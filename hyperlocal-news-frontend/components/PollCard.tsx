import React, { useState, useEffect, useRef, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Share,
  Animated,
  Platform,
  Linking,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import * as Haptics from 'expo-haptics';
import { PollItem } from '@/services/api/polls';
import { useCastVote } from '@/hooks/usePolls';
import { Colors } from '@/constants/Colors';
import { useAppColorScheme } from '@/hooks/useAppColorScheme';

interface PollCardProps {
  item: PollItem;
  containerHeight: number;
  votedOptionIndex?: number | null;
  onToggleUI?: () => void;
}

export const PollCard = React.memo(
  ({
    item,
    containerHeight,
    votedOptionIndex = null,
    onToggleUI,
  }: PollCardProps) => {
    const colorScheme = useAppColorScheme();
    const colors = Colors[colorScheme ?? 'light'];
    const isDark = colorScheme === 'dark';

    const { mutate: castVote } = useCastVote();

    const options = Array.isArray(item?.options) ? item.options : [];
    const votes = Array.isArray(item?.votes) ? item.votes : [];

    // Local optimistic vote state
    const [selectedOption, setSelectedOption] = useState<number | null>(
      votedOptionIndex !== undefined ? votedOptionIndex : null
    );
    const [votesList, setVotesList] = useState<number[]>(
      votes.length === options.length
        ? votes
        : new Array(options.length).fill(100)
    );
    const [totalVotes, setTotalVotes] = useState(item?.total_votes || 100);

    useEffect(() => {
      if (votes.length === options.length) {
        setVotesList(votes);
      }
      if (item?.total_votes != null) {
        setTotalVotes(item.total_votes);
      }
      if (votedOptionIndex !== undefined && votedOptionIndex !== null) {
        setSelectedOption(votedOptionIndex);
      }
    }, [item?.poll_uid, item?.total_votes, votes, options.length, votedOptionIndex]);

    const hasVoted = selectedOption !== null;

    const calculatePercentages = useMemo(() => {
      const total = totalVotes > 0 ? totalVotes : 1;
      return votesList.map((v) => Math.round((v / total) * 100));
    }, [votesList, totalVotes]);

    const handleVote = (optionIndex: number) => {
      if (hasVoted) return;

      if (Platform.OS !== 'web') {
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
      }

      setSelectedOption(optionIndex);

      // Optimistically update votes
      const nextVotes = [...votesList];
      nextVotes[optionIndex] = (nextVotes[optionIndex] || 0) + 1;
      setVotesList(nextVotes);
      setTotalVotes((prev) => prev + 1);

      castVote?.({
        poll_uid: item.poll_uid,
        option_index: optionIndex,
      });
    };

    const handleSharePoll = async (viaWhatsApp = false) => {
      if (Platform.OS !== 'web') {
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
      }

      const resultsSummary = options
        .map((opt, idx) => `• ${opt}: ${calculatePercentages[idx] || 0}%`)
        .join('\n');

      const message = `📊 *ప్రజాభిప్రాయ సేకరణ (City News Telugu Poll)*\n\n📌 *${item.question}*\n\n${
        hasVoted ? `ప్రస్తుత ఫలితాలు (Current Results):\n${resultsSummary}\n\n` : ''
      }📲 మీ అభిప్రాయాన్ని తెలపండి & పూర్తి ఫలితాలు చూడండి: https://citynewstelugu.com/polls/${item.poll_uid}\n\n#CityNewsTelugu #PublicOpinion #TeluguPolls`;

      if (viaWhatsApp) {
        try {
          const url = `whatsapp://send?text=${encodeURIComponent(message)}`;
          const canOpen = await Linking.canOpenURL(url);
          if (canOpen) {
            await Linking.openURL(url);
            return;
          }
        } catch (_) {}
      }

      try {
        await Share.share({
          message,
          title: item.question,
        });
      } catch (_) {}
    };

    return (
      <View
        style={[
          styles.container,
          { height: containerHeight, backgroundColor: colors.background },
        ]}
      >
        <LinearGradient
          colors={
            isDark
              ? ['#0F172A', '#13122A', '#0B0B14']
              : ['#EEF2FF', '#F8FAFC', '#FFFFFF']
          }
          style={StyleSheet.absoluteFillObject}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
        />

        {/* Ambient Top Glow */}
        <View
          style={[
            styles.glowAccent,
            { backgroundColor: isDark ? 'rgba(99, 102, 241, 0.15)' : 'rgba(70, 72, 212, 0.08)' },
          ]}
        />

        <View style={styles.innerContent}>
          {/* Top Pill Row */}
          <TouchableOpacity
            style={styles.topRow}
            activeOpacity={0.9}
            onPress={onToggleUI}
          >
            <View style={[styles.pollBadge, { backgroundColor: isDark ? '#1E1B4B' : '#E0E7FF' }]}>
              <View style={styles.pulsingDot} />
              <Text style={[styles.pollBadgeText, { color: isDark ? '#A5B4FC' : '#4338CA' }]}>
                ప్రజాభిప్రాయం (LIVE POLL)
              </Text>
            </View>

            {item.category && (
              <View
                style={[
                  styles.categoryPill,
                  { backgroundColor: isDark ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.04)' },
                ]}
              >
                <Text style={[styles.categoryText, { color: colors.textSecondary }]}>
                  {item.category}
                </Text>
              </View>
            )}
          </TouchableOpacity>

          {/* Question & Meta */}
          <TouchableOpacity
            style={styles.questionSection}
            activeOpacity={0.9}
            onPress={onToggleUI}
          >
            <Text style={[styles.questionText, { color: colors.text }]}>
              {item.question}
            </Text>

            <View style={styles.metaRow}>
              <Ionicons name="people-outline" size={15} color={colors.textTertiary} />
              <Text style={[styles.metaText, { color: colors.textSecondary }]}>
                {totalVotes.toLocaleString()} మంది పాల్గొన్నారు (Votes)
              </Text>
            </View>
          </TouchableOpacity>

          {/* Options / Live Results */}
          <View style={styles.optionsSection}>
            {options.map((optionText, idx) => {
              const isSelected = selectedOption === idx;
              const percent = calculatePercentages[idx] || 0;

              return (
                <TouchableOpacity
                  key={`poll-opt-${idx}`}
                  style={[
                    styles.optionCard,
                    {
                      backgroundColor: isDark ? '#181829' : '#FFFFFF',
                      borderColor: isSelected
                        ? colors.primary
                        : isDark
                        ? '#27273E'
                        : '#E2E8F0',
                    },
                    isSelected && {
                      borderWidth: 2,
                    },
                  ]}
                  onPress={() => handleVote(idx)}
                  activeOpacity={hasVoted ? 1 : 0.8}
                >
                  {/* Animated Progress Fill for Voted State */}
                  {hasVoted && (
                    <View
                      style={[
                        styles.progressBarFill,
                        {
                          width: `${percent}%`,
                          backgroundColor: isSelected
                            ? isDark
                              ? 'rgba(99, 102, 241, 0.35)'
                              : 'rgba(70, 72, 212, 0.2)'
                            : isDark
                            ? 'rgba(255, 255, 255, 0.08)'
                            : 'rgba(0, 0, 0, 0.05)',
                        },
                      ]}
                    />
                  )}

                  <View style={styles.optionContentRow}>
                    <View style={styles.optionLabelWrap}>
                      <View
                        style={[
                          styles.optionIndexBadge,
                          {
                            backgroundColor: isSelected
                              ? colors.primary
                              : isDark
                              ? 'rgba(255,255,255,0.08)'
                              : '#F1F5F9',
                          },
                        ]}
                      >
                        {isSelected ? (
                          <Ionicons name="checkmark" size={12} color="#FFFFFF" />
                        ) : (
                          <Text
                            style={[
                              styles.optionIndexText,
                              { color: colors.textSecondary },
                            ]}
                          >
                            {String.fromCharCode(65 + idx)}
                          </Text>
                        )}
                      </View>

                      <Text
                        style={[
                          styles.optionText,
                          {
                            color: isSelected ? colors.primary : colors.text,
                            fontFamily: isSelected
                              ? 'Poppins_600SemiBold'
                              : 'Poppins_500Medium',
                          },
                        ]}
                        numberOfLines={2}
                      >
                        {optionText}
                      </Text>
                    </View>

                    {hasVoted && (
                      <Text
                        style={[
                          styles.percentText,
                          {
                            color: isSelected ? colors.primary : colors.textSecondary,
                            fontFamily: isSelected
                              ? 'Poppins_700Bold'
                              : 'Poppins_600SemiBold',
                          },
                        ]}
                      >
                        {percent}%
                      </Text>
                    )}
                  </View>
                </TouchableOpacity>
              );
            })}
          </View>

          {/* Voted Banner / Footer */}
          <View style={styles.footerSection}>
            {hasVoted ? (
              <View style={styles.votedNotice}>
                <Ionicons name="checkmark-circle" size={16} color="#10B981" />
                <Text style={styles.votedNoticeText}>
                  మీ ఓటు నమోదైంది! (Vote Recorded)
                </Text>
              </View>
            ) : (
              <Text style={[styles.promptText, { color: colors.textTertiary }]}>
                మీ అభిప్రాయాన్ని తెలపడానికి ఏదైనా ఆప్షన్‌పై నొక్కండి
              </Text>
            )}

            {/* Sharing Bar */}
            <View style={styles.shareBarRow}>
              {/* WhatsApp 1-Tap Share */}
              <TouchableOpacity
                style={[styles.shareBtn, styles.whatsappShareBtn]}
                onPress={() => handleSharePoll(true)}
                activeOpacity={0.8}
              >
                <Ionicons name="logo-whatsapp" size={17} color="#FFFFFF" />
                <Text style={styles.whatsappShareText}>
                  ఫలితాలు షేర్ చేయండి (Share)
                </Text>
              </TouchableOpacity>

              {/* General Share */}
              <TouchableOpacity
                style={[
                  styles.iconOnlyShareBtn,
                  {
                    backgroundColor: isDark ? 'rgba(255,255,255,0.08)' : '#F1F5F9',
                    borderColor: colors.border,
                  },
                ]}
                onPress={() => handleSharePoll(false)}
                activeOpacity={0.7}
              >
                <Ionicons name="share-social-outline" size={17} color={colors.text} />
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </View>
    );
  }
);

PollCard.displayName = 'PollCard';

const styles = StyleSheet.create({
  container: {
    width: '100%',
    overflow: 'hidden',
    justifyContent: 'center',
  },
  glowAccent: {
    position: 'absolute',
    top: -60,
    left: '20%',
    width: 250,
    height: 250,
    borderRadius: 125,
  },
  innerContent: {
    flex: 1,
    paddingHorizontal: 22,
    paddingTop: 70,
    paddingBottom: 40,
    justifyContent: 'space-between',
  },
  topRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  pollBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 20,
    gap: 6,
  },
  pulsingDot: {
    width: 7,
    height: 7,
    borderRadius: 3.5,
    backgroundColor: '#EF4444',
  },
  pollBadgeText: {
    fontSize: 11,
    fontFamily: 'Poppins_700Bold',
    letterSpacing: 0.5,
  },
  categoryPill: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
  },
  categoryText: {
    fontSize: 11,
    fontFamily: 'Poppins_500Medium',
  },
  questionSection: {
    marginVertical: 14,
  },
  questionText: {
    fontSize: 21,
    fontFamily: 'Poppins_700Bold',
    lineHeight: 30,
    marginBottom: 8,
  },
  metaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  metaText: {
    fontSize: 12,
    fontFamily: 'Poppins_400Regular',
  },
  optionsSection: {
    gap: 12,
    marginVertical: 10,
  },
  optionCard: {
    borderRadius: 14,
    borderWidth: 1,
    overflow: 'hidden',
    position: 'relative',
    minHeight: 52,
    justifyContent: 'center',
  },
  progressBarFill: {
    position: 'absolute',
    top: 0,
    bottom: 0,
    left: 0,
  },
  optionContentRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 14,
    paddingVertical: 12,
    zIndex: 2,
  },
  optionLabelWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
    marginRight: 10,
    gap: 10,
  },
  optionIndexBadge: {
    width: 22,
    height: 22,
    borderRadius: 11,
    alignItems: 'center',
    justifyContent: 'center',
  },
  optionIndexText: {
    fontSize: 11,
    fontFamily: 'Poppins_600SemiBold',
  },
  optionText: {
    fontSize: 14,
    lineHeight: 20,
    flex: 1,
  },
  percentText: {
    fontSize: 15,
  },
  footerSection: {
    gap: 12,
    marginTop: 'auto',
  },
  votedNotice: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
  },
  votedNoticeText: {
    color: '#10B981',
    fontSize: 12,
    fontFamily: 'Poppins_600SemiBold',
  },
  promptText: {
    fontSize: 11,
    fontFamily: 'Poppins_400Regular',
    textAlign: 'center',
  },
  shareBarRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  whatsappShareBtn: {
    backgroundColor: '#25D366',
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
    borderRadius: 12,
    gap: 8,
  },
  whatsappShareText: {
    color: '#FFFFFF',
    fontSize: 13,
    fontFamily: 'Poppins_600SemiBold',
  },
  iconOnlyShareBtn: {
    width: 44,
    height: 44,
    borderRadius: 12,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  shareBtn: {},
});
