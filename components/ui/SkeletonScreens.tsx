import React from 'react';
import { View, StyleSheet, StyleProp, ViewStyle } from 'react-native';
import { Skeleton, SkeletonAvatar } from './Skeleton';
import { Colors } from '@/constants/Colors';
import { Spacing, BorderRadius } from '@/constants/Spacing';

/**
 * Page-shaped skeleton loading screens.
 *
 * Each screen mirrors the layout of the page it represents (headers, search
 * bars, cards, chips, list rows, stat tiles) so the UI keeps its structure
 * while data loads, instead of showing a spinner.
 *
 * All screens accept `colorScheme` and an optional `style` for the outer
 * container. They fill the page's container view, which stays responsible
 * for safe-area padding / background color.
 */

type ColorScheme = 'light' | 'dark';

interface SkeletonScreenProps {
  colorScheme?: ColorScheme;
  style?: StyleProp<ViewStyle>;
}

// ── Home feed: full-screen paged immersive cards (ImmersiveNewsCard) ────────

export function FeedSkeleton({ colorScheme = 'light', style }: SkeletonScreenProps) {
  return (
    <View style={[styles.screen, style]}>
      {/* Full-bleed hero image (top portion of the card) */}
      <Skeleton colorScheme={colorScheme} borderRadius={0} style={styles.feedHero} />

      {/* Pinned bottom content panel: headline → summary → divider → actions */}
      <View style={[styles.feedPanel, { backgroundColor: Colors[colorScheme].background }]}>
        {/* Headline */}
        <Skeleton height={20} width="94%" colorScheme={colorScheme} />
        <Skeleton height={20} width="68%" colorScheme={colorScheme} />
        {/* Summary lines */}
        <View style={styles.feedSummary}>
          <Skeleton height={14} width="96%" colorScheme={colorScheme} />
          <Skeleton height={14} width="88%" colorScheme={colorScheme} />
          <Skeleton height={14} width="42%" colorScheme={colorScheme} />
        </View>
        {/* Divider */}
        <Skeleton height={1} colorScheme={colorScheme} style={styles.feedDivider} />
        {/* Footer: views (left) + 4 round action buttons (right) */}
        <View style={styles.feedFooter}>
          <View style={styles.row}>
            <Skeleton width={16} height={16} borderRadius={8} colorScheme={colorScheme} />
            <Skeleton width={48} height={12} colorScheme={colorScheme} />
          </View>
          <View style={styles.row}>
            {Array.from({ length: 4 }).map((_, i) => (
              <Skeleton
                key={i}
                width={36}
                height={36}
                borderRadius={18}
                colorScheme={colorScheme}
              />
            ))}
          </View>
        </View>
      </View>
    </View>
  );
}

// ── Local news (title header + location + filters + vertical/horizontal cards) ─

export function LocalNewsSkeleton({ colorScheme = 'light', style }: SkeletonScreenProps) {
  return (
    <View style={[styles.screen, styles.pad, style]}>
      {/* Header title + location picker */}
      <Skeleton width={140} height={24} style={styles.headerGap} colorScheme={colorScheme} />
      <Skeleton
        height={44}
        borderRadius={BorderRadius.md}
        style={styles.sectionGap}
        colorScheme={colorScheme}
      />

      {/* Filter pills */}
      <View style={styles.row}>
        {[72, 84, 60, 68].map((w, i) => (
          <Skeleton
            key={i}
            width={w}
            height={32}
            borderRadius={BorderRadius.full}
            colorScheme={colorScheme}
          />
        ))}
      </View>

      {/* TODAY section label + vertical card (192px image on top) */}
      <Skeleton
        width={64}
        height={12}
        style={[styles.sectionGap, styles.listGap]}
        colorScheme={colorScheme}
      />
      <SkeletonSectionCard scheme={colorScheme} />
      <SkeletonListCard scheme={colorScheme} />

      {/* YESTERDAY section label + horizontal cards */}
      <Skeleton
        width={80}
        height={12}
        style={[styles.sectionGap, styles.listGap]}
        colorScheme={colorScheme}
      />
      <SkeletonListCard scheme={colorScheme} />
      <SkeletonListCard scheme={colorScheme} />
    </View>
  );
}

