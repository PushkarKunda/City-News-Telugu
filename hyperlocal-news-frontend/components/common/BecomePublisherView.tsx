// components/common/BecomePublisherView.tsx
import React from 'react';
import {
    View,
    Text,
    StyleSheet,
    TouchableOpacity,
    ScrollView,
    Alert,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Colors } from '@/constants/Colors';
import { useAppColorScheme } from '@/hooks/useAppColorScheme';
import { StatusBar } from 'expo-status-bar';
import { useGoogleFirebaseAuth } from '@/hooks/useGoogleFirebaseAuth';

interface BecomePublisherViewProps {
    onBack: () => void;
    title?: string;
}

export const BecomePublisherView = ({
    onBack,
    title = 'Publisher Access',
}: BecomePublisherViewProps) => {
    const router = useRouter();
    const colorScheme = useAppColorScheme();
    const colors = Colors[colorScheme ?? 'light'];
    const isDark = colorScheme === 'dark';
    const insets = useSafeAreaInsets();
    const {
        signInWithGoogle,
        isGoogleReady,
        isGoogleLoading,
    } = useGoogleFirebaseAuth({
        onSuccess: () => {
            router.push('/(onboarding)/edit-profile');
        },
        onError: (error) => {
            Alert.alert('Google Sign-In Failed', error.message || 'Please try again.');
        },
    });

    return (
        <View style={[styles.container, { backgroundColor: colors.background }]}>
            <StatusBar style={isDark ? 'light' : 'dark'} />

            {/* Decorative blurs */}
            <View style={styles.topRightBlur} />
            <View style={styles.bottomLeftBlur} />

            {/* Header */}
            <View style={[
                styles.header,
                {
                    backgroundColor: colors.surface,
                    borderBottomColor: colors.border,
                    paddingTop: Math.max(12, insets.top),
                },
            ]}>
                <TouchableOpacity
                    style={styles.backButton}
                    onPress={onBack}
                    activeOpacity={0.7}
                >
                    <Ionicons name="arrow-back" size={24} color={colors.text} />
                </TouchableOpacity>
                <Text style={[styles.headerTitle, { color: colors.text }]}>{title}</Text>
                <View style={styles.headerSpacer} />
            </View>

            <ScrollView
                contentContainerStyle={[
                    styles.scroll,
                    { paddingBottom: Math.max(24, insets.bottom + 24) },
                ]}
                showsVerticalScrollIndicator={false}
            >
                <View style={styles.content}>

                    {/* Icon */}
                    <View style={[styles.iconCircle, { backgroundColor: colors.primaryLight }]}>
                        <Ionicons name="shield-checkmark" size={48} color={colors.primary} />
                    </View>

                    {/* Title */}
                    <Text style={[styles.title, { color: colors.text }]}>
                        Become a Publisher
                    </Text>

                    {/* Subtitle */}
                    <Text style={[styles.subtitle, { color: colors.textSecondary }]}>
                        To write articles, create polls, and host events in your local
                        community, sign in with Google to establish your publisher identity.
                    </Text>

                    {/* Features */}
                    <View style={styles.featuresList}>
                        {FEATURES.map((feature) => (
                            <View key={feature.title} style={styles.featureItem}>
                                <View style={[
                                    styles.featureIcon,
                                    { backgroundColor: colors.primaryLight },
                                ]}>
                                    <Ionicons
                                        name={feature.icon as any}
                                        size={20}
                                        color={colors.primary}
                                    />
                                </View>
                                <View style={styles.featureText}>
                                    <Text style={[styles.featureTitle, { color: colors.text }]}>
                                        {feature.title}
                                    </Text>
                                    <Text style={[styles.featureDesc, { color: colors.textSecondary }]}>
                                        {feature.desc}
                                    </Text>
                                </View>
                            </View>
                        ))}
                    </View>

                    {/* Google Sign-In Button */}
                    <TouchableOpacity
                        style={[
                            styles.googleButton,
                            { backgroundColor: colors.primary },
                            (!isGoogleReady || isGoogleLoading) && { opacity: 0.7 },
                        ]}
                        onPress={signInWithGoogle}
                        disabled={!isGoogleReady || isGoogleLoading}
                        activeOpacity={0.8}
                    >
                        <Ionicons name="logo-google" size={18} color="#FFFFFF" />
                        <Text style={styles.googleButtonText}>
                            {isGoogleLoading ? 'Signing in...' : 'Sign in with Google to Continue'}
                        </Text>
                        <Ionicons name="arrow-forward" size={16} color="#FFFFFF" />
                    </TouchableOpacity>

                    {/* Back Button */}
                    <TouchableOpacity
                        style={styles.backBtn}
                        onPress={onBack}
                        activeOpacity={0.7}
                    >
                        <Text style={[styles.backBtnText, { color: colors.textSecondary }]}>
                            Go Back
                        </Text>
                    </TouchableOpacity>

                </View>
            </ScrollView>
        </View>
    );
};

