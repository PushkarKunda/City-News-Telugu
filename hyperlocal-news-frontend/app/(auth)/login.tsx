import React, { useState, useRef, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  Animated,
  Pressable,
  Alert,
  Image,
  useWindowDimensions,
  ActivityIndicator,
} from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { Feather, Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useAuthStore } from '@/store/authStore';
import { Colors } from '@/constants/Colors';
import { useAppColorScheme } from '@/hooks/useAppColorScheme';
import { useGoogleFirebaseAuth } from '@/hooks/useGoogleFirebaseAuth';

const COUNTRY_CODES = [
  { code: '+91', country: 'IN', flag: '🇮🇳' },
];

export default function LoginScreen() {
  const router = useRouter();
  const colorScheme = useAppColorScheme();
  const colors = Colors[colorScheme ?? 'light'];
  const isDark = colorScheme === 'dark';
  const { width } = useWindowDimensions();
  const heroCardHeight = Math.min(Math.max(width * 0.46, 160), 220);

  // ✅ Only from store - no duplicate useState for isLoading
  const { sendPhoneOTP, isLoading, fetchUser } = useAuthStore();
  const [isDemoLoading, setIsDemoLoading] = useState(false);
  const {
    signInWithGoogle,
    isGoogleReady,
    isGoogleLoading,
  } = useGoogleFirebaseAuth({
    onSuccess: (response) => {
      const isNew = response.user?.is_new_user ?? (response as any).is_new_user ?? false;
      router.replace(isNew ? '/(onboarding)/language' : '/(tabs)');
    },
    onError: (error: any) => {
      if (error.code === 'SIGN_IN_CANCELLED' || error.message?.includes('cancelled')) return; // silent cancel
      Alert.alert('Google Sign-In', error.message || 'Please try again.');
    },
  });

  const [phoneNumber, setPhoneNumber] = useState('');
  const [selectedCountry, setSelectedCountry] = useState(COUNTRY_CODES[0]);
  const [showCountryPicker, setShowCountryPicker] = useState(false);

  // Animated values
  const primaryButtonScale = useRef(new Animated.Value(1)).current;
  const pickerDropdownOpacity = useRef(new Animated.Value(0)).current;
  const sweepRotation = useRef(new Animated.Value(0)).current;
  const ring1Rotation = useRef(new Animated.Value(0)).current;
  const ring2Rotation = useRef(new Animated.Value(0)).current;
  const ping1 = useRef(new Animated.Value(0)).current;
  const ping2 = useRef(new Animated.Value(0)).current;
  const ping3 = useRef(new Animated.Value(0)).current;
  const ping4 = useRef(new Animated.Value(0)).current;
  const ping5 = useRef(new Animated.Value(0)).current;
  const centerPulse = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    Animated.loop(
      Animated.timing(sweepRotation, { toValue: 1, duration: 2400, useNativeDriver: true })
    ).start();
    Animated.loop(
      Animated.timing(ring1Rotation, { toValue: 1, duration: 8000, useNativeDriver: true })
    ).start();
    Animated.loop(
      Animated.timing(ring2Rotation, { toValue: -1, duration: 12000, useNativeDriver: true })
    ).start();
    Animated.loop(
      Animated.sequence([
        Animated.timing(centerPulse, { toValue: 1.12, duration: 900, useNativeDriver: true }),
        Animated.timing(centerPulse, { toValue: 1, duration: 900, useNativeDriver: true }),
      ])
    ).start();

    const makePing = (anim: Animated.Value, delay: number) =>
      setTimeout(() => {
        Animated.loop(
          Animated.sequence([
            Animated.timing(anim, { toValue: 1, duration: 400, useNativeDriver: true }),
            Animated.delay(900),
            Animated.timing(anim, { toValue: 0, duration: 400, useNativeDriver: true }),
            Animated.delay(1400),
          ])
        ).start();
      }, delay);

    makePing(ping1, 0);
    makePing(ping2, 700);
    makePing(ping3, 1300);
    makePing(ping4, 2000);
    makePing(ping5, 2700);
  }, []);

  const sweepDeg = sweepRotation.interpolate({
    inputRange: [0, 1],
    outputRange: ['0deg', '360deg'],
  });
  const ring1Deg = ring1Rotation.interpolate({
    inputRange: [0, 1],
    outputRange: ['0deg', '360deg'],
  });
  const ring2Deg = ring2Rotation.interpolate({
    inputRange: [-1, 0],
    outputRange: ['-360deg', '0deg'],
  });

  // ─── Handlers ──────────────────────────────────────────────────────────────

  const handlePhoneChange = (text: string, country = selectedCountry) => {
    const cleaned = text.replace(/\D/g, '');
    if (cleaned.length === 0) {
      setPhoneNumber('');
      return;
    }
    let formatted = '';
    if (country.code === '+91') {
      const limited = cleaned.slice(0, 10);
      formatted = limited.length <= 5
        ? limited
        : `${limited.slice(0, 5)} ${limited.slice(5)}`;
    } else {
      const limited = cleaned.slice(0, 10);
      if (limited.length <= 3) {
        formatted = `(${limited}`;
      } else if (limited.length <= 6) {
        formatted = `(${limited.slice(0, 3)}) ${limited.slice(3)}`;
      } else {
        formatted = `(${limited.slice(0, 3)}) ${limited.slice(3, 6)}-${limited.slice(6)}`;
      }
    }
    setPhoneNumber(formatted);
  };

  const animateButton = (value: Animated.Value, toValue: number) => {
    Animated.spring(value, {
      toValue,
      useNativeDriver: true,
      tension: 100,
      friction: 8,
    }).start();
  };

  const toggleDropdown = (show: boolean) => {
    if (show) {
      setShowCountryPicker(true);
      Animated.timing(pickerDropdownOpacity, {
        toValue: 1,
        duration: 150,
        useNativeDriver: true,
      }).start();
    } else {
      Animated.timing(pickerDropdownOpacity, {
        toValue: 0,
        duration: 120,
        useNativeDriver: true,
      }).start(() => setShowCountryPicker(false));
    }
  };

  // ✅ Single clean handleSendOTP using Firebase via store
  const handleSendOTP = async () => {
    const rawDigits = phoneNumber.replace(/\D/g, '');

    if (rawDigits.length < 10) {
      Alert.alert('Invalid Number', 'Please enter a valid 10-digit phone number.');
      return;
    }

    const fullPhone = `${selectedCountry.code}${rawDigits}`;

    try {
      await sendPhoneOTP(fullPhone); // ✅ Firebase OTP via store
      router.push({
        pathname: '/(auth)/verify-otp',
        params: { phone: fullPhone },
      });
    } catch (error: any) {
      Alert.alert('Error', error.message || 'Failed to send OTP. Please try again.');
    }
  };

  const handleDemoLogin = async () => {
    setIsDemoLoading(true);
    try {
      const user = await fetchUser();
      if (user) {
        router.replace('/(tabs)');
      } else {
        Alert.alert('Demo Login', 'Could not authenticate demo session. Please try again.');
      }
    } catch (error: any) {
      Alert.alert('Demo Login', error?.message || 'Failed to authenticate');
    } finally {
      setIsDemoLoading(false);
    }
  };

  const handleLinkPress = (type: 'terms' | 'privacy') => {
    Alert.alert(
      type === 'terms' ? 'Terms of Service' : 'Privacy Policy',
      `Redirecting to HyperLocal's ${type === 'terms' ? 'Terms of Service' : 'Privacy Policy'}...`
    );
  };

  // ─── Render ────────────────────────────────────────────────────────────────

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]}>
      <StatusBar style={isDark ? 'light' : 'dark'} />

      <View style={[styles.header, { backgroundColor: colors.background }]}>
        <Text style={[styles.headerTitle, { color: colors.text }]}>
          <Text style={{ fontFamily: 'Poppins_700Bold' }}>Hyper</Text>
          <Text style={{ fontFamily: 'Poppins_700Bold', color: isDark ? '#818CF8' : colors.primary }}>Local</Text>
          <Text style={{ color: isDark ? '#818CF8' : colors.primary, fontFamily: 'Poppins_700Bold' }}>.</Text>
        </Text>
      </View>

      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        style={styles.keyboardView}
      >
        <ScrollView
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
        >
          <View style={styles.mainContent}>

            {/* Hero Section */}
            <View style={styles.heroSection}>
              <View style={[
                styles.heroCard,
                {
                  height: heroCardHeight,
                  backgroundColor: isDark ? '#0F0F2E' : colors.card,
                  borderWidth: isDark ? 0 : 1,
                  borderColor: isDark ? 'transparent' : colors.border,
                }
              ]}>
                <View style={styles.radarBase}>
                  <View style={[styles.radarRing, styles.radarRingLg, { borderColor: isDark ? 'rgba(99,102,241,0.25)' : 'rgba(70,72,212,0.12)' }]} />
                  <View style={[styles.radarRing, styles.radarRingMd, { borderColor: isDark ? 'rgba(99,102,241,0.35)' : 'rgba(70,72,212,0.2)' }]} />
                  <View style={[styles.radarRing, styles.radarRingSm, { borderColor: isDark ? 'rgba(99,102,241,0.5)' : 'rgba(70,72,212,0.35)' }]} />
                  <View style={[styles.crossH, { backgroundColor: isDark ? 'rgba(99,102,241,0.2)' : 'rgba(70,72,212,0.1)' }]} />
                  <View style={[styles.crossV, { backgroundColor: isDark ? 'rgba(99,102,241,0.2)' : 'rgba(70,72,212,0.1)' }]} />
                  <Animated.View style={[styles.radarRing, styles.radarRingXl, { borderColor: isDark ? 'rgba(99,102,241,0.15)' : 'rgba(70,72,212,0.08)', transform: [{ rotate: ring1Deg }] }]} />
                  <Animated.View style={[styles.radarRing, styles.radarRingXl2, { borderColor: isDark ? 'rgba(139,92,246,0.2)' : 'rgba(70,72,212,0.1)', borderStyle: 'dashed', transform: [{ rotate: ring2Deg }] }]} />

                  <Animated.View style={[styles.sweepWrap, { transform: [{ rotate: sweepDeg }] }]}>
                    <View style={[styles.sweepArm, { backgroundColor: isDark ? 'rgba(99,102,241,0.9)' : 'rgba(70,72,212,0.7)' }]} />
                    <View style={[styles.sweepGlow, { backgroundColor: isDark ? 'rgba(99,102,241,0.06)' : 'rgba(70,72,212,0.06)' }]} />
                  </Animated.View>

                  <Animated.View style={[styles.ping, { top: 28, left: 52, opacity: ping1 }]}>
                    <View style={[styles.pingDot, { backgroundColor: '#34D399' }]} />
                    <View style={[styles.pingRipple, { borderColor: '#34D399' }]} />
                  </Animated.View>
                  <Animated.View style={[styles.ping, { top: 60, right: 38, opacity: ping2 }]}>
                    <View style={[styles.pingDot, { backgroundColor: '#F59E0B' }]} />
                    <View style={[styles.pingRipple, { borderColor: '#F59E0B' }]} />
                  </Animated.View>
                  <Animated.View style={[styles.ping, { bottom: 44, left: 44, opacity: ping3 }]}>
                    <View style={[styles.pingDot, { backgroundColor: colors.primary }]} />
                    <View style={[styles.pingRipple, { borderColor: colors.primary }]} />
                  </Animated.View>
                  <Animated.View style={[styles.ping, { bottom: 30, right: 56, opacity: ping4 }]}>
                    <View style={[styles.pingDot, { backgroundColor: '#F472B6' }]} />
                    <View style={[styles.pingRipple, { borderColor: '#F472B6' }]} />
                  </Animated.View>
                  <Animated.View style={[styles.ping, { top: '45%', left: 22, opacity: ping5 }]}>
                    <View style={[styles.pingDot, { backgroundColor: '#38BDF8' }]} />
                    <View style={[styles.pingRipple, { borderColor: '#38BDF8' }]} />
                  </Animated.View>

                  <Animated.View style={[styles.radarCenter, { backgroundColor: isDark ? '#FFFFFF' : colors.primaryLight, transform: [{ scale: centerPulse }] }]}>
                    <Image
                      source={require('../../assets/logo.png')}
                      style={styles.radarLogoImage}
                      resizeMode="contain"
                    />
                  </Animated.View>
                </View>

                <View style={styles.liveLabel}>
                  <View style={[styles.liveDot, { backgroundColor: '#34D399' }]} />
                  <Text style={[styles.liveLabelText, { color: isDark ? 'rgba(255,255,255,0.45)' : colors.textSecondary }]}>
                    LIVE  LOCAL  NEWS
                  </Text>
                </View>
              </View>

              <View style={styles.headingContainer}>
                <Text style={[styles.welcomeTitle, { color: colors.text }]}>Welcome</Text>
                <Text style={[styles.welcomeSubtitle, { color: colors.textSecondary }]}>
                  Log in to your account with your phone number to continue where you left off.
                </Text>
              </View>
            </View>

            {/* Form Section */}
            <View style={styles.formSection}>
              <Text style={[styles.inputLabel, { color: colors.textSecondary }]}>
                PHONE NUMBER
              </Text>

              <View style={styles.phoneInputRow}>
                <TouchableOpacity
                  style={[styles.countryPicker, { backgroundColor: isDark ? colors.surface : '#EFF4FF' }]}
                  onPress={() => toggleDropdown(!showCountryPicker)}
                  activeOpacity={0.8}
                >
                  <Text style={[styles.countryPickerText, { color: colors.text }]}>
                    {selectedCountry.flag} {selectedCountry.code}
                  </Text>
                  <Feather name="chevron-down" size={16} color={colors.text} />
                </TouchableOpacity>

                <View style={[styles.phoneInputContainer, { backgroundColor: isDark ? colors.surface : '#EFF4FF' }]}>
                  <TextInput
                    style={[styles.phoneInput, { color: colors.text }]}
                    placeholder={selectedCountry.code === '+91' ? '98765 43210' : '(555) 000-0000'}
                    placeholderTextColor={isDark ? '#464554' : '#C7C4D7'}
                    keyboardType="phone-pad"
                    maxLength={selectedCountry.code === '+91' ? 11 : 14}
                    value={phoneNumber}
                    onChangeText={(text) => handlePhoneChange(text)}
                  />
                </View>
              </View>

              {showCountryPicker && (
                <Animated.View
                  style={[
                    styles.countryDropdown,
                    { backgroundColor: colors.card, borderColor: colors.border },
                    { opacity: pickerDropdownOpacity },
                  ]}
                >
                  {COUNTRY_CODES.map((country) => (
                    <TouchableOpacity
                      key={country.code}
                      style={[
                        styles.countryOption,
                        { borderBottomColor: colors.border },
                        selectedCountry.code === country.code && { backgroundColor: colors.primaryLight },
                      ]}
                      onPress={() => {
                        setSelectedCountry(country);
                        toggleDropdown(false);
                        handlePhoneChange(phoneNumber, country);
                      }}
                    >
                      <Text style={[styles.countryOptionText, { color: colors.text }]}>
                        {country.flag} {country.country} ({country.code})
                      </Text>
                      {selectedCountry.code === country.code && (
                        <Feather name="check" size={16} color={colors.primary} />
                      )}
                    </TouchableOpacity>
                  ))}
                </Animated.View>
              )}
            </View>

            {/* Actions */}
            <View style={styles.actionsSection}>
              <Animated.View style={{ transform: [{ scale: primaryButtonScale }] }}>
                <Pressable
                  style={[
                    styles.primaryButton,
                    { backgroundColor: colors.primary },
                    isLoading && { opacity: 0.7 },
                  ]}
                  onPressIn={() => animateButton(primaryButtonScale, 0.96)}
                  onPressOut={() => animateButton(primaryButtonScale, 1)}
                  onPress={handleSendOTP}
                  disabled={isLoading}
                >
                  <Text style={styles.primaryButtonText}>
                    {isLoading ? 'Sending...' : 'Send Code'}
                  </Text>
                  {!isLoading && (
                    <Feather name="arrow-right" size={16} color="#FFF" style={styles.buttonIcon} />
                  )}
                </Pressable>
              </Animated.View>

              <View style={styles.dividerRow}>
                <View style={[styles.dividerLine, { backgroundColor: colors.border }]} />
                <Text style={[styles.dividerText, { color: colors.textSecondary }]}>OR</Text>
                <View style={[styles.dividerLine, { backgroundColor: colors.border }]} />
              </View>

              <TouchableOpacity
                style={[
                  styles.googleButton,
                  {
                    backgroundColor: colors.card,
                    borderColor: colors.border,
                  },
                  isGoogleLoading && { opacity: 0.7 },
                ]}
                onPress={signInWithGoogle}
                disabled={isGoogleLoading}
                activeOpacity={0.8}
              >
                {isGoogleLoading ? (
                  <ActivityIndicator color={colors.text} size="small" />
                ) : (
                  <>
                    <Ionicons name="logo-google" size={18} color={colors.text} />
                    <Text style={[styles.googleButtonText, { color: colors.text }]}>
                      Sign in with Google
                    </Text>
                  </>
                )}
              </TouchableOpacity>

              <TouchableOpacity
                style={[
                  styles.demoButton,
                  {
                    backgroundColor: isDark ? 'rgba(99,102,241,0.12)' : 'rgba(70,72,212,0.06)',
                    borderColor: isDark ? 'rgba(99,102,241,0.35)' : 'rgba(70,72,212,0.22)',
                  },
                  isDemoLoading && { opacity: 0.7 },
                ]}
                onPress={handleDemoLogin}
                disabled={isDemoLoading}
                activeOpacity={0.8}
              >
                {isDemoLoading ? (
                  <ActivityIndicator color={colors.primary} size="small" />
                ) : (
                  <>
                    <Feather name="zap" size={16} color={colors.primary} />
                    <Text style={[styles.demoButtonText, { color: colors.primary }]}>
                      Quick Demo Login (Pushkar Kunda)
                    </Text>
                  </>
                )}
              </TouchableOpacity>
            </View>

            {/* Footer */}
            <View style={styles.footer}>
              <Text style={[styles.footerText, { color: colors.textSecondary }]}>
                By continuing, you agree to our{' '}
                <Text
                  style={[styles.footerLink, { color: colors.primary }]}
                  onPress={() => handleLinkPress('terms')}
                >
                  Terms of Service
                </Text>
                {' and '}
                <Text
                  style={[styles.footerLink, { color: colors.primary }]}
                  onPress={() => handleLinkPress('privacy')}
                >
                  Privacy Policy
                </Text>
                .
              </Text>
            </View>

          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: {
    height: 64,
    width: '100%',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 20,
  },
  headerTitle: {
    fontSize: 21,
    fontWeight: '700',
    fontFamily: 'Poppins_700Bold',
    letterSpacing: -0.4,
    color: '#4648D4',
    textAlign: 'center',
  },
  keyboardView: { flex: 1 },
  scrollContent: { flexGrow: 1 },
  mainContent: {
    flex: 1,
    maxWidth: 448,
    alignSelf: 'center',
    width: '100%',
    paddingHorizontal: 20,
    paddingTop: 20,
    paddingBottom: 24,
  },
  heroSection: { marginBottom: 32, width: '100%' },
  heroCard: {
    width: '100%',
    borderRadius: 12,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 2,
  },
  radarBase: {
    position: 'absolute',
    top: 0, left: 0, right: 0, bottom: 0,
    alignItems: 'center',
    justifyContent: 'center',
  },
  radarRing: {
    position: 'absolute',
    borderWidth: 1,
    borderRadius: 999,
  },
  radarRingSm: { width: 64, height: 64 },
  radarRingMd: { width: 108, height: 108 },
  radarRingLg: { width: 152, height: 152 },
  radarRingXl: { width: 188, height: 188, borderWidth: 1 },
  radarRingXl2: { width: 210, height: 210, borderWidth: 1 },
  crossH: { position: 'absolute', width: 210, height: 1 },
  crossV: { position: 'absolute', width: 1, height: 192 },
  sweepWrap: {
    position: 'absolute',
    width: 192, height: 192,
    alignItems: 'center',
    justifyContent: 'center',
  },
  sweepArm: {
    position: 'absolute',
    width: 96, height: 1.5,
    left: '50%', top: '50%',
  },
  sweepGlow: {
    position: 'absolute',
    width: 60, height: 60,
    borderRadius: 30,
    right: 10, top: '50%',
    transform: [{ translateY: -30 }],
  },
  ping: {
    position: 'absolute',
    alignItems: 'center',
    justifyContent: 'center',
    width: 20, height: 20,
  },
  pingDot: {
    width: 7, height: 7,
    borderRadius: 4,
    position: 'absolute',
  },
  pingRipple: {
    width: 18, height: 18,
    borderRadius: 9,
    borderWidth: 1.5,
    position: 'absolute',
    opacity: 0.5,
  },
  radarCenter: {
    width: 44, height: 44,
    borderRadius: 22,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#6366F1',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.6,
    shadowRadius: 10,
    elevation: 8,
  },
  radarLogoImage: { width: '80%', height: '80%', borderRadius: 18 },
  liveLabel: {
    position: 'absolute',
    bottom: 10, left: 0, right: 0,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
  },
  liveDot: { width: 6, height: 6, borderRadius: 3 },
  liveLabelText: {
    fontSize: 9,
    fontWeight: '700',
    fontFamily: 'Poppins_700Bold',
    letterSpacing: 2.5,
  },
  headingContainer: { marginTop: 16, width: '100%' },
  welcomeTitle: {
    fontSize: 32,
    fontWeight: '700',
    letterSpacing: -0.64,
    lineHeight: 40,
    fontFamily: 'Poppins_700Bold',
    marginBottom: 8,
  },
  welcomeSubtitle: {
    fontSize: 16,
    lineHeight: 24,
    fontFamily: 'Poppins_400Regular',
  },
  formSection: { marginBottom: 24, width: '100%', position: 'relative' },
  inputLabel: {
    fontSize: 12,
    fontWeight: '600',
    letterSpacing: 0.6,
    marginBottom: 12,
    paddingHorizontal: 8,
    fontFamily: 'Poppins_600SemiBold',
  },
  phoneInputRow: { flexDirection: 'row', gap: 8, height: 56, width: '100%' },
  countryPicker: {
    height: 56,
    borderRadius: 8,
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    gap: 4,
    elevation: 1,
  },
  countryPickerText: {
    fontSize: 16,
    fontWeight: '500',
    fontFamily: 'Poppins_500Medium',
  },
  phoneInputContainer: {
    flex: 1,
    height: 56,
    borderRadius: 8,
    paddingHorizontal: 16,
    justifyContent: 'center',
    elevation: 1,
  },
  phoneInput: {
    fontSize: 16,
    fontFamily: 'Poppins_400Regular',
    padding: 0,
  },
  countryDropdown: {
    position: 'absolute',
    top: 84, left: 0, right: 0,
    borderRadius: 8,
    borderWidth: 1,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 4,
    zIndex: 999,
    overflow: 'hidden',
  },
  countryOption: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 14,
    paddingHorizontal: 16,
    borderBottomWidth: 1,
  },
  countryOptionText: {
    fontSize: 15,
    fontWeight: '500',
    fontFamily: 'Poppins_500Medium',
  },
  actionsSection: { width: '100%', gap: 16, marginBottom: 32 },
  primaryButton: {
    height: 56,
    borderRadius: 28,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    shadowColor: '#4648D4',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 6,
    elevation: 4,
  },
  primaryButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
    fontFamily: 'Poppins_600SemiBold',
  },
  buttonIcon: { marginTop: 1 },
  googleButton: {
    height: 56,
    borderRadius: 28,
    borderWidth: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  googleButtonText: {
    fontSize: 16,
    fontWeight: '600',
    fontFamily: 'Poppins_600SemiBold',
  },
  demoButton: {
    height: 50,
    borderRadius: 25,
    borderWidth: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    marginTop: 4,
  },
  demoButtonText: {
    fontSize: 14,
    fontWeight: '600',
    fontFamily: 'Poppins_600SemiBold',
  },
  dividerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginVertical: 4,
    gap: 12,
  },
  dividerLine: {
    flex: 1,
    height: 1,
  },
  dividerText: {
    fontSize: 14,
    fontWeight: '600',
    fontFamily: 'Poppins_600SemiBold',
    letterSpacing: 0.5,
  },
  footer: { width: '100%', alignItems: 'center', paddingVertical: 12 },
  footerText: {
    fontSize: 11,
    lineHeight: 16,
    fontWeight: '500',
    textAlign: 'center',
    fontFamily: 'Poppins_500Medium',
  },
  footerLink: { fontWeight: '500' },
});