// ── Discover (header + search + trending card + hashtag chips + 2-col topic
//    grid + source avatars + nearby locality rows) ───────────────────────────

export function DiscoverSkeleton({ colorScheme = 'light', style }: SkeletonScreenProps) {
  const scheme = colorScheme;
  return (
    <View style={[styles.screen, style]}>
      {/* Header: height 64, surface bg, centered title */}
      <View
        style={[styles.discoverHeader, { backgroundColor: Colors[scheme].surface }]}
      >
        <Skeleton width={92} height={20} colorScheme={scheme} />
      </View>

      {/* Search bar: 48px, fully rounded */}
      <View style={styles.discoverSearchWrap}>
        <Skeleton height={48} borderRadius={24} colorScheme={scheme} />
      </View>

      <View style={styles.discoverScroll}>
        {/* 🔥 TRENDING NOW: card container with rows + dividers + trailing icon */}
        <View style={styles.sectionHeaderRow}>
          <Skeleton width={140} height={12} colorScheme={scheme} />
          <Skeleton width={40} height={10} colorScheme={scheme} />
        </View>
        <View
          style={[styles.trendingCard, { backgroundColor: Colors[scheme].surface }]}
        >
          {Array.from({ length: 3 }).map((_, i) => (
            <View key={i}>
              <View style={styles.trendingRow}>
                <View style={styles.trendingText}>
                  <Skeleton height={15} width="78%" colorScheme={scheme} />
                  <Skeleton height={10} width="34%" colorScheme={scheme} />
                </View>
                <Skeleton
                  width={20}
                  height={20}
                  borderRadius={10}
                  colorScheme={scheme}
                />
              </View>
              {i < 2 && <Skeleton height={1} colorScheme={scheme} />}
            </View>
          ))}
        </View>

        {/* # TRENDING HASHTAGS: horizontal bordered chips */}
        <Skeleton
          width={150}
          height={12}
          style={[styles.sectionGap, styles.listGap]}
          colorScheme={scheme}
        />
        <View style={[styles.row, styles.sectionGap]}>
          {[66, 88, 74, 62].map((w, i) => (
            <Skeleton
              key={i}
              width={w}
              height={34}
              borderRadius={BorderRadius.full}
              colorScheme={scheme}
            />
          ))}
        </View>

        {/* 📂 BROWSE BY TOPIC: 2-column grid, 102px tiles with icon circle */}
        <Skeleton
          width={150}
          height={12}
          style={[styles.sectionGap, styles.listGap]}
          colorScheme={scheme}
        />
        <View style={styles.discoverGrid}>
          {Array.from({ length: 6 }).map((_, i) => (
            <View key={i} style={[styles.topicTile, { backgroundColor: Colors[scheme].surface }]}>
              <SkeletonAvatar size={40} colorScheme={scheme} />
              <Skeleton width={52} height={12} colorScheme={scheme} />
            </View>
          ))}
        </View>

        {/* 📰 TOP SOURCES: 56px avatar circles + name line below */}
        <Skeleton
          width={110}
          height={12}
          style={[styles.sectionGap, styles.listGap]}
          colorScheme={scheme}
        />
        <View style={[styles.row, styles.sectionGap]}>
          {Array.from({ length: 4 }).map((_, i) => (
            <View key={i} style={styles.sourceItem}>
              <SkeletonAvatar size={56} colorScheme={scheme} />
              <Skeleton width={52} height={10} colorScheme={scheme} />
            </View>
          ))}
        </View>

        {/* 📍 NEARBY LOCALITIES: icon circle + name/count + chevron rows */}
        <Skeleton
          width={140}
          height={12}
          style={[styles.sectionGap, styles.listGap]}
          colorScheme={scheme}
        />
        {Array.from({ length: 3 }).map((_, i) => (
          <View
            key={i}
            style={[styles.localityRow, { backgroundColor: Colors[scheme].surface }]}
          >
            <Skeleton width={40} height={40} borderRadius={20} colorScheme={scheme} />
            <View style={{ flex: 1, gap: 6 }}>
              <Skeleton height={14} width="50%" colorScheme={scheme} />
              <Skeleton height={10} width="30%" colorScheme={scheme} />
            </View>
            <Skeleton width={16} height={16} borderRadius={8} colorScheme={scheme} />
          </View>
        ))}
      </View>
    </View>
  );
}

