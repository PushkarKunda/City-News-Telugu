import { useState, useRef, useCallback, useEffect } from 'react';
import { Animated } from 'react-native';
import { useNavigation } from 'expo-router';
import { useTabBarStore } from '@/store/tabBarStore';

export interface UseImmersiveChromeOptions {
  autoHideDelayMs?: number;
  isModalOpen?: boolean;
  disabled?: boolean;
}

export interface UseImmersiveChromeReturn {
  isShown: boolean;
  show: (andScheduleAutoHide?: boolean) => void;
  hide: () => void;
  toggle: () => void;
  headerAnim: Animated.Value;
  headerOpacity: Animated.AnimatedInterpolation<number>;
  clearTimer: () => void;
  /** Call from FlatList `onScroll` / `onScrollBeginDrag` to flag a real swipe. */
  markUserScroll: () => void;
  /**
   * Hides the chrome only if the user is actually swiping. Use this from
   * `onViewableItemsChanged` so spurious viewability events (data refreshes,
   * layout changes, a callback that lands just after the user tapped) cannot
   * hide the chrome the instant it was restored.
   */
  hideOnUserScroll: () => void;
}

export function useImmersiveChrome({
  autoHideDelayMs = 2500,
  isModalOpen = false,
  disabled = false,
}: UseImmersiveChromeOptions = {}): UseImmersiveChromeReturn {
  const navigation = useNavigation();
  const setTabBarVisible = useTabBarStore((s) => s.setVisible);

  const headerAnim = useRef(new Animated.Value(1)).current;
  const isChromeVisibleRef = useRef(true);
  const [isShown, setIsShown] = useState(true);
  const hideTimerRef = useRef<NodeJS.Timeout | null>(null);
  const lastUserScrollAtRef = useRef(0);

  const isModalOpenRef = useRef(isModalOpen);
  isModalOpenRef.current = isModalOpen;

  const disabledRef = useRef(disabled);
  disabledRef.current = disabled;

  const clearTimer = useCallback(() => {
    if (hideTimerRef.current) {
      clearTimeout(hideTimerRef.current);
      hideTimerRef.current = null;
    }
  }, []);

  const hide = useCallback(() => {
    clearTimer();
    if (!isChromeVisibleRef.current) return;
    if (isModalOpenRef.current || disabledRef.current) return;

    isChromeVisibleRef.current = false;
    setIsShown(false);
    setTabBarVisible(false);

    Animated.timing(headerAnim, {
      toValue: 0,
      duration: 250,
      useNativeDriver: true,
    }).start();
  }, [setTabBarVisible, headerAnim, clearTimer]);

  const hideRef = useRef(hide);
  hideRef.current = hide;

  const show = useCallback(
    (andScheduleAutoHide = false) => {
      clearTimer();

      isChromeVisibleRef.current = true;
      setIsShown(true);
      setTabBarVisible(true);

      // Always drive the animation to the visible end-state instead of only
      // when the ref flipped. If the animated value ever drifts out of sync
      // (interrupted animation, navigation blur, frozen screen, remount) the
      // header used to stay off-screen forever while JS believed it was
      // shown — so taps looked like they did nothing. Starting a new timing
      // also stops any in-flight hide animation on the same value.
      Animated.timing(headerAnim, {
        toValue: 1,
        duration: 250,
        useNativeDriver: true,
      }).start();

      if (andScheduleAutoHide && !isModalOpenRef.current && !disabledRef.current) {
        hideTimerRef.current = setTimeout(() => {
          hideRef.current();
        }, autoHideDelayMs);
      }
    },
    [setTabBarVisible, headerAnim, clearTimer, autoHideDelayMs]
  );

  const showRef = useRef(show);
  showRef.current = show;

  const toggle = useCallback(() => {
    if (isChromeVisibleRef.current) {
      hideRef.current();
    } else {
      showRef.current(false);
    }
  }, []);

  const markUserScroll = useCallback(() => {
    lastUserScrollAtRef.current = Date.now();
  }, []);

  const hideOnUserScroll = useCallback(() => {
    if (Date.now() - lastUserScrollAtRef.current > 1200) return;
    hideRef.current();
  }, []);

  // When a modal or bottom sheet opens, keep chrome shown and prevent auto-hiding
  useEffect(() => {
    if (isModalOpen) {
      clearTimer();
      if (!isChromeVisibleRef.current) {
        showRef.current(false);
      }
    }
  }, [isModalOpen, clearTimer]);

  // Focus and blur lifecycle
  useEffect(() => {
    const unsubFocus = navigation.addListener('focus', () => {
      showRef.current(true);
    });

    const unsubBlur = navigation.addListener('blur', () => {
      clearTimer();
      isChromeVisibleRef.current = true;
      setIsShown(true);
      setTabBarVisible(true);
      // setValue also stops any in-flight (native) hide animation.
      headerAnim.setValue(1);
    });

    // Mount auto-hide timer
    showRef.current(true);

    return () => {
      unsubFocus();
      unsubBlur();
      clearTimer();
      setTabBarVisible(true);
    };
  }, [navigation, clearTimer, setTabBarVisible, headerAnim]);

  const headerOpacity = headerAnim.interpolate({
    inputRange: [0, 0.4, 1],
    outputRange: [0, 0, 1],
  });

  return {
    isShown,
    show,
    hide,
    toggle,
    headerAnim,
    headerOpacity,
    clearTimer,
    markUserScroll,
    hideOnUserScroll,
  };
}
