/**
 * Image Resolver & Fallback Utility
 *
 * Resolves images for news articles, advertisements, and sponsored content.
 * If a news article has no image (or an invalid/mock URL), a single, consistent
 * breaking news graphic featuring the app logo and "BREAKING NEWS" badge is shown.
 */

import { Image } from 'react-native';

/**
 * Single unified breaking news fallback asset.
 * Features the official app logo with high-impact "BREAKING NEWS" branding.
 */
export const BREAKING_NEWS_FALLBACK_ASSET = require('@/assets/breaking-news-placeholder.png');

/**
 * Resolves the string URI for the breaking news fallback image.
 */
export function getBreakingNewsFallbackUri(): string {
  try {
    const source = Image.resolveAssetSource(BREAKING_NEWS_FALLBACK_ASSET);
    return source?.uri || '';
  } catch {
    return '';
  }
}

/**
 * Backward-compatible curated fallbacks.
 * All news fallbacks point strictly to the single breaking news image.
 */
export const CURATED_FALLBACK_IMAGES = {
  // Single news fallback showing app logo + breaking news text
  breaking_news: getBreakingNewsFallbackUri(),
  breaking: getBreakingNewsFallbackUri(),
  default_news: getBreakingNewsFallbackUri(),

  // Ads & Sponsored
  ad_fallback: 'https://images.unsplash.com/photo-1557804506-669a67965ba0?w=800&auto=format&fit=crop&q=80',
  sponsored_fallback: 'https://images.unsplash.com/photo-1542744173-8e7e53415bb0?w=800&auto=format&fit=crop&q=80',
};

/**
 * Checks whether an image URL is missing, invalid, or a mock URL (e.g. example.com).
 */
export function isInvalidOrMockImageUrl(url?: string | null): boolean {
  if (!url || typeof url !== 'string') return true;
  const trimmed = url.trim().toLowerCase();
  if (trimmed.length === 0) return true;
  if (
    !trimmed.startsWith('http://') &&
    !trimmed.startsWith('https://') &&
    !trimmed.startsWith('data:') &&
    !trimmed.startsWith('file:') &&
    !trimmed.startsWith('asset:')
  ) {
    return true;
  }
  if (
    trimmed.includes('example.com') ||
    trimmed.includes('example.org') ||
    trimmed.includes('example.net') ||
    trimmed.includes('localhost') ||
    trimmed.includes('127.0.0.1')
  ) {
    return true;
  }
  return false;
}

/**
 * Returns the single breaking news fallback image for any news article with no image.
 * All predefined category images have been removed in favor of this single logo+breaking news graphic.
 */
export function getCategoryFallbackImage(_categoryName?: string, _isBreaking?: boolean): string {
  return getBreakingNewsFallbackUri();
}

export interface ResolveArticleImageParams {
  imageUrl?: string | null;
  categoryNames?: string[];
  categoryName?: string;
  title?: string;
  isBreaking?: boolean;
  itemType?: string;
}

/**
 * Resolves the image URL for a news article or community post.
 * If the provided URL is a valid remote URL, it is returned directly.
 * If it is missing, invalid, or a mock URL, it returns the single breaking news
 * fallback image displaying the app logo with breaking news text.
 */
export function resolveArticleImageUrl(params: ResolveArticleImageParams): string {
  const { imageUrl } = params;

  // If a valid live URL is provided, return it
  if (!isInvalidOrMockImageUrl(imageUrl)) {
    return imageUrl!.trim();
  }

  // Unified fallback: single image showing the app logo with breaking news text
  return getBreakingNewsFallbackUri();
}

/**
 * Helper to get the correct Image component source (bundled asset vs remote URI).
 */
export function getNewsImageSource(url?: string | null) {
  if (isInvalidOrMockImageUrl(url)) {
    return BREAKING_NEWS_FALLBACK_ASSET;
  }
  return { uri: url!.trim(), headers: { Accept: 'image/webp,image/*;q=0.8' } };
}

/**
 * Resolves an advertisement image URL with fallback.
 */
export function resolveAdImageUrl(url?: string | null): string {
  if (!isInvalidOrMockImageUrl(url)) return url!.trim();
  return CURATED_FALLBACK_IMAGES.ad_fallback;
}

/**
 * Resolves a sponsored post image URL with fallback.
 */
export function resolveSponsoredImageUrl(url?: string | null): string {
  if (!isInvalidOrMockImageUrl(url)) return url!.trim();
  return CURATED_FALLBACK_IMAGES.sponsored_fallback;
}