// ── Search results in progress (discover searching state) ───────────────────

export function SearchResultsSkeleton({ colorScheme = 'light', style }: SkeletonScreenProps) {
  return (
    <View style={[styles.screen, style]}>
      {Array.from({ length: 5 }).map((_, i) => (
        <SkeletonListRow key={i} scheme={colorScheme} />
      ))}
    </View>
  );
}

// ── Shorts (full-bleed video pages, dark) ───────────────────────────────────

export function ShortsSkeleton({ style }: SkeletonScreenProps) {
  return (
    <View style={[styles.screen, { backgroundColor: '#000' }, style]}>
      {/* Full-screen video placeholder */}
      <View style={styles.shortsBlock}>
        <Skeleton colorScheme="dark" borderRadius={0} style={{ flex: 1 }} />
        {/* Centered play button */}
        <View style={styles.shortsPlayWrap} pointerEvents="none">
          <Skeleton
            width={64}
            height={64}
            borderRadius={32}
            colorScheme="dark"
            style={{ backgroundColor: '#2B2B3A' }}
          />
        </View>
        {/* Bottom meta row */}
        <View style={[styles.shortsMeta, styles.pad]} pointerEvents="none">
          <SkeletonAvatar size={40} colorScheme="dark" />
          <View style={{ flex: 1, gap: 8 }}>
            <Skeleton
              width="45%"
              height={14}
              colorScheme="dark"
              style={{ backgroundColor: '#2B2B3A' }}
            />
            <Skeleton
              width="30%"
              height={12}
              colorScheme="dark"
              style={{ backgroundColor: '#2B2B3A' }}
            />
          </View>
        </View>
      </View>
    </View>
  );
}

// ── Community posts (dark, full-screen paged cards) ─────────────────────────
// Mirrors PostCard: full-bleed background, bottom-left author/caption/tags
// overlay and a right-side vertical action rail of 4 round buttons.

export function PostsSkeleton({ style }: SkeletonScreenProps) {
  return (
    <View style={[styles.screen, { backgroundColor: '#0B1120' }, style]}>
      {/* Full-bleed media/gradient placeholder */}
      <Skeleton colorScheme="dark" borderRadius={0} style={StyleSheet.absoluteFill as ViewStyle} />

      {/* Bottom-left overlay: author meta, caption, hashtag pills */}
      <View style={styles.postOverlayLeft} pointerEvents="none">
        {/* Author row */}
        <View style={styles.postAuthorRow}>
          <SkeletonAvatar size={42} colorScheme="dark" />
          <View style={styles.postAuthorMeta}>
            <Skeleton width={130} height={15} colorScheme="dark" />
            <Skeleton width={80} height={12} colorScheme="dark" />
          </View>
        </View>
        {/* Caption lines */}
        <Skeleton width="82%" height={14} colorScheme="dark" />
        <Skeleton width="60%" height={14} colorScheme="dark" />
        {/* Hashtag pills */}
        <View style={styles.row}>
          <Skeleton width={54} height={22} borderRadius={12} colorScheme="dark" />
          <Skeleton width={62} height={22} borderRadius={12} colorScheme="dark" />
          <Skeleton width={46} height={22} borderRadius={12} colorScheme="dark" />
        </View>
      </View>

      {/* Right-side action rail: 4 round buttons with count labels */}
      <View style={styles.postActionRail} pointerEvents="none">
        {Array.from({ length: 4 }).map((_, i) => (
          <View key={i} style={styles.postActionItem}>
            <Skeleton width={44} height={44} borderRadius={22} colorScheme="dark" />
            <Skeleton width={22} height={10} colorScheme="dark" />
          </View>
        ))}
      </View>
    </View>
  );
}

// ── Notifications (header + grouped rows) ───────────────────────────────────

