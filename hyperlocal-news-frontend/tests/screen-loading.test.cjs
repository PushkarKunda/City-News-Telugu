const assert = require('node:assert/strict');
const { readFileSync } = require('node:fs');
const path = require('node:path');
const { test } = require('node:test');
const ts = require('typescript');
// Enable QueryObserver's browser/native polling timers in this Node test.
global.window = {};
const { QueryClient, QueryObserver, MutationObserver, focusManager } = require('@tanstack/react-query');

function load(relativePath, dependencies = {}) {
  const filename = path.resolve(__dirname, '..', relativePath);
  const { outputText } = ts.transpileModule(readFileSync(filename, 'utf8'), {
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2020 },
  });
  const loaded = { exports: {} };
  new Function('require', 'module', 'exports', outputText)(
    (name) => Object.hasOwn(dependencies, name) ? dependencies[name] : require(name), loaded, loaded.exports,
  );
  return loaded.exports;
}

test('AppState stops React Query intervals and resumes on foreground; listener is removed', async () => {
  const { bindQueryFocus } = load('services/queryFocus.ts');
  let listener;
  let removed = false;
  const cleanup = bindQueryFocus({
    currentState: 'active',
    addEventListener: (_event, callback) => { listener = callback; return { remove: () => { removed = true; } }; },
  }, focusManager);
  const client = new QueryClient();
  client.mount();
  let calls = 0;
  const observer = new QueryObserver(client, {
    queryKey: ['polling'], queryFn: () => ++calls,
    refetchInterval: 15, refetchIntervalInBackground: false, retry: false,
  });
  const unsubscribe = observer.subscribe(() => {});
  const wait = (ms) => new Promise((resolve) => setTimeout(resolve, ms));
  try {
    await wait(60);
    assert.ok(calls >= 2);
    listener('background');
    const paused = calls;
    await wait(60);
    assert.equal(calls, paused);
    listener('inactive');
    await wait(30);
    assert.equal(calls, paused);
    listener('active');
    await wait(45);
    assert.ok(calls > paused);
  } finally {
    unsubscribe(); client.unmount(); client.clear(); cleanup();
  }
  assert.ok(removed);
});

test('notification hooks share one scoped count query, with no list polling or double-counting', async () => {
  const calls = [];
  const { API_ROUTES } = load('services/api/routes.ts');
  const { notificationsApi } = load('services/api/notifications.ts', {
    './routes': { API_ROUTES },
    './client': { request: async (config) => { calls.push(config); return { unread_count: 7 }; } },
  });
  let focused = true;
  const hooks = load('hooks/useNotifications.ts', {
    '@tanstack/react-query': { useQuery: (options) => options },
    '@/services/api': { notificationsApi },
    '@react-navigation/native': { useIsFocused: () => focused },
    '@/store/authStore': { useAuthStore: (select) => select({ user: { user_uid: 'reader' } }) },
  });
  const one = hooks.useUnreadCount();
  assert.deepEqual(hooks.useInAppUnreadCount().queryKey, one.queryKey);
  assert.deepEqual(hooks.useTotalUnreadCount().queryKey, one.queryKey);
  assert.equal(hooks.useNotifications().refetchInterval, undefined);
  assert.equal((await notificationsApi.getTotalUnreadCount()).count, 7);
  assert.equal(calls.length, 1);
  calls.length = 0;
  const client = new QueryClient();
  const first = new QueryObserver(client, one);
  const second = new QueryObserver(client, hooks.useTotalUnreadCount());
  const stopFirst = first.subscribe(() => {});
  const stopSecond = second.subscribe(() => {});
  try {
    await new Promise(setImmediate);
    assert.equal(calls.length, 1);
    assert.equal(first.getCurrentResult().data.count, 7);
    assert.equal(second.getCurrentResult().data.count, 7);
  } finally {
    stopFirst(); stopSecond(); client.clear();
  }
  focused = false;
  assert.equal(hooks.useUnreadCount().refetchInterval, false);
  assert.equal(hooks.useUnreadCount().enabled, false);
});

