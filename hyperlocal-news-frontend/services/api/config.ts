// services/api/config.ts
const parseTimeout = (value: string | undefined, fallback: number) => {
  if (!value) return fallback;
  const parsed = Number(value);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : fallback;
};

export const API_CONFIG = {
  baseUrl: process.env.EXPO_PUBLIC_API_BASE_URL ?? '',
  timeoutMs: parseTimeout(process.env.EXPO_PUBLIC_API_TIMEOUT_MS, 15000),
};
