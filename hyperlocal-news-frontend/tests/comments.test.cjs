const assert = require('node:assert/strict');
const { randomUUID } = require('node:crypto');
const { readFileSync } = require('node:fs');
const path = require('node:path');
const { test } = require('node:test');
const ts = require('typescript');
const { QueryClient, MutationObserver } = require('@tanstack/react-query');

// Exercise the real mutation lifecycle/API code with an isolated transport.
// Native UUID generation is the only Expo dependency replaced in this test.
function loadTypeScript(relativePath, dependencies = {}) {
  const filename = path.resolve(__dirname, '..', relativePath);
  const { outputText } = ts.transpileModule(readFileSync(filename, 'utf8'), {
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2020 },
  });
  const loaded = { exports: {} };
  new Function('require', 'module', 'exports', outputText)(
    (name) => Object.hasOwn(dependencies, name) ? dependencies[name] : require(name),
    loaded,
    loaded.exports,
  );
  return loaded.exports;
}

function setup(transport) {
  const queryClient = new QueryClient({
    defaultOptions: { mutations: { retry: 1, retryDelay: 0, gcTime: Infinity } },
  });
  const calls = [];
  const { API_ROUTES } = loadTypeScript('services/api/routes.ts');
  const { newsApi } = loadTypeScript('services/api/news.ts', {
    './routes': { API_ROUTES },
    './client': { request: async (config) => {
      calls.push(config);
      return transport(config, calls.length);
    } },
    './users': { usersApi: {} },
  });
  const { useCommentCountStore } = loadTypeScript('store/commentCountStore.ts');
  const { useAddComment, newsKeys } = loadTypeScript('hooks/useNews.ts', {
    '@tanstack/react-query': {
      useQueryClient: () => queryClient,
      useMutation: (options) => new MutationObserver(queryClient, options),
    },
    '@/services/api/news': { newsApi },
    '@/store/commentCountStore': { useCommentCountStore },
    'expo-modules-core': { uuid: { v4: randomUUID } },
  });
  queryClient.setQueryData(newsKeys.comments('article'), {
    pages: [{ comments: [], page: 1, limit: 20, total: 8, has_more: false }],
    pageParams: [1],
  });
  useCommentCountStore.getState().setCount('article', 8);
  return {
    mutation: useAddComment(), calls, queryClient, newsKeys,
    count: () => useCommentCountStore.getState().counts.article,
    pages: () => queryClient.getQueryData(newsKeys.comments('article')).pages,
  };
}

const created = {
  id: 42,
  article_id: 'article',
  user_id: 'server-user',
  user_name: 'Server Name',
  user_avatar: 'https://example.test/avatar.jpg',
  text: 'సమాచారం బాగుంది',
  created_at: '2026-10-04T10:00:00+00:00',
  comments_count: 9,
};

test('automatic retry reuses one UUID in the header/body without polling comments', async () => {
  const state = setup((_config, attempt) => {
    if (attempt === 1) throw new Error('Response lost');
    return created;
  });
  await state.mutation.mutate({ uid: 'article', comment_text: created.text, tempId: 100 });

  assert.equal(state.calls.length, 2);
  const key = state.calls[0].headers['Idempotency-Key'];
  assert.match(key, /^[\da-f]{8}-[\da-f]{4}-4[\da-f]{3}-[89ab][\da-f]{3}-[\da-f]{12}$/i);
  for (const call of state.calls) {
    assert.equal(call.method, 'POST');
    assert.equal(call.headers['Idempotency-Key'], key);
    assert.equal(call.data.idempotency_key, key);
  }
  assert.equal(state.count(), 9);
  assert.equal(state.pages()[0].total, 9);
  assert.deepEqual(state.pages()[0].comments[0], {
    id: 42, user_uid: 'server-user', user_name: 'Server Name', user_avatar: created.user_avatar,
    comment_text: created.text, created_at: created.created_at, likes_count: 0,
    status: 'sent', idempotency_key: key,
  });
  state.queryClient.clear();
});

test('manual Retry retains the failed row key; a new submission gets a new key', async () => {
  let offline = true;
  const state = setup(() => {
    if (offline) throw new Error('Offline');
    return created;
  });
  await assert.rejects(state.mutation.mutate({ uid: 'article', comment_text: created.text, tempId: 100 }));
  const failed = state.pages()[0].comments[0];
  assert.equal(failed.status, 'failed');
  assert.equal(state.count(), 8);

  offline = false;
  await state.mutation.mutate({
    uid: 'article', comment_text: failed.comment_text,
    tempId: failed.id, idempotency_key: failed.idempotency_key,
  });
  assert.equal(state.calls[2].headers['Idempotency-Key'], failed.idempotency_key);
  assert.equal(state.pages()[0].comments.length, 1);

  await state.mutation.mutate({ uid: 'article', comment_text: created.text, tempId: 101 });
  assert.notEqual(state.calls[3].headers['Idempotency-Key'], failed.idempotency_key);
  state.queryClient.clear();
});

test('201 reconciles a realtime duplicate and overwrites optimistic page/store totals', async () => {
  let respond;
  const state = setup(() => new Promise((resolve) => { respond = resolve; }));
  const pending = state.mutation.mutate({ uid: 'article', comment_text: created.text, tempId: 100 });
  await new Promise(setImmediate);
  state.queryClient.setQueryData(state.newsKeys.comments('article'), (old) => ({
    ...old,
    pages: [...old.pages, {
      comments: [{ id: 42, comment_text: created.text, user_uid: 'server-user' }],
      page: 2, limit: 20, total: 8, has_more: false,
    }],
  }));
  respond({ ...created, comments_count: 8 });
  await pending;
  assert.equal(state.pages().flatMap((page) => page.comments).length, 1);
  assert.ok(state.pages().every((page) => page.total === 8));
  assert.equal(state.count(), 8);
  state.queryClient.clear();
});
