import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  TextInput,
  LayoutAnimation,
  Platform,
  UIManager,
  Alert,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import { Colors } from '@/constants/Colors';
import { useAppColorScheme } from '@/hooks/useAppColorScheme';

// Enable LayoutAnimation for Android
if (Platform.OS === 'android') {
  if (UIManager.setLayoutAnimationEnabledExperimental) {
    UIManager.setLayoutAnimationEnabledExperimental(true);
  }
}

interface FAQItem {
  id: string;
  question: string;
  answer: string;
  category: string;
}

const FAQS: FAQItem[] = [
  {
    id: '1',
    category: 'General',
    question: 'What is HyperLocal News?',
    answer: 'HyperLocal is a community-driven news platform that connects you to neighborhood stories, real-time local updates, and events happening around you. We focus on bringing high-impact, verified local reporting to your fingertips.',
  },
  {
    id: '2',
    category: 'Publisher',
    question: 'How do I become a verified Publisher?',
    answer: 'Go to your Profile tab, click on "Get Verified to Publish" or edit your profile details, upload a valid local identifier or press verification documents, and fill out your publication details. Once reviewed by our regional moderators, you will receive a verified badge and publishing tools.',
  },
  {
    id: '3',
    category: 'Location',
    question: 'Can I track news in multiple locations?',
    answer: 'Yes! In the App Settings, select "Location". You can customize your state and preferred districts. You can also explore news worldwide via the "Discover" tab.',
  },
  {
    id: '4',
    category: 'Troubleshooting',
    question: 'Why am I not receiving notifications?',
    answer: 'First, ensure that notifications are enabled in HyperLocal App Settings. Second, check your device system settings to confirm that notifications are allowed for HyperLocal News. Re-install the app if the issue persists.',
  },
  {
    id: '5',
    category: 'General',
    question: 'How does the community reporting system work?',
    answer: 'Any user can flag inappropriate, misleading, or plagiarized articles. Our system uses a mixture of user-reporting thresholds and community moderators to review flagged articles to ensure factual accuracy and high quality.',
  },
];

