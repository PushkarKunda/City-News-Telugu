import React, { useEffect, useRef } from 'react';
import { View, StyleSheet, Animated, ViewStyle, StyleProp } from 'react-native';
import { Colors } from '@/constants/Colors';
import { BorderRadius } from '@/constants/Spacing';

interface SkeletonProps {
  width?: ViewStyle['width'];
  height?: number;
  borderRadius?: number;
  style?: StyleProp<ViewStyle>;
  colorScheme?: 'light' | 'dark';
}

export function Skeleton({
  width = '100%',
  height = 20,
  borderRadius = BorderRadius.md,
  style,
  colorScheme = 'light',
}: SkeletonProps) {
  const colors = Colors[colorScheme];
  const animatedValue = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    const animation = Animated.loop(
      Animated.sequence([
        Animated.timing(animatedValue, {
          toValue: 1,
          duration: 1000,
          useNativeDriver: true,
        }),
        Animated.timing(animatedValue, {
          toValue: 0,
          duration: 1000,
          useNativeDriver: true,
        }),
      ])
    );
    animation.start();
    return () => animation.stop();
  }, [animatedValue]);

  const opacity = animatedValue.interpolate({
    inputRange: [0, 1],
    outputRange: [0.3, 0.7],
  });

  return (
    <Animated.View
      style={[
        styles.skeleton,
        {
          width,
          height,
          borderRadius,
          backgroundColor: colors.border,
          opacity,
        },
        style,
      ]}
    />
  );
}

// Preset Skeleton Components
export function SkeletonText({
  lines = 1,
  colorScheme = 'light',
}: {
  lines?: number;
  colorScheme?: 'light' | 'dark';
}) {
  return (
    <View style={styles.textContainer}>
      {Array.from({ length: lines }).map((_, index) => (
        <Skeleton
          key={index}
          height={14}
          width={index === lines - 1 ? '60%' : '100%'}
          style={index < lines - 1 ? styles.textLine : undefined}
          colorScheme={colorScheme}
        />
      ))}
    </View>
  );
}

export function SkeletonAvatar({
  size = 48,
  colorScheme = 'light',
}: {
  size?: number;
  colorScheme?: 'light' | 'dark';
}) {
  return (
    <Skeleton
      width={size}
      height={size}
      borderRadius={size / 2}
      colorScheme={colorScheme}
    />
  );
}

export function SkeletonCard({ colorScheme = 'light' }: { colorScheme?: 'light' | 'dark' }) {
  return (
    <View style={styles.cardContainer}>
      <Skeleton height={200} borderRadius={BorderRadius.xl} colorScheme={colorScheme} />
      <View style={styles.cardContent}>
        <Skeleton height={12} width={80} colorScheme={colorScheme} />
        <Skeleton height={20} style={styles.cardTitle} colorScheme={colorScheme} />
        <SkeletonText lines={2} colorScheme={colorScheme} />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  skeleton: {},
  textContainer: {
    gap: 8,
  },
  textLine: {
    marginBottom: 4,
  },
  cardContainer: {
    gap: 12,
  },
  cardContent: {
    gap: 8,
    paddingHorizontal: 4,
  },
  cardTitle: {
    marginVertical: 4,
  },
});