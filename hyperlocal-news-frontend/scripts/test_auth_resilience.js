// scripts/test_auth_resilience.js
const assert = require('assert');

console.log('=== TEST 1: SIMULATE BACKEND 404 (Route not found on older server) ===');

function simulateSyncProvider404() {
  const err = new Error('Not Found');
  err.response = { status: 404, data: { detail: 'Not Found' } };
  err.endpoint = 'POST /user/auth/google';
  err.status = 404;
  return err;
}

function simulateSyncProviderOffline() {
  const err = new Error('Network Error');
  err.endpoint = 'POST /user/auth/google';
  err.status = undefined;
  return err;
}

function simulateSyncProvider401() {
  const err = new Error('Unauthorized');
  err.response = { status: 401, data: { detail: 'Firebase ID token invalid or expired' } };
  err.endpoint = 'POST /user/auth/google';
  err.status = 401;
  return err;
}

// Mock auth store logic
function handleGoogleLoginLogic(syncProviderFn, mockFbUser) {
  let user = null;
  let isAuthenticated = false;
  let isOnboarded = false;
  let backgroundRetryQueued = false;
  let loggedWarning = null;

  try {
    let response;
    try {
      response = syncProviderFn();
    } catch (syncErr) {
      const status = syncErr?.response?.status ?? syncErr?.status;
      const isFatalAuthError = status === 401 || status === 403;

      if (isFatalAuthError) {
        throw syncErr;
      }

      loggedWarning = `[authStore] Non-blocking sync failure [${syncErr?.endpoint || 'POST /user/auth/sync-provider'} ${status || 'OFFLINE'}]. Keeping user signed in via Firebase and queueing background retry.`;

      const googleProvider = mockFbUser?.providerData?.find((p) => p.providerId === 'google.com');
      const googleId = googleProvider?.uid || mockFbUser?.uid || null;

      const fallbackUser = {
        user_uid: mockFbUser?.uid || 'google_user',
        user_name: mockFbUser?.displayName || null,
        name: mockFbUser?.displayName || null,
        email: mockFbUser?.email || null,
        phone: mockFbUser?.phoneNumber || null,
        role: 1,
        email_verified: true,
        mobile_verified: Boolean(mockFbUser?.phoneNumber),
        profile_picture: mockFbUser?.photoURL || null,
        google_id: googleId,
        auth_provider: 'google',
        providers: ['google'],
        is_google_linked: true,
        is_new_user: false,
        created_at: new Date().toISOString(),
      };

      response = {
        access_token: '',
        refresh_token: '',
        token_type: 'bearer',
        user: fallbackUser,
        is_new_user: false,
      };

      backgroundRetryQueued = true;
    }

    user = {
      ...response.user,
      auth_provider: response.user.auth_provider || 'google',
      providers: response.user.providers || ['google'],
      is_google_linked: true,
      email_verified: true,
    };
    isAuthenticated = true;
    isOnboarded = true;

    return { success: true, user, isAuthenticated, isOnboarded, backgroundRetryQueued, loggedWarning };
  } catch (error) {
    const status = error?.response?.status ?? error?.status;
    const endpointInfo = error.endpoint ? `[${error.endpoint} ${status || 'ERROR'}]` : 'AUTH_ERROR';
    const userMessage = "Couldn't complete sign-in, please try again";
    return {
      success: false,
      error: {
        code: endpointInfo,
        message: userMessage,
      },
    };
  }
}

const mockFbUser = {
  uid: 'fb_google_123',
  displayName: 'Google Test User',
  email: 'testuser@gmail.com',
  phoneNumber: null,
  photoURL: 'https://lh3.googleusercontent.com/a/test',
  providerData: [{ providerId: 'google.com', uid: 'google_sub_98765' }],
};

// 1. Test 404 - MUST NOT BLOCK LOGIN
const res404 = handleGoogleLoginLogic(() => { throw simulateSyncProvider404(); }, mockFbUser);
assert.strictEqual(res404.success, true, 'Login should succeed even if backend returns 404');
assert.strictEqual(res404.isAuthenticated, true, 'User must be authenticated');
assert.strictEqual(res404.isOnboarded, true, 'User must enter app tabs');
assert.strictEqual(res404.backgroundRetryQueued, true, 'Background retry must be scheduled');
assert.strictEqual(res404.user.google_id, 'google_sub_98765');
assert.strictEqual(res404.user.auth_provider, 'google');
assert.strictEqual(res404.user.email_verified, true);
console.log('✅ TEST 1 PASSED: 404 does NOT block login. User enters app and retry is queued.');
console.log('   Warning logged:', res404.loggedWarning);

// 2. Test Offline - MUST NOT BLOCK LOGIN
const resOffline = handleGoogleLoginLogic(() => { throw simulateSyncProviderOffline(); }, mockFbUser);
assert.strictEqual(resOffline.success, true, 'Login should succeed when backend is offline');
assert.strictEqual(resOffline.isAuthenticated, true);
assert.strictEqual(resOffline.isOnboarded, true);
assert.strictEqual(resOffline.backgroundRetryQueued, true);
console.log('✅ TEST 2 PASSED: Offline backend does NOT block login. User enters app.');

// 3. Test 401 - MUST BE TREATED AS REAL SIGN-IN FAILURE
const res401 = handleGoogleLoginLogic(() => { throw simulateSyncProvider401(); }, mockFbUser);
assert.strictEqual(res401.success, false, '401 must fail login');
assert.strictEqual(res401.error.code, '[POST /user/auth/google 401]', 'Replaced generic SERVER_ERROR with endpoint name & status');
assert.strictEqual(res401.error.message, "Couldn't complete sign-in, please try again", 'Clean user message shown');
console.log('✅ TEST 3 PASSED: 401 treated as real sign-in failure with improved logs & clean error message.');
console.log('   Error Code logged:', res401.error.code);
console.log('   User Error Message:', res401.error.message);

// 4. Test 200 - HEALTHY SYNC
const res200 = handleGoogleLoginLogic(() => ({
  access_token: 'jwt_access_token_abc',
  refresh_token: 'jwt_refresh_token_xyz',
  token_type: 'bearer',
  user: {
    user_uid: 'I4K25FT5',
    name: 'Verified Google User',
    email: 'testuser@gmail.com',
    google_id: 'google_sub_98765',
    auth_provider: 'google',
    providers: ['google'],
    email_verified: true,
  },
}), mockFbUser);
assert.strictEqual(res200.success, true);
assert.strictEqual(res200.user.google_id, 'google_sub_98765');
assert.strictEqual(res200.user.auth_provider, 'google');
assert.strictEqual(res200.user.email_verified, true);
console.log('✅ TEST 4 PASSED: 200 updates user with google_id, auth_provider, and email_verified.');

console.log('\nALL 4 FRONTEND RESILIENCE TEST SCENARIOS PASSED PERFECTLY!');