test('screen queries use one aggregate and preserve failed comments and pagination during hydration', async (t) => {
  const client = new QueryClient();
  t.after(() => client.clear());
  const calls = [];
  const newsKeys = {
    single: (uid) => ['news', 'single', uid],
    engagement: (uid) => ['news', 'engagement', uid],
    comments: (uid) => ['news', 'comments', uid],
  };
  const engagementKeys = { checkBookmark: (uid, type) => ['engagement', 'check-bookmark', type, uid] };
  const { API_ROUTES } = load('services/api/routes.ts');
  let detail = {
    article: { news_uid: 'article', title: 'Story' }, engagement: null, bookmark: null, ads: [],
    comments: { comments: [{ id: 1 }], total: 21, page: 1, limit: 20, has_more: true },
    errors: { engagement: 'Unavailable' },
  };
  const { screensApi } = load('services/api/screens.ts', {
    './routes': { API_ROUTES },
    './client': { request: async (config) => { calls.push(config); return detail; } },
  });
  let count;
  const hooks = load('hooks/useScreens.ts', {
    react: { useEffect: () => {} },
    '@tanstack/react-query': { useQuery: (options) => options, useQueryClient: () => client },
    '@react-navigation/native': { useIsFocused: () => true },
    '@/store/authStore': { useAuthStore: (select) => select({ user: { user_uid: 'reader' } }) },
    '@/store/commentCountStore': { useCommentCountStore: { getState: () => ({ setCount: (_uid, value) => { count = value; } }) } },
    '@/services/api/screens': { screensApi },
    '@/hooks/useNews': { newsKeys },
    '@/hooks/usePosts': { postKeys: {} },
    '@/hooks/usePolls': { pollKeys: {} },
    '@/hooks/useEngagement': { engagementKeys },
  });
  const failed = { id: 999, status: 'failed', idempotency_key: 'retry-key' };
  client.setQueryData(newsKeys.comments('article'), {
    pages: [{ comments: [failed, { id: 1 }], total: 21 }, { comments: [{ id: 21 }] }], pageParams: [1, 2],
  });
  client.setQueryData(newsKeys.engagement('article'), { comments: 20 });
  const options = hooks.useNewsDetailScreen('article');
  await client.fetchQuery(options);
  assert.equal(calls.length, 1);
  assert.equal(calls[0].url, '/screens/news/article');
  const cached = client.getQueryData(newsKeys.comments('article'));
  assert.deepEqual(cached.pageParams, [1, 2]);
  assert.deepEqual(cached.pages[0].comments[0], failed);
  assert.equal(cached.pages[1].comments[0].id, 21);
  assert.equal(count, 21);
  assert.deepEqual(client.getQueryData(newsKeys.engagement('article')), { comments: 20 });

  let legacyRequests = 0;
  const newsHooks = load('hooks/useNews.ts', {
    '@tanstack/react-query': {
      useQuery: (options) => options, useQueryClient: () => client,
      useMutation: (options) => new MutationObserver(client, options),
    },
    '@/services/api/news': { newsApi: { like: async () => {
      detail = { ...detail, engagement: { likes: 8, comments: 21 } };
      return { success: true };
    } } },
    '@/store/commentCountStore': {}, 'expo-modules-core': {},
  });
  assert.equal(newsHooks.useBreakingNews().refetchInterval, undefined);
  const disabled = new QueryObserver(client, {
    ...newsHooks.useNewsEngagement('article', false),
    queryFn: () => { legacyRequests++; throw new Error('Legacy engagement call'); },
  });
  const stopDisabled = disabled.subscribe(() => {});
  const activeScreen = new QueryObserver(client, options);
  const stopScreen = activeScreen.subscribe(() => {});
  try {
    await newsHooks.useLikeArticle().mutate('article');
    await new Promise(setImmediate);
    assert.equal(calls.length, 2); // initial aggregate plus one mutation-triggered refresh
    assert.equal(legacyRequests, 0);
    assert.equal(disabled.getCurrentResult().data.likes, 8);
  } finally {
    stopScreen(); stopDisabled();
  }

  detail = { ...detail, comments: { ...detail.comments, total: 22, comments: [{ id: 2 }, { id: 1 }] } };
  await client.fetchQuery({ ...options, staleTime: 0 });
  const restarted = client.getQueryData(newsKeys.comments('article'));
  assert.deepEqual(restarted.pageParams, [1]);
  assert.deepEqual(restarted.pages[0].comments.map((comment) => comment.id), [999, 2, 1]);
  assert.equal(count, 22);

  // Even an isolated transport that ignores abort cannot hydrate stale data
  // after an optimistic mutation cancels the in-flight aggregate.
  let resolveOldResponse;
  const pending = client.fetchQuery({
    ...options, staleTime: 0,
    queryFn: async (context) => {
      await new Promise((resolve) => { resolveOldResponse = resolve; });
      return options.queryFn(context);
    },
  });
  await client.cancelQueries({ queryKey: newsKeys.single('article') });
  detail = { ...detail, article: { title: 'Outdated response' } };
  resolveOldResponse();
  // React Query reverts a cancelled refetch to its previous cached result.
  await pending;
  await new Promise(setImmediate);
  assert.equal(client.getQueryData(newsKeys.single('article')).title, 'Story');

  calls.length = 0;
  await client.fetchQuery(hooks.useProfileScreen());
  assert.equal(calls.length, 1);
  assert.equal(calls[0].url, '/screens/profile');
  client.clear();
});