export function NotificationsSkeleton({ colorScheme = 'light', style }: SkeletonScreenProps) {
  return (
    <View style={[styles.screen, styles.pad, style]}>
      {/* Header */}
      <View style={[styles.row, styles.headerGap, styles.sectionGap]}>
        <Skeleton width={40} height={40} borderRadius={20} colorScheme={colorScheme} />
        <Skeleton width={120} height={18} colorScheme={colorScheme} />
        <Skeleton width={70} height={24} borderRadius={BorderRadius.full} colorScheme={colorScheme} />
      </View>

      {/* Section label */}
      <Skeleton
        width={48}
        height={12}
        style={[styles.sectionGap, styles.listGap]}
        colorScheme={colorScheme}
      />

      {/* Notification rows */}
      {Array.from({ length: 4 }).map((_, i) => (
        <View key={i} style={[styles.listRow, styles.listGap]}>
          <Skeleton
            width={46}
            height={46}
            borderRadius={BorderRadius.lg}
            colorScheme={colorScheme}
          />
          <View style={{ flex: 1, gap: 8 }}>
            <View style={styles.row}>
              <Skeleton width="55%" height={15} colorScheme={colorScheme} />
              <Skeleton width={42} height={11} colorScheme={colorScheme} />
            </View>
            <Skeleton height={13} width="88%" colorScheme={colorScheme} />
          </View>
        </View>
      ))}
    </View>
  );
}

// ── Bookmarks (search + chips + vertical article cards) ─────────────────────

export function BookmarksSkeleton({ colorScheme = 'light', style }: SkeletonScreenProps) {
  return (
    <View style={[styles.screen, styles.pad, style]}>
      {/* Header */}
      <View style={[styles.row, styles.headerGap, styles.sectionGap]}>
        <Skeleton width={36} height={36} borderRadius={18} colorScheme={colorScheme} />
        <Skeleton width={110} height={20} colorScheme={colorScheme} />
        <View style={{ flex: 1 }} />
        <Skeleton width={36} height={36} borderRadius={18} colorScheme={colorScheme} />
      </View>

      {/* Search bar */}
      <Skeleton
        height={44}
        borderRadius={BorderRadius.xl}
        style={styles.listGap}
        colorScheme={colorScheme}
      />

      {/* Filter chips */}
      <View style={styles.row}>
        {[64, 72, 58, 76].map((w, i) => (
          <Skeleton
            key={i}
            width={w}
            height={32}
            borderRadius={BorderRadius.full}
            colorScheme={colorScheme}
          />
        ))}
      </View>

      {/* Saved article cards: image top + badges + title + desc + meta */}
      {Array.from({ length: 2 }).map((_, i) => (
        <SkeletonArticleCard key={i} scheme={colorScheme} />
      ))}
    </View>
  );
}

// ── Article detail (hero image + badge + headline + byline + lead + footer) ──

export function ArticleDetailSkeleton({ colorScheme = 'light', style }: SkeletonScreenProps) {
  return (
    <View style={[styles.screen, style]}>
      {/* Hero image (full bleed) with floating back button */}
      <Skeleton borderRadius={0} height={380} colorScheme={colorScheme} />
      <View style={styles.heroBackButton} pointerEvents="none">
        <Skeleton
          width={44}
          height={44}
          borderRadius={22}
          colorScheme="dark"
          style={{ backgroundColor: 'rgba(255,255,255,0.25)' }}
        />
      </View>

      <View style={[styles.pad, { paddingTop: Spacing.lg }]}>
        {/* Category pill */}
        <Skeleton
          width={92}
          height={22}
          borderRadius={BorderRadius.full}
          style={styles.listGap}
          colorScheme={colorScheme}
        />
        {/* Headline */}
        <Skeleton height={22} style={styles.listGap} colorScheme={colorScheme} />
        <Skeleton height={22} width="80%" style={styles.listGap} colorScheme={colorScheme} />
        {/* Byline: source + published date (no avatar) */}
        <Skeleton width={130} height={14} style={styles.listGap} colorScheme={colorScheme} />
        <Skeleton width={90} height={12} colorScheme={colorScheme} />
        <Skeleton
          height={1}
          style={[styles.sectionGap, { height: 1 }]}
          colorScheme={colorScheme}
        />
        {/* Lead summary */}
        <View style={[styles.feedSummary, styles.sectionGap]}>
          <Skeleton height={16} width="100%" colorScheme={colorScheme} />
          <Skeleton height={16} width="92%" colorScheme={colorScheme} />
          <Skeleton height={16} width="60%" colorScheme={colorScheme} />
        </View>
        {/* Source footer bar */}
        <View
          style={[styles.sourceFooter, { backgroundColor: Colors[colorScheme].surface }]}
        >
          <Skeleton width={18} height={18} borderRadius={9} colorScheme={colorScheme} />
          <Skeleton width="55%" height={14} colorScheme={colorScheme} />
          <Skeleton width={14} height={14} borderRadius={7} colorScheme={colorScheme} />
        </View>
        {/* Floating engagement bar */}
        <View style={[styles.engagementBar, { borderTopColor: Colors[colorScheme].border }]}>
          <Skeleton width={110} height={13} colorScheme={colorScheme} />
          <Skeleton width={110} height={13} colorScheme={colorScheme} />
        </View>
      </View>
    </View>
  );
}

