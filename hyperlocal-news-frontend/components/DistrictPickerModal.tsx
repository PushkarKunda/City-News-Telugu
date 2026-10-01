import React, { useState, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Modal,
  TouchableOpacity,
  TextInput,
  ScrollView,
  Platform,
  Dimensions,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { Colors } from '@/constants/Colors';
import { useAppColorScheme } from '@/hooks/useAppColorScheme';
import { useDistrictsList } from '@/hooks/useApi';

const { height: screenHeight } = Dimensions.get('window');

// ═══════════════════════════════════════════════════════════════════════════
// CURATED DISTRICT FALLBACKS (Instant 0-latency load for AP & Telangana)
// ═══════════════════════════════════════════════════════════════════════════

interface DistrictItem {
  id: number;
  name: string;
  nameTe?: string;
  stateId: number;
}

const AP_FALLBACK_DISTRICTS: DistrictItem[] = [
  { id: 1, name: 'Visakhapatnam', nameTe: 'విశాఖపట్నం', stateId: 1 },
  { id: 2, name: 'Vijayawada', nameTe: 'విజయవాడ', stateId: 1 },
  { id: 3, name: 'Guntur', nameTe: 'గుంటూరు', stateId: 1 },
  { id: 4, name: 'Tirupati', nameTe: 'తిరుపతి', stateId: 1 },
  { id: 5, name: 'Kurnool', nameTe: 'కర్నూలు', stateId: 1 },
  { id: 6, name: 'Nellore', nameTe: 'నెల్లూరు', stateId: 1 },
  { id: 7, name: 'Kakinada', nameTe: 'కాకినాడ', stateId: 1 },
  { id: 8, name: 'Rajahmundry', nameTe: 'రాజమండ్రి', stateId: 1 },
  { id: 9, name: 'Kadapa', nameTe: 'కడప', stateId: 1 },
  { id: 10, name: 'Anantapur', nameTe: 'అనంతపురం', stateId: 1 },
  { id: 11, name: 'Chittoor', nameTe: 'చిత్తూరు', stateId: 1 },
  { id: 12, name: 'Prakasam (Ongole)', nameTe: 'ప్రకాశం', stateId: 1 },
  { id: 13, name: 'Eluru', nameTe: 'ఏలూరు', stateId: 1 },
  { id: 14, name: 'Bapatla', nameTe: 'బాపట్ల', stateId: 1 },
  { id: 15, name: 'Palnadu', nameTe: 'పల్నాడు', stateId: 1 },
  { id: 16, name: 'Srikakulam', nameTe: 'శ్రీకాకుళం', stateId: 1 },
  { id: 17, name: 'Vizianagaram', nameTe: 'విజయనగరం', stateId: 1 },
  { id: 18, name: 'Nandyal', nameTe: 'నంద్యాల', stateId: 1 },
  { id: 19, name: 'Annamayya', nameTe: 'అన్నమయ్య', stateId: 1 },
  { id: 20, name: 'Konaseema', nameTe: 'కోనసీమ', stateId: 1 },
];

const TS_FALLBACK_DISTRICTS: DistrictItem[] = [
  { id: 101, name: 'Hyderabad', nameTe: 'హైదరాబాద్', stateId: 2 },
  { id: 102, name: 'Warangal', nameTe: 'వరంగల్', stateId: 2 },
  { id: 103, name: 'Karimnagar', nameTe: 'కరీంనగర్', stateId: 2 },
  { id: 104, name: 'Nizamabad', nameTe: 'నిజామాబాద్', stateId: 2 },
  { id: 105, name: 'Khammam', nameTe: 'ఖమ్మం', stateId: 2 },
  { id: 106, name: 'Nalgonda', nameTe: 'నల్గొండ', stateId: 2 },
  { id: 107, name: 'Mahabubnagar', nameTe: 'మహబూబ్ నగర్', stateId: 2 },
  { id: 108, name: 'Rangareddy', nameTe: 'రంగారెడ్డి', stateId: 2 },
  { id: 109, name: 'Medchal-Malkajgiri', nameTe: 'మేడ్చల్', stateId: 2 },
  { id: 110, name: 'Sangareddy', nameTe: 'సంగారెడ్డి', stateId: 2 },
  { id: 111, name: 'Siddipet', nameTe: 'సిద్దిపేట', stateId: 2 },
  { id: 112, name: 'Suryapet', nameTe: 'సూర్యాపేట', stateId: 2 },
  { id: 113, name: 'Mancherial', nameTe: 'మంచిర్యాల', stateId: 2 },
  { id: 114, name: 'Adilabad', nameTe: 'ఆదిలాబాద్', stateId: 2 },
  { id: 115, name: 'Jagtial', nameTe: 'జగిత్యాల', stateId: 2 },
  { id: 116, name: 'Kamareddy', nameTe: 'కామారెడ్డి', stateId: 2 },
  { id: 117, name: 'Bhadradri Kothagudem', nameTe: 'కొత్తగూడెం', stateId: 2 },
  { id: 118, name: 'Vikarabad', nameTe: 'వికారాబాద్', stateId: 2 },
  { id: 119, name: 'Wanaparthy', nameTe: 'వనపర్తి', stateId: 2 },
  { id: 120, name: 'Peddapalli', nameTe: 'పెద్దపల్లి', stateId: 2 },
];

export interface SelectedDistrictPayload {
  districtId: number;
  districtName: string;
  stateId: number;
  stateName: string;
}

interface DistrictPickerModalProps {
  visible: boolean;
  onClose: () => void;
  currentDistrictName?: string | null;
  currentStateId?: number | null;
  onSelectDistrict: (payload: SelectedDistrictPayload) => void;
  onOpenAdvancedSettings?: () => void;
}

export function DistrictPickerModal({
  visible,
  onClose,
  currentDistrictName,
  currentStateId = 1,
  onSelectDistrict,
  onOpenAdvancedSettings,
}: DistrictPickerModalProps) {
  const colorScheme = useAppColorScheme();
  const colors = Colors[colorScheme ?? 'light'];
  const isDark = colorScheme === 'dark';

  const [activeStateTab, setActiveStateTab] = useState<'ap' | 'ts'>(
    currentStateId === 2 ? 'ts' : 'ap'
  );
  const [searchQuery, setSearchQuery] = useState('');

  // Live API districts with fallback
  const { data: apiDistricts = [] } = useDistrictsList(activeStateTab);

  const displayedDistricts = useMemo(() => {
    const fallbackList = activeStateTab === 'ap' ? AP_FALLBACK_DISTRICTS : TS_FALLBACK_DISTRICTS;
    
    // Combine API data if available or use curated fallback
    let list: DistrictItem[] = [];
    if (apiDistricts && apiDistricts.length > 0) {
      list = apiDistricts.map((d: any) => {
        const match = fallbackList.find(
          (f) => f.name.toLowerCase() === d.name.toLowerCase()
        );
        return {
          id: d.backendId || d.id,
          name: d.name,
          nameTe: match?.nameTe,
          stateId: activeStateTab === 'ap' ? 1 : 2,
        };
      });
    } else {
      list = fallbackList;
    }

    if (!searchQuery.trim()) return list;

    const q = searchQuery.toLowerCase().trim();
    return list.filter(
      (item) =>
        item.name.toLowerCase().includes(q) ||
        (item.nameTe && item.nameTe.includes(q))
    );
  }, [activeStateTab, apiDistricts, searchQuery]);

  const handleSelect = (item: DistrictItem) => {
    if (Platform.OS !== 'web') {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    }
    const stateName = activeStateTab === 'ap' ? 'Andhra Pradesh' : 'Telangana';
    onSelectDistrict({
      districtId: item.id,
      districtName: item.name,
      stateId: activeStateTab === 'ap' ? 1 : 2,
      stateName,
    });
    onClose();
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
              <Ionicons name="location" size={20} color={colors.primary} />
              <View style={{ marginLeft: 8 }}>
                <Text style={[styles.headerTitle, { color: colors.text }]}>
                  జిల్లా ఎంచుకోండి
                </Text>
                <Text style={[styles.headerSubtitle, { color: colors.textSecondary }]}>
                  Select District / City News
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

          {/* State Switcher Pills */}
          <View style={[styles.statePillsRow, { backgroundColor: isDark ? '#161622' : '#F1F5F9' }]}>
            <TouchableOpacity
              style={[
                styles.statePill,
                activeStateTab === 'ap' && {
                  backgroundColor: colors.primary,
                  shadowColor: colors.primary,
                  shadowOffset: { width: 0, height: 2 },
                  shadowOpacity: 0.3,
                  shadowRadius: 4,
                  elevation: 3,
                },
              ]}
              onPress={() => {
                if (Platform.OS !== 'web') Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                setActiveStateTab('ap');
              }}
              activeOpacity={0.8}
            >
              <Text
                style={[
                  styles.statePillText,
                  { color: activeStateTab === 'ap' ? '#FFFFFF' : colors.textSecondary },
                ]}
              >
                ఆంధ్రప్రదేశ్ (AP)
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[
                styles.statePill,
                activeStateTab === 'ts' && {
                  backgroundColor: colors.primary,
                  shadowColor: colors.primary,
                  shadowOffset: { width: 0, height: 2 },
                  shadowOpacity: 0.3,
                  shadowRadius: 4,
                  elevation: 3,
                },
              ]}
              onPress={() => {
                if (Platform.OS !== 'web') Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                setActiveStateTab('ts');
              }}
              activeOpacity={0.8}
            >
              <Text
                style={[
                  styles.statePillText,
                  { color: activeStateTab === 'ts' ? '#FFFFFF' : colors.textSecondary },
                ]}
              >
                తెలంగాణ (Telangana)
              </Text>
            </TouchableOpacity>
          </View>

          {/* Search Box */}
          <View
            style={[
              styles.searchBox,
              {
                backgroundColor: isDark ? '#181826' : '#F8FAFC',
                borderColor: colors.border,
              },
            ]}
          >
            <Ionicons name="search" size={17} color={colors.textTertiary} />
            <TextInput
              style={[styles.searchInput, { color: colors.text }]}
              placeholder="Search district / వెతకండి..."
              placeholderTextColor={colors.textTertiary}
              value={searchQuery}
              onChangeText={setSearchQuery}
              autoCorrect={false}
              clearButtonMode="while-editing"
            />
            {searchQuery.length > 0 && (
              <TouchableOpacity onPress={() => setSearchQuery('')}>
                <Ionicons name="close-circle" size={18} color={colors.textTertiary} />
              </TouchableOpacity>
            )}
          </View>

          {/* Districts List / Grid */}
          <ScrollView
            style={styles.districtsScroll}
            contentContainerStyle={styles.districtsGrid}
            showsVerticalScrollIndicator={false}
            keyboardShouldPersistTaps="handled"
          >
            {displayedDistricts.map((item) => {
              const isSelected =
                currentDistrictName &&
                currentDistrictName.toLowerCase() === item.name.toLowerCase();

              return (
                <TouchableOpacity
                  key={`dist-${item.id}-${item.name}`}
                  style={[
                    styles.districtCard,
                    {
                      backgroundColor: isSelected
                        ? isDark
                          ? 'rgba(99, 102, 241, 0.22)'
                          : 'rgba(70, 72, 212, 0.12)'
                        : isDark
                        ? '#171725'
                        : '#FFFFFF',
                      borderColor: isSelected ? colors.primary : colors.border,
                    },
                  ]}
                  onPress={() => handleSelect(item)}
                  activeOpacity={0.7}
                >
                  <View style={styles.districtCardContent}>
                    <Text
                      style={[
                        styles.districtName,
                        {
                          color: isSelected ? colors.primary : colors.text,
                          fontFamily: isSelected ? 'Poppins_700Bold' : 'Poppins_500Medium',
                        },
                      ]}
                      numberOfLines={1}
                    >
                      {item.name}
                    </Text>
                    {item.nameTe && (
                      <Text
                        style={[
                          styles.districtNameTe,
                          {
                            color: isSelected ? colors.primary : colors.textSecondary,
                          },
                        ]}
                        numberOfLines={1}
                      >
                        {item.nameTe}
                      </Text>
                    )}
                  </View>
                  {isSelected && (
                    <Ionicons
                      name="checkmark-circle"
                      size={18}
                      color={colors.primary}
                      style={{ marginLeft: 6 }}
                    />
                  )}
                </TouchableOpacity>
              );
            })}

            {displayedDistricts.length === 0 && (
              <View style={styles.emptyWrap}>
                <Ionicons name="location-outline" size={36} color={colors.textTertiary} />
                <Text style={[styles.emptyText, { color: colors.textSecondary }]}>
                  No districts found for &quot;{searchQuery}&quot;
                </Text>
              </View>
            )}
          </ScrollView>

          {/* Footer: GPS & Detailed Mandal Setup */}
          {onOpenAdvancedSettings && (
            <View style={[styles.footerRow, { borderTopColor: colors.divider }]}>
              <TouchableOpacity
                style={styles.advancedBtn}
                onPress={() => {
                  onClose();
                  onOpenAdvancedSettings();
                }}
                activeOpacity={0.7}
              >
                <Ionicons name="navigate-circle-outline" size={17} color={colors.primary} />
                <Text style={[styles.advancedBtnText, { color: colors.primary }]}>
                  GPS Auto-detect & Mandal / Village Settings →
                </Text>
              </TouchableOpacity>
            </View>
          )}
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
    maxHeight: screenHeight * 0.82,
    minHeight: screenHeight * 0.55,
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
  statePillsRow: {
    flexDirection: 'row',
    marginHorizontal: 20,
    marginTop: 14,
    marginBottom: 12,
    padding: 4,
    borderRadius: 12,
  },
  statePill: {
    flex: 1,
    paddingVertical: 9,
    borderRadius: 9,
    alignItems: 'center',
    justifyContent: 'center',
  },
  statePillText: {
    fontSize: 13,
    fontFamily: 'Poppins_600SemiBold',
  },
  searchBox: {
    flexDirection: 'row',
    alignItems: 'center',
    marginHorizontal: 20,
    marginBottom: 12,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 12,
    borderWidth: 1,
    gap: 8,
  },
  searchInput: {
    flex: 1,
    fontSize: 13,
    fontFamily: 'Poppins_400Regular',
    padding: 0,
  },
  districtsScroll: {
    paddingHorizontal: 20,
  },
  districtsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
    paddingBottom: 16,
  },
  districtCard: {
    width: '48.2%',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderRadius: 12,
    borderWidth: 1,
  },
  districtCardContent: {
    flex: 1,
  },
  districtName: {
    fontSize: 13,
    lineHeight: 18,
  },
  districtNameTe: {
    fontSize: 11,
    fontFamily: 'Poppins_400Regular',
    marginTop: 2,
  },
  emptyWrap: {
    width: '100%',
    alignItems: 'center',
    paddingVertical: 36,
    gap: 8,
  },
  emptyText: {
    fontSize: 13,
    fontFamily: 'Poppins_400Regular',
  },
  footerRow: {
    paddingHorizontal: 20,
    paddingTop: 12,
    borderTopWidth: 1,
    alignItems: 'center',
  },
  advancedBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  advancedBtnText: {
    fontSize: 12,
    fontFamily: 'Poppins_600SemiBold',
  },
});
