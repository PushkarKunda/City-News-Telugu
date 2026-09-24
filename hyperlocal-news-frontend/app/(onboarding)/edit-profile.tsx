// app/(onboarding)/edit-profile.tsx
import React, { useState, useRef, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  TextInput,
  Image,
  Animated,
  Platform,
  TouchableWithoutFeedback,
  Keyboard,
  Pressable,
  BackHandler,
  KeyboardAvoidingView,
  useWindowDimensions,
  ActivityIndicator,
} from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { Feather, Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useAuthStore } from '@/store/authStore';
import { Colors } from '@/constants/Colors';
import * as ImagePicker from 'expo-image-picker';
import { useAppColorScheme } from '@/hooks/useAppColorScheme';
import { useGoogleFirebaseAuth } from '@/hooks/useGoogleFirebaseAuth';
import { statusCodes } from '@react-native-google-signin/google-signin';
import { usersApi, type UserMeResponse, type UpdateMePayload } from '@/services/api';
import { compressImage } from '@/services/image';
import { uploadImageToSupabaseProfile } from '@/services/supabase';

// ═══════════════════════════════════════════════════════════════════════════
// TYPES
// ═══════════════════════════════════════════════════════════════════════════

type DialogType = 'success' | 'info' | 'error' | 'warning';

interface DialogConfig {
  visible: boolean;
  title: string;
  message: string;
  type: DialogType;
}

// ═══════════════════════════════════════════════════════════════════════════
// MAIN SCREEN
// ═══════════════════════════════════════════════════════════════════════════

