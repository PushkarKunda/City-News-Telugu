import React, { useEffect, useRef } from 'react';
import { View, Text, StyleSheet, Animated, Easing, Image } from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useRouter } from 'expo-router';
import { useAuthStore } from '@/store/authStore';
import { Spacing, BorderRadius, Shadows } from '@/constants/Spacing';
import { Colors } from '@/constants/Colors';
import { useAppColorScheme } from '@/hooks/useAppColorScheme';

export default function SplashScreen() {
  const colorScheme = useAppColorScheme();
  const colors = Colors[colorScheme ?? 'light'];
  const isDark = colorScheme === 'dark';
  const router = useRouter();

  // Intro branding animations
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const scaleAnim = useRef(new Animated.Value(0.82)).current;
  const textRevealAnim = useRef(new Animated.Value(0)).current;

  // Infinite spinner rotation
  const spinAnim = useRef(new Animated.Value(0)).current;

  // Breathing subtext pulse
  const pulseAnim = useRef(new Animated.Value(0.5)).current;

  useEffect(() => {
    // 1. Trigger intro branding animations in a faster, snappier sequence
    Animated.parallel([
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 500,
        useNativeDriver: true,
      }),
      Animated.spring(scaleAnim, {
        toValue: 1,
        friction: 6,
        tension: 40,
        useNativeDriver: true,
      }),
      Animated.sequence([
        Animated.delay(200),
        Animated.timing(textRevealAnim, {
          toValue: 1,
          duration: 400,
          useNativeDriver: true,
        }),
      ]),
    ]).start();

    // 2. Infinite circular rotation for spinner
    Animated.loop(
      Animated.timing(spinAnim, {
        toValue: 1,
        duration: 1000,
        easing: Easing.linear,
        useNativeDriver: true,
      })
    ).start();

    // 3. Infinite breathing pulse for loading subtitle
    Animated.loop(
      Animated.sequence([
        Animated.timing(pulseAnim, {
          toValue: 1,
          duration: 900,
          easing: Easing.inOut(Easing.quad),
          useNativeDriver: true,
        }),
        Animated.timing(pulseAnim, {
          toValue: 0.5,
          duration: 900,
          easing: Easing.inOut(Easing.quad),
          useNativeDriver: true,
        }),
      ])
    ).start();

    // 4. Authentication state check and routing after snappier delay of 1.0s (was 2.8s)
    const timer = setTimeout(() => {
      const { isAuthenticated, isOnboarded, pendingPhone, pendingVerificationId } = useAuthStore.getState();
      if (isAuthenticated && isOnboarded) {
        router.replace('/(tabs)');
      } else if (isAuthenticated) {
        router.replace('/(onboarding)/language');
      } else if (pendingPhone && pendingVerificationId) {
        router.replace({
          pathname: '/(auth)/verify-otp',
          params: { phone: pendingPhone },
        });
      } else {
        router.replace('/(auth)/login');
      }
    }, 1000);

    return () => clearTimeout(timer);
  }, []);

  // Map 0-1 values to rotational degree
  const spin = spinAnim.interpolate({
    inputRange: [0, 1],
    outputRange: ['0deg', '360deg'],
  });

  return (
    <LinearGradient
      colors={['#F8F9FF', '#E5EEFF', '#F0F7FF', '#F8F9FF']}
      start={{ x: 0, y: 0 }}
      end={{ x: 1, y: 1 }}
      style={styles.container}
    >
      <StatusBar style="dark" translucent backgroundColor="transparent" />

      {/* Background Decorative Blurs */}
      <View style={styles.topLeftBlur} />
      <View style={styles.bottomRightBlur} />

      {/* Main Content Area */}
      <View style={styles.content}>
        <Animated.View 
          style={[
            styles.brandingContainer,
            {
              opacity: fadeAnim,
              transform: [{ scale: scaleAnim }],
            },
          ]}
        >
          {/* Logo Card with Scale-up, Fade-in & Shadow */}
          <View style={styles.logoContainer}>
            <Image 
              source={require('../assets/logo.png')} 
              style={styles.logoImage} 
              resizeMode="contain" 
            />
          </View>

          {/* App Name/Headline */}
          <Animated.View style={[styles.textContainer, { opacity: textRevealAnim }]}>
            <Text style={styles.appName}>HyperLocal</Text>
            <Text style={styles.subtitle}>SECURE SOLUTIONS</Text>
          </Animated.View>
        </Animated.View>
      </View>

      {/* Bottom Loading Indicator Stack */}
      <View style={styles.footer}>
        <View style={styles.spinnerContainer}>
          <Animated.View style={[styles.spinner, { transform: [{ rotate: spin }] }]}>
            <View style={styles.spinnerArc} />
          </Animated.View>
          
          <Animated.Text style={[styles.loadingText, { opacity: pulseAnim }]}>
            INITIALISING SECURITY
          </Animated.Text>
        </View>

        {/* Minimal iOS/Android home layout spacer */}
        <View style={styles.homeIndicator} />
      </View>
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    position: 'relative',
    overflow: 'hidden',
  },
  topLeftBlur: {
    position: 'absolute',
    top: -64,
    left: -64,
    width: 256,
    height: 256,
    borderRadius: 128,
    backgroundColor: 'rgba(70, 72, 212, 0.12)',
  },
  bottomRightBlur: {
    position: 'absolute',
    bottom: 60,
    right: -96,
    width: 320,
    height: 320,
    borderRadius: 160,
    backgroundColor: 'rgba(0, 106, 97, 0.08)',
  },
  content: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: Spacing.lg,
  },
  brandingContainer: {
    alignItems: 'center',
  },
  logoContainer: {
    width: 140,
    height: 140,
    borderRadius: 28,
    backgroundColor: '#FFFFFF',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: Spacing.lg,
    shadowColor: '#4648D4',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.15,
    shadowRadius: 16,
    elevation: 8,
    padding: 10,
  },
  logoImage: {
    width: '100%',
    height: '100%',
    borderRadius: 20,
  },
  textContainer: {
    alignItems: 'center',
  },
  appName: {
    fontSize: 32,
    fontWeight: '800',
    color: '#4648D4',
    fontFamily: 'Poppins_700Bold',
    letterSpacing: -0.8,
    marginBottom: 4,
    textAlign: 'center',
  },
  subtitle: {
    fontSize: 12,
    fontWeight: '700',
    color: '#767586',
    fontFamily: 'Poppins_600SemiBold',
    letterSpacing: 1.2,
    textAlign: 'center',
  },
  footer: {
    paddingBottom: Spacing.xl,
    alignItems: 'center',
  },
  spinnerContainer: {
    alignItems: 'center',
    marginBottom: Spacing.xl,
  },
  spinner: {
    width: 32,
    height: 32,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: Spacing.md,
  },
  spinnerArc: {
    width: '100%',
    height: '100%',
    borderRadius: 16,
    borderWidth: 2.5,
    borderColor: '#4648D4',
    borderTopColor: 'transparent',
  },
  loadingText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#464554',
    fontFamily: 'Poppins_600SemiBold',
    letterSpacing: 1.65,
    textAlign: 'center',
  },
  homeIndicator: {
    width: 134,
    height: 5,
    borderRadius: 100,
    backgroundColor: 'rgba(0, 0, 0, 0.1)',
  },
});