// src/api/client.js
/**
 * Central API Client for HyperNews Backend
 * Connects to http://127.0.0.1:8000 with JWT bearer token support.
 */

const API_BASE_URL = 'http://127.0.0.1:8000';

const DEFAULT_DEV_ADMIN_TOKEN = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiJKS0E2RFkwMSIsImV4cCI6MTgyMTUwMjE4NywiaWF0IjoxNzg5OTY2MTg3LCJ2ZXIiOjAsInR5cGUiOiJhY2Nlc3MifQ.XBBAXezbskhd5nohX3tXDLmIjwntEIVp8ilTEOZNUVo';

class ApiClient {
  constructor() {
    this.baseUrl = API_BASE_URL;
    this.token = localStorage.getItem('hypernews_token') || DEFAULT_DEV_ADMIN_TOKEN;
  }

  setToken(token) {
    this.token = token;
    if (token) {
      localStorage.setItem('hypernews_token', token);
    } else {
      localStorage.removeItem('hypernews_token');
    }
  }

  getHeaders(customHeaders = {}) {
    const headers = {
      'Content-Type': 'application/json',
      ...customHeaders,
    };
    if (this.token) {
      headers['Authorization'] = `Bearer ${this.token}`;
    }
    return headers;
  }

  async request(endpoint, options = {}) {
    const url = `${this.baseUrl}${endpoint}`;
    const headers = this.getHeaders(options.headers);

    try {
      const response = await fetch(url, {
        ...options,
        headers,
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.detail || `Request failed with status ${response.status}`);
      }

      return await response.json();
    } catch (err) {
      console.warn(`[API] ${options.method || 'GET'} ${endpoint} failed:`, err.message);
      throw err;
    }
  }

  async checkHealth() {
    try {
      const res = await fetch(`${this.baseUrl}/docs`, { method: 'HEAD', mode: 'no-cors' });
      return true;
    } catch {
      return false;
    }
  }

  // Auth
  async login(username, password) {
    return this.request('/user/auth/login', {
      method: 'POST',
      body: JSON.stringify({ identifier: username, password }),
    });
  }

  // News Endpoints
  async getNews(params = {}) {
    const query = new URLSearchParams(params).toString();
    try {
      return await this.request(`/v1/trending?${query}`);
    } catch {
      return await this.request(`/v1/feed?${query}`);
    }
  }

  async getNewsFeed(params = {}) {
    const query = new URLSearchParams(params).toString();
    return this.request(`/v1/feed?${query}`);
  }

  async getNewsDetails(newsUid) {
    try {
      return await this.request(`/admin/news/${newsUid}/details`);
    } catch {
      return await this.request(`/admin/news/${newsUid}`);
    }
  }

  async getPendingNews(page = 1, limit = 20, filters = {}) {
    const query = new URLSearchParams({ page, limit, ...filters }).toString();
    return this.request(`/admin/news/pending?${query}`);
  }

  async getRejectedNews(page = 1, limit = 20) {
    return this.request(`/admin/news/rejected?page=${page}&limit=${limit}`);
  }

  async approveNews(newsUid) {
    return this.request(`/admin/news/${newsUid}/approve`, {
      method: 'PUT',
    });
  }

  async rejectNews(newsUid, reason = '') {
    let url = `/admin/news/${newsUid}/reject`;
    if (reason) url += `?reason=${encodeURIComponent(reason)}`;
    return this.request(url, {
      method: 'PUT',
    });
  }

  async bulkRejectNews(newsUids, reason = '') {
    let url = `/admin/news/bulk-reject`;
    const params = new URLSearchParams();
    newsUids.forEach(uid => params.append('news_uids', uid));
    if (reason) params.append('reason', reason);
    return this.request(`${url}?${params.toString()}`, {
      method: 'POST',
    });
  }

  async autoGenerateNews(sourceUrl, language = 'en', cityId = null, categoryIds = []) {
    const langCode = language.toLowerCase().startsWith('te') ? 'te' : 'en';
    return this.request(`/admin/news/auto-generate/${langCode}`, {
      method: 'POST',
      body: JSON.stringify({
        source_url: sourceUrl,
        city_id: cityId,
        category_ids: categoryIds,
      }),
    });
  }

  async exportNews(format = 'csv') {
    return this.request(`/admin/export/news?format=${format}`);
  }

