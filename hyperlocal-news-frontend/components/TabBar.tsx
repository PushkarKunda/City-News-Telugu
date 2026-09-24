import React, { useEffect, useRef } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Animated, Platform } from 'react-native';
import { BottomTabBarProps } from '@react-navigation/bottom-tabs';
import { MaterialIcons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTabBarStore } from '@/store/tabBarStore';
import { Colors } from '@/constants/Colors';
import { useAppColorScheme } from '@/hooks/useAppColorScheme';

interface TabButtonProps {
    route: any;
    index: number;
    state: any;
    descriptors: any;
    navigation: any;
    colors: any;
    isDark: boolean;
}

const TabButton = React.memo(({ route, index, state, descriptors, navigation, colors, isDark }: TabButtonProps) => {
    const { options } = descriptors[route.key];
    const isFocused = state.index === index;
    const scaleAnim = useRef(new Animated.Value(1)).current;

    useEffect(() => {
        if (isFocused) {
            Animated.sequence([
                Animated.spring(scaleAnim, { toValue: 1.18, speed: 50, bounciness: 12, useNativeDriver: true }),
                Animated.spring(scaleAnim, { toValue: 1, speed: 40, bounciness: 8, useNativeDriver: true }),
            ]).start();
        }
    }, [isFocused]);

    const label =
        options.tabBarLabel !== null && options.tabBarLabel !== undefined
            ? options.tabBarLabel
            : options.title !== null && options.title !== undefined
                ? options.title
                : route.name;

    const onPress = () => {
        const event = navigation.emit({
            type: 'tabPress',
            target: route.key,
            canPreventDefault: true,
        });

        if (!isFocused && !event.defaultPrevented) {
            navigation.navigate(route.name, route.params);
        }
    };

    const onLongPress = () => {
        navigation.emit({
            type: 'tabLongPress',
            target: route.key,
        });
    };

    let iconName: any = 'home';
    if (route.name === 'index') iconName = 'home';
    else if (route.name === 'posts') iconName = 'dynamic-feed';
    else if (route.name === 'shorts') iconName = 'play-circle-outline';
    else if (route.name === 'local') iconName = 'near-me';
    else if (route.name === 'discover') iconName = 'explore';
    else if (route.name === 'more') iconName = 'more-horiz';

    const color = isFocused ? colors.primary : colors.textTertiary;

    return (
        <TouchableOpacity
            accessibilityRole="button"
            accessibilityState={isFocused ? { selected: true } : {}}
            accessibilityLabel={options.tabBarAccessibilityLabel}
            testID={(options as any).tabBarTestID}
            onPress={onPress}
            onLongPress={onLongPress}
            style={styles.tabButton}
            activeOpacity={0.7}
        >
            <Animated.View
                style={[
                    styles.iconWrapper,
                    isFocused && {
                        backgroundColor: isDark ? 'rgba(99, 102, 241, 0.16)' : 'rgba(70, 72, 212, 0.08)',
                    },
                    { transform: [{ scale: scaleAnim }] },
                ]}
            >
                <MaterialIcons name={iconName} size={22} color={color} />
            </Animated.View>
            <Text
                style={[
                    styles.label,
                    {
                        color,
                        fontFamily: isFocused ? 'Poppins_700Bold' : 'Poppins_500Medium',
                    },
                ]}
            >
                {label as string}
            </Text>
        </TouchableOpacity>
    );
});

export function TabBar({ state, descriptors, navigation }: BottomTabBarProps) {
    const colorScheme = useAppColorScheme();
    const colors = Colors[colorScheme ?? 'light'];
    const isDark = colorScheme === 'dark';
    const insets = useSafeAreaInsets();
    const bottomInset = Math.max(insets.bottom, Platform.OS === 'ios' ? 24 : 12);
    const tabHeight = 58 + bottomInset;

    const { visible } = useTabBarStore();
    const translateY = useRef(new Animated.Value(0)).current;

    // Inspect route descriptors to check if tabBarStyle has display: 'none' (e.g. for secondary screens)
    const activeRoute = state.routes[state.index];
    const activeDescriptor = descriptors[activeRoute.key];
    const activeOptions = activeDescriptor?.options;

    // Tab bar pop-up / hide is controlled dynamically on index (home) and shorts feeds
    const routeName = activeRoute?.name;
    const isFullscreenFeed = ['index', 'shorts'].includes(routeName);
    const isTabBarVisible = isFullscreenFeed ? visible : true;

    useEffect(() => {
        Animated.spring(translateY, {
            toValue: isTabBarVisible ? 0 : 150,
            useNativeDriver: true,
            tension: 60,
            friction: 9,
        }).start();
    }, [isTabBarVisible]);

    const isTabHiddenByScreen = activeOptions?.tabBarStyle &&
        (activeOptions.tabBarStyle as any).display === 'none';

    if (isTabHiddenByScreen) {
        return null;
    }

    const allowedTabs = ['index', 'posts', 'shorts', 'local', 'discover', 'more'];

    return (
        <Animated.View
            pointerEvents={isTabBarVisible ? 'auto' : 'none'}
            style={[
                styles.container,
                {
                    backgroundColor: colors.surface,
                    borderTopColor: colors.border,
                    transform: [{ translateY }],
                    height: tabHeight,
                    paddingBottom: bottomInset,
                    shadowColor: isDark ? '#000000' : '#4648D4',
                    shadowOpacity: isDark ? 0.35 : 0.08,
                    shadowRadius: 6,
                    elevation: 1000,
                    zIndex: 9999,
                },
            ]}
        >
            {state.routes.map((route, index) => {
                if (!allowedTabs.includes(route.name)) {
                    return null;
                }

                return (
                    <TabButton
                        key={route.key}
                        route={route}
                        index={index}
                        state={state}
                        descriptors={descriptors}
                        navigation={navigation}
                        colors={colors}
                        isDark={isDark}
                    />
                );
            })}
        </Animated.View>
    );
}

const styles = StyleSheet.create({
    container: {
        position: 'absolute',
        bottom: 0,
        left: 0,
        right: 0,
        flexDirection: 'row',
        alignItems: 'flex-start',
        justifyContent: 'space-around',
        borderTopWidth: StyleSheet.hairlineWidth,
        paddingTop: 6,
        zIndex: 9999,
        elevation: 1000,
    },
    tabButton: {
        flex: 1,
        alignItems: 'center',
        justifyContent: 'center',
    },
    iconWrapper: {
        paddingHorizontal: 12,
        paddingVertical: 3,
        borderRadius: 14,
        alignItems: 'center',
        justifyContent: 'center',
    },
    label: {
        fontSize: 10,
        marginTop: 2,
        textAlign: 'center',
    },
});
