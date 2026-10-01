import React, { useEffect, useRef, useState, useCallback } from 'react';
import {
  Animated,
  Text,
  StyleSheet,
  TouchableOpacity,
  Platform,
} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Ionicons } from '@expo/vector-icons';
import { TELUGU_FONT_STACK } from '@/constants/Typography';

const SWIPE_HINT_STORAGE_KEY = '@city_news_swipe_hint_seen';

interface SwipeHintProps {
  /** If provided, when this becomes true the hint is immediately dismissed (e.g. on first swipe) */
  dismissTrigger?: boolean;
  bottomOffset?: number;
}

export const SwipeHint = React.memo(({ dismissTrigger, bottomOffset = 76 }: SwipeHintProps) => {
  const [isVisible, setIsVisible] = useState(false);
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const bounceAnim = useRef(new Animated.Value(0)).current;
  const isDismissedRef = useRef(false);
  const timerRef = useRef<NodeJS.Timeout | null>(null);

  const dismiss = useCallback(async () => {
    if (isDismissedRef.current) return;
    isDismissedRef.current = true;

    if (timerRef.current) {
      clearTimeout(timerRef.current);
      timerRef.current = null;
    }

    Animated.timing(fadeAnim, {
      toValue: 0,
      duration: 350,
      useNativeDriver: true,
    }).start(() => {
      setIsVisible(false);
    });

    try {
      await AsyncStorage.setItem(SWIPE_HINT_STORAGE_KEY, 'true');
    } catch (_) {}
  }, [fadeAnim]);

  // Check storage on mount
  useEffect(() => {
    let mounted = true;

    AsyncStorage.getItem(SWIPE_HINT_STORAGE_KEY)
      .then((val) => {
        if (!mounted) return;
        if (!val) {
          // First launch - show hint
          setIsVisible(true);

          // Fade in
          Animated.timing(fadeAnim, {
            toValue: 1,
            duration: 400,
            useNativeDriver: true,
          }).start();

          // Continuous gentle upwards bounce
          Animated.loop(
            Animated.sequence([
              Animated.timing(bounceAnim, {
                toValue: -5,
                duration: 650,
                useNativeDriver: true,
              }),
              Animated.timing(bounceAnim, {
                toValue: 0,
                duration: 650,
                useNativeDriver: true,
              }),
            ])
          ).start();

          // Auto-fade out after 3 seconds
          timerRef.current = setTimeout(() => {
            if (mounted) dismiss();
          }, 3000);
        }
      })
      .catch(() => {});

    return () => {
      mounted = false;
      if (timerRef.current) {
        clearTimeout(timerRef.current);
      }
    };
  }, [fadeAnim, bounceAnim, dismiss]);

  // If external dismiss trigger fires (e.g. after first swipe)
  useEffect(() => {
    if (dismissTrigger && isVisible) {
      dismiss();
    }
  }, [dismissTrigger, isVisible, dismiss]);

  if (!isVisible) return null;

  return (
    <Animated.View
      style={[
        styles.container,
        {
          bottom: bottomOffset,
          opacity: fadeAnim,
        },
      ]}
      pointerEvents="box-none"
    >
      <TouchableOpacity
        style={styles.pill}
        activeOpacity={0.9}
        onPress={dismiss}
        accessibilityRole="button"
        accessibilityLabel="Swipe up for next news"
      >
        <Animated.View style={{ transform: [{ translateY: bounceAnim }] }}>
          <Ionicons name="arrow-up" size={13} color="#A5B4FC" />
        </Animated.View>
        <Text style={styles.text}>
          Swipe up for next <Text style={styles.teluguText}>· పైకి స్వైప్ చేయండి</Text>
        </Text>
      </TouchableOpacity>
    </Animated.View>
  );
});

const styles = StyleSheet.create({
  container: {
    position: 'absolute',
    left: 0,
    right: 0,
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 10,
  },
  pill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: 'rgba(15, 23, 42, 0.88)',
    paddingVertical: 7,
    paddingHorizontal: 14,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.16)',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 6,
    elevation: 4,
  },
  text: {
    color: '#FFFFFF',
    fontSize: 11,
    fontFamily: 'Poppins_600SemiBold',
    fontWeight: '600',
    letterSpacing: 0.2,
  },
  teluguText: {
    fontFamily: TELUGU_FONT_STACK.regular,
    fontSize: 11,
    color: '#CBD5E1',
  },
});
