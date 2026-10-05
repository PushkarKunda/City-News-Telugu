import React, { useRef, useCallback, useMemo } from 'react';
import {
  View,
  ScrollView,
  StyleSheet,
  Animated,
  NativeSyntheticEvent,
  NativeScrollEvent,
  ScrollViewProps,
  StyleProp,
  ViewStyle,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';

export interface EdgeFadedScrollViewProps extends ScrollViewProps {
  /** The solid background color of the parent container to fade into (e.g. colors.surface) */
  fadeColor: string;
  /** Width of the edge gradient fade in pixels (default: 32) */
  fadeWidth?: number;
  /** Optional style for the outer relative wrapper container */
  containerStyle?: StyleProp<ViewStyle>;
  /** Children elements inside the horizontal scroll */
  children?: React.ReactNode;
}

/**
 * Converts a hex or rgb color to its transparent rgba equivalent to prevent
 * dark/gray interpolation artifacts in linear gradients on Android and Web.
 */
function getTransparentColor(color: string): string {
  if (!color) return 'transparent';
  if (color.startsWith('#')) {
    let hex = color.slice(1);
    if (hex.length === 3) {
      hex = hex.split('').map((c) => c + c).join('');
    }
    if (hex.length === 6 || hex.length === 8) {
      const r = parseInt(hex.slice(0, 2), 16);
      const g = parseInt(hex.slice(2, 4), 16);
      const b = parseInt(hex.slice(4, 6), 16);
      return `rgba(${r}, ${g}, ${b}, 0)`;
    }
  } else if (color.startsWith('rgb(')) {
    return color.replace('rgb(', 'rgba(').replace(')', ', 0)');
  } else if (color.startsWith('rgba(')) {
    return color.replace(/[\d\.]+\)$/, '0)');
  }
  return 'transparent';
}

/**
 * A horizontal ScrollView with soft edge gradient fades:
 * - Right fade: Hints that more scrollable content exists, fades out at the end.
 * - Left fade: Appears once the user scrolls right, fades out when returned to start.
 * - Pointer-events none: Touches and taps pass through directly to underlying chips.
 */
export const EdgeFadedScrollView = React.forwardRef<ScrollView, EdgeFadedScrollViewProps>(
  (
    {
      fadeColor,
      fadeWidth = 32,
      containerStyle,
      children,
      showsHorizontalScrollIndicator = false,
      scrollEventThrottle = 16,
      onScroll,
      onContentSizeChange,
      onLayout,
      ...restProps
    },
    ref
  ) => {
    const scrollOffsetRef = useRef(0);
    const contentWidthRef = useRef(0);
    const layoutWidthRef = useRef(0);

    const leftFadeOpacity = useRef(new Animated.Value(0)).current;
    const rightFadeOpacity = useRef(new Animated.Value(0)).current;

    const isLeftVisibleRef = useRef(false);
    const isRightVisibleRef = useRef(false);

    const transparentColor = useMemo(() => getTransparentColor(fadeColor), [fadeColor]);

    const updateFades = useCallback(
      (contentW: number, layoutW: number, scrollX: number) => {
        if (layoutW <= 0) return;

        const maxScroll = Math.max(0, contentW - layoutW);
        const canScroll = maxScroll > 2;

        // Show left fade once scrolled right past threshold (4px)
        const shouldShowLeft = canScroll && scrollX > 4;

        // Show right fade when there is scrollable content and we haven't reached the end
        const shouldShowRight = canScroll && scrollX < maxScroll - 4;

        if (shouldShowLeft !== isLeftVisibleRef.current) {
          isLeftVisibleRef.current = shouldShowLeft;
          Animated.timing(leftFadeOpacity, {
            toValue: shouldShowLeft ? 1 : 0,
            duration: 180,
            useNativeDriver: true,
          }).start();
        }

        if (shouldShowRight !== isRightVisibleRef.current) {
          isRightVisibleRef.current = shouldShowRight;
          Animated.timing(rightFadeOpacity, {
            toValue: shouldShowRight ? 1 : 0,
            duration: 180,
            useNativeDriver: true,
          }).start();
        }
      },
      [leftFadeOpacity, rightFadeOpacity]
    );

    const handleScroll = useCallback(
      (e: NativeSyntheticEvent<NativeScrollEvent>) => {
        const x = Math.max(0, e.nativeEvent.contentOffset.x);
        scrollOffsetRef.current = x;
        updateFades(contentWidthRef.current, layoutWidthRef.current, x);
        onScroll?.(e);
      },
      [updateFades, onScroll]
    );

    const handleContentSizeChange = useCallback(
      (w: number, h: number) => {
        contentWidthRef.current = w;
        updateFades(w, layoutWidthRef.current, scrollOffsetRef.current);
        onContentSizeChange?.(w, h);
      },
      [updateFades, onContentSizeChange]
    );

    const handleLayout = useCallback(
      (e: any) => {
        const w = e.nativeEvent.layout.width;
        layoutWidthRef.current = w;
        updateFades(contentWidthRef.current, w, scrollOffsetRef.current);
        onLayout?.(e);
      },
      [updateFades, onLayout]
    );

    return (
      <View style={[styles.container, containerStyle]}>
        <ScrollView
          ref={ref}
          horizontal
          showsHorizontalScrollIndicator={showsHorizontalScrollIndicator}
          scrollEventThrottle={scrollEventThrottle}
          onScroll={handleScroll}
          onContentSizeChange={handleContentSizeChange}
          onLayout={handleLayout}
          {...restProps}
          contentContainerStyle={[
            restProps.contentContainerStyle,
            { paddingEnd: Math.max(fadeWidth, 24), paddingRight: Math.max(fadeWidth, 24) },
          ]}
        >
          {children}
        </ScrollView>

        {/* Left edge fade */}
        <Animated.View
          pointerEvents="none"
          style={[
            styles.fadeBase,
            styles.fadeLeft,
            { width: fadeWidth, opacity: leftFadeOpacity },
          ]}
        >
          <LinearGradient
            pointerEvents="none"
            colors={[fadeColor, transparentColor]}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 0 }}
            style={StyleSheet.absoluteFill}
          />
        </Animated.View>

        {/* Right edge fade */}
        <Animated.View
          pointerEvents="none"
          style={[
            styles.fadeBase,
            styles.fadeRight,
            { width: fadeWidth, opacity: rightFadeOpacity },
          ]}
        >
          <LinearGradient
            pointerEvents="none"
            colors={[transparentColor, fadeColor]}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 0 }}
            style={StyleSheet.absoluteFill}
          />
        </Animated.View>
      </View>
    );
  }
);

EdgeFadedScrollView.displayName = 'EdgeFadedScrollView';

const styles = StyleSheet.create({
  container: {
    position: 'relative',
  },
  fadeBase: {
    position: 'absolute',
    top: 0,
    bottom: 0,
    zIndex: 2,
  },
  fadeLeft: {
    left: 0,
  },
  fadeRight: {
    right: 0,
  },
});
