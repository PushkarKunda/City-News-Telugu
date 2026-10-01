import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  Modal,
  TouchableOpacity,
  ScrollView,
  Platform,
  Dimensions,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { Colors } from '@/constants/Colors';
import { useAppColorScheme } from '@/hooks/useAppColorScheme';

const { height: screenHeight } = Dimensions.get('window');

const CATEGORY_ICONS: Record<string, keyof typeof Ionicons.glyphMap> = {
  'for-you': 'sparkles',
  politics: 'business',
  cinema: 'film',
  movies: 'film',
  sports: 'football',
  cricket: 'tennisball',
  crime: 'alert-circle-outline',
  business: 'trending-up',
  technology: 'hardware-chip',
  spiritual: 'flower',
  devotional: 'flower',
  lifestyle: 'heart',
  health: 'medkit',
  education: 'school',
  jobs: 'briefcase',
  agriculture: 'leaf',
  auto: 'car',
  international: 'globe',
  national: 'flag',
};

const CATEGORY_TELUGU: Record<string, string> = {
  'for-you': 'మీ కోసం',
  politics: 'రాజకీయాలు',
  cinema: 'సినిమా',
  movies: 'సినిమా',
  sports: 'క్రీడలు',
  crime: 'నేరాలు',
  business: 'వ్యాపారం',
  technology: 'టెక్నాలజీ',
  spiritual: 'ఆధ్యాత్మికం',
  health: 'ఆరోగ్యం',
  education: 'విద్య',
  jobs: 'ఉద్యోగాలు',
  agriculture: 'వ్యవసాయం',
  national: 'జాతీయం',
  international: 'అంతర్జాతీయం',
};

export interface CategoryTabItem {
  id: 'for-you' | number;
  name: string;
  color?: string;
}

interface CategoryExplorerModalProps {
  visible: boolean;
  onClose: () => void;
  categories: CategoryTabItem[];
  activeCategoryId: 'for-you' | number;
  onSelectCategory: (id: 'for-you' | number) => void;
}

