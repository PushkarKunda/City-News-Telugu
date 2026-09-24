import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  Alert,
  ActivityIndicator,
  Animated,
  Pressable,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
} from 'react-native';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Feather, Ionicons } from '@expo/vector-icons';
import { StatusBar } from 'expo-status-bar';
import { useAuthStore } from '@/store/authStore';
import { Colors } from '@/constants/Colors';
import { useAppColorScheme } from '@/hooks/useAppColorScheme';

export default function VerifyOTPScreen() {
  const router = useRouter();
  const { phone } = useLocalSearchParams<{ phone: string }>();
  const colorScheme = useAppColorScheme();
  const colors = Colors[colorScheme ?? 'light'];
  const isDark = colorScheme === 'dark';

  const { verifyPhoneOTP, sendPhoneOTP, isLoading } = useAuthStore();

  const [otp, setOtp] = useState('');
  const [resending, setResending] = useState(false);
  const [countdown, setCountdown] = useState(30);
  const [canResend, setCanResend] = useState(false);

  const inputRef = useRef<TextInput>(null);
  const buttonScale = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    const timer = setTimeout(() => {
      inputRef.current?.focus();
    }, 400);
    return () => clearTimeout(timer);
  }, []);

  useEffect(() => {
    if (countdown <= 0) {
      setCanResend(true);
      return;
    }
    const timer = setTimeout(() => setCountdown((c) => c - 1), 1000);
    return () => clearTimeout(timer);
  }, [countdown]);

  const animateButton = (toValue: number) => {
    Animated.spring(buttonScale, {
      toValue,
      useNativeDriver: true,
      tension: 100,
      friction: 8,
    }).start();
  };

  const handleVerify = async () => {
    if (otp.length !== 6) {
      Alert.alert('Invalid OTP', 'Please enter the 6-digit code');
      return;
    }

    // Check if user is already authenticated (e.g. via Google from Edit Profile)
    const wasAlreadyAuthenticated = useAuthStore.getState().isAuthenticated;

    try {
      const response = await verifyPhoneOTP(otp);

      if (wasAlreadyAuthenticated) {
        // User was linking their phone from Edit Profile
        Alert.alert(
          'Success',
          'Your phone number has been verified successfully!',
          [
            {
              text: 'OK',
              onPress: () => {
                if (router.canGoBack()) {
                  router.back();
                } else {
                  router.replace('/(tabs)/profile');
                }
              },
            },
          ]
        );
      } else {
        // Fresh login via Phone Auth
        const isNew = response.user?.is_new_user ?? (response as any).is_new_user ?? false;
        if (isNew) {
          router.replace('/(onboarding)/language');
        } else {
          router.replace('/(tabs)');
        }
      }
    } catch (error: any) {
      console.error('❌ OTP Verification Failed Details:', error);

      let errorMsg = error.message || 'Invalid OTP. Please try again.';

      if (error.message?.includes('already been linked') || error.code === 'auth/provider-already-linked') {
        // Fallback UI safety if the firebase.ts fix didn't catch it smoothly
        errorMsg = 'This phone number is already linked to your account.';
        Alert.alert('Already Verified', errorMsg, [
          {
            text: 'OK',
            onPress: () => {
              if (router.canGoBack()) {
                router.back();
              } else {
                router.replace('/(tabs)/profile');
              }
            },
          },
        ]);
        return;
      }

      if (error.code === 'auth/invalid-verification-code') {
        errorMsg = 'The OTP code you entered is incorrect. Please check and try again.';
      } else if (error.code === 'auth/code-expired') {
        errorMsg = 'The OTP code has expired. Please tap "Resend Code".';
      }

      Alert.alert('Verification Failed', errorMsg);
      setOtp('');
    }
  };

  const handleResend = async () => {
    if (!phone || !canResend) return;

    setResending(true);
    setCanResend(false);
    setCountdown(30);

    try {
      await sendPhoneOTP(phone);
      setOtp('');
      Alert.alert('OTP Sent', 'A new code has been sent to ' + phone);
    } catch (error: any) {
      Alert.alert('Error', error.message || 'Failed to resend OTP');
    } finally {
      setResending(false);
    }
  };

  const handleBack = () => {
    if (router.canGoBack()) {
      router.back();
    } else {
      router.replace('/(auth)/login');
    }
  };

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]}>
      <StatusBar style={isDark ? 'light' : 'dark'} />

      {/* Header - Top Navigation Anchor */}
      <View style={[styles.header, { backgroundColor: colors.background }]}>
        <TouchableOpacity
          style={styles.backButton}
          onPress={handleBack}
          activeOpacity={0.7}
        >
          <Ionicons name="arrow-back" size={24} color={colors.primary} />
        </TouchableOpacity>
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

            {/* Icon */}
            <View style={[styles.iconContainer, { backgroundColor: colors.primaryLight }]}>
              <Feather name="shield" size={32} color={colors.primary} />
            </View>

            {/* Title */}
            <Text style={[styles.title, { color: colors.text }]}>
              Verify Your Number
            </Text>

            {/* Subtitle */}
            <Text style={[styles.subtitle, { color: colors.textSecondary }]}>
              Enter the 6-digit code sent to{'\n'}
              <Text style={[styles.phoneText, { color: colors.text }]}>
                {phone}
              </Text>
            </Text>

            {/* OTP Input */}
            <TextInput
              ref={inputRef}
              style={[
                styles.otpInput,
                {
                  color: colors.text,
                  borderColor: otp.length === 6 ? colors.primary : colors.border,
                  backgroundColor: isDark ? colors.surface : '#EFF4FF',
                },
              ]}
              value={otp}
              onChangeText={(text) => {
                setOtp(text.replace(/\D/g, ''));
              }}
              keyboardType="number-pad"
              maxLength={6}
              placeholder="• • • • • •"
              placeholderTextColor={isDark ? '#464554' : '#C7C4D7'}
              textAlign="center"
              autoComplete="sms-otp"
              textContentType="oneTimeCode"
            />

            {/* Verify Button */}
            <Animated.View
              style={[styles.buttonWrapper, { transform: [{ scale: buttonScale }] }]}
            >
              <Pressable
                style={[
                  styles.button,
                  { backgroundColor: colors.primary },
                  (isLoading || otp.length !== 6) && { opacity: 0.7 },
                ]}
                onPressIn={() => animateButton(0.96)}
                onPressOut={() => animateButton(1)}
                onPress={handleVerify}
                disabled={isLoading || otp.length !== 6}
              >
                {isLoading ? (
                  <ActivityIndicator color="#fff" />
                ) : (
                  <>
                    <Text style={styles.buttonText}>Verify Code</Text>
                    <Feather name="check" size={18} color="#fff" />
                  </>
                )}
              </Pressable>
            </Animated.View>

            {/* Resend */}
            <View style={styles.resendContainer}>
              {canResend ? (
                <TouchableOpacity
                  onPress={handleResend}
                  disabled={resending}
                  style={styles.resendBtn}
                >
                  <Text style={[styles.resendText, { color: colors.primary }]}>
                    {resending ? 'Sending...' : 'Resend Code'}
                  </Text>
                </TouchableOpacity>
              ) : (
                <Text style={[styles.countdownText, { color: colors.textSecondary }]}>
                  Resend code in{' '}
                  <Text style={{ color: colors.primary, fontWeight: '600' }}>
                    {countdown}s
                  </Text>
                </Text>
              )}
            </View>

          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    paddingHorizontal: 20,
    paddingTop: 8,
    paddingBottom: 8,
  },
  backButton: {
    padding: 8,
    alignSelf: 'flex-start',
  },
  content: {
    flex: 1,
    paddingHorizontal: 24,
    alignItems: 'center',
    justifyContent: 'center',
    paddingBottom: 40,
  },
  keyboardView: {
    flex: 1,
  },
  scrollContent: {
    flexGrow: 1,
  },
  mainContent: {
    flex: 1,
    maxWidth: 448,
    alignSelf: 'center',
    width: '100%',
    paddingHorizontal: 20,
    paddingTop: 16,
    paddingBottom: 24,
    alignItems: 'center',
  },
  iconContainer: {
    width: 72,
    height: 72,
    borderRadius: 36,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 24,
  },
  title: {
    fontSize: 26,
    fontWeight: '700',
    marginBottom: 12,
    fontFamily: 'Poppins_700Bold',
    textAlign: 'center',
  },
  subtitle: {
    fontSize: 15,
    marginBottom: 32,
    fontFamily: 'Poppins_400Regular',
    textAlign: 'center',
    lineHeight: 22,
  },
  phoneText: {
    fontFamily: 'Poppins_600SemiBold',
    fontWeight: '600',
  },
  otpInput: {
    width: '85%',
    height: 64,
    borderWidth: 1.5,
    borderRadius: 16,
    fontSize: 22,
    letterSpacing: 14,
    textAlign: 'center',
    paddingLeft: 14, // Offset letterSpacing to ensure true centering
    marginBottom: 28,
    fontFamily: 'Poppins_600SemiBold',
  },
  buttonWrapper: {
    width: '85%',
    marginBottom: 20,
  },
  button: {
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
  buttonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
    fontFamily: 'Poppins_600SemiBold',
  },
  resendContainer: {
    alignItems: 'center',
    height: 40,
    justifyContent: 'center',
  },
  resendBtn: {
    padding: 8,
  },
  resendText: {
    fontSize: 15,
    fontWeight: '600',
    fontFamily: 'Poppins_600SemiBold',
  },
  countdownText: {
    fontSize: 14,
    fontFamily: 'Poppins_400Regular',
  },
});