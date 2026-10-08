// services/api/client.ts
import axios, {
  AxiosError,
  AxiosInstance,
  AxiosRequestConfig,
  InternalAxiosRequestConfig,
} from 'axios';
import { API_CONFIG } from './config';
import { getAuthToken, getRefreshToken, saveTokens, clearTokens } from './token';
import { API_ROUTES } from './routes';
import { firebaseAuth } from '../firebase';

// ─── Types ───────────────────────────────────────────────────────────────────

export interface ApiError {
  code: string;
  message: string;
  status?: number;
}

export interface ApiResponse<T> {
  data: T;
  message?: string;
  error?: ApiError;
}

// ─── Axios Instance ──────────────────────────────────────────────────────────

export const apiClient: AxiosInstance = axios.create({
  baseURL: API_CONFIG.baseUrl,
  timeout: API_CONFIG.timeoutMs,
  headers: {
    Accept: 'application/json',
    'Content-Type': 'application/json',
  },
});

// ─── Unauthorized Callback Handling ──────────────────────────────────────────

let onUnauthorizedCallback: (() => void) | null = null;

export const setOnUnauthorizedCallback = (callback: (() => void) | null) => {
  onUnauthorizedCallback = callback;
};

// ─── Request Interceptor ─────────────────────────────────────────────────────

