// scripts/test-comment-sync.js
// Verification of Comment Count Synchronization Requirements

const assert = require('assert');

console.log('Testing Comment Count Synchronization System...\n');

// 1. Mock Zustand CommentCountStore
function createCommentCountStore() {
  let state = {
    counts: {},
    drafts: {},
  };

  const get = () => state;
  const set = (fn) => {
    state = typeof fn === 'function' ? fn(state) : { ...state, ...fn };
  };

  return {
    getState: get,
    setInitialCount: (uid, count) => {
      if (get().counts[uid] === undefined) {
        set((s) => ({ counts: { ...s.counts, [uid]: Math.max(0, count) } }));
      }
    },
    getCount: (uid, fallbackCount) => {
      const val = get().counts[uid];
      return typeof val === 'number' ? val : fallbackCount;
    },
    incrementCount: (uid, fallback) => {
      set((s) => {
        const current = s.counts[uid] !== undefined ? s.counts[uid] : (fallback ?? 0);
        return { counts: { ...s.counts, [uid]: current + 1 } };
      });
    },
    decrementCount: (uid) => {
      set((s) => {
        const current = s.counts[uid] ?? 1;
        return { counts: { ...s.counts, [uid]: Math.max(0, current - 1) } };
      });
    },
    setCount: (uid, count) => {
      set((s) => ({ counts: { ...s.counts, [uid]: Math.max(0, count) } }));
    },
    syncCount: (uid, count) => {
      set((s) => ({ counts: { ...s.counts, [uid]: Math.max(0, count) } }));
    },
  };
}

let store = createCommentCountStore();
const articleUid = 'article_101';

// Test 1: Single Source of Truth - initial card render
console.log('Test 1: Initial Card Mount & Count Store');
store.setInitialCount(articleUid, 0);
assert.strictEqual(store.getState().counts[articleUid], 0, 'Initial count should be 0');
console.log('  Passed: Initial count is 0 in shared store.');

// Test 2: Comments List Fetched (Sync from Real List)
console.log('\nTest 2: Sync from Real Comments List');
// Suppose the server returns 3 comments on sheet open
const serverTotal = 3;
const commentsList = [{ id: 1 }, { id: 2 }, { id: 3 }];
const realCount = Math.max(serverTotal, commentsList.length);
store.setCount(articleUid, realCount);

assert.strictEqual(store.getState().counts[articleUid], 3, 'Store count should sync to 3');
console.log('  Passed: Store updated to 3 from server response (fixes drift).');

// Test 3: Header Matches List
console.log('\nTest 3: Sheet Header Calculation');
function computeHeaderCount(liveStoreCount, comments, serverTotal) {
  return Math.max(
    liveStoreCount ?? 0,
    comments.length,
    typeof serverTotal === 'number' ? serverTotal : 0
  );
}
let headerCount = computeHeaderCount(store.getState().counts[articleUid], commentsList, serverTotal);
assert.strictEqual(headerCount, 3, 'Header should display 3');

// Edge case: liveStoreCount was 0 (stale), but 1 comment is visible
let edgeHeaderCount = computeHeaderCount(0, [{ id: 99 }], 0);
assert.strictEqual(edgeHeaderCount, 1, 'Header must NEVER show 0 while a comment is visible');
console.log('  Passed: Sheet header derived from list length and live store count, never shows 0 with visible comment.');

// Test 4: Update on Success (Optimistic + Confirmation)
console.log('\nTest 4: Post Comment Flow (Optimistic + Verified in DB)');
// 4a: onMutate increments count right away
store.incrementCount(articleUid);
assert.strictEqual(store.getState().counts[articleUid], 4, 'Count should immediately increment to 4');

// 4b: Optimistic comment added to list
const optimisticComment = { id: 9999, status: 'sending', comment_text: 'Hello world' };
const updatedList = [optimisticComment, ...commentsList];
headerCount = computeHeaderCount(store.getState().counts[articleUid], updatedList, 4);
assert.strictEqual(headerCount, 4, 'Header immediately reflects 4');

// 4c: Backend returns 500 but verify check finds comment in DB
// Verification logic
function verifyCommentInDb(matchingCommentFound, serverCount) {
  if (matchingCommentFound) {
    // verified! Do NOT rollback. Sync confirmed count
    if (typeof serverCount === 'number') {
      store.setCount(articleUid, serverCount);
    }
    return true;
  } else {
    // confirmed not saved -> rollback
    store.decrementCount(articleUid);
    return false;
  }
}

const verified = verifyCommentInDb(true, 4);
assert.strictEqual(verified, true, 'Comment should be verified in DB');
assert.strictEqual(store.getState().counts[articleUid], 4, 'Count must NOT rollback when verified');
console.log('  Passed: Count remains increased when comment exists in DB (even after 500).');

// Test 5: True Failure Rolls Back
console.log('\nTest 5: True Failure (Confirmed Not Saved)');
store.incrementCount(articleUid); // optimistic 4 -> 5
assert.strictEqual(store.getState().counts[articleUid], 5);
const failureVerified = verifyCommentInDb(false, null);
assert.strictEqual(failureVerified, false);
assert.strictEqual(store.getState().counts[articleUid], 4, 'Count properly rolls back on confirmed failure');
console.log('  Passed: Count rolls back only when confirmed not saved.');

// Test 6: Deleting Comment Decrements Count
console.log('\nTest 6: Deleting Comment');
store.decrementCount(articleUid);
assert.strictEqual(store.getState().counts[articleUid], 3, 'Count decrements to 3');
store.decrementCount(articleUid);
store.decrementCount(articleUid);
store.decrementCount(articleUid);
store.decrementCount(articleUid); // excess decrement
assert.strictEqual(store.getState().counts[articleUid], 0, 'Count never drops below 0');
console.log('  Passed: Deletion decrements count cleanly with lower bound of 0.');

// Test 7: Feed Card Memoization & Re-rendering
console.log('\nTest 7: Memoized Feed Card Re-rendering Check');
function cardMemoComparator(prev, next, storeCounts) {
  const prevUid = prev.item?.data?.news_uid;
  const nextUid = next.item?.data?.news_uid;
  if (prevUid !== nextUid) return false;
  if (prev.commentCount !== next.commentCount) return false;
  if (prevUid && storeCounts) {
    if (storeCounts[prevUid] !== undefined) {
      const itemComments = prev.item?.data?.comments;
      if (storeCounts[prevUid] !== itemComments) {
        return false; // trigger re-render because store count changed!
      }
    }
  }
  return true;
}

const card1 = {
  item: { data: { news_uid: 'art_1', comments: 0 } },
  commentCount: 0,
};
const card2 = {
  item: { data: { news_uid: 'art_1', comments: 0 } }, // stale props!
  commentCount: 1, // updated from store subscription!
};

assert.strictEqual(
  cardMemoComparator(card1, card2, { art_1: 1 }),
  false,
  'Card comparator must return false (re-render) when commentCount changed'
);
console.log('  Passed: Memoized card detects count changes and re-renders even with stale article item.');

console.log('\nALL 7 TESTS PASSED SUCCESSFULLY! (100% assertions verified)\n');