// ── Publisher dashboard (header + stats + tabs + article cards) ─────────────

export function DashboardSkeleton({ colorScheme = 'light', style }: SkeletonScreenProps) {
  return (
    <View style={[styles.screen, styles.pad, style]}>
      {/* Header: back, title block, fab */}
      <View style={[styles.row, styles.headerGap]}>
        <Skeleton width={40} height={40} borderRadius={20} colorScheme={colorScheme} />
        <View style={{ flex: 1, gap: 8 }}>
          <Skeleton width={170} height={18} colorScheme={colorScheme} />
          <Skeleton width={90} height={12} colorScheme={colorScheme} />
        </View>
        <Skeleton width={40} height={40} borderRadius={20} colorScheme={colorScheme} />
      </View>

      {/* Stats row */}
      <View style={[styles.row, styles.gridRow, styles.sectionGap]}>
        {Array.from({ length: 3 }).map((_, i) => (
          <View key={i} style={[styles.statCard, { backgroundColor: Colors[colorScheme].surface }]}>
            <Skeleton width={36} height={36} borderRadius={12} colorScheme={colorScheme} />
            <Skeleton width={48} height={20} style={styles.cardGap} colorScheme={colorScheme} />
            <Skeleton width={70} height={11} colorScheme={colorScheme} />
          </View>
        ))}
      </View>

      {/* Tabs */}
      <View style={styles.row}>
        {[84, 96, 78].map((w, i) => (
          <Skeleton
            key={i}
            width={w}
            height={36}
            borderRadius={BorderRadius.full}
            colorScheme={colorScheme}
          />
        ))}
      </View>

      {/* Article cards */}
      {Array.from({ length: 2 }).map((_, i) => (
        <View
          key={i}
          style={[styles.cardBox, styles.sectionGap, { backgroundColor: Colors[colorScheme].surface }]}
        >
          <View style={[styles.row, styles.headerGap]}>
            <Skeleton width="55%" height={16} colorScheme={colorScheme} />
            <Skeleton width={72} height={20} borderRadius={BorderRadius.full} colorScheme={colorScheme} />
          </View>
          <Skeleton height={14} width="90%" style={styles.listGap} colorScheme={colorScheme} />
          <Skeleton height={14} width="60%" colorScheme={colorScheme} />
        </View>
      ))}
    </View>
  );
}

// ── Selection grid pages (onboarding language/cities/districts/location/
//    interests + settings language/interests/location): header, title,
//    section row, 2-column grid of option cards, footer CTA button. ─────────

