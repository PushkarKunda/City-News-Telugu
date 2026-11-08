/**
 * Feed Slotting & Interleaving Engine
 *
 * Implements the official content distribution schedule for the "For You" feed:
 * ┌───────────────┬─────────────────────────────────────────┬────────────────────────────────────────────────────────┐
 * │ Slot / Pos    │ Content Type                            │ Fallback Rule                                          │
 * ├───────────────┼─────────────────────────────────────────┼────────────────────────────────────────────────────────┤
 * │ Slot 0        │ Premium Ad                              │ If no premium ad is booked, displays News #1.          │
 * │ Slots 1–3     │ 3 News Articles + 1 Community Post      │ 1 trending community post is inserted after News #2.   │
 * │ Slot 4        │ City / District Targeted Ad             │ Falls back to next News article.                       │
 * │ Slots 5–7     │ 3 News Articles + 1 Sponsored Post      │ If no direct sponsor, inserts AdMob Card / next News.  │
 * │ Slot 8        │ State / Regional Ad                     │ Falls back to next News article.                       │
 * │ Slots 9–11    │ 3 News Articles + Event + Poll + Spons. │ Mixes in upcoming local events and active polls.       │
 * │ Remaining     │ Remaining News Stream                   │ Intersperses posts every 5 news & ads every 10 news.   │
 * └───────────────┴─────────────────────────────────────────┴────────────────────────────────────────────────────────┘
 */

import type { FeedItem, NewsArticle } from '@/services/api/news';
import type { Advertisement, SponsoredPost } from '@/services/api/content';
import type { PollItem } from '@/services/api/polls';
import type { Post } from '@/services/api/posts';

export interface FeedInterleaveOptions {
  polls?: PollItem[];
  posts?: Post[];
  ads?: Advertisement[];
  sponsored?: SponsoredPost[];
  events?: any[];
}

interface ItemPools {
  news: NewsArticle[];
  premiumAds: Advertisement[];
  districtAds: Advertisement[];
  regionalAds: Advertisement[];
  generalAds: Advertisement[];
  posts: Post[];
  sponsored: SponsoredPost[];
  polls: PollItem[];
  events: any[];
}

function categorizeAd(ad: Advertisement, pools: ItemPools): void {
  const adType = String((ad as any).ad_type || (ad as any).type || '').toLowerCase();
  const isPremium =
    (ad as any).is_premium === true ||
    adType === 'premium' ||
    (ad as any).placement === 'slot_0' ||
    (ad as any).placement === 'hero';

  const isDistrict =
    Boolean((ad as any).district_id || (ad as any).city_id || (ad as any).target_district) ||
    adType === 'district' ||
    adType === 'city';

  const isRegional =
    Boolean((ad as any).state_id || (ad as any).target_state) ||
    adType === 'state' ||
    adType === 'regional';

  if (isPremium) {
    pools.premiumAds.push(ad);
  } else if (isDistrict) {
    pools.districtAds.push(ad);
  } else if (isRegional) {
    pools.regionalAds.push(ad);
  } else {
    pools.generalAds.push(ad);
  }
}

/**
 * Main feed interleaver function.
 * Takes raw feed items (or separated arrays) and arranges them strictly according
 * to the slotting and fallback schedule.
 */
