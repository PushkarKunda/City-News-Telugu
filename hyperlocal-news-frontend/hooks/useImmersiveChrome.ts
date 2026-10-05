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
    if (!isChromeVisibleRef.current) return;
    if (isModalOpenRef.current || disabledRef.current) return;
    clearTimer();

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

      if (!isChromeVisibleRef.current) {
        isChromeVisibleRef.current = true;
        setIsShown(true);
        setTabBarVisible(true);

        Animated.timing(headerAnim, {
          toValue: 1,
          duration: 250,
          useNativeDriver: true,
        }).start();
      }

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
  };
}