export function SelectListSkeleton({ colorScheme = 'light', style }: SkeletonScreenProps) {
  return (
    <View style={[styles.screen, styles.pad, style]}>
      {/* Header: back circle + centered logo/title + spacer */}
      <View style={[styles.row, styles.headerGap, styles.sectionGap]}>
        <Skeleton width={36} height={36} borderRadius={18} colorScheme={colorScheme} />
        <View style={{ flex: 1, alignItems: 'center' }}>
          <Skeleton width={110} height={20} colorScheme={colorScheme} />
        </View>
        <View style={{ width: 36 }} />
      </View>

      {/* Headline + subtitle */}
      <Skeleton width="62%" height={24} style={styles.listGap} colorScheme={colorScheme} />
      <Skeleton width="42%" height={14} style={styles.sectionGap} colorScheme={colorScheme} />

      {/* Section divider row: line — label — line */}
      <SelectSectionRow scheme={colorScheme} />

      {/* 2-column grid of option cards */}
      {Array.from({ length: 3 }).map((_, rowIndex) => (
        <View key={rowIndex} style={[styles.gridRow, styles.selectGridGap]}>
          <SkeletonOptionTile scheme={colorScheme} />
          <SkeletonOptionTile scheme={colorScheme} />
        </View>
      ))}

      {/* Footer CTA button */}
      <Skeleton
        height={48}
        borderRadius={BorderRadius.full}
        style={styles.selectFooter}
        colorScheme={colorScheme}
      />
    </View>
  );
}

// ── Toggle / settings rows (settings-notifications style pages) ─────────────

export function SettingsListSkeleton({ colorScheme = 'light', style }: SkeletonScreenProps) {
  return (
    <View style={[styles.screen, styles.pad, style]}>
      {/* Header: back circle + title */}
      <View style={[styles.row, styles.headerGap, styles.sectionGap]}>
        <Skeleton width={36} height={36} borderRadius={18} colorScheme={colorScheme} />
        <Skeleton width={110} height={18} colorScheme={colorScheme} />
        <View style={{ flex: 1 }} />
      </View>
      <Skeleton width={210} height={14} style={styles.sectionGap} colorScheme={colorScheme} />

      {/* Settings group with toggle rows */}
      <View
        style={[
          styles.cardBox,
          styles.sectionGap,
          { backgroundColor: Colors[colorScheme].surface },
        ]}
      >
        {Array.from({ length: 4 }).map((_, i) => (
          <View key={i} style={styles.settingsRow}>
            <Skeleton width={34} height={34} borderRadius={10} colorScheme={colorScheme} />
            <Skeleton width="35%" height={14} colorScheme={colorScheme} />
            <View style={{ flex: 1 }} />
            {/* Switch */}
            <Skeleton width={44} height={26} borderRadius={13} colorScheme={colorScheme} />
          </View>
        ))}
      </View>

      {/* Second group */}
      <View style={[styles.cardBox, styles.sectionGap, { backgroundColor: Colors[colorScheme].surface }]}>
        {Array.from({ length: 2 }).map((_, i) => (
          <View key={i} style={styles.settingsRow}>
            <Skeleton width={34} height={34} borderRadius={10} colorScheme={colorScheme} />
            <Skeleton width="45%" height={14} colorScheme={colorScheme} />
            <Skeleton width={44} height={26} borderRadius={13} colorScheme={colorScheme} />
          </View>
        ))}
      </View>
    </View>
  );
}

// ── Internal building blocks ────────────────────────────────────────────────

function SkeletonSectionCard({ scheme }: { scheme: ColorScheme }) {
  // Local news "vertical" card: full-bleed 192px image + padded content
  return (
    <View style={[styles.cardBox, styles.cardBoxFlush, { backgroundColor: Colors[scheme].surface }]}>
      <Skeleton height={192} borderRadius={0} colorScheme={scheme} />
      <View style={[styles.cardInner, styles.sectionGap]}>
        <Skeleton height={17} width="90%" colorScheme={scheme} />
        <Skeleton height={17} width="60%" colorScheme={scheme} />
        <View style={styles.row}>
          <Skeleton width={80} height={11} colorScheme={scheme} />
          <Skeleton width={48} height={11} colorScheme={scheme} />
        </View>
      </View>
    </View>
  );
}

