import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { MaterialIcons } from '@expo/vector-icons';
import { Colors } from '@/constants/Colors';
import { Spacing } from '@/constants/Spacing';
import { useAppColorScheme } from '@/hooks/useAppColorScheme';

export function Header() {
  const colorScheme = useAppColorScheme();
  const colors = Colors[colorScheme ?? 'light'];
  const isDark = colorScheme === 'dark';
  const insets = useSafeAreaInsets();

  return (
    <View style={[
      styles.safePadding, 
      { 
        backgroundColor: colors.surface,
        paddingTop: insets.top 
      }
    ]}>
      <View style={[styles.container, { borderBottomColor: colors.border }]}>
        <TouchableOpacity style={styles.iconButton}>
          <MaterialIcons name="menu" size={28} color={colors.text} />
        </TouchableOpacity>

        <Text style={[styles.title, { color: colors.text }]}>
          <Text style={{ fontFamily: 'Poppins_700Bold' }}>Hyper</Text>
          <Text style={{ fontFamily: 'Poppins_700Bold', color: isDark ? '#818CF8' : colors.primary }}>Local</Text>
          <Text style={{ color: isDark ? '#818CF8' : colors.primary, fontFamily: 'Poppins_700Bold' }}>.</Text>
        </Text>

        <View style={styles.rightActions}>
          <TouchableOpacity style={styles.iconButton}>
            <MaterialIcons name="search" size={28} color={colors.text} />
          </TouchableOpacity>
          <TouchableOpacity style={styles.iconButton}>
            <MaterialIcons name="notifications-none" size={28} color={colors.text} />
          </TouchableOpacity>
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  safePadding: {
    zIndex: 10,
  },
  container: {
    height: 60,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: Spacing.md,
    borderBottomWidth: 1,
  },
  title: {
    fontSize: 21,
    fontFamily: 'Poppins_700Bold',
    fontWeight: '700',
    letterSpacing: -0.4,
  },
  rightActions: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  iconButton: {
    padding: 4,
    marginLeft: Spacing.sm,
  },
});
