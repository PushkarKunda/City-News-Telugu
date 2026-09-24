// services/api/follow.ts
import { API_ROUTES } from './routes';
import { request } from './client';

// ─── Types ───────────────────────────────────────────────────────────────────
// ⚠️ THESE NEED VERIFICATION - Please provide actual API response

export interface UserProfile {
    user_uid: string;
    name: string;
    username?: string;
    avatar?: string;
    bio?: string;
    is_verified?: boolean;
    is_publisher?: boolean;
}

export interface FollowStatus {
    is_following: boolean;
    is_followed_by?: boolean;
    is_blocked?: boolean;
    can_follow?: boolean;
}

export interface FollowCounts {
    followers_count: number;
    following_count: number;
}

export interface FollowerUser extends UserProfile {
    followed_at?: string;
    is_following_back?: boolean;
}

export interface FollowingSuggestion extends UserProfile {
    reason?: string;
    mutual_followers?: number;
    mutual_following?: number;
}

// ─── API ─────────────────────────────────────────────────────────────────────

export const followApi = {

    /**
     * POST /follow/:uid
     * Follow a user
     */
    followUser: async (userUid: string): Promise<void> => {
        await request({
            url: API_ROUTES.follow.followUser(userUid),
            method: 'POST',
        });
    },

    /**
     * DELETE /follow/:uid
     * Unfollow a user
     */
    unfollowUser: async (userUid: string): Promise<void> => {
        await request({
            url: API_ROUTES.follow.unfollowUser(userUid),
            method: 'DELETE',
        });
    },

    /**
     * GET /follow/followers/:uid
     * Get user's followers list
     */
    getFollowers: async (userUid: string): Promise<FollowerUser[]> => {
        return await request<FollowerUser[]>({
            url: API_ROUTES.follow.followers(userUid),
            method: 'GET',
        });
    },

    /**
     * GET /follow/following/:uid
     * Get users that this user is following
     */
    getFollowing: async (userUid: string): Promise<FollowerUser[]> => {
        return await request<FollowerUser[]>({
            url: API_ROUTES.follow.following(userUid),
            method: 'GET',
        });
    },

    /**
     * GET /follow/suggestions
     * Get follow suggestions for current user
     */
    getSuggestions: async (): Promise<FollowingSuggestion[]> => {
        return await request<FollowingSuggestion[]>({
            url: API_ROUTES.follow.suggestions,
            method: 'GET',
        });
    },

    /**
     * GET /follow/status/:uid
     * Get follow relationship status with a user
     */
    getFollowStatus: async (userUid: string): Promise<FollowStatus> => {
        return await request<FollowStatus>({
            url: API_ROUTES.follow.status(userUid),
            method: 'GET',
        });
    },

    /**
     * GET /follow/counts/:uid
     * Get follower/following counts for a user
     */
    getFollowCounts: async (userUid: string): Promise<FollowCounts> => {
        return await request<FollowCounts>({
            url: API_ROUTES.follow.counts(userUid),
            method: 'GET',
        });
    },

    /**
     * GET /follow/feed/posts
     * Get posts from users you follow (used in postsApi too)
     */
    getFollowingFeed: async (): Promise<any[]> => {
        return await request<any[]>({
            url: API_ROUTES.follow.feed,
            method: 'GET',
        });
    },
};