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
        const refreshToken = await getRefreshToken();
        if (!refreshToken) throw new Error('No refresh token');

        // Call refresh endpoint
        const response = await axios.post(
          `${API_CONFIG.baseUrl}${API_ROUTES.auth.refreshToken}`,
          null,
          {
            params: {
              refresh_token: refreshToken,
            },
          }
        );

        const { access_token, refresh_token } = response.data;
        await saveTokens(access_token, refresh_token);
        //Just for testing
        console.log('auth/refresh-token url is used, now access-token is:', access_token);

        processQueue(null, access_token);

        originalRequest.headers = {
          ...originalRequest.headers,
          Authorization: `Bearer ${access_token}`,
        };

        return apiClient(originalRequest);
      } catch (refreshError) {
        processQueue(refreshError, null);
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