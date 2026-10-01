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

export const setOnUnauthorizedCallback = (callback: () => void) => {
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
    const originalRequest = error.config as AxiosRequestConfig & {
      _retry?: boolean;
    };

    const isAuthUrl =
      originalRequest.url?.includes(API_ROUTES.auth.logout) ||
      originalRequest.url?.includes(API_ROUTES.auth.refreshToken) ||
      originalRequest.url?.includes(API_ROUTES.auth.firebaseLogin);

    if (error.response?.status === 401 && !originalRequest._retry && !isAuthUrl) {
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

      originalRequest._retry = true;
      isRefreshing = true;

      try {
        let newAccessToken: string | null = null;
        let newRefreshToken: string | null = null;

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
              }
            );
            newAccessToken = response.data?.access_token;
            newRefreshToken = response.data?.refresh_token;
          } catch (_) {
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
                  { firebase_token: fbToken }
                );
                newAccessToken = fbRes.data?.access_token;
                newRefreshToken = fbRes.data?.refresh_token;
              }
            }
          } catch (_) {}
        }

        if (!newAccessToken) {
          throw new Error('No refresh token available');
        }

        await saveTokens(newAccessToken, newRefreshToken || '');
        processQueue(null, newAccessToken);

        originalRequest.headers = {
          ...originalRequest.headers,
          Authorization: `Bearer ${newAccessToken}`,
        };

        return apiClient(originalRequest);
      } catch (refreshError) {
        processQueue(refreshError, null);

        // Check if the failing request is background telemetry/tracking
        const requestUrl = originalRequest.url || '';
        const isTelemetryOrNonCritical =
          requestUrl.includes('/view') ||
          requestUrl.includes('/share') ||
          requestUrl.includes('/engagement') ||
          requestUrl.includes('/analytics') ||
          requestUrl.includes('/in-app') ||
          requestUrl.includes('/notifications') ||
          requestUrl.includes('/preferences') ||
          requestUrl.includes('/bookmarks') ||
          requestUrl.includes('/feed');

        // Only log out if it is a critical authenticated route and not background tracking
        if (!isTelemetryOrNonCritical) {
          await clearTokens();
          if (onUnauthorizedCallback) {
            const cb = onUnauthorizedCallback;
            onUnauthorizedCallback = null;
            try {
              cb();
            } finally {
              setTimeout(() => {
                onUnauthorizedCallback = cb;
              }, 1000);
            }
          }
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

export const getApiError = (error: unknown): ApiError => {
  if (axios.isAxiosError(error)) {
    const data = error.response?.data;
    return {
      code: error.code ?? 'API_ERROR',
      message: data?.detail || data?.message || error.message || 'Request failed',
      status: error.response?.status,
    };
  }
  if (error instanceof Error) {
    return { code: 'UNKNOWN_ERROR', message: error.message };
  }
  return { code: 'UNKNOWN_ERROR', message: 'An unexpected error occurred' };
};