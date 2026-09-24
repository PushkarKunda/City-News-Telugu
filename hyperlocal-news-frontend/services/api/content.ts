// services/api/content.ts
import { API_ROUTES } from './routes';
import { request } from './client';

// ─── Types ───────────────────────────────────────────────────────────────────

export interface AdvertisementTargeting {
    languages?: number[] | null;
    states?: number[] | null;
    districts?: number[] | null;
    cities?: number[] | null;
    gender?: 'male' | 'female' | 'other' | null;
    age_min?: number | null;
    age_max?: number | null;
}

export interface Advertisement {
    ad_id: number;
    title: string;
    image_url: string;
    placement: string;
    start_date: string;
    end_date: string;
    redirect_url: string;
    cta_text: string;
    priority: 'premium' | 'standard';
    state_id: number | null;
    district_id: number | null;
    city_id: number | null;
    language_id: number | null;
    is_active: boolean;
    targeting: AdvertisementTargeting | null;
}



export interface SponsoredPostTargeting {
    languages?: number[] | null;
    states?: number[] | null;
    districts?: number[] | null;
    cities?: number[] | null;
    gender?: 'male' | 'female' | 'other' | null;
    age_min?: number | null;
    age_max?: number | null;
}

export interface SponsoredPost {
    post_uid: string;
    title: string;
    content: string;
    image_url: string;
    cta_text: string;
    cta_url: string;
    start_date: string;
    end_date: string;
    state_id: number | null;
    district_id: number | null;
    city_id: number | null;
    language_id: number | null;
    id: number;
    sponsor_name: string;
    source: string;
    targeting: SponsoredPostTargeting | null;
}

export interface CreateAdvertisementPayload {
    title: string;
    image_url: string;
    placement: string;
    start_date: string;
    end_date: string;
    redirect_url?: string | null;
    state_id?: number | null;
    district_id?: number | null;
    city_id?: number | null;
    language_id?: number | null;
    is_active?: boolean;
    targeting?: AdvertisementTargeting | null;
}

export interface UpdateAdvertisementPayload {
    title?: string;
    image_url?: string;
    placement?: string;
    start_date?: string;
    end_date?: string;
    redirect_url?: string | null;
    state_id?: number | null;
    district_id?: number | null;
    city_id?: number | null;
    language_id?: number | null;
    is_active?: boolean;
    targeting?: AdvertisementTargeting | null;
}

export interface CreateSponsoredPostPayload {
    title: string;
    content: string;
    image_url: string;
    cta_text: string;
    cta_url: string;
    start_date: string;
    end_date: string;
    state_id?: number | null;
    district_id?: number | null;
    city_id?: number | null;
    language_id?: number | null;
    targeting?: SponsoredPostTargeting | null;
}

export interface UpdateSponsoredPostPayload {
    title?: string;
    content?: string;
    image_url?: string;
    cta_text?: string;
    cta_url?: string;
    start_date?: string;
    end_date?: string;
    state_id?: number | null;
    district_id?: number | null;
    city_id?: number | null;
    language_id?: number | null;
    targeting?: SponsoredPostTargeting | null;
}

// ─── API ─────────────────────────────────────────────────────────────────────

export const contentApi = {

    // ═══════════════════════════════════════════════════════════════════════════
    // ADVERTISEMENTS (Full-page ads for feeds)
    // ═══════════════════════════════════════════════════════════════════════════

    /**
     * GET /content/advertisements/active
     * Get active advertisements for injection into feeds
     * Used in: News Feed, Local News, Shorts (every 4-5 items)
     */
    getActiveAdvertisements: async (): Promise<Advertisement[]> => {
        return await request<Advertisement[]>({
            url: API_ROUTES.content.advertisements,
            method: 'GET',
        });
    },

    /**
     * GET /content/advertisements/:id
     * Get single advertisement by ad_id
     */
    getAdvertisementById: async (adId: number): Promise<Advertisement> => {
        return await request<Advertisement>({
            url: API_ROUTES.content.advertisementById(adId),
            method: 'GET',
        });
    },

    /**
     * POST /content/advertisements
     * Create advertisement (Admin only)
     */
    createAdvertisement: async (payload: CreateAdvertisementPayload): Promise<Advertisement> => {
        return await request<Advertisement>({
            url: API_ROUTES.content.createAdvertisement,
            method: 'POST',
            data: payload,
        });
    },

    /**
     * PUT /content/advertisements/:id
     * Update advertisement (Admin only)
     */
    updateAdvertisement: async (
        adId: number,
        payload: UpdateAdvertisementPayload
    ): Promise<Advertisement> => {
        return await request<Advertisement>({
            url: API_ROUTES.content.updateAdvertisement(adId),
            method: 'PUT',
            data: payload,
        });
    },

    /**
     * POST /content/advertisements/:id/toggle-status
     * Toggle advertisement active status (Admin only)
     */
    toggleAdvertisementStatus: async (adId: number): Promise<Advertisement> => {
        return await request<Advertisement>({
            url: API_ROUTES.content.toggleAdStatus(adId),
            method: 'POST',
        });
    },

    // ═══════════════════════════════════════════════════════════════════════════
    // SPONSORED POSTS (Native ads for posts feed)
    // ═══════════════════════════════════════════════════════════════════════════

    /**
     * GET /content/sponsored-posts/active
     * Get active sponsored posts for injection into posts feed
     * Used in: Posts page (every 4-5 posts)
     */
    getActiveSponsoredPosts: async (): Promise<SponsoredPost[]> => {
        return await request<SponsoredPost[]>({
            url: API_ROUTES.content.sponsoredPosts,
            method: 'GET',
        });
    },

    /**
     * POST /content/sponsored-posts
     * Create sponsored post (Admin only)
     */
    createSponsoredPost: async (payload: CreateSponsoredPostPayload): Promise<SponsoredPost> => {
        return await request<SponsoredPost>({
            url: API_ROUTES.content.createSponsoredPost,
            method: 'POST',
            data: payload,
        });
    },

    /**
     * PUT /content/sponsored-posts/:id
     * Update sponsored post (Admin only)
     */
    updateSponsoredPost: async (
        postUid: string,
        payload: UpdateSponsoredPostPayload
    ): Promise<SponsoredPost> => {
        return await request<SponsoredPost>({
            url: API_ROUTES.content.updateSponsoredPost(Number(postUid)),
            method: 'PUT',
            data: payload,
        });
    },

    /**
     * GET /content/sponsored-posts/pending
     * Get pending sponsored posts (Admin only)
     */
    getPendingSponsoredPosts: async (): Promise<SponsoredPost[]> => {
        return await request<SponsoredPost[]>({
            url: API_ROUTES.content.pendingSponsoredPosts,
            method: 'GET',
        });
    },
};