export function interleaveFeed(
  incomingItems: (FeedItem | NewsArticle | any)[],
  options?: FeedInterleaveOptions
): FeedItem[] {
  const pools: ItemPools = {
    news: [],
    premiumAds: [],
    districtAds: [],
    regionalAds: [],
    generalAds: [],
    posts: [...(options?.posts ?? [])],
    sponsored: [...(options?.sponsored ?? [])],
    polls: [...(options?.polls ?? [])],
    events: [...(options?.events ?? [])],
  };

  // Add supplementary ads if provided
  if (options?.ads?.length) {
    options.ads.forEach((ad) => categorizeAd(ad, pools));
  }

  // Deconstruct incoming items into respective categorized pools
  incomingItems.forEach((raw) => {
    if (!raw) return;

    // Check if it's already a wrapped FeedItem
    if (typeof raw === 'object' && 'type' in raw && 'data' in raw) {
      const { type, data } = raw as FeedItem;
      if (!data) return;

      switch (type) {
        case 'news':
          pools.news.push(data as NewsArticle);
          break;
        case 'ad':
          categorizeAd(data as Advertisement, pools);
          break;
        case 'sponsored':
          pools.sponsored.push(data as SponsoredPost);
          break;
        case 'poll':
          pools.polls.push(data as any);
          break;
        case 'post':
          pools.posts.push(data as any);
          break;
        case 'event':
          pools.events.push(data);
          break;
        default:
          pools.news.push(data as any);
          break;
      }
    } else {
      // Treat naked item as news
      pools.news.push(raw as NewsArticle);
    }
  });

  const result: FeedItem[] = [];

  const takeNextAd = (): Advertisement | null => {
    return (
      pools.generalAds.shift() ||
      pools.districtAds.shift() ||
      pools.regionalAds.shift() ||
      pools.premiumAds.shift() ||
      null
    );
  };

  // ─── Slot 0: Premium Ad ──────────────────────────────────────────────────
  // Fallback Rule: If no premium ad is booked, displays News #1.
  const premiumAd = pools.premiumAds.shift() || pools.generalAds.shift();
  if (premiumAd) {
    result.push({
      type: 'ad',
      data: premiumAd,
      position: result.length,
    });
  } else if (pools.news.length > 0) {
    result.push({
      type: 'news',
      data: pools.news.shift()!,
      position: result.length,
    });
  }

  // ─── Slots 1–3: 3 News Articles + 1 Community Post ───────────────────────
  // Rule: 1 trending community post is inserted after News #2.
  if (pools.news.length > 0) {
    result.push({ type: 'news', data: pools.news.shift()!, position: result.length });
  }
  if (pools.news.length > 0) {
    result.push({ type: 'news', data: pools.news.shift()!, position: result.length });
  }
  if (pools.posts.length > 0) {
    result.push({ type: 'post', data: pools.posts.shift()!, position: result.length });
  }
  if (pools.news.length > 0) {
    result.push({ type: 'news', data: pools.news.shift()!, position: result.length });
  }

  // ─── Slot 4: City / District Targeted Ad ─────────────────────────────────
  // Fallback Rule: Falls back to next News article.
  const districtAd = pools.districtAds.shift() || takeNextAd();
  if (districtAd) {
    result.push({ type: 'ad', data: districtAd, position: result.length });
  } else if (pools.news.length > 0) {
    result.push({ type: 'news', data: pools.news.shift()!, position: result.length });
  }

  // ─── Slots 5–7: 3 News Articles + 1 Sponsored Post ───────────────────────
  // Fallback Rule: If no direct sponsor, inserts Google AdMob Native / next News.
  for (let i = 0; i < 3 && pools.news.length > 0; i++) {
    result.push({ type: 'news', data: pools.news.shift()!, position: result.length });
  }

  const sponsored = pools.sponsored.shift();
  if (sponsored) {
    result.push({ type: 'sponsored', data: sponsored, position: result.length });
  } else {
    // Fallback: check for alternate ad or news article
    const fallbackAd = takeNextAd();
    if (fallbackAd) {
      result.push({ type: 'ad', data: fallbackAd, position: result.length });
    } else if (pools.news.length > 0) {
      result.push({ type: 'news', data: pools.news.shift()!, position: result.length });
    }
  }

  // ─── Slot 8: State / Regional Ad ─────────────────────────────────────────
  // Fallback Rule: Falls back to next News article.
  const regionalAd = pools.regionalAds.shift() || takeNextAd();
  if (regionalAd) {
    result.push({ type: 'ad', data: regionalAd, position: result.length });
  } else if (pools.news.length > 0) {
    result.push({ type: 'news', data: pools.news.shift()!, position: result.length });
  }

  // ─── Slots 9–11: 3 News Articles + Event + Poll + Sponsored ──────────────
  // Rule: Mixes in upcoming local events and active community polls.
  if (pools.news.length > 0) {
    result.push({ type: 'news', data: pools.news.shift()!, position: result.length });
  }
  if (pools.events.length > 0) {
    result.push({ type: 'event', data: pools.events.shift(), position: result.length });
  }

  if (pools.news.length > 0) {
    result.push({ type: 'news', data: pools.news.shift()!, position: result.length });
  }
  if (pools.polls.length > 0) {
    result.push({ type: 'poll', data: pools.polls.shift() as any, position: result.length });
  }

  if (pools.news.length > 0) {
    result.push({ type: 'news', data: pools.news.shift()!, position: result.length });
  }
  if (pools.sponsored.length > 0) {
    result.push({ type: 'sponsored', data: pools.sponsored.shift()!, position: result.length });
  } else {
    const spareAd = takeNextAd();
    if (spareAd) {
      result.push({ type: 'ad', data: spareAd, position: result.length });
    }
  }

  // ─── Remaining: Remaining News Stream ────────────────────────────────────
  // Rule: Automatically intersperses posts every 5 news items and ads every 10 news items.
  let newsCounterSincePost = 0;
  let newsCounterSinceAd = 0;

  while (pools.news.length > 0) {
    result.push({
      type: 'news',
      data: pools.news.shift()!,
      position: result.length,
    });
    newsCounterSincePost++;
    newsCounterSinceAd++;

    // Every 5 news items: insert a community post (or poll if no posts remain)
    if (newsCounterSincePost >= 5) {
      if (pools.posts.length > 0) {
        result.push({ type: 'post', data: pools.posts.shift()!, position: result.length });
        newsCounterSincePost = 0;
      } else if (pools.polls.length > 0) {
        result.push({ type: 'poll', data: pools.polls.shift() as any, position: result.length });
        newsCounterSincePost = 0;
      }
    }

    // Every 10 news items: insert an ad or sponsored post
    if (newsCounterSinceAd >= 10) {
      const ad = takeNextAd();
      if (ad) {
        result.push({ type: 'ad', data: ad, position: result.length });
        newsCounterSinceAd = 0;
      } else if (pools.sponsored.length > 0) {
        result.push({ type: 'sponsored', data: pools.sponsored.shift()!, position: result.length });
        newsCounterSinceAd = 0;
      }
    }
  }

  // Append any leftover polls or events at the bottom if feed is short
  while (pools.polls.length > 0 && result.length < 20) {
    result.push({
      type: 'poll',
      data: pools.polls.shift() as any,
      position: result.length,
    });
  }

  // Final indexing pass
  result.forEach((item, index) => {
    item.position = index;
  });

  return result;
}