  async getCategories() {
    try {
      return await this.request('/categories/all');
    } catch {
      return await this.request('/categories/menu');
    }
  }

  async createNews(newsData) {
    return this.request('/news/', {
      method: 'POST',
      body: JSON.stringify(newsData),
    });
  }

  async updateNewsStatus(newsId, status) {
    return this.request(`/news/${newsId}/status`, {
      method: 'PATCH',
      body: JSON.stringify({ status }),
    });
  }

  async updateNews(newsUid, newsData) {
    try {
      return await this.request(`/admin/news/${newsUid}`, {
        method: 'PUT',
        body: JSON.stringify(newsData),
      });
    } catch {
      return await this.request(`/news/${newsUid}`, {
        method: 'PATCH',
        body: JSON.stringify(newsData),
      });
    }
  }

  async deleteNews(newsUid) {
    try {
      return await this.request(`/admin/news/${newsUid}`, {
        method: 'DELETE',
      });
    } catch {
      return await this.request(`/news/${newsUid}`, {
        method: 'DELETE',
      });
    }
  }

  async bulkApproveNews(newsUids) {
    return Promise.all(newsUids.map(uid => this.approveNews(uid)));
  }

  // Location Hierarchy Endpoints
  async getStates() {
    try {
      return await this.request('/base/states');
    } catch {
      return [
        { id: 1, name: 'Telangana', code: 'TG' },
        { id: 2, name: 'Andhra Pradesh', code: 'AP' },
        { id: 3, name: 'Maharashtra', code: 'MH' },
        { id: 4, name: 'Karnataka', code: 'KA' },
        { id: 5, name: 'National', code: 'IN' }
      ];
    }
  }

  async getDistricts(stateId) {
    try {
      const q = stateId ? `?state_id=${stateId}` : '';
      return await this.request(`/base/districts${q}`);
    } catch {
      return [
        { id: 1, state_id: 1, name: 'Hyderabad' },
        { id: 2, state_id: 1, name: 'Rangareddy' },
        { id: 3, state_id: 1, name: 'Warangal' },
        { id: 4, state_id: 2, name: 'Visakhapatnam' },
        { id: 5, state_id: 2, name: 'Vijayawada' }
      ];
    }
  }

  async getCities(districtId) {
    try {
      const q = districtId ? `?district_id=${districtId}` : '';
      return await this.request(`/base/cities${q}`);
    } catch {
      return [
        { id: 1, district_id: 1, name: 'HITEC City' },
        { id: 2, district_id: 1, name: 'Gachibowli' },
        { id: 3, district_id: 1, name: 'Banjara Hills' },
        { id: 4, district_id: 1, name: 'Secunderabad' },
        { id: 5, district_id: 3, name: 'Hanamkonda' }
      ];
    }
  }

  async translateNewsContent(text, targetLang = 'te') {
    try {
      return await this.request('/admin/ai/translate', {
        method: 'POST',
        body: JSON.stringify({ text, target_language: targetLang })
      });
    } catch {
      return {
        translated_text: text,
        target_language: targetLang,
        note: 'AI Translation simulated'
      };
    }
  }

  // AI Summarization
  async generateAiSummary(text, language = 'en') {
    return this.request('/admin/ai/summarize', {
      method: 'POST',
      body: JSON.stringify({ text, language }),
    });
  }

  // Community Posts
  async getPosts(limit = 20, cursor = null) {
    const query = new URLSearchParams({ limit, ...(cursor ? { cursor } : {}) }).toString();
    return this.request(`/posts/feed?${query}`);
  }

  async getUserPosts(userUid, limit = 20) {
    return this.request(`/posts/user/${userUid}?limit=${limit}`);
  }

  async createPost(postData) {
    return this.request('/posts/', {
      method: 'POST',
      body: JSON.stringify(postData),
    });
  }

  async deletePost(postUid) {
    return this.request(`/posts/${postUid}`, {
      method: 'DELETE',
    });
  }

  async updatePostHashtags(postUid, hashtags) {
    return this.request(`/posts/${postUid}/hashtags`, {
      method: 'PATCH',
      body: JSON.stringify(hashtags),
    });
  }

  async likePost(postUid) {
    return this.request(`/posts/${postUid}/like`, {
      method: 'POST',
    });
  }