const FEATURES = [
    {
        icon: 'document-text',
        title: 'Write Local Stories',
        desc: 'Share news, updates, and stories impacting your neighborhood.',
    },
    {
        icon: 'bar-chart',
        title: 'Create Polls',
        desc: 'Engage your community with polls on local topics.',
    },
    {
        icon: 'calendar',
        title: 'Host Local Events',
        desc: 'Organize and promote nearby community meetups & activities.',
    },
];

const styles = StyleSheet.create({
    container: { flex: 1 },
    topRightBlur: {
        position: 'absolute',
        top: -80, right: -80,
        width: 240, height: 240,
        borderRadius: 120,
        backgroundColor: 'rgba(70, 72, 212, 0.08)',
    },
    bottomLeftBlur: {
        position: 'absolute',
        bottom: -80, left: -80,
        width: 240, height: 240,
        borderRadius: 120,
        backgroundColor: 'rgba(16, 185, 129, 0.05)',
    },
    header: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingHorizontal: 20,
        paddingBottom: 16,
        borderBottomWidth: 1,
    },
    backButton: {
        width: 40, height: 40,
        borderRadius: 20,
        justifyContent: 'center',
        alignItems: 'center',
    },
    headerTitle: {
        fontSize: 18,
        fontWeight: '700',
        fontFamily: 'Poppins_700Bold',
    },
    headerSpacer: { width: 40 },
    scroll: {
        flexGrow: 1,
        justifyContent: 'center',
        padding: 24,
    },
    content: { alignItems: 'center', gap: 16 },
    iconCircle: {
        width: 96, height: 96,
        borderRadius: 48,
        justifyContent: 'center',
        alignItems: 'center',
        marginBottom: 8,
    },
    title: {
        fontSize: 24,
        fontWeight: '800',
        fontFamily: 'Poppins_700Bold',
        textAlign: 'center',
    },
    subtitle: {
        fontSize: 15,
        fontFamily: 'Poppins_500Medium',
        lineHeight: 22,
        textAlign: 'center',
        marginBottom: 8,
    },
    featuresList: { width: '100%', gap: 20, marginBottom: 16 },
    featureItem: {
        flexDirection: 'row',
        alignItems: 'flex-start',
        gap: 14,
    },
    featureIcon: {
        width: 40, height: 40,
        borderRadius: 20,
        justifyContent: 'center',
        alignItems: 'center',
        marginTop: 2,
    },
    featureText: { flex: 1, gap: 4 },
    featureTitle: {
        fontSize: 16,
        fontWeight: '700',
        fontFamily: 'Poppins_700Bold',
    },
    featureDesc: {
        fontSize: 13,
        fontFamily: 'Poppins_400Regular',
        lineHeight: 18,
    },
    googleButton: {
        width: '100%',
        height: 52,
        borderRadius: 26,
        flexDirection: 'row',
        justifyContent: 'center',
        alignItems: 'center',
        gap: 8,
        marginTop: 8,
    },
    googleButtonText: {
        color: '#FFFFFF',
        fontSize: 15,
        fontWeight: '700',
        fontFamily: 'Poppins_700Bold',
    },
    backBtn: {
        width: '100%',
        height: 48,
        justifyContent: 'center',
        alignItems: 'center',
    },
    backBtnText: {
        fontSize: 15,
        fontWeight: '600',
        fontFamily: 'Poppins_600SemiBold',
    },
});