export function CategoryExplorerModal({
  visible,
  onClose,
  categories,
  activeCategoryId,
  onSelectCategory,
}: CategoryExplorerModalProps) {
  const colorScheme = useAppColorScheme();
  const colors = Colors[colorScheme ?? 'light'];
  const isDark = colorScheme === 'dark';

  const handleSelect = (id: 'for-you' | number) => {
    if (Platform.OS !== 'web') {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    }
    onSelectCategory(id);
    onClose();
  };

  const getIconName = (name: string): keyof typeof Ionicons.glyphMap => {
    const key = name.toLowerCase().trim();
    return CATEGORY_ICONS[key] || 'newspaper-outline';
  };

  const getTeluguLabel = (name: string): string | null => {
    const key = name.toLowerCase().trim();
    return CATEGORY_TELUGU[key] || null;
  };

  return (
    <Modal
      visible={visible}
      animationType="slide"
      transparent={true}
      onRequestClose={onClose}
    >
      <View style={[styles.modalOverlay, { backgroundColor: colors.modalOverlay }]}>
        <TouchableOpacity style={styles.backdrop} activeOpacity={1} onPress={onClose} />

        <View
          style={[
            styles.modalContainer,
            {
              backgroundColor: colors.sheet,
              borderTopColor: isDark ? colors.borderGlass : colors.border,
            },
          ]}
        >
          {/* Sheet Handle */}
          <View
            style={[
              styles.sheetHandle,
              { backgroundColor: isDark ? 'rgba(99, 102, 241, 0.4)' : colors.indicator },
            ]}
          />

          {/* Header */}
          <View style={[styles.headerRow, { borderBottomColor: colors.divider }]}>
            <View style={styles.headerTitleWrap}>
              <Ionicons name="grid-outline" size={19} color={colors.primary} />
              <View style={{ marginLeft: 8 }}>
                <Text style={[styles.headerTitle, { color: colors.text }]}>
                  వార్తల విభాగాలు (Categories)
                </Text>
                <Text style={[styles.headerSubtitle, { color: colors.textSecondary }]}>
                  Explore all news topics
                </Text>
              </View>
            </View>
            <TouchableOpacity
              onPress={onClose}
              style={[
                styles.closeBtn,
                { backgroundColor: isDark ? 'rgba(255,255,255,0.08)' : '#F1F5F9' },
              ]}
              hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
            >
              <Ionicons name="close" size={20} color={colors.textSecondary} />
            </TouchableOpacity>
          </View>

          {/* Category Grid */}
          <ScrollView
            style={styles.scrollArea}
            contentContainerStyle={styles.gridContainer}
            showsVerticalScrollIndicator={false}
          >
            {categories.map((cat) => {
              const isActive = activeCategoryId === cat.id;
              const iconName = getIconName(cat.name);
              const teLabel = getTeluguLabel(cat.name);
              const brandColor = cat.color || colors.primary;

              return (
                <TouchableOpacity
                  key={`cat-modal-${cat.id}`}
                  style={[
                    styles.catCard,
                    {
                      backgroundColor: isActive
                        ? isDark
                          ? 'rgba(99, 102, 241, 0.22)'
                          : 'rgba(70, 72, 212, 0.12)'
                        : isDark
                        ? '#171725'
                        : '#FFFFFF',
                      borderColor: isActive ? brandColor : colors.border,
                    },
                  ]}
                  onPress={() => handleSelect(cat.id)}
                  activeOpacity={0.7}
                >
                  <View
                    style={[
                      styles.iconWrap,
                      {
                        backgroundColor: isActive
                          ? brandColor
                          : isDark
                          ? 'rgba(255,255,255,0.06)'
                          : 'rgba(70, 72, 212, 0.08)',
                      },
                    ]}
                  >
                    <Ionicons
                      name={iconName}
                      size={18}
                      color={isActive ? '#FFFFFF' : brandColor}
                    />
                  </View>

                  <View style={styles.catTextWrap}>
                    <Text
                      style={[
                        styles.catName,
                        {
                          color: isActive ? brandColor : colors.text,
                          fontFamily: isActive ? 'Poppins_700Bold' : 'Poppins_600SemiBold',
                        },
                      ]}
                      numberOfLines={1}
                    >
                      {cat.name}
                    </Text>
                    {teLabel && (
                      <Text
                        style={[
                          styles.catTeName,
                          { color: isActive ? brandColor : colors.textSecondary },
                        ]}
                        numberOfLines={1}
                      >
                        {teLabel}
                      </Text>
                    )}
                  </View>

                  {isActive && (
                    <Ionicons
                      name="checkmark-circle"
                      size={16}
                      color={brandColor}
                      style={{ marginLeft: 4 }}
                    />
                  )}
                </TouchableOpacity>
              );
            })}
          </ScrollView>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  modalOverlay: {
    flex: 1,
    justifyContent: 'flex-end',
  },
  backdrop: {
    flex: 1,
  },
  modalContainer: {
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    borderTopWidth: 1.5,
    maxHeight: screenHeight * 0.72,
    minHeight: screenHeight * 0.45,
    paddingTop: 10,
    paddingBottom: Platform.OS === 'ios' ? 24 : 16,
  },
  sheetHandle: {
    width: 44,
    height: 4.5,
    borderRadius: 3,
    alignSelf: 'center',
    marginBottom: 12,
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingBottom: 12,
    borderBottomWidth: 1,
  },
  headerTitleWrap: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  headerTitle: {
    fontSize: 16,
    fontFamily: 'Poppins_700Bold',
    lineHeight: 20,
  },
  headerSubtitle: {
    fontSize: 11,
    fontFamily: 'Poppins_400Regular',
    marginTop: 1,
  },
  closeBtn: {
    width: 32,
    height: 32,
    borderRadius: 16,
    justifyContent: 'center',
    alignItems: 'center',
  },
  scrollArea: {
    paddingHorizontal: 20,
    paddingTop: 14,
  },
  gridContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
    paddingBottom: 20,
  },
  catCard: {
    width: '48.2%',
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderRadius: 12,
    borderWidth: 1,
  },
  iconWrap: {
    width: 32,
    height: 32,
    borderRadius: 8,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 10,
  },
  catTextWrap: {
    flex: 1,
  },
  catName: {
    fontSize: 13,
    lineHeight: 18,
  },
  catTeName: {
    fontSize: 11,
    fontFamily: 'Poppins_400Regular',
    marginTop: 1,
  },
});
