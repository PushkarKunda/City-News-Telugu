import React, { useState, useRef, useEffect } from 'react';
import {
  View, Text, StyleSheet, ScrollView, Animated,
  Platform, BackHandler, Alert,
} from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { Colors } from '@/constants/Colors';
import { useAppColorScheme } from '@/hooks/useAppColorScheme';
import { useAuthStore } from '@/store/authStore';

export default function SetupFeedScreen() {
  const router = useRouter();
  const colorScheme = useAppColorScheme();
  const colors = Colors[colorScheme ?? 'light'];
  const isDark = colorScheme === 'dark';

  const { completeOnboarding, user } = useAuthStore();

  const fadeAnim = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(30)).current;
  const pulseAnim = useRef(new Animated.Value(1)).current;

  const [isProcessing, setIsProcessing] = useState(false);

  // ✅ Prevent back during setup
  useEffect(() => {
    const handler = BackHandler.addEventListener('hardwareBackPress', () => true);
    return () => handler.remove();
  }, []);

  // ✅ Entry animations
  useEffect(() => {
    Animated.parallel([
      Animated.timing(fadeAnim, { toValue: 1, duration: 600, useNativeDriver: true }),
      Animated.spring(slideAnim, { toValue: 0, tension: 50, friction: 8, useNativeDriver: true }),
    ]).start();

    const pulseLoop = Animated.loop(
      Animated.sequence([
        Animated.timing(pulseAnim, { toValue: 1.05, duration: 1000, useNativeDriver: true }),
        Animated.timing(pulseAnim, { toValue: 1, duration: 1000, useNativeDriver: true }),
      ])
    );
    pulseLoop.start();
    return () => pulseLoop.stop();
  }, []);

  // ✅ This is where completeOnboarding is called
  // It syncs everything to backend and marks onboarding done
  const handleFinishSetup = async () => {
    if (isProcessing) return;
    setIsProcessing(true);
    try {
      await completeOnboarding();
      router.replace('/(onboarding)/complete');
    } catch (error: any) {
      console.error('[SetupFeed] completeOnboarding failed:', error);
      Alert.alert(
        'Setup Failed',
        error.message || 'Could not complete setup. Please try again.',
        [{ text: 'Retry', onPress: () => setIsProcessing(false) }]
      );
    }
  };

  // ✅ Auto-trigger after animations settle
  useEffect(() => {
    const timer = setTimeout(() => {
      handleFinishSetup();
    }, 2500);
    return () => clearTimeout(timer);
  }, []);

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]}>
      <StatusBar style={isDark ? 'light' : 'dark'} />

      <View style={[styles.gradientBlur1, { backgroundColor: isDark ? 'rgba(70,72,212,0.08)' : 'rgba(70,72,212,0.04)' }]} />
      <View style={[styles.gradientBlur2, { backgroundColor: isDark ? 'rgba(0,106,97,0.08)' : 'rgba(0,106,97,0.04)' }]} />

      <ScrollView style={styles.scrollView} contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        <Animated.View style={{ opacity: fadeAnim, transform: [{ translateY: slideAnim }] }}>

          {/* Hero Icon */}
          <Animated.View style={[styles.heroIconContainer, {
            backgroundColor: isDark ? 'rgba(70,72,212,0.12)' : 'rgba(70,72,212,0.08)',
            transform: [{ scale: pulseAnim }],
          }]}>
            <Ionicons name="newspaper-outline" size={80} color={colors.primary} />
          </Animated.View>

          <Text style={[styles.mainTitle, { color: colors.text }]}>Setting up your feed</Text>
          <Text style={[styles.subtitle, { color: colors.textSecondary }]}>
            Hang tight! We're personalizing your news experience based on your preferences.
          </Text>

          {/* Summary Cards */}
          <View style={styles.cardsContainer}>
            {/* Language */}
            <View style={[styles.setupCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
              <View style={[styles.cardIconContainer, { backgroundColor: isDark ? 'rgba(70,72,212,0.12)' : 'rgba(70,72,212,0.08)' }]}>
                <Ionicons name="language-outline" size={24} color={colors.primary} />
              </View>
              <View style={styles.cardContent}>
                <Text style={[styles.cardTitle, { color: colors.text }]}>Language</Text>
                <Text style={[styles.cardValue, { color: colors.textSecondary }]}>
                  {user?.language || 'English'}
                </Text>
              </View>
              <Ionicons name="checkmark-circle" size={24} color="#10B981" />
            </View>

            {/* Location */}
            <View style={[styles.setupCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
              <View style={[styles.cardIconContainer, { backgroundColor: isDark ? 'rgba(0,106,97,0.12)' : 'rgba(0,106,97,0.08)' }]}>
                <Ionicons name="location-outline" size={24} color="#006A61" />
              </View>
              <View style={styles.cardContent}>
                <Text style={[styles.cardTitle, { color: colors.text }]}>Location</Text>
                <Text style={[styles.cardValue, { color: colors.textSecondary }]}>
                  {[user?.district, user?.state].filter(Boolean).join(', ') || 'Not set'}
                </Text>
              </View>
              <Ionicons name="checkmark-circle" size={24} color="#10B981" />
            </View>

            {/* Interests */}
            <View style={[styles.setupCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
              <View style={[styles.cardIconContainer, { backgroundColor: isDark ? 'rgba(225,29,72,0.12)' : 'rgba(225,29,72,0.08)' }]}>
                <Ionicons name="heart-outline" size={24} color="#E11D48" />
              </View>
              <View style={styles.cardContent}>
                <Text style={[styles.cardTitle, { color: colors.text }]}>Interests</Text>
                <Text style={[styles.cardValue, { color: colors.textSecondary }]}>
                  {user?.interests?.length
                    ? `${user.interests.length} topics selected`
                    : 'Not set'}
                </Text>
              </View>
              <Ionicons name="checkmark-circle" size={24} color="#10B981" />
            </View>
          </View>

          {/* Loading Bar */}
          <View style={styles.loadingContainer}>
            <View style={[styles.loadingBar, { backgroundColor: colors.border }]}>
              <View style={[styles.loadingProgress, { backgroundColor: colors.primary }]} />
            </View>
            <Text style={[styles.loadingText, { color: colors.textSecondary }]}>
              {isProcessing ? 'Finalizing...' : 'Almost there...'}
            </Text>
          </View>

          {/* Info Box */}
          <View style={[styles.infoBox, {
            backgroundColor: isDark ? 'rgba(70,72,212,0.08)' : 'rgba(70,72,212,0.05)',
            borderColor: isDark ? 'rgba(70,72,212,0.2)' : 'rgba(70,72,212,0.15)',
          }]}>
            <Ionicons name="information-circle-outline" size={20} color={colors.primary} />
            <Text style={[styles.infoText, { color: colors.textSecondary }]}>
              You can change these preferences anytime from your profile settings.
            </Text>
          </View>
        </Animated.View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  gradientBlur1: { position: 'absolute', top: -100, right: -100, width: 300, height: 300, borderRadius: 150, zIndex: -1 },
  gradientBlur2: { position: 'absolute', bottom: -100, left: -100, width: 300, height: 300, borderRadius: 150, zIndex: -1 },
  scrollView: { flex: 1 },
  scrollContent: { flexGrow: 1, paddingHorizontal: 20, paddingTop: 60, paddingBottom: 40, alignItems: 'center', justifyContent: 'center' },
  heroIconContainer: {
    width: 160, height: 160, borderRadius: 80, alignItems: 'center', justifyContent: 'center',
    alignSelf: 'center', marginBottom: 32,
    ...Platform.select({
      ios: { shadowColor: '#4648D4', shadowOffset: { width: 0, height: 12 }, shadowOpacity: 0.15, shadowRadius: 24 },
      android: { elevation: 8 },
    }),
  },
  mainTitle: { fontSize: 32, fontWeight: '700', fontFamily: 'Poppins_700Bold', letterSpacing: -0.64, textAlign: 'center', marginBottom: 12 },
  subtitle: { fontSize: 16, fontFamily: 'Poppins_400Regular', lineHeight: 24, textAlign: 'center', marginBottom: 40, paddingHorizontal: 20 },
  cardsContainer: { width: '100%', gap: 16, marginBottom: 32 },
  setupCard: {
    flexDirection: 'row', alignItems: 'center', padding: 16, borderRadius: 16, borderWidth: 1, gap: 12,
    ...Platform.select({
      ios: { shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.05, shadowRadius: 8 },
      android: { elevation: 2 },
    }),
  },
  cardIconContainer: { width: 48, height: 48, borderRadius: 24, alignItems: 'center', justifyContent: 'center' },
  cardContent: { flex: 1 },
  cardTitle: { fontSize: 14, fontWeight: '600', fontFamily: 'Poppins_600SemiBold', marginBottom: 2 },
  cardValue: { fontSize: 13, fontFamily: 'Poppins_400Regular' },
  loadingContainer: { width: '100%', alignItems: 'center', marginBottom: 24 },
  loadingBar: { width: '100%', height: 6, borderRadius: 3, overflow: 'hidden', marginBottom: 12 },
  loadingProgress: { height: '100%', borderRadius: 3, width: '100%' },
  loadingText: { fontSize: 14, fontWeight: '500', fontFamily: 'Poppins_500Medium' },
  infoBox: { flexDirection: 'row', alignItems: 'center', padding: 16, borderRadius: 12, borderWidth: 1, gap: 12, width: '100%' },
  infoText: { flex: 1, fontSize: 13, fontFamily: 'Poppins_400Regular', lineHeight: 18 },
});