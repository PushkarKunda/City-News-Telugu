// services/api/routes.ts
export const API_ROUTES = {
  // ─── Auth ───────────────────────────────────────────────────────────────────
  auth: {
    firebaseLogin: '/user/auth/firebase/login',           // POST - Firebase Login
    refreshToken: '/user/auth/refresh',                   // POST - Refresh token (query param)
    logout: '/user/auth/logout',                          // POST - Logout
    switchToPublisher: '/user/auth/switch-to-publisher',  // POST - Switch to publisher
    registerDevice: '/user/device/token/register',        // POST - Register FCM token
    unregisterDevice: '/user/device/token/unregister',    // DELETE - Unregister device
  },

  // ─── User ───────────────────────────────────────────────────────────────────
  user: {
    me: '/user/users/me',                                      // GET, PATCH - My profile (includes avatar)
    publisherEligibility: '/user/users/me/publisher-eligibility', // GET
    suspensionStatus: '/user/users/me/suspension-status',      // GET
    preferences: '/user/preferences/me',                       // GET, POST, PUT, PATCH, DELETE
    dashboard: '/user/dashboardnew',                           // GET - User dashboard
    dashboardEngagement: '/user/dashboard/engagement',         // GET - Dashboard engagement
  },

  // ─── News ───────────────────────────────────────────────────────────────────
  news: {
    feed: '/news/v1/feed',                                       // GET - News feed
    create: '/news/v1/news',                                     // POST - Create news
    byId: (uid: string) => `/news/v1/news/${uid}`,              // GET, PUT - Get/Update news
    deleteNews: (uid: string) => `/news/v1/user/news/${uid}`,   // DELETE - Delete news

    // Discovery
    breaking: '/news/v1/news/breaking',                          // GET - Breaking news
    popular: '/news/v1/news/popular',                            // GET - Popular news
    trending: '/news/v1/news/analytics/trending',                // GET - Trending news
    byLocation: '/news/v1/news/location',                        // GET - News by location
    byCategory: (id: number) => `/news/v1/news/category/${id}`, // GET - News by category
    related: (uid: string) => `/news/v1/news/${uid}/related`,   // GET - Related news
    search: '/news/v1/search',                                   // GET - Search news

    // News Shorts
    shorts: '/content/news-shorts',                             // GET - News shorts
    shortsFeed: '/shorts/feed',                                 // GET - YouTube shorts feed

    // Engagement
    engagement: (uid: string) => `/news/v1/news/${uid}/engagement`, // GET - News engagement stats
    like: (uid: string) => `/news/v1/user/news/${uid}/like`,       // POST, DELETE - Like/Unlike
    view: (uid: string) => `/news/v1/user/news/${uid}/view`,       // POST - Record view
    share: (uid: string) => `/news/v1/user/news/${uid}/share`,     // POST - Share news

    // Comments
    comments: (uid: string) => `/news/v1/news/${uid}/comments`,         // GET - Get comments
    comment: (uid: string) => `/news/v1/user/news/${uid}/comment`,      // POST - Add comment
    deleteComment: (uid: string, id: number) =>
      `/news/v1/user/news/${uid}/comment/${id}`,                        // DELETE - Delete comment

    // Analytics
    weeklyStats: '/news/v1/news/analytics/weekly',               // GET - Weekly stats
    dailyStats: '/news/v1/news/analytics/daily',                 // GET - Daily stats
    topPerforming: '/news/v1/news/analytics/top',                // GET - Top performing
  },

  // ─── Categories ─────────────────────────────────────────────────────────────
  categories: {
    list: '/categories/',                                        // GET - List categories
    menu: '/categories/menu',                                    // GET - Category menu
    all: '/categories/all',                                      // GET - All categories
    news: (id: number) => `/categories/${id}/news`,             // GET - News by category
  },

  // ─── Content ────────────────────────────────────────────────────────────────
  content: {
    // Advertisements
    advertisements: '/content/advertisements/active',                    // GET - Active ads
    advertisementById: (id: number) => `/content/advertisements/${id}`, // GET - Get ad by ID
    createAdvertisement: '/content/advertisements',                      // POST - Create ad (admin)
    updateAdvertisement: (id: number) => `/content/advertisements/${id}`, // PUT - Update ad (admin)
    toggleAdStatus: (id: number) => `/content/advertisements/${id}/toggle-status`, // POST (admin)

    // Sponsored Posts
    sponsoredPosts: '/content/sponsored-posts/active',           // GET - Active sponsored posts
    createSponsoredPost: '/content/sponsored-posts',             // POST - Create sponsored post (admin side only)
    updateSponsoredPost: (id: number) => `/content/sponsored-posts/${id}`, // PUT (admin only)
    pendingSponsoredPosts: '/content/sponsored-posts/pending',   // GET - Pending posts (admin only)

    // Events (Coming Soon - basic structure)
    events: '/content/events',                                   // GET, POST
    eventById: (uid: string) => `/content/events/${uid}`,       // GET

    // Polls (Coming Soon - basic structure)
    polls: '/content/polls',                                     // POST - Create poll
    pollById: (uid: string) => `/content/polls/${uid}`,         // GET - Get poll
    activePolls: '/content/polls/active',                        // GET - Active polls
    pollVote: '/content/polls/vote',                             // PUT - Vote on poll
    updatePoll: (id: number) => `/content/polls/${id}`,         // PUT - Update poll

    // News Shorts
    newsShorts: '/content/news-shorts',                          // GET, POST - News shorts

    // Tags
    tags: '/content/tags',                                       // GET - Get tags
    tagContent: (name: string) => `/content/tags/${name}/content`, // GET - Content by tag
    assignTags: (type: string, id: string) => `/content/${type}/${id}/tags`, // POST

    // Flagging
    flagContent: (type: string, id: string) => `/content/${type}/${id}/flag`, // POST

    // Search & Analytics
    search: '/content/search',                                   // GET - Search content
    analytics: (type: string, id: string) => `/content/analytics/${type}/${id}`, // GET
    stats: '/content/stats',                                     // GET - Content stats
    quickStats: '/content/quick-stats',                          // GET - Quick stats
    targetingOptions: '/content/targeting-options',              // GET - Targeting options
    overview: '/content/overview',                               // GET - Dashboard overview
  },

  // ─── Engagement ─────────────────────────────────────────────────────────────
  engagement: {
    // Bookmarks
    bookmarks: '/engagement/bookmarks',                          // GET, POST, DELETE
    checkBookmark: '/engagement/bookmarks/check',                // GET - Check bookmark status

    // Notifications
    notifications: '/engagement/notifications',                  // GET - Get notifications
    unreadCount: '/engagement/notifications/unread/count',       // GET - Unread count
    markRead: (id: number) => `/engagement/notifications/${id}/read`, // PATCH - Mark as read
    markAllRead: '/engagement/notifications/read-all',           // PATCH - Mark all read
    deleteNotification: (id: number) => `/engagement/notifications/${id}`, // DELETE
    clearAll: '/engagement/notifications/clear',                 // DELETE - Clear all

    // Summary
    summary: (uid: string) => `/engagement/summary/${uid}`,     // GET - Engagement summary
  },

  // ─── Location & Language ────────────────────────────────────────────────────
  location: {
    // Languages
    languages: '/base/languages',                                     // GET - All languages
    languageById: (id: number) => `/base/languages/${id}`,           // GET - Language by ID

    // States
    states: '/base/states',                                           // GET - All states
    stateById: (id: number) => `/base/states/${id}`,                 // GET - State details
    stateHierarchy: (id: number) => `/base/hierarchy/states/${id}`,  // GET - State hierarchy
    stateLanguage: (id: number) => `/base/states/${id}/language`,    // GET - State language

    // Districts
    districts: '/base/districts',                                     // GET - All districts
    districtById: (id: number) => `/base/districts/${id}`,           // GET - District details

    // Cities
    cities: '/base/cities',                                           // GET - All cities
    cityById: (id: number) => `/base/cities/${id}`,                  // GET - City details

    // Search
    search: '/base/search',                                           // GET - Search locations
  },

  // ─── Rewards ────────────────────────────────────────────────────────────────
  rewards: {
    me: '/rewards/me',                                           // GET - My rewards
    badges: '/rewards/badges',                                   // GET - My badges
    referral: '/rewards/referral',                               // GET - Referral info
    leaderboard: '/rewards/leaderboard',                         // GET - Leaderboard

    // Bingo
    bingo: '/rewards/bingo',                                     // GET - Get bingo card
    claimBingo: '/rewards/bingo/claim',                          // POST - Claim bingo reward
    bingoLeaderboard: '/rewards/bingo/leaderboard',              // GET - Bingo leaderboard

    // Daily & Challenges
    dailyLogin: '/rewards/daily-login',                          // POST - Claim daily login
    todayChallenge: '/rewards/challenge/today',                  // GET - Today's challenge
    claimChallenge: (id: number) => `/rewards/challenge/${id}/claim`, // POST - Claim challenge

    // Earning Actions
    earnRead: '/rewards/earn/read',                              // POST - Earn for reading
    earnShare: '/rewards/earn/share',                            // POST - Earn for sharing
    earnComment: '/rewards/earn/comment',                        // POST - Earn for commenting
    earnLike: '/rewards/earn/like',                              // POST - Earn for liking
    earnBookmark: '/rewards/earn/bookmark',                      // POST - Earn for bookmarking

    // Referral
    useReferral: '/rewards/use-referral',                        // POST - Use referral code

    // Ads
    rewardedAd: '/rewards/ad/rewarded',                          // POST - Claim rewarded ad

    // Transactions
    transactions: '/rewards/transactions',                       // GET - My transactions
    info: '/api/v1/rewards/info',                                // GET - Rewards info
  },

  // ─── Insights ───────────────────────────────────────────────────────────────
  insights: {
    list: '/insights/',                                          // GET - List insights
    create: '/insights/',                                        // POST - Create insight
    createWithUrls: '/insights/create',                          // POST - Create with URLs
    byUid: (uid: string) => `/insights/uid/${uid}`,             // GET, DELETE, PATCH - By UID
    byCategory: (name: string) => `/insights/${name}`,          // GET - By category
    popular: '/insights/stats/popular',                          // GET - Popular insights
    share: '/insights/share',                                    // POST - Share insight
    shareById: (id: number) => `/insights/share/${id}`,         // POST - Share by ID
    categories: '/insights/categories',                          // GET - Insight categories
  },

  // ─── Posts ──────────────────────────────────────────────────────────────────
  posts: {
    create: '/posts/',                                          // POST - Create post
    feed: '/posts/feed',                                        // GET - Get public feed
    byId: (uid: string) => `/posts/${uid}`,                     // GET - Get post
    updatePost: (uid: string) => `/posts/${uid}`,               // PUT - Update post
    deletePost: (uid: string) => `/posts/${uid}`,               // DELETE - Delete post
    userPosts: (uid: string) => `/posts/user/${uid}`,           // GET - User posts
    editHashtags: (uid: string) => `/posts/${uid}/hashtags`,    // PATCH - Edit post hashtags
    like: (uid: string) => `/posts/${uid}/like`,                // POST - Like/Unlike post
    comment: (uid: string) => `/posts/${uid}/comment`,          // POST - Add comment
    comments: (uid: string) => `/posts/${uid}/comments`,        // GET - Post comments
    share: (uid: string) => `/posts/${uid}/share`,              // POST - Share post
    trendingHashtags: '/posts/hashtags/trending',               // GET - Get trending hashtags
    hashtagSuggestions: '/posts/hashtags/suggestions',          // GET - Get hashtag suggestions
    byHashtag: (name: string) => `/posts/hashtag/${name}/posts`, // GET - Posts by hashtag
  },

  // ─── Follow ─────────────────────────────────────────────────────────────────
  follow: {
    followUser: (uid: string) => `/follow/${uid}`,              // POST - Follow
    unfollowUser: (uid: string) => `/follow/${uid}`,            // DELETE - Unfollow
    followers: (uid: string) => `/follow/followers/${uid}`,     // GET - Followers
    following: (uid: string) => `/follow/following/${uid}`,     // GET - Following
    suggestions: '/follow/suggestions',                         // GET - Follow suggestions
    status: (uid: string) => `/follow/status/${uid}`,           // GET - Follow status
    counts: (uid: string) => `/follow/counts/${uid}`,           // GET - Follow counts
    feed: '/follow/feed/posts',                                 // GET - Following posts
  },

  // ─── User Activity ──────────────────────────────────────────────────────────
  userActivity: {
    sessions: '/user-activity/sessions',                        // GET - Get sessions
    killSession: (hash: string) => `/user-activity/sessions/${hash}`, // DELETE
    killAllSessions: '/user-activity/sessions/kill-all',        // POST
    activities: '/user-activity/activities/me',                 // GET - My activities
    securityEvents: '/user-activity/activities/security-events',// GET
    stats: '/user-activity/stats/me',                           // GET - Session stats
    deviceLimit: '/user-activity/device-limit',                 // GET - Device limit
  },

  // ─── Discovery ──────────────────────────────────────────────────────────────
  discovery: {
    home: '/discovery/home',                                     // GET - Get Home Feed
    search: '/content/search',                                   // GET - Discovery Search
    category: (id: number) => `/discovery/category/${id}`,       // GET - Category Explore
    related: '/discovery/related',                               // GET - Related Content
    trending: '/discovery/trending',                             // GET - Trending
    trendingHashtags: '/posts/hashtags/trending',                // GET - Trending Hashtags
    hashtagSuggestions: '/posts/hashtags/suggestions',           // GET - Hashtag Suggestions
    byHashtag: (name: string) => `/posts/hashtag/${name}/posts`, // GET - Posts By Hashtag
  },

  // ─── In-App Notifications ───────────────────────────────────────────────────
  inAppNotifications: {
    list: '/notifications/in-app',                               // GET - Get in-app notifications
    markRead: (id: number) => `/notifications/in-app/${id}/read`, // PATCH - Mark as read
    unreadCount: '/notifications/in-app/unread/count',           // GET - Unread count
  },

  // ─── Health Checks ──────────────────────────────────────────────────────────
  health: {
    root: '/',                                                   // GET - Root
    main: '/health',                                             // GET - Main health
    news: '/news/v1/health',                                     // GET - News health
    content: '/content/health',                                  // GET - Content health
    engagement: '/engagement/health',                            // GET - Engagement health
    base: '/base/health',                                        // GET - Base health
    categories: '/categories/health',                            // GET - Categories health
    insights: '/insights/health',                                // GET - Insights health
    rewards: '/rewards/health',                                  // GET - Rewards health
    userActivity: '/user-activity/health',                       // GET - User activity health
  },
} as const;