export default function HelpSupportScreen() {
  const colorScheme = useAppColorScheme();
  const colors = Colors[colorScheme ?? 'light'];
  const insets = useSafeAreaInsets();
  const router = useRouter();

  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<'All' | 'General' | 'Publisher' | 'Location' | 'Troubleshooting'>('All');
  const [expandedFaqId, setExpandedFaqId] = useState<string | null>(null);

  // Support Request form states
  const [ticketCategory, setTicketCategory] = useState('Support Inquiry');
  const [ticketMessage, setTicketMessage] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const categories: ('All' | 'General' | 'Publisher' | 'Location' | 'Troubleshooting')[] = [
    'All',
    'General',
    'Publisher',
    'Location',
    'Troubleshooting',
  ];

  const handleToggleFaq = (id: string) => {
    LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
    if (expandedFaqId === id) {
      setExpandedFaqId(null);
    } else {
      setExpandedFaqId(id);
    }
  };

  const handleSubmitTicket = () => {
    if (!ticketMessage.trim()) {
      Alert.alert('Error', 'Please describe your query or issue before submitting.');
      return;
    }

    setIsSubmitting(true);
    // Simulate API call
    setTimeout(() => {
      setIsSubmitting(false);
      Alert.alert(
        'Ticket Submitted!',
        'Thank you for reaching out. Our support team will review your inquiry and respond within 24 hours.',
        [
          {
            text: 'OK',
            onPress: () => {
              setTicketMessage('');
            },
          },
        ]
      );
    }, 1200);
  };

  // Filter FAQs
  const filteredFaqs = FAQS.filter((faq) => {
    const matchesCategory = selectedCategory === 'All' || faq.category === selectedCategory;
    const matchesSearch =
      faq.question.toLowerCase().includes(searchQuery.toLowerCase()) ||
      faq.answer.toLowerCase().includes(searchQuery.toLowerCase());
    return matchesCategory && matchesSearch;
  });

  const isDark = colorScheme === 'dark';

  return (
    <View style={[styles.container, { backgroundColor: colors.background, paddingTop: insets.top }]}>
      {/* Background Gradient Blurs */}
      <View style={styles.purpleBlur} />
      <View style={styles.tealBlur} />

      {/* Symmetrical Header */}
      <View style={[styles.header, { borderBottomColor: colors.border }]}>
        <TouchableOpacity
          style={styles.headerLeftButton}
          onPress={() => router.push('/(tabs)/more')}
          activeOpacity={0.7}
        >
          <Ionicons name="arrow-back" size={22} color={colors.text} />
        </TouchableOpacity>
        
        <Text style={[styles.headerTitle, { color: colors.text }]}>Help & Support</Text>
      </View>

      <ScrollView
        contentContainerStyle={[styles.scrollContent, { paddingBottom: insets.bottom + 40 }]}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
      >
        {/* Help Hero section */}
        <View style={styles.heroSection}>
          <Text style={[styles.heroTitle, { color: colors.text }]}>How can we help you today?</Text>
          <Text style={[styles.heroSubtitle, { color: colors.textSecondary }]}>
            Find answers to common questions or reach out to our dedicated support team.
          </Text>

          {/* Search Box */}
          <View style={[styles.searchContainer, { backgroundColor: colors.card, borderColor: colors.border }]}>
            <Ionicons name="search-outline" size={20} color={colors.textTertiary} style={styles.searchIcon} />
            <TextInput
              placeholder="Search topics, questions..."
              placeholderTextColor={colors.textTertiary}
              value={searchQuery}
              onChangeText={setSearchQuery}
              style={[styles.searchInput, { color: colors.text }]}
            />
            {searchQuery ? (
              <TouchableOpacity onPress={() => setSearchQuery('')}>
                <Ionicons name="close-circle" size={18} color={colors.textTertiary} />
              </TouchableOpacity>
            ) : null}
          </View>
        </View>

        {/* Quick Help Bento Cards */}
        <View style={styles.section}>
          <Text style={[styles.sectionHeader, { color: colors.textSecondary }]}>DIRECT CHANNELS</Text>
          <View style={styles.bentoRow}>
            {/* Call Support Card */}
            <TouchableOpacity
              style={[styles.quickCard, { backgroundColor: colors.card, borderColor: colors.border }]}
              onPress={() => Alert.alert('Call Support', 'Connecting you to our helpline (toll-free): 1800-419-HYPER')}
              activeOpacity={0.75}
            >
              <View style={[styles.quickIconContainer, { backgroundColor: 'rgba(0, 106, 97, 0.08)' }]}>
                <Ionicons name="call-outline" size={22} color="#006A61" />
              </View>
              <Text style={[styles.quickTitle, { color: colors.text }]}>Call Helpline</Text>
              <Text style={[styles.quickDesc, { color: colors.textSecondary }]}>Toll-Free 24/7</Text>
            </TouchableOpacity>

            {/* Email Support Card */}
            <TouchableOpacity
              style={[styles.quickCard, { backgroundColor: colors.card, borderColor: colors.border }]}
              onPress={() => Alert.alert('Email Support', 'Please send your queries directly to support@hyperlocal.news')}
              activeOpacity={0.75}
            >
              <View style={[styles.quickIconContainer, { backgroundColor: 'rgba(70, 72, 212, 0.08)' }]}>
                <Ionicons name="mail-outline" size={22} color="#4648D4" />
              </View>
              <Text style={[styles.quickTitle, { color: colors.text }]}>Email Us</Text>
              <Text style={[styles.quickDesc, { color: colors.textSecondary }]}>support@hyperlocal.news</Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* FAQs Accordion */}
        <View style={styles.section}>
          <Text style={[styles.sectionHeader, { color: colors.textSecondary }]}>FREQUENTLY ASKED QUESTIONS</Text>
          
          {/* FAQ Category Chips */}
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.categoryChips}
          >
            {categories.map((cat) => {
              const isActive = selectedCategory === cat;
              return (
                <TouchableOpacity
                  key={cat}
                  style={[
                    styles.chip,
                    {
                      backgroundColor: isActive ? colors.primary : colors.card,
                      borderColor: isActive ? colors.primary : colors.border,
                    },
                  ]}
                  onPress={() => {
                    LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
                    setSelectedCategory(cat);
                  }}
                  activeOpacity={0.8}
                >
                  <Text style={[styles.chipText, { color: isActive ? '#FFFFFF' : colors.text }]}>
                    {cat}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </ScrollView>

          {/* List of FAQ Accordions */}
          <View style={[styles.bentoCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
            {filteredFaqs.length > 0 ? (
              filteredFaqs.map((faq, index) => {
                const isExpanded = expandedFaqId === faq.id;
                return (
                  <View key={faq.id}>
                    <TouchableOpacity
                      style={styles.faqHeader}
                      onPress={() => handleToggleFaq(faq.id)}
                      activeOpacity={0.7}
                    >
                      <Text style={[styles.faqQuestion, { color: colors.text }]}>{faq.question}</Text>
                      <Ionicons
                        name={isExpanded ? 'chevron-up' : 'chevron-down'}
                        size={18}
                        color={colors.textSecondary}
                      />
                    </TouchableOpacity>
                    
                    {isExpanded && (
                      <View style={styles.faqAnswerContainer}>
                        <Text style={[styles.faqAnswer, { color: colors.textSecondary }]}>
                          {faq.answer}
                        </Text>
                      </View>
                    )}

                    {index < filteredFaqs.length - 1 && (
                      <View style={[styles.divider, { backgroundColor: colors.divider }]} />
                    )}
                  </View>
                );
              })
            ) : (
              <View style={styles.noFaqs}>
                <Ionicons name="search" size={32} color={colors.textTertiary} />
                <Text style={[styles.noFaqText, { color: colors.textSecondary }]}>
                  No questions match your search.
                </Text>
              </View>
            )}
          </View>
        </View>

        {/* Submit Ticket Form */}
        <View style={styles.section}>
          <Text style={[styles.sectionHeader, { color: colors.textSecondary }]}>SUBMIT A SUPPORT TICKET</Text>
          <View style={[styles.bentoCard, { backgroundColor: colors.card, borderColor: colors.border, padding: 20 }]}>
            <Text style={[styles.formLabel, { color: colors.text }]}>Topic Category</Text>
            
            {/* Category Select Buttons */}
            <View style={styles.ticketTopicRow}>
              {['Support Inquiry', 'Bug Report', 'Publisher Verification', 'Feedback'].map((cat) => {
                const isSel = ticketCategory === cat;
                return (
                  <TouchableOpacity
                    key={cat}
                    style={[
                      styles.ticketTopicBtn,
                      {
                        backgroundColor: isSel ? colors.primaryLight : 'transparent',
                        borderColor: isSel ? colors.primary : colors.border,
                      },
                    ]}
                    onPress={() => setTicketCategory(cat)}
                    activeOpacity={0.7}
                  >
                    <Text
                      style={[
                        styles.ticketTopicText,
                        { color: isSel ? colors.primary : colors.textSecondary },
                      ]}
                    >
                      {cat}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </View>

            <Text style={[styles.formLabel, { color: colors.text, marginTop: 16 }]}>
              Description of your issue / query
            </Text>
            <View style={[styles.messageInputContainer, { borderColor: colors.border, backgroundColor: isDark ? 'rgba(255, 255, 255, 0.03)' : 'rgba(70, 72, 212, 0.02)' }]}>
              <TextInput
                placeholder="Write detailed information here to help our team assist you better..."
                placeholderTextColor={colors.textTertiary}
                value={ticketMessage}
                onChangeText={setTicketMessage}
                multiline
                numberOfLines={5}
                textAlignVertical="top"
                style={[styles.messageInput, { color: colors.text }]}
              />
            </View>

            {/* Submit Button */}
            <TouchableOpacity
              style={[styles.submitButton, { backgroundColor: colors.primary }]}
              onPress={handleSubmitTicket}
              activeOpacity={0.8}
              disabled={isSubmitting}
            >
              <MaterialCommunityIcons
                name={isSubmitting ? 'loading' : 'send'}
                size={18}
                color="#FFFFFF"
                style={styles.submitIcon}
              />
              <Text style={styles.submitButtonText}>
                {isSubmitting ? 'Submitting...' : 'Submit Support Request'}
              </Text>
            </TouchableOpacity>
          </View>
        </View>

      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F8F9FF',
  },
  purpleBlur: {
    position: 'absolute',
    right: -39,
    top: -98,
    width: 156,
    height: 393.59,
    borderRadius: 9999,
    backgroundColor: 'rgba(70, 72, 212, 0.04)',
    zIndex: -1,
  },
  tealBlur: {
    position: 'absolute',
    left: -19.5,
    bottom: -49.19,
    width: 117,
    height: 295.19,
    borderRadius: 9999,
    backgroundColor: 'rgba(0, 106, 97, 0.04)',
    zIndex: -1,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 20,
    height: 64,
    borderBottomWidth: 1,
    position: 'relative',
  },
  headerLeftButton: {
    position: 'absolute',
    left: 20,
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(70, 72, 212, 0.05)',
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: '700',
    fontFamily: 'Poppins_700Bold',
    letterSpacing: -0.5,
  },
  scrollContent: {
    paddingHorizontal: 20,
    paddingTop: 24,
    gap: 28,
  },
  heroSection: {
    gap: 8,
  },
  heroTitle: {
    fontSize: 24,
    fontWeight: '700',
    fontFamily: 'Poppins_700Bold',
    letterSpacing: -0.5,
  },
  heroSubtitle: {
    fontSize: 14,
    lineHeight: 22,
    fontFamily: 'Poppins_400Regular',
  },
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 2,
    borderRadius: 16,
    paddingHorizontal: 16,
    height: 52,
    marginTop: 12,
    shadowColor: '#4648D4',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.02,
    shadowRadius: 8,
    elevation: 1,
  },
  searchIcon: {
    marginRight: 10,
  },
  searchInput: {
    flex: 1,
    fontSize: 15,
    fontWeight: '500',
    fontFamily: 'Poppins_500Medium',
  },
  section: {
    gap: 12,
  },
  sectionHeader: {
    fontSize: 12,
    fontWeight: '600',
    color: '#767586',
    fontFamily: 'Poppins_600SemiBold',
    letterSpacing: 1.2,
    marginLeft: 4,
  },
  bentoRow: {
    flexDirection: 'row',
    gap: 16,
  },
  quickCard: {
    flex: 1,
    borderRadius: 20,
    borderWidth: 2,
    padding: 16,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    shadowColor: '#4648D4',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.03,
    shadowRadius: 10,
    elevation: 2,
  },
  quickIconContainer: {
    width: 44,
    height: 44,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 4,
  },
  quickTitle: {
    fontSize: 14,
    fontWeight: '700',
    fontFamily: 'Poppins_700Bold',
    textAlign: 'center',
  },
  quickDesc: {
    fontSize: 11,
    fontWeight: '500',
    fontFamily: 'Poppins_500Medium',
    textAlign: 'center',
  },
  categoryChips: {
    gap: 10,
    paddingVertical: 4,
  },
  chip: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 9999,
    borderWidth: 1.5,
  },
  chipText: {
    fontSize: 13,
    fontWeight: '600',
    fontFamily: 'Poppins_600SemiBold',
  },
  bentoCard: {
    borderRadius: 24,
    borderWidth: 2,
    borderColor: 'rgba(199, 196, 215, 0.3)',
    overflow: 'hidden',
    shadowColor: '#4648D4',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.03,
    shadowRadius: 12,
    elevation: 2,
  },
  faqHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 18,
    paddingHorizontal: 20,
  },
  faqQuestion: {
    fontSize: 15,
    fontWeight: '600',
    fontFamily: 'Poppins_600SemiBold',
    flex: 1,
    marginRight: 16,
    lineHeight: 20,
  },
  faqAnswerContainer: {
    paddingHorizontal: 20,
    paddingBottom: 18,
  },
  faqAnswer: {
    fontSize: 14,
    lineHeight: 22,
    fontFamily: 'Poppins_400Regular',
  },
  divider: {
    height: 1,
    marginHorizontal: 20,
  },
  noFaqs: {
    padding: 32,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  noFaqText: {
    fontSize: 14,
    fontFamily: 'Poppins_500Medium',
    textAlign: 'center',
  },
  formLabel: {
    fontSize: 14,
    fontWeight: '700',
    fontFamily: 'Poppins_700Bold',
    marginBottom: 8,
    marginLeft: 2,
  },
  ticketTopicRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  ticketTopicBtn: {
    borderWidth: 1.5,
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  ticketTopicText: {
    fontSize: 12,
    fontWeight: '600',
    fontFamily: 'Poppins_600SemiBold',
  },
  messageInputContainer: {
    borderWidth: 1.5,
    borderRadius: 16,
    paddingHorizontal: 14,
    paddingVertical: 10,
    minHeight: 120,
  },
  messageInput: {
    fontSize: 14,
    fontFamily: 'Poppins_400Regular',
    flex: 1,
  },
  submitButton: {
    flexDirection: 'row',
    borderRadius: 9999,
    height: 52,
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 20,
    elevation: 3,
    shadowColor: '#4648D4',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 8,
  },
  submitIcon: {
    marginRight: 8,
  },
  submitButtonText: {
    color: '#FFFFFF',
    fontSize: 15,
    fontWeight: '700',
    fontFamily: 'Poppins_600SemiBold',
  },
});
