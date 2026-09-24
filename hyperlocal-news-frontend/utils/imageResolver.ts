/**
 * Image Resolver & Curated Fallbacks Utility
 *
 * Resolves reliable, high-resolution, content-matching images for news articles,
 * community posts, advertisements, and sponsored content. Handles invalid or mock
 * backend URLs (such as example.com) and provides graceful error fallbacks.
 */

export const CURATED_FALLBACK_IMAGES = {
  // News Categories
  crime_accident: 'https://images.unsplash.com/photo-1568605117036-5fe5e7bab0b7?w=800&auto=format&fit=crop&q=80',
  crime_law: 'https://images.unsplash.com/photo-1589829545856-d10d557cf95f?w=800&auto=format&fit=crop&q=80',
  sports: 'https://images.unsplash.com/photo-1540747913346-19e32dc3e97e?w=800&auto=format&fit=crop&q=80',
  sports_alt: 'https://images.unsplash.com/photo-1574629810360-7efbbe195018?w=800&auto=format&fit=crop&q=80',
  health_leaf: 'https://images.unsplash.com/photo-1512069772995-ec65ed45afd6?w=800&auto=format&fit=crop&q=80',
  health: 'https://images.unsplash.com/photo-1505751172876-fa1923c5c528?w=800&auto=format&fit=crop&q=80',
  politics_press: 'https://images.unsplash.com/photo-1541872703-74c5e44368f9?w=800&auto=format&fit=crop&q=80',
  politics_gov: 'https://images.unsplash.com/photo-1529107386315-e1a2ed48a620?w=800&auto=format&fit=crop&q=80',
  business_silver: 'https://images.unsplash.com/photo-1610375461246-83df859d849d?w=800&auto=format&fit=crop&q=80',
  business: 'https://images.unsplash.com/photo-1611974789855-9c2a0a7236a3?w=800&auto=format&fit=crop&q=80',
  cinema: 'https://images.unsplash.com/photo-1489599849927-2ee91cede3ba?w=800&auto=format&fit=crop&q=80',
  cinema_alt: 'https://images.unsplash.com/photo-1517604931442-7e0c8ed2963c?w=800&auto=format&fit=crop&q=80',
  education: 'https://images.unsplash.com/photo-1523240795612-9a054b0db644?w=800&auto=format&fit=crop&q=80',
  education_library: 'https://images.unsplash.com/photo-1497633762265-9d179a990aa6?w=800&auto=format&fit=crop&q=80',
  disaster: 'https://images.unsplash.com/photo-1509114397022-ed747cca3f65?w=800&auto=format&fit=crop&q=80',
  temple: 'https://images.unsplash.com/photo-1582510003544-4d00b7f74220?w=800&auto=format&fit=crop&q=80',
  tech: 'https://images.unsplash.com/photo-1518770660439-4636190af475?w=800&auto=format&fit=crop&q=80',
  community: 'https://images.unsplash.com/photo-1577495508048-b635879837f1?w=800&auto=format&fit=crop&q=80',
  breaking: 'https://images.unsplash.com/photo-1585829365295-ab7cd400c167?w=800&auto=format&fit=crop&q=80',
  default_news: 'https://images.unsplash.com/photo-1495020689067-958852a7765e?w=800&auto=format&fit=crop&q=80',

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
  if (!trimmed.startsWith('http://') && !trimmed.startsWith('https://') && !trimmed.startsWith('data:') && !trimmed.startsWith('file:')) {
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
 * Returns a fallback image based purely on the category name or breaking status.
 */
export function getCategoryFallbackImage(categoryName?: string, isBreaking?: boolean): string {
  if (isBreaking) {
    return CURATED_FALLBACK_IMAGES.breaking;
  }

  const cat = (categoryName || '').toLowerCase().trim();

  if (cat.includes('politic')) return CURATED_FALLBACK_IMAGES.politics_gov;
  if (cat.includes('crime') || cat.includes('law')) return CURATED_FALLBACK_IMAGES.crime_law;
  if (cat.includes('sport') || cat.includes('cricket')) return CURATED_FALLBACK_IMAGES.sports;
  if (cat.includes('health') || cat.includes('medic')) return CURATED_FALLBACK_IMAGES.health;
  if (cat.includes('business') || cat.includes('market') || cat.includes('econom') || cat.includes('financ')) return CURATED_FALLBACK_IMAGES.business;
  if (cat.includes('edu') || cat.includes('school') || cat.includes('college')) return CURATED_FALLBACK_IMAGES.education;
  if (cat.includes('entertain') || cat.includes('cinema') || cat.includes('movie')) return CURATED_FALLBACK_IMAGES.cinema;
  if (cat.includes('tech')) return CURATED_FALLBACK_IMAGES.tech;
  if (cat.includes('community') || cat.includes('local')) return CURATED_FALLBACK_IMAGES.community;

  return CURATED_FALLBACK_IMAGES.default_news;
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
 * Resolves the best image URL for a news article or community post.
 * If the provided URL is a valid remote URL, it is returned directly.
 * If it is empty or a mock URL (like images.example.com), it resolves a context-aware,
 * verified Unsplash image based on URL path hints, categories, and title keywords.
 */
export function resolveArticleImageUrl(params: ResolveArticleImageParams): string {
  const { imageUrl, categoryNames = [], categoryName, title = '', isBreaking, itemType } = params;

  // If a valid live URL is provided, return it
  if (!isInvalidOrMockImageUrl(imageUrl)) {
    return imageUrl!.trim();
  }

  const path = (imageUrl || '').toLowerCase();
  const titleLower = title.toLowerCase();
  const cats = [...categoryNames, categoryName || ''].map(c => c.toLowerCase());

  // 1. Specific image path clues from backend mock filenames
  if (path.includes('baby_murder') || path.includes('murder') || titleLower.includes('చంపిన') || titleLower.includes('హత్య')) {
    return CURATED_FALLBACK_IMAGES.crime_law;
  }
  if (path.includes('crash') || path.includes('accident') || titleLower.includes('ప్రమాదం') || titleLower.includes('కారు')) {
    return CURATED_FALLBACK_IMAGES.crime_accident;
  }
  if (path.includes('silver') || path.includes('gold') || path.includes('silver_drop') || titleLower.includes('వెండి') || titleLower.includes('బంగారం')) {
    return CURATED_FALLBACK_IMAGES.business_silver;
  }
  if (path.includes('earthquake') || path.includes('nz_earthquake') || titleLower.includes('భూకంపం')) {
    return CURATED_FALLBACK_IMAGES.disaster;
  }
  if (path.includes('puri') || path.includes('stampede') || titleLower.includes('రథయాత్ర') || titleLower.includes('జగన్నాథ')) {
    return CURATED_FALLBACK_IMAGES.temple;
  }
  if (path.includes('leaf') || path.includes('leaf_benefit') || titleLower.includes('ఆకు')) {
    return CURATED_FALLBACK_IMAGES.health_leaf;
  }
  if (path.includes('visa') || path.includes('nz_visa') || titleLower.includes('వీసా') || titleLower.includes('స్టూడెంట్')) {
    return CURATED_FALLBACK_IMAGES.education;
  }
  if (path.includes('press') || path.includes('jagan') || path.includes('ncbn') || path.includes('harish')) {
    return CURATED_FALLBACK_IMAGES.politics_press;
  }
  if (path.includes('cinema') || path.includes('sequel') || path.includes('akhil') || path.includes('ene_sequel') || titleLower.includes('సీక్వెల్') || titleLower.includes('సినిమా')) {
    return CURATED_FALLBACK_IMAGES.cinema;
  }
  if (path.includes('sports') || path.includes('gurnoor') || titleLower.includes('పేసర్') || titleLower.includes('క్రికెట్')) {
    return CURATED_FALLBACK_IMAGES.sports;
  }

  // 2. Category matching
  if (cats.some(c => c.includes('politic'))) return CURATED_FALLBACK_IMAGES.politics_gov;
  if (cats.some(c => c.includes('crime') || c.includes('law'))) return CURATED_FALLBACK_IMAGES.crime_law;
  if (cats.some(c => c.includes('sport') || c.includes('cricket'))) return CURATED_FALLBACK_IMAGES.sports;
  if (cats.some(c => c.includes('health') || c.includes('medic'))) return CURATED_FALLBACK_IMAGES.health;
  if (cats.some(c => c.includes('business') || c.includes('market') || c.includes('financ'))) return CURATED_FALLBACK_IMAGES.business;
  if (cats.some(c => c.includes('edu') || c.includes('school'))) return CURATED_FALLBACK_IMAGES.education;
  if (cats.some(c => c.includes('entertain') || c.includes('cinema'))) return CURATED_FALLBACK_IMAGES.cinema;
  if (cats.some(c => c.includes('tech'))) return CURATED_FALLBACK_IMAGES.tech;
  if (itemType === 'post' || cats.some(c => c.includes('community'))) return CURATED_FALLBACK_IMAGES.community;

  // 3. Breaking / Default
  if (isBreaking) return CURATED_FALLBACK_IMAGES.breaking;

  return CURATED_FALLBACK_IMAGES.default_news;
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