export default function ProfileCompletionScreen() {
  const router = useRouter();
  const colorScheme = useAppColorScheme();
  const colors = Colors[colorScheme ?? 'light'];
  const isDark = colorScheme === 'dark';
  const { width } = useWindowDimensions();

  const {
    user,
    updateProfile,
    isOnboarded,
    sendPhoneOTP,
    linkPhone,
    isLoading,
    updateProfileLocal,
  } = useAuthStore();

  // ─── Form State ─────────────────────────────────────────────────────────

  const [name, setName] = useState('');
  const [phoneNumber, setPhoneNumber] = useState('');
  const [email, setEmail] = useState('');
  const [gender, setGender] = useState('');
  const [dob, setDob] = useState('');
  const [selectedAvatar, setSelectedAvatar] = useState('');

  // ─── UI State ───────────────────────────────────────────────────────────

  const [isFocused, setIsFocused] = useState(false);
  const [otpCode, setOtpCode] = useState('');
  const [isSaving, setIsSaving] = useState(false);
  const [isLoadingProfile, setIsLoadingProfile] = useState(false);
  const [showPhoneVerification, setShowPhoneVerification] = useState(false);
  const [isVerifyingPhone, setIsVerifyingPhone] = useState(false);
  const [formattedPhone, setFormattedPhone] = useState('');

  // ─── Dialog ─────────────────────────────────────────────────────────────

  const [dialogConfig, setDialogConfig] = useState<DialogConfig>({
    visible: false,
    title: '',
    message: '',
    type: 'info',
  });

  const showDialog = (
    title: string,
    message: string,
    type: DialogType = 'info'
  ) => setDialogConfig({ visible: true, title, message, type });

  const closeDialog = () =>
    setDialogConfig((prev) => ({ ...prev, visible: false }));

  // ─── Animations ─────────────────────────────────────────────────────────

  const buttonScale = useRef(new Animated.Value(1)).current;
  const avatarScale = useRef(new Animated.Value(1)).current;
  const inputBorderAnim = useRef(new Animated.Value(0)).current;
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(20)).current;

  const avatarSize = Math.min(Math.max(width * 0.28, 88), 130);

  // ─── Back Handler (block back during onboarding) ─────────────────────────

  useEffect(() => {
    const onBackPress = () => {
      if (!isOnboarded) return true;
      return false;
    };
    const sub = BackHandler.addEventListener('hardwareBackPress', onBackPress);

    Animated.parallel([
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 500,
        useNativeDriver: true,
      }),
      Animated.timing(slideAnim, {
        toValue: 0,
        duration: 500,
        useNativeDriver: true,
      }),
    ]).start();

    return () => sub.remove();
  }, [isOnboarded]);

  // ─── Load Profile on Mount ───────────────────────────────────────────────

  useEffect(() => {
    const loadProfile = async () => {
      // ✅ For onboarding: use user from store (already set)
      if (!isOnboarded) {
        setName(user?.name ?? '');
        setPhoneNumber(user?.phoneNumber ?? user?.phone ?? '');
        setEmail(user?.email ?? '');
        setGender(user?.gender ?? '');
        setDob(user?.date_of_birth ?? '');
        setSelectedAvatar(user?.profile_picture ?? user?.avatar ?? '');
        return;
      }

      // ✅ For edit mode: fetch fresh from API
      setIsLoadingProfile(true);
      try {
        const freshUser: UserMeResponse = await usersApi.me();

        setName(freshUser.name ?? '');
        setPhoneNumber(freshUser.phone ?? '');
        setEmail(freshUser.email ?? '');
        setGender(freshUser.gender ?? '');
        setDob(
          freshUser.date_of_birth
            ? new Date(freshUser.date_of_birth).toISOString().split('T')[0]
            : ''
        );
        setSelectedAvatar(freshUser.profile_picture ?? '');

        // ✅ Update store with fresh data
        updateProfileLocal({
          name: freshUser.name,
          phone: freshUser.phone,
          phoneNumber: freshUser.phone,
          email: freshUser.email,
          profile_picture: freshUser.profile_picture,
          avatar: freshUser.profile_picture,
          gender: freshUser.gender,
          date_of_birth: freshUser.date_of_birth,
          email_verified: freshUser.email_verified,
          mobile_verified: freshUser.mobile_verified,
        });
      } catch (error) {
        console.error('[edit-profile] Failed to load profile:', error);
        // Fallback to store data
        setName(user?.name ?? '');
        setPhoneNumber(user?.phoneNumber ?? user?.phone ?? '');
        setEmail(user?.email ?? '');
        setGender(user?.gender ?? '');
        setDob(user?.date_of_birth ?? '');
        setSelectedAvatar(user?.profile_picture ?? user?.avatar ?? '');
      } finally {
        setIsLoadingProfile(false);
      }
    };

    loadProfile();
  }, [isOnboarded]);

  // ─── Google Sign-In ──────────────────────────────────────────────────────

  const { signInWithGoogle, isGoogleLoading, isGoogleReady } =
    useGoogleFirebaseAuth({
      onSuccess: async (response) => {
        // ✅ CRITICAL FIX: Fetch fresh user data from API after linking
        try {
          const freshUser: UserMeResponse = await usersApi.me();

          // ✅ Update store with fresh API data
          updateProfileLocal({
            email: freshUser.email,
            email_verified: freshUser.email_verified,
            name: freshUser.name,
            phone: freshUser.phone,
            phoneNumber: freshUser.phone,
            profile_picture: freshUser.profile_picture,
            avatar: freshUser.profile_picture,
            gender: freshUser.gender,
            date_of_birth: freshUser.date_of_birth,
            mobile_verified: freshUser.mobile_verified,
          });

          // ✅ Update local state
          setEmail(freshUser.email ?? '');

          showDialog('Success', 'Google account linked successfully!', 'success');
        } catch (error) {
          console.error('[edit-profile] Failed to fetch user after Google link:', error);

          // ✅ Fallback to response data
          const updatedUser = response.user;
          updateProfile({
            email: updatedUser.email ?? null,
            email_verified: updatedUser.email_verified,
          });
          setEmail(updatedUser.email ?? '');

          showDialog('Success', 'Google account linked successfully!', 'success');
        }
      },
      onError: (error: any) => {
        if (error?.code === statusCodes.SIGN_IN_CANCELLED) return;
        showDialog(
          'Error',
          error?.message ?? 'Failed to link Google account.',
          'error'
        );
      },
    });

  // ─── Phone Verification ──────────────────────────────────────────────────

  const handleSendPhoneVerification = async () => {
    if (!phoneNumber.trim()) {
      showDialog('Phone Required', 'Please enter your phone number first.', 'warning');
      return;
    }

    let phone = phoneNumber.trim();
    if (!phone.startsWith('+')) {
      const clean = phone.replace(/\D/g, '');
      if (clean.length < 10) {
        showDialog('Invalid Phone', 'Please enter a valid 10-digit number.', 'error');
        return;
      }
      phone = `+91${clean.slice(-10)}`;
    }

    try {
      setIsVerifyingPhone(true);
      setFormattedPhone(phone);
      setPhoneNumber(phone);
      await sendPhoneOTP(phone);
      setShowPhoneVerification(true);
      showDialog('Code Sent', `Verification code sent to ${phone}.`, 'success');
    } catch (error: unknown) {
      const message =
        error instanceof Error ? error.message : 'Failed to send code.';
      showDialog('Error', message, 'error');
    } finally {
      setIsVerifyingPhone(false);
    }
  };

  const handleConfirmPhoneOtp = async () => {
    if (otpCode.trim().length !== 6) {
      showDialog('Invalid Code', 'Please enter the 6-digit code.', 'error');
      return;
    }

    try {
      setIsVerifyingPhone(true);
      await linkPhone(formattedPhone || phoneNumber, otpCode);
      setOtpCode('');
      setShowPhoneVerification(false);

      // ✅ CRITICAL FIX: Fetch fresh user data after phone verification
      try {
        const freshUser: UserMeResponse = await usersApi.me();

        updateProfileLocal({
          phone: freshUser.phone,
          phoneNumber: freshUser.phone,
          mobile_verified: freshUser.mobile_verified,
          email: freshUser.email,
          email_verified: freshUser.email_verified,
        });

        setPhoneNumber(freshUser.phone ?? formattedPhone);
      } catch {
        // Fallback
        setPhoneNumber(formattedPhone);
      }

      showDialog('Verified', 'Phone number verified successfully!', 'success');
    } catch (error: unknown) {
      const message =
        error instanceof Error ? error.message : 'OTP verification failed.';
      showDialog('Error', message, 'error');
    } finally {
      setIsVerifyingPhone(false);
    }
  };

  // ─── Image Picker ────────────────────────────────────────────────────────

  const handlePickFromGallery = async () => {
    try {
      const { status } =
        await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (status !== 'granted') {
        showDialog(
          'Permission Denied',
          'Please allow access to your photos.',
          'warning'
        );
        return;
      }

      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: 'images',
        allowsEditing: true,
        aspect: [1, 1],
        quality: 1,
      });

      if (!result.canceled && result.assets?.length > 0) {
        Animated.sequence([
          Animated.timing(avatarScale, {
            toValue: 0.88,
            duration: 80,
            useNativeDriver: true,
          }),
          Animated.spring(avatarScale, {
            toValue: 1,
            friction: 6,
            tension: 180,
            useNativeDriver: true,
          }),
        ]).start();
        setSelectedAvatar(result.assets[0].uri);
      }
    } catch {
      showDialog('Error', 'Could not select photo. Please try again.', 'error');
    }
  };

  // ─── Save Profile ────────────────────────────────────────────────────────

  const handleFinishSetup = async () => {
    if (name.trim().length < 2) {
      showDialog('Name Required', 'Please enter your full name.', 'warning');
      return;
    }

    setIsSaving(true);

    try {
      // ✅ Upload avatar if local file
      let uploadedAvatarUrl: string | null = selectedAvatar || null;

      const isLocalFile =
        selectedAvatar &&
        (selectedAvatar.startsWith('file://') ||
          selectedAvatar.startsWith('content://') ||
          (!selectedAvatar.startsWith('http://') &&
            !selectedAvatar.startsWith('https://')));

      if (isLocalFile) {
        try {
          const compressed = await compressImage(selectedAvatar, {
            width: 512,
            height: 512,
            compress: 0.8,
          });

          uploadedAvatarUrl = await uploadImageToSupabaseProfile(compressed.uri, 'profile');

          if (!uploadedAvatarUrl) {
            throw new Error('Failed to get upload URL from Supabase.');
          }
        } catch (uploadErr) {
          console.error('[edit-profile] Avatar upload failed:', uploadErr);
          showDialog(
            'Upload Failed',
            'Could not upload photo, saving other details.',
            'warning'
          );
          uploadedAvatarUrl = null;
        }
      }

      if (isOnboarded) {
        // ─── EDIT MODE ────────────────────────────────────────────────────
        // ✅ Build clean payload
        const payload: UpdateMePayload = {
          name: name.trim(),
          profile_picture: uploadedAvatarUrl,
          gender: gender ? (gender.toLowerCase() as 'male' | 'female' | 'other') : null,
          date_of_birth: dob ? new Date(dob).toISOString() : null,
        };

        // ✅ Call PATCH /users/me
        const response: UserMeResponse = await usersApi.updateMe(payload);

        // ✅ Update store with API response
        updateProfile({
          name: response.name,
          phone: response.phone,
          phoneNumber: response.phone,
          email: response.email,
          avatar: response.profile_picture,
          profile_picture: response.profile_picture,
          gender: response.gender,
          date_of_birth: response.date_of_birth,
          email_verified: response.email_verified,
          mobile_verified: response.mobile_verified,
        });

        showDialog('Saved', 'Profile updated successfully!', 'success');
        setTimeout(() => router.replace('/(tabs)/profile'), 1200);
      } else {
        // ─── ONBOARDING MODE ──────────────────────────────────────────────
        // ✅ Store locally, completeOnboarding handles API call
        updateProfile({
          name: name.trim(),
          avatar: uploadedAvatarUrl ?? selectedAvatar,
          profile_picture: uploadedAvatarUrl ?? selectedAvatar,
          gender: gender || null,
          date_of_birth: dob ? new Date(dob).toISOString() : null,
        });

        router.push('/(onboarding)/language');
      }
    } catch (err: unknown) {
      const message =
        err instanceof Error
          ? err.message
          : 'Failed to save profile. Please try again.';
      showDialog('Error', message, 'error');
    } finally {
      setIsSaving(false);
    }
  };

  // ─── Derived ─────────────────────────────────────────────────────────────

  const isNameValid = name.trim().length >= 2 && name.trim().length <= 50;
  const isButtonDisabled =
    !isNameValid || isSaving || isLoading || isLoadingProfile;

  const phoneVerified = user?.mobile_verified === true;
  const emailVerified = user?.email_verified === true;

  const borderInterpolation = inputBorderAnim.interpolate({
    inputRange: [0, 1],
    outputRange: [colors.border, colors.primary],
  });

  // ─── Render ───────────────────────────────────────────────────────────────

  return (
    <SafeAreaView
      style={[styles.container, { backgroundColor: colors.background }]}
    >
      <StatusBar style={isDark ? 'light' : 'dark'} />

      {/* Background Blurs */}
      <View
        style={[
          styles.topRadial,
          {
            backgroundColor: isDark
              ? 'rgba(70, 72, 212, 0.1)'
              : 'rgba(225, 224, 255, 0.65)',
          },
        ]}
      />
      <View
        style={[
          styles.bottomRadial,
          {
            backgroundColor: isDark
              ? 'rgba(0, 106, 97, 0.1)'
              : 'rgba(229, 238, 255, 0.7)',
          },
        ]}
      />

      {/* Header */}
      <View style={[styles.header, { borderBottomColor: colors.border }]}>
        {isOnboarded ? (
          <TouchableOpacity
            style={styles.backButton}
            onPress={() => router.back()}
            activeOpacity={0.7}
          >
            <Ionicons name="arrow-back" size={24} color={colors.primary} />
          </TouchableOpacity>
        ) : (
          <View style={styles.headerPlaceholder} />
        )}

        <Text style={[styles.headerTitle, { color: colors.text }]}>
          <Text style={{ fontFamily: 'Poppins_700Bold' }}>Hyper</Text>
          <Text
            style={{
              fontFamily: 'Poppins_500Medium',
              color: isDark ? '#818CF8' : colors.primary,
            }}
          >
            Local
          </Text>
          <Text
            style={{
              color: isDark ? '#818CF8' : colors.primary,
              fontFamily: 'Poppins_700Bold',
            }}
          >
            .
          </Text>
        </Text>

        <View style={styles.headerPlaceholder} />
      </View>

      {/* Loading Overlay */}
      {isLoadingProfile && (
        <View style={styles.loadingOverlay}>
          <ActivityIndicator size="large" color={colors.primary} />
          <Text style={[styles.loadingText, { color: colors.text }]}>
            Loading your profile...
          </Text>
        </View>
      )}

      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={{ flex: 1 }}
      >
        <TouchableWithoutFeedback onPress={Keyboard.dismiss}>
          <ScrollView
            style={[styles.scrollView, { backgroundColor: colors.background }]}
            contentContainerStyle={styles.scrollContent}
            showsVerticalScrollIndicator={false}
            keyboardShouldPersistTaps="handled"
            scrollEnabled={!isLoadingProfile}
          >
            <Animated.View
              style={{
                opacity: fadeAnim,
                transform: [{ translateY: slideAnim }],
              }}
            >
              {/* Progress (onboarding only) */}
              {!isOnboarded && (
                <View style={styles.progressContainer}>
                  <View
                    style={[
                      styles.stepDot,
                      { backgroundColor: colors.primaryLight },
                    ]}
                  />
                  <View
                    style={[
                      styles.stepDot,
                      { backgroundColor: colors.primaryLight },
                    ]}
                  />
                  <View
                    style={[
                      styles.stepActive,
                      { backgroundColor: colors.primary },
                    ]}
                  />
                </View>
              )}

              {/* Headline */}
              <View style={styles.headlineSection}>
                <Text style={[styles.mainTitle, { color: colors.text }]}>
                  {isOnboarded ? 'Edit Your Profile' : 'Complete your profile'}
                </Text>
                <Text
                  style={[styles.subtitle, { color: colors.textSecondary }]}
                >
                  {isOnboarded
                    ? 'Update your information anytime'
                    : 'Add a photo and your name so we\ncan personalize your experience.'}
                </Text>
              </View>

              {/* Avatar */}
              <View style={styles.uploaderSection}>
                <Pressable
                  onPress={handlePickFromGallery}
                  onPressIn={() =>
                    Animated.spring(avatarScale, {
                      toValue: 0.94,
                      useNativeDriver: true,
                      tension: 180,
                      friction: 12,
                    }).start()
                  }
                  onPressOut={() =>
                    Animated.spring(avatarScale, {
                      toValue: 1,
                      useNativeDriver: true,
                      tension: 180,
                      friction: 12,
                    }).start()
                  }
                  style={styles.uploaderTouch}
                  disabled={isLoadingProfile}
                >
                  <Animated.View
                    style={[
                      styles.avatarCircle,
                      {
                        backgroundColor: isDark ? '#2A2A3C' : '#E1E0FF',
                        borderColor: colors.border,
                        width: avatarSize,
                        height: avatarSize,
                        borderRadius: avatarSize / 2,
                        transform: [{ scale: avatarScale }],
                      },
                    ]}
                  >
                    {selectedAvatar ? (
                      <Image
                        source={{ uri: selectedAvatar }}
                        style={[
                          styles.avatarImage,
                          { borderRadius: avatarSize / 2 - 4 },
                        ]}
                      />
                    ) : (
                      <Feather name="camera" size={32} color={colors.primary} />
                    )}
                    <View
                      style={[
                        styles.plusBadge,
                        {
                          backgroundColor: colors.primary,
                          borderColor: colors.background,
                        },
                      ]}
                    >
                      <Ionicons name="add" size={20} color="#FFFFFF" />
                    </View>
                  </Animated.View>
                </Pressable>
                <Text
                  style={[styles.uploadPrompt, { color: colors.primary }]}
                >
                  TAP TO UPLOAD
                </Text>
              </View>

              {/* ── FULL NAME ── */}
              <View style={styles.inputContainer}>
                <Text
                  style={[styles.inputLabel, { color: colors.textSecondary }]}
                >
                  FULL NAME
                </Text>
                <Animated.View
                  style={[
                    styles.inputWrapper,
                    {
                      backgroundColor: colors.card,
                      borderColor: borderInterpolation,
                    },
                    isFocused && styles.inputWrapperFocused,
                  ]}
                >
                  <TextInput
                    style={[styles.textInput, { color: colors.text }]}
                    placeholder="Enter your name"
                    placeholderTextColor={
                      isDark
                        ? 'rgba(255,255,255,0.3)'
                        : 'rgba(118,117,134,0.5)'
                    }
                    value={name}
                    onChangeText={setName}
                    onFocus={() => {
                      setIsFocused(true);
                      Animated.timing(inputBorderAnim, {
                        toValue: 1,
                        duration: 200,
                        useNativeDriver: false,
                      }).start();
                    }}
                    onBlur={() => {
                      setIsFocused(false);
                      Animated.timing(inputBorderAnim, {
                        toValue: 0,
                        duration: 200,
                        useNativeDriver: false,
                      }).start();
                    }}
                    autoCapitalize="words"
                    maxLength={50}
                    editable={!isLoadingProfile}
                  />
                  {name.length > 30 && (
                    <Text
                      style={[
                        styles.charCount,
                        { color: colors.textSecondary },
                      ]}
                    >
                      {name.length}/50
                    </Text>
                  )}
                  <Feather
                    name="user"
                    size={20}
                    color={
                      isDark
                        ? 'rgba(255,255,255,0.4)'
                        : 'rgba(118,117,134,0.5)'
                    }
                    style={styles.inputIcon}
                  />
                </Animated.View>
              </View>

              {/* ── PHONE NUMBER ── */}
              <View style={styles.inputContainer}>
                <Text
                  style={[styles.inputLabel, { color: colors.textSecondary }]}
                >
                  PHONE NUMBER
                </Text>
                <View
                  style={[
                    styles.inputWrapper,
                    {
                      backgroundColor: phoneVerified
                        ? isDark
                          ? '#1C1C2E'
                          : '#F1F3F9'
                        : colors.card,
                      borderColor: colors.border,
                    },
                  ]}
                >
                  <TextInput
                    style={[
                      styles.textInput,
                      {
                        color: phoneVerified
                          ? isDark
                            ? 'rgba(255,255,255,0.4)'
                            : 'rgba(0,0,0,0.4)'
                          : colors.text,
                      },
                    ]}
                    placeholder="Enter phone number"
                    placeholderTextColor={
                      isDark
                        ? 'rgba(255,255,255,0.3)'
                        : 'rgba(118,117,134,0.5)'
                    }
                    value={phoneNumber}
                    onChangeText={setPhoneNumber}
                    keyboardType="phone-pad"
                    maxLength={15}
                    editable={
                      !phoneVerified && !isVerifyingPhone && !isLoadingProfile
                    }
                  />
                  <Feather
                    name="phone"
                    size={20}
                    color={
                      isDark
                        ? 'rgba(255,255,255,0.4)'
                        : 'rgba(118,117,134,0.5)'
                    }
                    style={styles.inputIcon}
                  />
                </View>

                {phoneVerified ? (
                  <View
                    style={[
                      styles.statusBadge,
                      { backgroundColor: '#10B981', borderColor: '#10B981', marginTop: 10 },
                    ]}
                  >
                    <Ionicons
                      name="checkmark-circle"
                      size={18}
                      color="#FFFFFF"
                    />
                    <Text style={[styles.statusBadgeText, { color: '#FFFFFF' }]}>
                      Phone Verified
                    </Text>
                  </View>
                ) : !showPhoneVerification ? (
                  <TouchableOpacity
                    style={[
                      styles.actionButton,
                      {
                        backgroundColor: colors.primaryLight,
                        borderColor: 'rgba(70,72,212,0.2)',
                        marginTop: 10,
                      },
                    ]}
                    onPress={handleSendPhoneVerification}
                    disabled={isVerifyingPhone || isLoadingProfile}
                    activeOpacity={0.7}
                  >
                    {isVerifyingPhone ? (
                      <ActivityIndicator
                        size="small"
                        color={colors.primary}
                      />
                    ) : (
                      <>
                        <Ionicons
                          name="send"
                          size={16}
                          color={colors.primary}
                        />
                        <Text
                          style={[
                            styles.actionButtonText,
                            { color: colors.primary },
                          ]}
                        >
                          Send Verification Code
                        </Text>
                      </>
                    )}
                  </TouchableOpacity>
                ) : (
                  <View
                    style={[
                      styles.otpBox,
                      {
                        borderColor: 'rgba(70,72,212,0.15)',
                        backgroundColor: 'rgba(70,72,212,0.02)',
                      },
                    ]}
                  >
                    <Text
                      style={[
                        styles.otpLabel,
                        { color: colors.textSecondary },
                      ]}
                    >
                      ENTER OTP CODE
                    </Text>
                    <View
                      style={[
                        styles.otpInputWrapper,
                        {
                          backgroundColor: colors.card,
                          borderColor: colors.border,
                        },
                      ]}
                    >
                      <TextInput
                        style={[styles.otpInput, { color: colors.text }]}
                        placeholder="Enter 6-digit code"
                        placeholderTextColor={
                          isDark
                            ? 'rgba(255,255,255,0.3)'
                            : 'rgba(118,117,134,0.5)'
                        }
                        value={otpCode}
                        onChangeText={setOtpCode}
                        keyboardType="number-pad"
                        maxLength={6}
                      />
                      <Feather
                        name="lock"
                        size={20}
                        color={
                          isDark
                            ? 'rgba(255,255,255,0.4)'
                            : 'rgba(118,117,134,0.5)'
                        }
                        style={styles.inputIcon}
                      />
                    </View>
                    <TouchableOpacity
                      style={[
                        styles.otpConfirmBtn,
                        { backgroundColor: colors.primary },
                        (isVerifyingPhone || otpCode.length !== 6) && {
                          opacity: 0.6,
                        },
                      ]}
                      onPress={handleConfirmPhoneOtp}
                      disabled={isVerifyingPhone || otpCode.length !== 6}
                      activeOpacity={0.8}
                    >
                      {isVerifyingPhone ? (
                        <ActivityIndicator color="#fff" />
                      ) : (
                        <Text style={styles.otpConfirmBtnText}>
                          Confirm & Verify Phone
                        </Text>
                      )}
                    </TouchableOpacity>
                  </View>
                )}
              </View>

              {/* ── EMAIL VERIFICATION ── */}
              <View style={styles.inputContainer}>
                <Text
                  style={[styles.inputLabel, { color: colors.textSecondary }]}
                >
                  EMAIL VERIFICATION
                </Text>
                {emailVerified ? (
                  <View
                    style={[
                      styles.inputWrapper,
                      {
                        backgroundColor: isDark ? '#1C1C2E' : '#F1F3F9',
                        borderColor: colors.border,
                      },
                    ]}
                  >
                    <TextInput
                      style={[
                        styles.textInput,
                        {
                          color: isDark
                            ? 'rgba(255,255,255,0.4)'
                            : 'rgba(0,0,0,0.4)',
                        },
                      ]}
                      value={email || user?.email || ''}
                      editable={false}
                    />
                    <Ionicons
                      name="checkmark-circle"
                      size={20}
                      color="#10B981"
                      style={styles.inputIcon}
                    />
                  </View>
                ) : (
                  <TouchableOpacity
                    style={[
                      styles.googleBtn,
                      { backgroundColor: colors.primary },
                    ]}
                    onPress={signInWithGoogle}
                    disabled={
                      !isGoogleReady || isGoogleLoading || isLoadingProfile
                    }
                    activeOpacity={0.8}
                  >
                    {isGoogleLoading ? (
                      <ActivityIndicator color="#FFFFFF" size="small" />
                    ) : (
                      <>
                        <Ionicons
                          name="logo-google"
                          size={18}
                          color="#FFFFFF"
                        />
                        <Text style={styles.googleBtnText}>
                          Link Google Account
                        </Text>
                      </>
                    )}
                  </TouchableOpacity>
                )}
              </View>

              {/* ── GENDER ── */}
              <View style={styles.inputContainer}>
                <Text
                  style={[styles.inputLabel, { color: colors.textSecondary }]}
                >
                  GENDER
                </Text>
                <View style={styles.genderRow}>
                  {(['Male', 'Female', 'Other'] as const).map((g) => {
                    const isActive =
                      gender.toLowerCase() === g.toLowerCase();
                    return (
                      <TouchableOpacity
                        key={g}
                        style={[
                          styles.genderBtn,
                          {
                            borderColor: isActive
                              ? colors.primary
                              : colors.border,
                            backgroundColor: isActive
                              ? colors.primaryLight
                              : colors.card,
                          },
                        ]}
                        onPress={() => setGender(g.toLowerCase())}
                        activeOpacity={0.7}
                        disabled={isLoadingProfile}
                      >
                        <Text
                          style={[
                            styles.genderBtnText,
                            {
                              color: isActive
                                ? colors.primary
                                : colors.textSecondary,
                              fontWeight: isActive ? '600' : '400',
                            },
                          ]}
                        >
                          {g}
                        </Text>
                      </TouchableOpacity>
                    );
                  })}
                </View>
              </View>

              {/* ── DATE OF BIRTH ── */}
              <View style={styles.inputContainer}>
                <Text
                  style={[styles.inputLabel, { color: colors.textSecondary }]}
                >
                  DATE OF BIRTH
                </Text>
                <View
                  style={[
                    styles.inputWrapper,
                    {
                      backgroundColor: colors.card,
                      borderColor: colors.border,
                    },
                  ]}
                >
                  <TextInput
                    style={[styles.textInput, { color: colors.text }]}
                    placeholder="YYYY-MM-DD"
                    placeholderTextColor={
                      isDark
                        ? 'rgba(255,255,255,0.3)'
                        : 'rgba(118,117,134,0.5)'
                    }
                    value={dob}
                    onChangeText={(text) => {
                      let cleaned = text.replace(/\D/g, '');
                      if (cleaned.length > 8)
                        cleaned = cleaned.substring(0, 8);
                      let formatted = cleaned;
                      if (cleaned.length > 4) {
                        formatted = `${cleaned.substring(0, 4)}-${cleaned.substring(4)}`;
                      }
                      if (cleaned.length > 6) {
                        formatted = `${formatted.substring(0, 7)}-${formatted.substring(7)}`;
                      }
                      setDob(formatted);
                    }}
                    keyboardType="numeric"
                    maxLength={10}
                    editable={!isLoadingProfile}
                  />
                  <Feather
                    name="calendar"
                    size={20}
                    color={
                      isDark
                        ? 'rgba(255,255,255,0.4)'
                        : 'rgba(118,117,134,0.5)'
                    }
                    style={styles.inputIcon}
                  />
                </View>
              </View>

              {/* ── INFO CARD ── */}
              <View
                style={[
                  styles.infoCard,
                  {
                    backgroundColor: colors.card,
                    borderColor: colors.border,
                  },
                ]}
              >
                <View
                  style={[
                    styles.infoIcon,
                    { backgroundColor: colors.primaryLight },
                  ]}
                >
                  <Ionicons
                    name="shield-checkmark-outline"
                    size={28}
                    color={colors.primary}
                  />
                </View>
                <View style={styles.infoText}>
                  <Text style={[styles.infoTitle, { color: colors.text }]}>
                    Your data is safe
                  </Text>
                  <Text
                    style={[
                      styles.infoDesc,
                      { color: colors.textSecondary },
                    ]}
                  >
                    We only use your information to personalize your news and
                    improve your experience.
                  </Text>
                </View>
              </View>
            </Animated.View>
          </ScrollView>
        </TouchableWithoutFeedback>
      </KeyboardAvoidingView>

      {/* Footer */}
      <View
        style={[
          styles.footer,
          {
            backgroundColor: colors.background,
            borderTopColor: colors.border,
          },
        ]}
      >
        <Pressable
          style={styles.buttonWrapper}
          disabled={isButtonDisabled}
          onPress={handleFinishSetup}
          onPressIn={() =>
            Animated.spring(buttonScale, {
              toValue: 0.94,
              useNativeDriver: true,
              tension: 180,
              friction: 12,
            }).start()
          }
          onPressOut={() =>
            Animated.spring(buttonScale, {
              toValue: 1,
              useNativeDriver: true,
              tension: 180,
              friction: 12,
            }).start()
          }
        >
          <Animated.View
            style={[
              styles.finishButton,
              isButtonDisabled
                ? {
                  backgroundColor: isDark
                    ? '#2A2A3C'
                    : 'rgba(199,196,215,0.4)',
                }
                : { backgroundColor: colors.primary },
              { transform: [{ scale: buttonScale }] },
            ]}
          >
            {isSaving || isLoadingProfile ? (
              <ActivityIndicator color="#fff" size="small" />
            ) : (
              <>
                <Text
                  style={[
                    styles.finishButtonText,
                    isButtonDisabled && {
                      color: isDark
                        ? 'rgba(255,255,255,0.2)'
                        : 'rgba(118,117,134,0.6)',
                    },
                  ]}
                >
                  {isOnboarded ? 'Save Changes' : 'Finish Setup'}
                </Text>
                <Ionicons
                  name={isOnboarded ? 'save' : 'checkmark-circle'}
                  size={20}
                  color={
                    isButtonDisabled
                      ? isDark
                        ? 'rgba(255,255,255,0.2)'
                        : 'rgba(118,117,134,0.4)'
                      : '#FFFFFF'
                  }
                />
              </>
            )}
          </Animated.View>
        </Pressable>

        {!isOnboarded && (
          <Text style={[styles.stepText, { color: colors.textSecondary }]}>
            STEP 1 OF 5
          </Text>
        )}
      </View>

      {/* Custom Alert Dialog */}
      {dialogConfig.visible && (
        <View style={styles.modalBackdrop}>
          <TouchableWithoutFeedback onPress={closeDialog}>
            <View style={StyleSheet.absoluteFill} />
          </TouchableWithoutFeedback>
          <View
            style={[
              styles.modalCard,
              {
                backgroundColor: colors.card,
                borderColor: colors.border,
              },
            ]}
          >
            <View
              style={[
                styles.modalIconContainer,
                dialogConfig.type === 'success' && {
                  backgroundColor: 'rgba(16,185,129,0.12)',
                },
                dialogConfig.type === 'error' && {
                  backgroundColor: 'rgba(239,68,68,0.12)',
                },
                dialogConfig.type === 'warning' && {
                  backgroundColor: 'rgba(245,158,11,0.12)',
                },
                dialogConfig.type === 'info' && {
                  backgroundColor: colors.primaryLight,
                },
              ]}
            >
              {dialogConfig.type === 'success' && (
                <Ionicons
                  name="checkmark-circle-outline"
                  size={32}
                  color="#10B981"
                />
              )}
              {dialogConfig.type === 'error' && (
                <Ionicons
                  name="alert-circle-outline"
                  size={32}
                  color="#EF4444"
                />
              )}
              {dialogConfig.type === 'warning' && (
                <Ionicons
                  name="warning-outline"
                  size={32}
                  color="#F59E0B"
                />
              )}
              {dialogConfig.type === 'info' && (
                <Ionicons
                  name="information-circle-outline"
                  size={32}
                  color={colors.primary}
                />
              )}
            </View>
            <Text style={[styles.modalTitle, { color: colors.text }]}>
              {dialogConfig.title}
            </Text>
            <Text
              style={[
                styles.modalMessage,
                { color: colors.textSecondary },
              ]}
            >
              {dialogConfig.message}
            </Text>
            <TouchableOpacity
              style={[
                styles.modalButton,
                { backgroundColor: colors.primary },
              ]}
              onPress={closeDialog}
              activeOpacity={0.85}
            >
              <Text style={styles.modalButtonText}>Got it</Text>
            </TouchableOpacity>
          </View>
        </View>
      )}
    </SafeAreaView>
  );
}

