import { useState, useEffect } from 'react';
import { AppState, AppStateStatus } from 'react-native';
import { formatTimeAgo, TimeAgoOptions } from '@/utils/formatters';

interface UseRelativeTimeOptions extends TimeAgoOptions {
  /**
   * Only run the minute interval when the card or screen is actively visible.
   * Defaults to true.
   */
  isActive?: boolean;
}

/**
 * Hook to display and keep relative time fresh:
 * - Updates every 60 seconds while visible
 * - Updates immediately when returning from background
 * - Returns empty string if timestamp is missing or invalid
 */
export function useRelativeTime(
  rawDate: string | number | Date | null | undefined,
  options?: UseRelativeTimeOptions
): string {
  const isActive = options?.isActive ?? true;
  const language = options?.language;

  const [timeAgo, setTimeAgo] = useState<string>(() =>
    formatTimeAgo(rawDate, { language })
  );

  useEffect(() => {
    // 1. Immediately evaluate for the latest date
    setTimeAgo(formatTimeAgo(rawDate, { language }));

    if (!rawDate) return;

    // 2. Only tick if currently visible/active
    let intervalId: NodeJS.Timeout | null = null;
    if (isActive) {
      intervalId = setInterval(() => {
        setTimeAgo(formatTimeAgo(rawDate, { language }));
      }, 60000);
    }

    // 3. AppState change listener (e.g. returning from background to foreground)
    const handleAppStateChange = (nextAppState: AppStateStatus) => {
      if (nextAppState === 'active') {
        setTimeAgo(formatTimeAgo(rawDate, { language }));
      }
    };

    const subscription = AppState.addEventListener('change', handleAppStateChange);

    return () => {
      if (intervalId) clearInterval(intervalId);
      subscription.remove();
    };
  }, [rawDate, isActive, language]);

  return timeAgo;
}