function SkeletonListCard({ scheme }: { scheme: ColorScheme }) {
  // Local news "horizontal" card: text LEFT, 96x96 image RIGHT
  return (
    <View
      style={[styles.localHorizontalCard, { backgroundColor: Colors[scheme].surface }]}
    >
      <View style={styles.localHorizontalContent}>
        <Skeleton
          width={70}
          height={18}
          borderRadius={9}
          colorScheme={scheme}
        />
        <Skeleton height={14} width="92%" colorScheme={scheme} />
        <Skeleton height={14} width="65%" colorScheme={scheme} />
        <Skeleton width={90} height={11} colorScheme={scheme} />
      </View>
      <Skeleton width={96} height={96} borderRadius={16} colorScheme={scheme} />
    </View>
  );
}

function SkeletonListRow({ scheme, style }: { scheme: ColorScheme; style?: StyleProp<ViewStyle> }) {
  return (
    <View style={[styles.listRow, styles.listRowPad, style]}>
      <View style={{ flex: 1, gap: 6 }}>
        <Skeleton height={15} width="70%" colorScheme={scheme} />
        <Skeleton height={12} width="40%" colorScheme={scheme} />
      </View>
    </View>
  );
}

function SkeletonArticleCard({ scheme }: { scheme: ColorScheme }) {
  // Bookmarks card: full-width image, badges row, title, desc, meta
  return (
    <View style={[styles.cardBox, styles.cardBoxFlush, { backgroundColor: Colors[scheme].surface }]}>
      <Skeleton height={196} borderRadius={0} colorScheme={scheme} />
      <View style={styles.cardInner}>
        {/* Badges row + bookmark icon */}
        <View style={[styles.row, styles.listGap]}>
          <Skeleton width={24} height={24} borderRadius={12} colorScheme={scheme} />
          <Skeleton width={58} height={20} borderRadius={4} colorScheme={scheme} />
          <View style={{ flex: 1 }} />
          <Skeleton width={20} height={20} borderRadius={10} colorScheme={scheme} />
        </View>
        {/* Title */}
        <Skeleton height={16} width="92%" colorScheme={scheme} />
        <Skeleton height={16} width="64%" colorScheme={scheme} />
        {/* Description */}
        <Skeleton height={12} width="96%" colorScheme={scheme} />
        <Skeleton height={12} width="72%" colorScheme={scheme} />
        {/* Meta row */}
        <View style={styles.cardGap}>
          <Skeleton width={110} height={11} colorScheme={scheme} />
        </View>
      </View>
    </View>
  );
}

function SelectSectionRow({ scheme }: { scheme: ColorScheme }) {
  return (
    <View style={[styles.row, styles.sectionGap, { gap: 12 }]}>
      <View style={{ flex: 1 }}>
        <Skeleton height={1} colorScheme={scheme} />
      </View>
      <Skeleton width={110} height={14} colorScheme={scheme} />
      <View style={{ flex: 1 }}>
        <Skeleton height={1} colorScheme={scheme} />
      </View>
    </View>
  );
}

function SkeletonOptionTile({ scheme }: { scheme: ColorScheme }) {
  return (
    <View
      style={[styles.optionTile, { backgroundColor: Colors[scheme].surface }]}
    >
      <Skeleton width={34} height={34} borderRadius={10} colorScheme={scheme} />
      <Skeleton width="55%" height={13} colorScheme={scheme} />
      <Skeleton width={18} height={18} borderRadius={9} colorScheme={scheme} />
    </View>
  );
}