// ═══════════════════════════════════════════════════════════════════════════
// STYLES
// ═══════════════════════════════════════════════════════════════════════════

const styles = StyleSheet.create({
  container: { flex: 1 },
  topRadial: {
    position: 'absolute',
    top: -120,
    right: -120,
    width: 320,
    height: 320,
    borderRadius: 160,
    zIndex: -1,
  },
  bottomRadial: {
    position: 'absolute',
    bottom: -120,
    left: -120,
    width: 320,
    height: 320,
    borderRadius: 160,
    zIndex: -1,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    height: 64,
    borderBottomWidth: 1,
  },
  backButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(70,72,212,0.05)',
  },
  headerTitle: {
    fontSize: 16,
    fontWeight: '700',
    fontFamily: 'Poppins_700Bold',
  },
  headerPlaceholder: { width: 40 },
  loadingOverlay: {
    position: 'absolute',
    top: 64,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0,0,0,0.3)',
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 100,
  },
  loadingText: {
    marginTop: 12,
    fontSize: 14,
    fontFamily: 'Poppins_500Medium',
  },
  scrollView: { flex: 1 },
  scrollContent: {
    paddingHorizontal: 20,
    paddingTop: 16,
    paddingBottom: 40,
  },
  progressContainer: {
    flexDirection: 'row',
    gap: 8,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 32,
  },
  stepDot: { width: 32, height: 6, borderRadius: 3 },
  stepActive: { width: 64, height: 6, borderRadius: 3 },
  headlineSection: { alignItems: 'center', marginBottom: 36 },
  mainTitle: {
    fontSize: 32,
    fontWeight: '700',
    lineHeight: 40,
    letterSpacing: -0.64,
    fontFamily: 'Poppins_700Bold',
    textAlign: 'center',
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 16,
    lineHeight: 24,
    fontFamily: 'Poppins_400Regular',
    textAlign: 'center',
  },
  uploaderSection: { alignItems: 'center', marginBottom: 32 },
  uploaderTouch: { marginBottom: 12 },
  avatarCircle: {
    borderWidth: 4,
    alignItems: 'center',
    justifyContent: 'center',
    position: 'relative',
    ...Platform.select({
      ios: {
        shadowColor: '#4648D4',
        shadowOffset: { width: 0, height: 12 },
        shadowOpacity: 0.12,
        shadowRadius: 24,
      },
      android: { elevation: 8 },
    }),
  },
  avatarImage: { width: '100%', height: '100%' },
  plusBadge: {
    position: 'absolute',
    bottom: 0,
    right: 0,
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 3,
  },
  uploadPrompt: {
    fontSize: 12,
    fontWeight: '600',
    letterSpacing: 0.3,
    fontFamily: 'Poppins_600SemiBold',
  },
  inputContainer: { marginBottom: 24 },
  inputLabel: {
    fontSize: 12,
    fontWeight: '600',
    letterSpacing: 0.6,
    fontFamily: 'Poppins_600SemiBold',
    marginBottom: 8,
    paddingLeft: 4,
  },
  inputWrapper: {
    height: 56,
    borderRadius: 16,
    borderWidth: 2,
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
  },
  inputWrapperFocused: {
    ...Platform.select({
      ios: {
        shadowColor: '#4648D4',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.1,
        shadowRadius: 10,
      },
      android: { elevation: 3 },
    }),
  },
  textInput: {
    flex: 1,
    height: '100%',
    fontSize: 16,
    fontFamily: 'Poppins_400Regular',
  },
  inputIcon: { marginLeft: 12 },
  charCount: {
    fontSize: 12,
    fontFamily: 'Poppins_400Regular',
    marginRight: 8,
  },
  statusBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 12,
    borderWidth: 1,
  },
  statusBadgeText: {
    fontSize: 14,
    fontWeight: '700',
    fontFamily: 'Poppins_700Bold',
  },
  actionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 12,
    borderWidth: 1,
  },
  actionButtonText: {
    fontSize: 14,
    fontWeight: '700',
    fontFamily: 'Poppins_700Bold',
  },
  otpBox: {
    marginTop: 12,
    gap: 8,
    padding: 14,
    borderRadius: 16,
    borderWidth: 1,
  },
  otpLabel: {
    fontSize: 11,
    fontWeight: '700',
    fontFamily: 'Poppins_700Bold',
    letterSpacing: 1.0,
  },
  otpInputWrapper: {
    height: 48,
    borderRadius: 12,
    borderWidth: 1,
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
  },
  otpInput: {
    flex: 1,
    fontSize: 15,
    fontFamily: 'Poppins_600SemiBold',
    letterSpacing: 2,
  },
  otpConfirmBtn: {
    height: 44,
    borderRadius: 10,
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 4,
  },
  otpConfirmBtnText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '700',
    fontFamily: 'Poppins_700Bold',
  },
  googleBtn: {
    height: 48,
    borderRadius: 12,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    width: '100%',
  },
  googleBtnText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '700',
    fontFamily: 'Poppins_700Bold',
  },
  genderRow: { flexDirection: 'row', gap: 12 },
  genderBtn: {
    flex: 1,
    height: 48,
    borderRadius: 12,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  genderBtnText: {
    fontSize: 14,
    fontFamily: 'Poppins_500Medium',
  },
  infoCard: {
    borderWidth: 1,
    borderRadius: 12,
    padding: 24,
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 16,
    marginBottom: 24,
  },
  infoIcon: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 2,
  },
  infoText: { flex: 1 },
  infoTitle: {
    fontSize: 16,
    fontWeight: '600',
    fontFamily: 'Poppins_600SemiBold',
    marginBottom: 4,
  },
  infoDesc: {
    fontSize: 14,
    lineHeight: 20,
    fontFamily: 'Poppins_400Regular',
  },
  footer: {
    borderTopWidth: 1,
    paddingHorizontal: 20,
    paddingTop: 24,
    paddingBottom: Platform.OS === 'ios' ? 36 : 24,
    alignItems: 'center',
    gap: 12,
  },
  buttonWrapper: { width: '100%' },
  finishButton: {
    height: 56,
    borderRadius: 28,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    width: '100%',
    ...Platform.select({
      ios: {
        shadowColor: '#4648D4',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.25,
        shadowRadius: 10,
      },
      android: { elevation: 4 },
    }),
  },
  finishButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '700',
    fontFamily: 'Poppins_700Bold',
  },
  stepText: {
    fontSize: 11,
    fontWeight: '600',
    letterSpacing: 1.1,
    fontFamily: 'Poppins_600SemiBold',
  },
  modalBackdrop: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(15,23,42,0.65)',
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 9999,
  },
  modalCard: {
    maxWidth: 340,
    width: '90%',
    borderRadius: 24,
    borderWidth: 1.5,
    padding: 24,
    alignItems: 'center',
    shadowColor: '#4648D4',
    shadowOffset: { width: 0, height: 12 },
    shadowOpacity: 0.15,
    shadowRadius: 24,
    elevation: 10,
  },
  modalIconContainer: {
    width: 64,
    height: 64,
    borderRadius: 32,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 16,
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: '700',
    fontFamily: 'Poppins_700Bold',
    textAlign: 'center',
    marginBottom: 8,
  },
  modalMessage: {
    fontSize: 14,
    lineHeight: 20,
    fontFamily: 'Poppins_400Regular',
    textAlign: 'center',
    marginBottom: 20,
  },
  modalButton: {
    width: '100%',
    height: 48,
    borderRadius: 24,
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalButtonText: {
    color: '#FFFFFF',
    fontSize: 15,
    fontWeight: '600',
    fontFamily: 'Poppins_600SemiBold',
  },
});