// utils/feedInjection.ts
import type { Advertisement, SponsoredPost } from '@/services/api/content';

/**
 * Check if content is currently active based on date range
 */
export function isContentActive(startDate: string, endDate: string): boolean {
    const now = new Date();
    const start = new Date(startDate);
    const end = new Date(endDate);
    return now >= start && now <= end;
}

/**
 * Filter advertisements by active status and date range
 */
export function getActiveAds(ads: Advertisement[]): Advertisement[] {
    if (!Array.isArray(ads)) return [];
    return ads.filter(ad =>
        ad.is_active && isContentActive(ad.start_date, ad.end_date)
    );
}

/**
 * Filter sponsored posts by date range
 */
export function getActiveSponsoredPosts(posts: SponsoredPost[]): SponsoredPost[] {
    if (!Array.isArray(posts)) return [];
    return posts.filter(post =>
        isContentActive(post.start_date, post.end_date)
    );
}

/**
 * Inject advertisements into feed items at regular intervals
 * Used for: News Feed, Local News, Shorts
 * 
 * @param items - Original feed items (news articles, shorts)
 * @param ads - Available advertisements (will be filtered for active)
 * @param interval - Insert ad every N items (default: 5)
 * @returns Combined array with ads injected
 */
export function injectAdsIntoFeed<T>(
    items: T[],
    ads: Advertisement[],
    interval: number = 5
): Array<T | { type: 'ad'; data: Advertisement; position: number }> {
    const activeAds = getActiveAds(ads);

    if (!activeAds.length) return items;

    const result: Array<T | { type: 'ad'; data: Advertisement; position: number }> = [];
    let adIndex = 0;

    items.forEach((item, index) => {
        result.push(item);

        // Insert ad after every `interval` items (but not at the very end)
        if ((index + 1) % interval === 0 && index < items.length - 1) {
            if (adIndex < activeAds.length) {
                result.push({
                    type: 'ad',
                    data: activeAds[adIndex],
                    position: result.length,
                });
                adIndex = (adIndex + 1) % activeAds.length; // Cycle through ads
            }
        }
    });

    return result;
}

/**
 * Inject sponsored posts into user posts feed
 * Used for: Posts page
 * 
 * @param posts - Original posts
 * @param sponsoredPosts - Available sponsored posts (will be filtered for active)
 * @param interval - Insert sponsored post every N posts (default: 4)
 * @returns Combined array with sponsored posts injected
 */
export function injectSponsoredIntoPosts<T>(
    posts: T[],
    sponsoredPosts: SponsoredPost[],
    interval: number = 4
): Array<T | { type: 'sponsored'; data: SponsoredPost; position: number }> {
    const activePosts = getActiveSponsoredPosts(sponsoredPosts);

    if (!activePosts.length) return posts;

    const result: Array<T | { type: 'sponsored'; data: SponsoredPost; position: number }> = [];
    let sponsoredIndex = 0;

    posts.forEach((post, index) => {
        result.push(post);

        // Insert sponsored post after every `interval` posts
        if ((index + 1) % interval === 0 && index < posts.length - 1) {
            if (sponsoredIndex < activePosts.length) {
                result.push({
                    type: 'sponsored',
                    data: activePosts[sponsoredIndex],
                    position: result.length,
                });
                sponsoredIndex = (sponsoredIndex + 1) % activePosts.length;
            }
        }
    });

    return result;
}

/**
 * Check if feed item is an advertisement
 */
export function isAdvertisement(item: any): item is { type: 'ad'; data: Advertisement } {
    return item?.type === 'ad';
}

/**
 * Check if feed item is a sponsored post
 */
export function isSponsoredPost(item: any): item is { type: 'sponsored'; data: SponsoredPost } {
    return item?.type === 'sponsored';
}

/**
 * Filter ads by placement
 */
export function filterAdsByPlacement(ads: Advertisement[], placement: string): Advertisement[] {
    if (!Array.isArray(ads)) return [];
    return ads.filter(ad => ad.placement === placement);
}

/**
 * Filter content by location targeting
 */
export function filterByLocation(
    items: (Advertisement | SponsoredPost)[],
    userLocation: {
        state_id?: number;
        district_id?: number;
        city_id?: number;
    }
): (Advertisement | SponsoredPost)[] {
    if (!Array.isArray(items)) return [];
    return items.filter(item => {
        // If no location targeting, show to everyone
        if (!item.state_id && !item.district_id && !item.city_id) return true;

        // Match state
        if (item.state_id && item.state_id !== userLocation.state_id) return false;

        // Match district
        if (item.district_id && item.district_id !== userLocation.district_id) return false;

        // Match city
        if (item.city_id && item.city_id !== userLocation.city_id) return false;

        return true;
    });
}

/**
 * Filter by advanced targeting (from targeting object)
 */
export function filterByTargeting<T extends { targeting: any }>(
    items: T[],
    userProfile: {
        language_id?: number;
        state_id?: number;
        district_id?: number;
        city_id?: number;
        gender?: 'male' | 'female' | 'other';
        age?: number;
    }
): T[] {
    if (!Array.isArray(items)) return [];
    return items.filter(item => {
        if (!item.targeting) return true;

        const { targeting } = item;

        // Language targeting
        if (targeting.languages?.length && userProfile.language_id) {
            if (!targeting.languages.includes(userProfile.language_id)) return false;
        }

        // State targeting
        if (targeting.states?.length && userProfile.state_id) {
            if (!targeting.states.includes(userProfile.state_id)) return false;
        }

        // District targeting
        if (targeting.districts?.length && userProfile.district_id) {
            if (!targeting.districts.includes(userProfile.district_id)) return false;
        }

        // City targeting
        if (targeting.cities?.length && userProfile.city_id) {
            if (!targeting.cities.includes(userProfile.city_id)) return false;
        }

        // Gender targeting
        if (targeting.gender && userProfile.gender) {
            if (targeting.gender !== userProfile.gender) return false;
        }

        // Age targeting
        if (userProfile.age !== undefined) {
            if (targeting.age_min !== null && userProfile.age < targeting.age_min) return false;
            if (targeting.age_max !== null && userProfile.age > targeting.age_max) return false;
        }

        return true;
    });
}