// ── Styles ──────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  screen: {
    flex: 1,
  },
  pad: {
    paddingHorizontal: Spacing.md,
    paddingTop: Spacing.md,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  headerGap: {
    gap: 10,
  },
  sectionGap: {
    marginBottom: Spacing.md,
  },
  listGap: {
    marginBottom: Spacing.md,
  },
  cardGap: {
    marginTop: Spacing.md,
  },
  gridRow: {
    gap: 12,
  },
  statCard: {
    flex: 1,
    alignItems: 'center',
    paddingTop: Spacing.md,
    paddingBottom: Spacing.md,
    borderRadius: BorderRadius.lg,
    gap: 8,
  },
  cardBox: {
    borderRadius: BorderRadius.lg,
    marginBottom: Spacing.md,
  },
  cardBoxFlush: {
    overflow: 'hidden',
    gap: 0,
  },
  cardInner: {
    padding: Spacing.md,
    gap: 7,
  },
  // Home feed (full-screen immersive card)
  feedHero: {
    flex: 1,
  },
  feedPanel: {
    paddingTop: Spacing.md,
    paddingHorizontal: Spacing.md,
    paddingBottom: Spacing.xl,
    gap: 6,
  },
  feedSummary: {
    gap: 8,
    marginTop: 2,
  },
  feedDivider: {
    marginTop: Spacing.sm,
    marginBottom: Spacing.sm,
  },
  feedFooter: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  // Local news
  localHorizontalCard: {
    flexDirection: 'row',
    padding: Spacing.md,
    borderRadius: 24,
    gap: 16,
    marginBottom: Spacing.md,
  },
  localHorizontalContent: {
    flex: 1,
    gap: 8,
    justifyContent: 'center',
  },
  // Bookmarks / discover cards
  listRow: {
    flexDirection: 'row',
    gap: 12,
  },
  listRowPad: {
    paddingHorizontal: Spacing.md,
    paddingVertical: 10,
  },
  topicTile: {
    width: '47.7%', // two per row with gap 12, matches discover gridItem (47% of scroll area)
    height: 102,
    borderRadius: 24,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 9,
  },
  // Discover page-specific
  discoverHeader: {
    height: 64,
    alignItems: 'center',
    justifyContent: 'center',
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: 'rgba(128,128,128,0.25)',
  },
  discoverSearchWrap: {
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.md,
  },
  discoverScroll: {
    paddingHorizontal: Spacing.lg,
    paddingBottom: 100,
  },
  sectionHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: Spacing.md,
    marginTop: Spacing.sm,
  },
  trendingCard: {
    borderRadius: BorderRadius.xl,
    padding: Spacing.sm,
    marginBottom: Spacing.xl,
  },
  trendingRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: Spacing.sm,
    paddingHorizontal: Spacing.sm,
  },
  trendingText: {
    flex: 1,
    gap: 6,
  },
  discoverGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: Spacing.md,
    justifyContent: 'space-between',
    marginBottom: Spacing.xl,
  },
  sourceItem: {
    alignItems: 'center',
    gap: 8,
    marginRight: Spacing.lg,
  },
  localityRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingVertical: Spacing.md,
    paddingHorizontal: Spacing.md,
    borderRadius: BorderRadius.xl,
    marginBottom: Spacing.sm,
  },
  // Posts (dark paged cards)
  postOverlayLeft: {
    position: 'absolute',
    left: 16,
    bottom: 22,
    right: 76, // leaves space for the right action rail (mirrors PostCard)
    gap: 9,
    zIndex: 20,
  },
  postAuthorRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    marginBottom: 4,
  },
  postAuthorMeta: {
    flex: 1,
    gap: 6,
  },
  postActionRail: {
    position: 'absolute',
    right: 12,
    bottom: 22,
    gap: 12,
    alignItems: 'center',
    zIndex: 25,
  },
  postActionItem: {
    alignItems: 'center',
    gap: 3,
  },
  // Article detail
  sourceFooter: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    padding: Spacing.md,
    borderRadius: BorderRadius.lg,
    marginBottom: 80,
  },
  engagementBar: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: Spacing.xl,
    paddingVertical: 14,
    borderTopWidth: StyleSheet.hairlineWidth,
  },
  // Selection grid pages
  optionTile: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    padding: 14,
    borderRadius: BorderRadius.md,
  },
  selectGridGap: {
    marginBottom: 12,
  },
  selectFooter: {
    marginTop: Spacing.lg,
  },
  settingsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingVertical: 14,
  },
  // Shorts
  shortsBlock: {
    flex: 1,
    overflow: 'hidden',
  },
  shortsPlayWrap: {
    ...StyleSheet.absoluteFillObject,
    alignItems: 'center',
    justifyContent: 'center',
  },
  shortsMeta: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: Spacing['2xl'],
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  // Article hero
  heroBackButton: {
    position: 'absolute',
    top: Spacing['2xl'],
    left: Spacing.md,
  },
});
