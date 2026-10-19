// services/api/token.ts
import * as SecureStore from 'expo-secure-store';
import { assertCurrentSession, getSessionVersion, invalidateSession } from '../session';

const ACCESS_TOKEN_KEY = 'access_token';
const REFRESH_TOKEN_KEY = 'refresh_token';

// Serialize writes/deletions: a refresh finishing during logout cannot restore tokens.
let pendingWrite: Promise<void> = Promise.resolve();
const writeTokens = (operation: () => Promise<void>) => {
  const result = pendingWrite.then(operation);
  pendingWrite = result.catch(() => {});
  return result;
};

export const getAuthToken = async (): Promise<string | null> => {
  try {
    await pendingWrite;
    return await SecureStore.getItemAsync(ACCESS_TOKEN_KEY);
  } catch {
    return null;
  }
};

export const getRefreshToken = async (): Promise<string | null> => {
  try {
    await pendingWrite;
    return await SecureStore.getItemAsync(REFRESH_TOKEN_KEY);
  } catch {
    return null;
  }
};

export const saveTokens = async (
  accessToken: string,
  refreshToken: string,
  sessionVersion = getSessionVersion()
): Promise<void> => {
  await writeTokens(async () => {
    assertCurrentSession(sessionVersion);
    await SecureStore.setItemAsync(ACCESS_TOKEN_KEY, accessToken);
    await SecureStore.setItemAsync(REFRESH_TOKEN_KEY, refreshToken);
  });
  assertCurrentSession(sessionVersion);
};

export const clearTokens = async (): Promise<void> => {
  invalidateSession();
  await writeTokens(async () => {
    await Promise.all([
      SecureStore.deleteItemAsync(ACCESS_TOKEN_KEY),
      SecureStore.deleteItemAsync(REFRESH_TOKEN_KEY),
    ]);
  });
};