apiClient.interceptors.request.use(
  async (config: InternalAxiosRequestConfig) => {
    const token = await getAuthToken();
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => Promise.reject(error)
);

// ─── Response Interceptor (Token Refresh) ────────────────────────────────────

let isRefreshing = false;
let failedQueue: Array<{
  resolve: (token: string) => void;
  reject: (error: unknown) => void;
}> = [];

const processQueue = (error: unknown, token: string | null = null) => {
  failedQueue.forEach((prom) => {
    if (error) {
      prom.reject(error);
    } else {
      prom.resolve(token!);
    }
  });
  failedQueue = [];
};

apiClient.interceptors.response.use(
  (response) => response,
  async (error: AxiosError) => {
    const originalRequest = error.config as (AxiosRequestConfig & { _retry?: boolean }) | undefined;
    if (!originalRequest) return Promise.reject(error);

    const isAuthUrl =
      originalRequest.url?.includes(API_ROUTES.auth.logout) ||
      originalRequest.url?.includes(API_ROUTES.auth.refreshToken) ||
      originalRequest.url?.includes(API_ROUTES.auth.firebaseLogin) ||
      originalRequest.url?.includes(API_ROUTES.auth.google) ||
      originalRequest.url?.includes(API_ROUTES.auth.syncProvider);

    if (error.response?.status === 401 && originalRequest._retry && !isAuthUrl) {
      try {
        await clearTokens();
      } finally {
        onUnauthorizedCallback?.();
      }
      return Promise.reject(error);
    }

    if (error.response?.status === 401 && !originalRequest._retry && !isAuthUrl) {
      originalRequest._retry = true;
      if (isRefreshing) {
        // Queue requests while refreshing
        return new Promise((resolve, reject) => {
          failedQueue.push({ resolve, reject });
        })
          .then((token) => {
            originalRequest.headers = {
              ...originalRequest.headers,
              Authorization: `Bearer ${token}`,
            };
            return apiClient(originalRequest);
          })
          .catch((err) => Promise.reject(err));
      }

      isRefreshing = true;

      try {
        let newAccessToken: string | null = null;
        let newRefreshToken: string | null = null;
        let recoveryError: unknown;

        const refreshToken = await getRefreshToken();
        if (refreshToken) {
          try {
            const response = await axios.post(
              `${API_CONFIG.baseUrl}${API_ROUTES.auth.refreshToken}`,
              null,
              {
                params: {
                  refresh_token: refreshToken,
                },
                timeout: API_CONFIG.timeoutMs,
              }
            );
            newAccessToken = response.data?.access_token;
            newRefreshToken = response.data?.refresh_token;
          } catch (err) {
            recoveryError = err;
            // refresh token call failed, fall back to Firebase re-auth below
          }
        }

        // If backend refresh token failed or was missing, attempt silent Firebase token exchange
        if (!newAccessToken) {
          try {
            const fbUser = firebaseAuth.currentUser;
            if (fbUser) {
              const fbToken = await fbUser.getIdToken(true);
              if (fbToken) {
                const fbRes = await axios.post(
                  `${API_CONFIG.baseUrl}${API_ROUTES.auth.firebaseLogin}`,
                  { firebase_token: fbToken },
                  { timeout: API_CONFIG.timeoutMs }
                );
                newAccessToken = fbRes.data?.access_token;
                newRefreshToken = fbRes.data?.refresh_token;
              }
            }
          } catch (err) {
            recoveryError = err;
          }
        }

        if (!newAccessToken) {
          throw recoveryError ?? new Error('No refresh token available');
        }

        await saveTokens(newAccessToken, newRefreshToken || refreshToken || '');
        processQueue(null, newAccessToken);

        originalRequest.headers = {
          ...originalRequest.headers,
          Authorization: `Bearer ${newAccessToken}`,
        };

        return apiClient(originalRequest);
      } catch (refreshError) {
        processQueue(refreshError, null);

        // Any failed recovery invalidates the local authenticated session,
        // including sessions used by background requests.
        try {
          await clearTokens();
        } finally {
          onUnauthorizedCallback?.();
        }
        return Promise.reject(refreshError);
      } finally {
        isRefreshing = false;
      }
    }

    return Promise.reject(error);
  }
);

// ─── Request Helper ──────────────────────────────────────────────────────────

export const request = async <T>(config: AxiosRequestConfig): Promise<T> => {
  const response = await apiClient.request<T>(config);
  return response.data;
};

// ─── Error Normalizer ────────────────────────────────────────────────────────

const formatValidationErrors = (detail: any[]): string => {
  return detail
    .map((err) => {
      if (typeof err === 'string') return err;
      if (!err || typeof err !== 'object') return String(err);
      const loc = Array.isArray(err.loc)
        ? err.loc.filter((part: any) => part !== 'body').join('.')
        : err.loc;
      const msg = err.msg || err.message || 'invalid value';
      return loc ? `${loc}: ${msg}` : msg;
    })
    .filter(Boolean)
    .join('; ');
};

export const getApiError = (error: unknown): ApiError => {
  if (axios.isAxiosError(error)) {
    const status = error.response?.status;
    const data = error.response?.data;
    const method = error.config?.method?.toUpperCase() || '';
    const url = error.config?.url || '';

    // Log diagnostic strings in development only
    if (typeof __DEV__ !== 'undefined' && __DEV__) {
      const logFn = status === 404 || status === 401 ? console.warn : console.error;
      logFn(
        `[API Error] ${method} ${url} ${status || error.code || ''}:`,
        data || error.message
      );
    }

    let code = error.code ?? 'API_ERROR';
    let message: string;

    if (status === 401) {
      code = 'UNAUTHORIZED';
      message =
        typeof data?.detail === 'string' &&
        !['unauthorized', 'not authenticated', 'signature has expired', 'invalid token'].includes(
          data.detail.toLowerCase()
        )
          ? data.detail
          : 'Your session has expired. Please sign in again.';
    } else if (status === 403) {
      code = 'FORBIDDEN';
      message =
        typeof data?.detail === 'string' && data.detail.toLowerCase() !== 'forbidden'
          ? data.detail
          : 'You do not have permission to perform this action.';
    } else if (status === 404) {
      code = 'NOT_FOUND';
      message =
        typeof data?.detail === 'string' && data.detail.toLowerCase() !== 'not found'
          ? data.detail
          : 'The requested resource was not found. Please try again later.';
    } else if (status === 422) {
      code = 'VALIDATION_ERROR';
      if (Array.isArray(data?.detail)) {
        message = formatValidationErrors(data.detail);
      } else if (typeof data?.detail === 'string') {
        message = data.detail;
      } else {
        message = 'Please check the information you entered and try again.';
      }
    } else if (status && status >= 500) {
      code = 'SERVER_ERROR';
      message = 'A server error occurred. Please try again later.';
    } else if (typeof data?.detail === 'string') {
      message = data.detail;
    } else if (typeof data?.message === 'string') {
      message = data.message;
    } else if (error.message) {
      message = error.message;
    } else {
      message = 'Request failed. Please try again.';
    }

    // Strip raw [METHOD /path ...] debug patterns if present
    message = message.replace(/\[(POST|GET|PUT|PATCH|DELETE)\s+[^\]]+\]/gi, '').trim() || message;

    return {
      code,
      message,
      status,
    };
  }

  if (error instanceof Error) {
    let message = error.message || 'An unexpected error occurred';
    message = message.replace(/\[(POST|GET|PUT|PATCH|DELETE)\s+[^\]]+\]/gi, '').trim() || message;
    return { code: 'UNKNOWN_ERROR', message };
  }

  return { code: 'UNKNOWN_ERROR', message: 'An unexpected error occurred' };
};

/** Convert transport/library errors into copy that is safe to show in UI. */
export const getUserFacingError = (error: unknown, fallback: string): string => {
  const normalized = getApiError(error);
  const message = normalized.message?.trim();
  if (!message) return fallback;

  const technicalMessage = /^(network error|request failed|timeout|unknown error|error)$/i.test(message)
    || /status code \d{3}/i.test(message)
    || /\baxios\b/i.test(message);
  return technicalMessage ? fallback : message;
};