  async getPostComments(postUid, limit = 20, offset = 0) {
    return this.request(`/posts/${postUid}/comments?limit=${limit}&offset=${offset}`);
  }

  async addPostComment(postUid, commentText) {
    return this.request(`/posts/${postUid}/comment`, {
      method: 'POST',
      body: JSON.stringify({ comment_text: commentText }),
    });
  }

  async sharePost(postUid, platform = null) {
    return this.request(`/posts/${postUid}/share`, {
      method: 'POST',
      body: JSON.stringify(platform ? { platform } : {}),
    });
  }

  async getTrendingHashtags(limit = 10) {
    return this.request(`/posts/hashtags/trending?limit=${limit}`);
  }

  async getHashtagSuggestions(query, limit = 10) {
    return this.request(`/posts/hashtags/suggestions?query=${encodeURIComponent(query)}&limit=${limit}`);
  }

  // Users & Roles
  async getUsers(page = 1, limit = 20) {
    return this.request(`/user/all?page=${page}&limit=${limit}`);
  }

  async updateUserRole(userUid, newRole) {
    return this.request(`/user/${userUid}/role`, {
      method: 'PATCH',
      body: JSON.stringify({ role: newRole }),
    });
  }

  async toggleUserSuspension(userUid, isSuspended) {
    return this.request(`/user/${userUid}/suspend`, {
      method: 'POST',
      body: JSON.stringify({ is_suspended: isSuspended }),
    });
  }

  // Ads & Campaigns
  async getAds() {
    try {
      return await this.request('/content/admin/advertisements');
    } catch {
      return this.request('/admin/ads/');
    }
  }

