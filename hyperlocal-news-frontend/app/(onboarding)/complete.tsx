import React, { useEffect, useRef } from 'react';
import {
  View, Text, StyleSheet, Pressable, Animated,
  BackHandler, ActivityIndicator,
} from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { MaterialIcons, Ionicons } from '@expo/vector-icons';
import { useRouter, useNavigation } from 'expo-router';
import { Colors } from '@/constants/Colors';
import { useAuthStore } from '@/store/authStore';
import { useAppColorScheme } from '@/hooks/useAppColorScheme';
import { useState } from 'react';

export default function CompleteScreen() {
  const colorScheme = useAppColorScheme();
  const colors = Colors[colorScheme ?? 'light'];
  const isDark = colorScheme === 'dark';
  const router = useRouter();
  const navigation = useNavigation();
  const { user } = useAuthStore();

  const [isNavigating, setIsNavigating] = useState(false);

  // ─── Animations ────────────────────────────────────────────────────────────

  const scaleAnim = useRef(new Animated.Value(0)).current;
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(50)).current;
  const buttonScale = useRef(new Animated.Value(1)).current;

  // Block hardware back
  useEffect(() => {
    const handler = BackHandler.addEventListener('hardwareBackPress', () => {
      BackHandler.exitApp();
      return true;
    });
    return () => handler.remove();
  }, []);

  // Entry animations
  useEffect(() => {
    Animated.sequence([
      Animated.spring(scaleAnim, { toValue: 1, tension: 50, friction: 7, useNativeDriver: true }),
      Animated.parallel([
        Animated.timing(fadeAnim, { toValue: 1, duration: 400, useNativeDriver: true }),
        Animated.timing(slideAnim, { toValue: 0, duration: 400, useNativeDriver: true }),
      ]),
    ]).start();
  }, []);

  // Navigate to main app - reset navigation stack
  const handleStartReading = () => {
    if (isNavigating) return;
    setIsNavigating(true);
    try {
      (navigation as any).reset({ index: 0, routes: [{ name: '(tabs)' }] });
    } catch {
      router.replace('/(tabs)');
    }
  };

  // Summary built from authStore user (already populated during onboarding)
  const summaryItems = [
    {
      icon: 'language' as const,
      label: 'Language',
      value: user?.language || 'English',
    },
    {
      icon: 'place' as const,
      label: 'Location',
      value: [user?.district, user?.state].filter(Boolean).join(', ') || 'Not set',
    },
    {
      icon: 'bookmark-border' as const,
      label: 'Interests',
      value: `${user?.interests?.length ?? 0} Topic${(user?.interests?.length ?? 0) !== 1 ? 's' : ''} Selected`,
    },
  ];

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <StatusBar style={isDark ? 'light' : 'dark'} />

      {/* Background blurs */}
      <View style={[styles.gradientBlur1, { backgroundColor: isDark ? 'rgba(70,72,212,0.1)' : 'rgba(70,72,212,0.05)' }]} />
      <View style={[styles.gradientBlur2, { backgroundColor: isDark ? 'rgba(0,106,97,0.1)' : 'rgba(0,106,97,0.05)' }]} />

      {/* Success Icon Section */}
      <View style={styles.successSection}>
        {/* Confetti */}
        <View style={styles.confettiContainer}>
          <View style={[styles.confetti, styles.confetti1, { backgroundColor: colors.primary }]} />
          <View style={[styles.confetti, styles.confetti2, { backgroundColor: '#F472B6' }]} />
          <View style={[styles.confetti, styles.confetti3, { backgroundColor: '#FBBF24' }]} />
          <View style={[styles.confetti, styles.confetti4, { backgroundColor: '#34D399' }]} />
          <View style={[styles.confetti, styles.confetti5, { backgroundColor: colors.primary + '66' }]} />
        </View>

        <Animated.View style={[styles.successIconOuter, { backgroundColor: colors.primaryLight, transform: [{ scale: scaleAnim }] }]}>
          <View style={[styles.successIconInner, { backgroundColor: colors.primary }]}>
            <MaterialIcons name="check" size={48} color="#FFF" />
          </View>
        </Animated.View>
      </View>

      {/* Title */}
      <Animated.View style={[styles.titleSection, { opacity: fadeAnim, transform: [{ translateY: slideAnim }] }]}>
        <Text style={[styles.title, { color: colors.text }]}>You're All Set!</Text>
        <Text style={[styles.subtitle, { color: colors.textSecondary }]}>
          Start exploring local news personalized for you
        </Text>
      </Animated.View>

      {/* Summary Card */}
      <Animated.View style={[styles.summaryCard, { backgroundColor: colors.card, borderColor: colors.border, opacity: fadeAnim, transform: [{ translateY: slideAnim }] }]}>
        {summaryItems.map((item, index) => (
          <View
            key={item.label}
            style={[
              styles.summaryRow,
              index < summaryItems.length - 1 && styles.summaryRowBorder,
              index < summaryItems.length - 1 && { borderBottomColor: 'rgba(70,72,212,0.1)' },
            ]}
          >
            <View style={styles.summaryIcon}>
              <MaterialIcons name={item.icon} size={20} color={colors.primary} />
            </View>
            <View style={styles.summaryText}>
              <Text style={[styles.summaryLabel, { color: colors.textTertiary }]}>
                {item.label.toUpperCase()}
              </Text>
              <Text style={[styles.summaryValue, { color: colors.text }]}>{item.value}</Text>
            </View>
          </View>
        ))}
      </Animated.View>

      <View style={styles.spacer} />

      {/* Footer */}
      <View style={styles.footer}>
        <Pressable
          style={{ width: '100%' }}
          onPress={handleStartReading}
          onPressIn={() => Animated.spring(buttonScale, { toValue: 0.94, useNativeDriver: true, tension: 180, friction: 12 }).start()}
          onPressOut={() => Animated.spring(buttonScale, { toValue: 1, useNativeDriver: true, tension: 180, friction: 12 }).start()}
          disabled={isNavigating}
        >
          <Animated.View style={[styles.startButton, { backgroundColor: colors.primary, transform: [{ scale: buttonScale }] }, isNavigating && { opacity: 0.7 }]}>
            {isNavigating
              ? <ActivityIndicator color="#FFF" />
              : <Text style={styles.startButtonText}>Start Reading</Text>
            }
          </Animated.View>
        </Pressable>

        <Text style={[styles.versionText, { color: colors.textTertiary }]}>
          HyperLocal News v2.4
        </Text>
      </View>

      {/* Home Indicator */}
      <View style={styles.homeIndicatorContainer}>
        <View style={[styles.homeIndicator, { backgroundColor: isDark ? colors.border : colors.divider }]} />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  gradientBlur1: { position: 'absolute', top: -150, right: -150, width: 400, height: 400, borderRadius: 200, zIndex: -1 },
  gradientBlur2: { position: 'absolute', bottom: -150, left: -150, width: 400, height: 400, borderRadius: 200, zIndex: -1 },
  successSection: { alignItems: 'center', justifyContent: 'center', paddingTop: 60, paddingBottom: 24, position: 'relative' },
  confettiContainer: { position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, opacity: 0.3 },
  confetti: { position: 'absolute', width: 8, height: 8, borderRadius: 2 },
  confetti1: { top: 40, left: 60, transform: [{ rotate: '12deg' }] },
  confetti2: { top: 80, right: 40, transform: [{ rotate: '-12deg' }] },
  confetti3: { bottom: 40, left: 40, transform: [{ rotate: '45deg' }] },
  confetti4: { top: 120, right: 80, transform: [{ rotate: '12deg' }] },
  confetti5: { bottom: 80, right: 100, transform: [{ rotate: '-45deg' }] },
  successIconOuter: { padding: 20, borderRadius: 9999 },
  successIconInner: { width: 80, height: 80, borderRadius: 9999, justifyContent: 'center', alignItems: 'center' },
  titleSection: { alignItems: 'center', paddingHorizontal: 24 },
  title: { fontSize: 28, fontWeight: '700', fontFamily: 'Poppins_700Bold', marginBottom: 8 },
  subtitle: { fontSize: 18, fontFamily: 'Poppins_400Regular', textAlign: 'center', lineHeight: 26 },
  summaryCard: {
    marginHorizontal: 24, marginTop: 32, borderRadius: 20, borderWidth: 1.5, padding: 16,
    shadowColor: '#4648D4', shadowOffset: { width: 0, height: 12 }, shadowOpacity: 0.06, shadowRadius: 24, elevation: 3,
  },
  summaryRow: { flexDirection: 'row', alignItems: 'center', paddingVertical: 12 },
  summaryRowBorder: { borderBottomWidth: 1.5 },
  summaryIcon: { width: 42, height: 42, borderRadius: 12, justifyContent: 'center', alignItems: 'center', marginRight: 12, backgroundColor: 'rgba(70,72,212,0.08)', borderWidth: 1, borderColor: 'rgba(70,72,212,0.1)' },
  summaryText: { flex: 1 },
  summaryLabel: { fontSize: 11, fontWeight: '500', fontFamily: 'Poppins_500Medium', letterSpacing: 1, marginBottom: 2 },
  summaryValue: { fontSize: 16, fontWeight: '600', fontFamily: 'Poppins_600SemiBold' },
  spacer: { flex: 1 },
  footer: { paddingHorizontal: 24, paddingBottom: 16, alignItems: 'center' },
  startButton: { height: 56, borderRadius: 20, justifyContent: 'center', alignItems: 'center', width: '100%', shadowColor: '#4648D4', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.3, shadowRadius: 12, elevation: 4 },
  startButtonText: { color: '#FFF', fontSize: 16, fontWeight: '700', fontFamily: 'Poppins_700Bold' },
  versionText: { fontSize: 12, fontWeight: '500', fontFamily: 'Poppins_500Medium', marginTop: 12 },
  homeIndicatorContainer: { paddingBottom: 8, alignItems: 'center' },
  homeIndicator: { width: 128, height: 6, borderRadius: 100 },
});