  async createAdvertisement(data) {
    return this.request('/content/advertisements', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  }

  // System Settings & Info
  async getAppInfo() {
    return this.request('/admin/settings/info');
  }

  async getAppSettings() {
    return this.request('/admin/settings/');
  }

  async updateAppSettings(settings) {
    return this.request('/admin/settings/', {
      method: 'PUT',
      body: JSON.stringify(settings),
    });
  }

  // Audit Logs
  async getSecurityAuditLogs(limit = 20, offset = 0) {
    return this.request(`/user-activity/admin/security-audit-logs?limit=${limit}&offset=${offset}`);
  }

  // Polls Endpoints
  async getActivePolls(limit = 20, offset = 0) {
    return this.request(`/content/polls/active?limit=${limit}&offset=${offset}`);
  }

  async getPendingPolls(limit = 50, offset = 0) {
    return this.request(`/content/admin/polls/pending?limit=${limit}&offset=${offset}`);
  }

  async createPoll(pollData) {
    return this.request('/content/polls', {
      method: 'POST',
      body: JSON.stringify(pollData),
    });
  }

  async votePoll(pollUid, optionIndex, userUid) {
    return this.request('/content/polls/vote', {
      method: 'PUT',
      body: JSON.stringify({
        poll_uid: pollUid,
        option_index: optionIndex,
        user_uid: userUid,
      }),
    });
  }

  async approvePoll(pollId, isApproved) {
    return this.request(`/content/admin/polls/${pollId}/approval?is_approved=${isApproved}`, {
      method: 'PUT',
    });
  }

  async deletePoll(pollId) {
    return this.request(`/content/admin/polls/${pollId}`, {
      method: 'DELETE',
    });
  }

  // Rewards & Gamification Endpoints
  async getRewardsStats() {
    return this.request('/rewards/admin/stats');
  }

  async getRewardsHealth(detailed = true) {
    return this.request(`/rewards/health?detailed=${detailed}`);
  }

  async getBingoLeaderboard(limit = 20) {
    return this.request(`/rewards/bingo/leaderboard?limit=${limit}`);
  }

  async addPointsAdmin(userUid, points, reason) {
    return this.request(`/rewards/admin/add-points?user_uid=${encodeURIComponent(userUid)}&points=${points}&reason=${encodeURIComponent(reason)}`, {
      method: 'POST',
    });
  }

  async clearFraudFlag(userUid) {
    return this.request(`/rewards/admin/clear-flag/${encodeURIComponent(userUid)}`, {
      method: 'POST',
    });
  }

  // Sponsored Posts Endpoints
  async getSponsoredPosts(page = 1, limit = 20, isApproved = null) {
    let url = `/content/admin/sponsored-posts?page=${page}&limit=${limit}`;
    if (isApproved !== null) url += `&is_approved=${isApproved}`;
    return this.request(url);
  }

  async getActiveSponsoredPosts(limit = 20) {
    return this.request(`/content/sponsored-posts/active?limit=${limit}`);
  }

  async createSponsoredPost(postData) {
    return this.request('/content/sponsored-posts', {
      method: 'POST',
      body: JSON.stringify(postData),
    });
  }

  async moderateSponsoredPost(postId, action, reason = '') {
    let url = `/content/admin/sponsored-posts/${postId}/moderate?action=${action}`;
    if (reason) url += `&reason=${encodeURIComponent(reason)}`;
    return this.request(url, { method: 'PUT' });
  }

  async deleteSponsoredPost(postId) {
    return this.request(`/content/admin/sponsored-posts/${postId}`, {
      method: 'DELETE',
    });
  }

  async getTargetingOptions() {
    return this.request('/content/targeting-options');
  }

  // Advertisements Endpoints
  async getAdminAdvertisements(page = 1, limit = 20, isApproved = null) {
    let url = `/content/admin/advertisements?page=${page}&limit=${limit}`;
    if (isApproved !== null) url += `&is_approved=${isApproved}`;
    return this.request(url);
  }

  async moderateAdvertisement(adId, action, reason = '') {
    let url = `/content/admin/advertisements/${adId}/moderate?action=${action}`;
    if (reason) url += `&reason=${encodeURIComponent(reason)}`;
    return this.request(url, { method: 'PUT' });
  }

  async deleteAdvertisement(adId) {
    return this.request(`/content/admin/advertisements/${adId}`, {
      method: 'DELETE',
    });
  }

  // Events Endpoints
  async getEvents(limit = 20, offset = 0) {
    return this.request(`/content/events?limit=${limit}&offset=${offset}`);
  }

  async getPendingEvents(limit = 20, offset = 0) {
    return this.request(`/content/admin/events/pending?limit=${limit}&offset=${offset}`);
  }

  async approveEvent(eventId, statusApproved, reason = '') {
    let url = `/content/admin/events/${eventId}/approval?status_approved=${statusApproved}`;
    if (reason) url += `&rejection_reason=${encodeURIComponent(reason)}`;
    return this.request(url, { method: 'PUT' });
  }

  async deleteEvent(eventId) {
    return this.request(`/content/admin/events/${eventId}`, {
      method: 'DELETE',
    });
  }

  // Content Analytics & Overview
  async getContentOverview(period = 'week') {
    return this.request(`/content/overview?period=${period}`);
  }

  async getContentStats() {
    return this.request('/content/stats');
  }

  // Insights / Inshorts Stories Endpoints
  async getInsights(limit = 20, offset = 0, category = null, search = null) {
    let url = `/insights/?limit=${limit}&offset=${offset}`;
    if (category) url += `&category=${encodeURIComponent(category)}`;
    if (search) url += `&search=${encodeURIComponent(search)}`;
    return this.request(url);
  }

  async getInsightCategories() {
    return this.request('/insights/categories');
  }

  async getInsightByUid(insightUid) {
    return this.request(`/insights/uid/${insightUid}`);
  }

  async createInsight(insightData) {
    return this.request('/insights/', {
      method: 'POST',
      body: JSON.stringify(insightData),
    });
  }

  async deleteInsight(insightUid) {
    return this.request(`/insights/${insightUid}`, {
      method: 'DELETE',
    });
  }

  // Shorts & YouTube Videos Endpoints
  async getShortsFeed(language = 'en', limit = 20, cursor = null) {
    let url = `/shorts/feed?language=${language}&limit=${limit}`;
    if (cursor) url += `&cursor=${encodeURIComponent(cursor)}`;
    return this.request(url);
  }

  async getYouTubeShorts(language = 'en', limit = 20) {
    return this.request(`/shorts/youtube?language=${language}&limit=${limit}`);
  }

  async getUserShorts(userUid = null, language = 'en', limit = 20) {
    let url = `/shorts/user?language=${language}&limit=${limit}`;
    if (userUid) url += `&user_uid=${encodeURIComponent(userUid)}`;
    return this.request(url);
  }

  async createUserShort(shortData) {
    return this.request('/shorts/', {
      method: 'POST',
      body: JSON.stringify(shortData),
    });
  }

  async fetchYouTubeShortsAdmin(language = 'en', query = '', limit = 10) {
    let url = `/shorts/admin/fetch/youtube?language=${language}&limit=${limit}`;
    if (query) url += `&query=${encodeURIComponent(query)}`;
    return this.request(url, { method: 'POST' });
  }

  async approveUserShort(shortUid) {
    return this.request(`/shorts/admin/${shortUid}/approve`, {
      method: 'PATCH',
    });
  }

  async rejectUserShort(shortUid, reason) {
    return this.request(`/shorts/admin/${shortUid}/reject?reason=${encodeURIComponent(reason)}`, {
      method: 'PATCH',
    });
  }

  // Analytics
  async getAnalytics(timeRange = '7d') {
    return this.request(`/insights/dashboard?range=${timeRange}`);
  }

  // Base Location & Language Management
  async getLanguages(search = null, limit = 100) {
    let url = `/base/languages?limit=${limit}`;
    if (search) url += `&search=${encodeURIComponent(search)}`;
    return this.request(url);
  }

  async getAllLanguages() {
    return this.request('/base/languages/all');
  }

  async createLanguage(data) {
    return this.request('/base/languages', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  }

  async updateLanguage(id, data) {
    return this.request(`/base/languages/${id}`, {
      method: 'PUT',
      body: JSON.stringify(data),
    });
  }

  async deleteLanguage(id) {
    return this.request(`/base/languages/${id}`, {
      method: 'DELETE',
    });
  }

  async getStates(search = null, limit = 100) {
    let url = `/base/states?limit=${limit}`;
    if (search) url += `&search=${encodeURIComponent(search)}`;
    return this.request(url);
  }

  async createState(data) {
    return this.request('/base/states', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  }

  async updateState(id, data) {
    return this.request(`/base/states/${id}`, {
      method: 'PUT',
      body: JSON.stringify(data),
    });
  }

  async deleteState(id) {
    return this.request(`/base/states/${id}`, {
      method: 'DELETE',
    });
  }

  async getDistricts(stateId = null, limit = 100) {
    let url = `/base/districts?limit=${limit}`;
    if (stateId) url += `&state_id=${stateId}`;
    return this.request(url);
  }

  async createDistrict(data) {
    return this.request('/base/districts', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  }

  async updateDistrict(id, data) {
    return this.request(`/base/districts/${id}`, {
      method: 'PUT',
      body: JSON.stringify(data),
    });
  }

  async deleteDistrict(id) {
    return this.request(`/base/districts/${id}`, {
      method: 'DELETE',
    });
  }

  async getCities(districtId = null, limit = 100) {
    let url = `/base/cities?limit=${limit}`;
    if (districtId) url += `&district_id=${districtId}`;
    return this.request(url);
  }

  async createCity(data) {
    return this.request('/base/cities', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  }

  async updateCity(id, data) {
    return this.request(`/base/cities/${id}`, {
      method: 'PUT',
      body: JSON.stringify(data),
    });
  }

  async deleteCity(id) {
    return this.request(`/base/cities/${id}`, {
      method: 'DELETE',
    });
  }

  async getLocationStats() {
    try {
      return await this.request('/base/stats');
    } catch {
      return null;
    }
  }

  async getStateHierarchy(stateId) {
    try {
      return await this.request(`/base/hierarchy/states/${stateId}`);
    } catch {
      return null;
    }
  }

  async searchLocations(query, limit = 20) {
    try {
      return await this.request(`/base/search?query=${encodeURIComponent(query)}&limit=${limit}`);
    } catch {
      return [];
    }
  }

  async getLocationHierarchy() {
    try {
      return await this.request('/base/hierarchy');
    } catch {
      return null;
    }
  }

  async getAdminDashboard() {
    try {
      return await this.request('/admin/dashboard');
    } catch {
      return null;
    }
  }

  async getDetailedAdminStats() {
    try {
      return await this.request('/admin/stats/detailed');
    } catch {
      return null;
    }
  }

  // Rewards & Economy
  async getRewardsHealth(detailed = true) {
    try {
      return await this.request(`/rewards/health?detailed=${detailed}`);
    } catch {
      return null;
    }
  }

  async getRewardsStats() {
    try {
      return await this.request('/rewards/admin/stats');
    } catch {
      return null;
    }
  }

  async clearRewardsUserFlag(userUid) {
    return this.request(`/rewards/admin/clear-flag/${userUid}`, {
      method: 'POST'
    });
  }

  async clearFraudFlag(userUid) {
    return this.clearRewardsUserFlag(userUid);
  }

  async adminAddRewardsPoints(userUid, points, reason = 'Admin adjustment') {
    const q = new URLSearchParams({ user_uid: userUid, points, reason }).toString();
    return this.request(`/rewards/admin/add-points?${q}`, {
      method: 'POST'
    });
  }

  async addPointsAdmin(userUid, points, reason) {
    return this.adminAddRewardsPoints(userUid, points, reason);
  }

  async getRewardsLeaderboard(period = 'weekly', limit = 50) {
    try {
      return await this.request(`/rewards/leaderboard?period=${period}&limit=${limit}`);
    } catch {
      return null;
    }
  }

  // =========================================================================
  // Categories & Taxonomy Management
  // =========================================================================
  async getAllCategories(includeInactive = false, search = '') {
    try {
      let url = `/categories/?include_inactive=${includeInactive}`;
      if (search) url += `&search=${encodeURIComponent(search)}`;
      return await this.request(url);
    } catch {
      try {
        return await this.request('/categories/all');
      } catch {
        return [];
      }
    }
  }

  async createCategory(categoryData) {
    return this.request('/categories/admin/create', {
      method: 'POST',
      body: JSON.stringify(categoryData),
    });
  }

  async updateCategory(categoryId, categoryData) {
    return this.request(`/categories/admin/${categoryId}`, {
      method: 'PUT',
      body: JSON.stringify(categoryData),
    });
  }

  async deleteCategory(categoryId) {
    return this.request(`/categories/admin/${categoryId}`, {
      method: 'DELETE',
    });
  }

  // =========================================================================
  // Hyperlocal Events Operations
  // =========================================================================
  async getEvents(params = {}) {
    const q = new URLSearchParams();
    if (params.search) q.append('search', params.search);
    if (params.state_id) q.append('state_id', params.state_id);
    if (params.district_id) q.append('district_id', params.district_id);
    if (params.city_id) q.append('city_id', params.city_id);
    if (params.is_online !== undefined && params.is_online !== null) q.append('is_online', params.is_online);
    q.append('upcoming_only', params.upcoming_only !== undefined ? params.upcoming_only : false);
    q.append('limit', params.limit || 50);
    q.append('offset', params.offset || 0);

    try {
      return await this.request(`/content/events?${q.toString()}`);
    } catch {
      return { total: 0, items: [] };
    }
  }

  async getPendingEvents(limit = 50, offset = 0) {
    try {
      return await this.request(`/content/admin/events/pending?limit=${limit}&offset=${offset}`);
    } catch {
      return { total: 0, items: [] };
    }
  }

  async getEventByUid(eventUid) {
    return this.request(`/content/events/${eventUid}`);
  }

  async createEvent(eventData) {
    return this.request('/content/events', {
      method: 'POST',
      body: JSON.stringify(eventData),
    });
  }

  async updateEvent(eventId, eventData) {
    return this.request(`/content/events/${eventId}`, {
      method: 'PUT',
      body: JSON.stringify(eventData),
    });
  }

  async approveEvent(eventId, statusApproved, rejectionReason = '') {
    let url = `/content/admin/events/${eventId}/approval?status_approved=${statusApproved}`;
    if (rejectionReason) {
      url += `&rejection_reason=${encodeURIComponent(rejectionReason)}`;
    }
    return this.request(url, {
      method: 'PUT',
    });
  }

  async deleteEvent(eventId) {
    return this.request(`/content/admin/events/${eventId}`, {
      method: 'DELETE',
    });
  }

  async getEventsAnalytics(period = 'month') {
    try {
      return await this.request(`/content/events/analytics?period=${period}`);
    } catch {
      return null;
    }
  }

  // =========================================================================
  // User Profile & Preferences
  // =========================================================================
  async getMyProfile() {
    try {
      return await this.request('/user/users/me');
    } catch {
      return null;
    }
  }

  async updateMyProfile(profileData) {
    const validKeys = ['user_name', 'name', 'gender', 'date_of_birth', 'language_id', 'state_id', 'district_id', 'city_id', 'profile_picture'];
    const payload = {};
    for (const key of validKeys) {
      if (profileData[key] !== undefined && profileData[key] !== null && profileData[key] !== '') {
        payload[key] = profileData[key];
      }
    }
    if (Object.keys(payload).length === 0 && profileData.name) {
      payload.name = profileData.name;
    }
    return this.request('/user/users/me', {
      method: 'PATCH',
      body: JSON.stringify(payload),
    });
  }

  async getMyPreferences() {
    try {
      return await this.request('/user/preferences/me');
    } catch {
      return null;
    }
  }

  async updateMyPreferences(prefData) {
    return this.request('/user/preferences/me', {
      method: 'PUT',
      body: JSON.stringify(prefData),
    });
  }

  // =========================================================================
  // Platform & Admin Settings Management
  // =========================================================================
  async getAppInfo() {
    try {
      return await this.request('/admin/settings/info');
    } catch {
      return null;
    }
  }

  async getAppSettings() {
    try {
      return await this.request('/admin/settings/');
    } catch {
      return null;
    }
  }

  async updateAppSettings(settingsData) {
    return this.request('/admin/settings/', {
      method: 'PUT',
      body: JSON.stringify(settingsData),
    });
  }

  async getAdminSettingsHealth() {
    try {
      return await this.request('/admin/settings/health');
    } catch {
      return null;
    }
  }

  async getAdminSettingsStats() {
    try {
      return await this.request('/admin/settings/stats');
    } catch {
      return null;
    }
  }

  async getMenuItems() {
    try {
      return await this.request('/admin/settings/menu/header');
    } catch {
      return [];
    }
  }

  async createMenuItem(itemData) {
    return this.request('/admin/settings/menu', {
      method: 'POST',
      body: JSON.stringify(itemData),
    });
  }

  async updateMenuItem(itemId, itemData) {
    return this.request(`/admin/settings/menu/${itemId}`, {
      method: 'PUT',
      body: JSON.stringify(itemData),
    });
  }

  async deleteMenuItem(itemId) {
    return this.request(`/admin/settings/menu/${itemId}`, {
      method: 'DELETE',
    });
  }

  async getFooterLinks() {
    try {
      return await this.request('/admin/settings/footer');
    } catch {
      return [];
    }
  }

  async createFooterLink(linkData) {
    return this.request('/admin/settings/footer', {
      method: 'POST',
      body: JSON.stringify(linkData),
    });
  }

  async deleteFooterLink(linkId) {
    return this.request(`/admin/settings/footer/${linkId}`, {
      method: 'DELETE',
    });
  }

  async getSocialLinks() {
    try {
      return await this.request('/admin/settings/social');
    } catch {
      return [];
    }
  }

  async createSocialLink(linkData) {
    return this.request('/admin/settings/social', {
      method: 'POST',
      body: JSON.stringify(linkData),
    });
  }

  async deleteSocialLink(linkId) {
    return this.request(`/admin/settings/social/${linkId}`, {
      method: 'DELETE',
    });
  }

  async downloadNewsCsv(statusFilter = null) {
    const q = statusFilter ? `?format=csv&status_filter=${statusFilter}` : '?format=csv';
    const response = await fetch(`${this.baseUrl}/admin/settings/export/news${q}`, {
      headers: {
        Authorization: `Bearer ${this.token}`,
      },
    });
    if (!response.ok) throw new Error('Failed to export news CSV');
    const blob = await response.blob();
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `news_export_${new Date().toISOString().slice(0, 10)}.csv`;
    document.body.appendChild(a);
    a.click();
    a.remove();
    window.URL.revokeObjectURL(url);
    return true;
  }

  async downloadUsersCsv() {
    const response = await fetch(`${this.baseUrl}/admin/settings/export/users?format=csv`, {
      headers: {
        Authorization: `Bearer ${this.token}`,
      },
    });
    if (!response.ok) throw new Error('Failed to export users CSV');
    const blob = await response.blob();
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `users_export_${new Date().toISOString().slice(0, 10)}.csv`;
    document.body.appendChild(a);
    a.click();
    a.remove();
    window.URL.revokeObjectURL(url);
    return true;
  }
}

export const api = new ApiClient();
export const apiClient = api;
export default api;
