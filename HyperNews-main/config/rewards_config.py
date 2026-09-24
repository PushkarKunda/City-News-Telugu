# config/rewards_config.py

class RewardsConfig:
    """Complete configuration for rewards system"""
    
    # =========================================================
    # EARNING RATES
    # =========================================================
    
    READ_ARTICLE_POINTS = 10
    READ_ARTICLE_DAILY_LIMIT = 500
    
    SHARE_ARTICLE_POINTS = 20
    SHARE_ARTICLE_COINS = 2
    SHARE_DAILY_LIMIT = 200
    
    COMMENT_ARTICLE_POINTS = 15
    COMMENT_DAILY_LIMIT = 150
    
    LIKE_ARTICLE_POINTS = 5
    LIKE_DAILY_LIMIT = 50
    
    BOOKMARK_ARTICLE_POINTS = 5
    BOOKMARK_DAILY_LIMIT = 50
    
    # Ad Watching
    REWARDED_AD_COINS = 10
    REWARDED_AD_DAILY_LIMIT = 50
    INTERSTITIAL_AD_COINS = 5
    BANNER_AD_COINS = 1
    
    # Daily Rewards
    DAILY_LOGIN_POINTS = 50
    DAILY_LOGIN_COINS = 5
    
    STREAK_BONUS_7_DAYS = 200
    STREAK_BONUS_7_COINS = 20
    STREAK_BONUS_30_DAYS = 1000
    STREAK_BONUS_30_COINS = 100
    STREAK_BONUS_100_DAYS = 5000
    STREAK_BONUS_100_COINS = 500
    
    # Referral Rewards
    REFERRAL_SIGNUP_POINTS = 100
    REFERRAL_SIGNUP_COINS = 50
    REFERRED_USER_BONUS_POINTS = 50
    REFERRED_USER_BONUS_COINS = 25
    
    REFERRAL_MILESTONES = {
        5: {"coins": 100, "points": 500, "badge": "bronze_referrer", "description": "5 Friends Joined"},
        25: {"coins": 500, "points": 2500, "badge": "silver_referrer", "description": "25 Friends Joined"},
        100: {"coins": 2500, "points": 10000, "badge": "gold_referrer", "description": "100 Friends Joined"},
        500: {"coins": 15000, "points": 50000, "badge": "platinum_referrer", "description": "500 Friends Joined"},
    }
    
    # Daily Challenge
    DAILY_CHALLENGE_BASE_POINTS = 100
    DAILY_CHALLENGE_BASE_COINS = 20
    
    # =========================================================
    # LEVEL SYSTEM
    # =========================================================
    
    LEVEL_THRESHOLDS = {
        1: 0,          # Reader
        2: 1000,       # Contributor
        3: 5000,       # Writer
        4: 25000,      # Influencer
        5: 100000,     # Star
        6: 500000,     # Elite
        7: 2000000,    # Legend
        8: 10000000,   # Mythic
    }
    
    LEVEL_BADGES = {
        2: "contributor",
        3: "writer",
        4: "influencer",
        # config/rewards_config.py (continued)

        5: "star",
        6: "elite",
        7: "legend",
        8: "mythic",
    }
    
    LEVEL_COIN_REWARDS = {
        2: 50,
        3: 100,
        4: 250,
        5: 500,
        6: 1000,
        7: 5000,
        8: 25000,
    }
    
    # =========================================================
    # COIN TO REAL MONEY CONVERSION
    # =========================================================
    
    COINS_PER_RUPEE = 100  # 100 coins = ₹1
    MIN_WITHDRAWAL = 10000  # Minimum ₹100 to withdraw
    WITHDRAWAL_FEE_PERCENT = 5
    
    # =========================================================
    # BINGO CARD CONFIGURATION
    # =========================================================
    
    BINGO_TASKS = {
        # Reading Tasks (Easy)
        "read_politics": {"name": "📰 Read Political News", "target": 1, "type": "read", "category_id": 1, "difficulty": "easy"},
        "read_sports": {"name": "⚽ Read Sports News", "target": 1, "type": "read", "category_id": 2, "difficulty": "easy"},
        "read_tech": {"name": "💻 Read Tech News", "target": 1, "type": "read", "category_id": 3, "difficulty": "easy"},
        "read_entertainment": {"name": "🎬 Read Entertainment", "target": 1, "type": "read", "category_id": 4, "difficulty": "easy"},
        "read_business": {"name": "📈 Read Business News", "target": 1, "type": "read", "category_id": 5, "difficulty": "easy"},
        "read_local": {"name": "🏘️ Read Local News", "target": 1, "type": "read_local", "difficulty": "easy"},
        
        # Reading Count Tasks (Medium/Hard)
        "read_5": {"name": "📚 Read 5 Articles", "target": 5, "type": "read_count", "difficulty": "medium"},
        "read_10": {"name": "📚 Read 10 Articles", "target": 10, "type": "read_count", "difficulty": "medium"},
        "read_15": {"name": "📚 Read 15 Articles", "target": 15, "type": "read_count", "difficulty": "hard"},
        "read_20": {"name": "📚 Read 20 Articles", "target": 20, "type": "read_count", "difficulty": "hard"},
        
        # Engagement Tasks
        "share_article": {"name": "📤 Share 1 Article", "target": 1, "type": "share", "difficulty": "easy"},
        "share_whatsapp": {"name": "📱 Share on WhatsApp", "target": 1, "type": "share_platform", "platform": "whatsapp", "difficulty": "easy"},
        "comment_3": {"name": "💬 Comment on 3 Articles", "target": 3, "type": "comment", "difficulty": "medium"},
        "like_5": {"name": "❤️ Like 5 Articles", "target": 5, "type": "like", "difficulty": "easy"},
        "bookmark": {"name": "🔖 Bookmark 1 Article", "target": 1, "type": "bookmark", "difficulty": "easy"},
        
        # User Activity Tasks
        "daily_login": {"name": "📅 Login 3 Days", "target": 3, "type": "login_days", "difficulty": "medium"},
        "streak_7": {"name": "🔥 7-Day Reading Streak", "target": 7, "type": "streak", "difficulty": "hard"},
        "follow_category": {"name": "➕ Follow a Category", "target": 1, "type": "follow_category", "difficulty": "easy"},
        "vote_poll": {"name": "🗳️ Vote in a Poll", "target": 1, "type": "vote_poll", "difficulty": "easy"},
        "daily_quiz": {"name": "📝 Complete Daily Quiz", "target": 1, "type": "daily_quiz", "difficulty": "medium"},
        "invite_friend": {"name": "👥 Invite 1 Friend", "target": 1, "type": "invite", "difficulty": "medium"},
        
        # Content Tasks
        "watch_short": {"name": "🎥 Watch 1 Short", "target": 1, "type": "watch_short", "difficulty": "easy"},
        "watch_2_shorts": {"name": "🎥 Watch 2 Shorts", "target": 2, "type": "watch_short", "difficulty": "easy"},
        "complete_challenge": {"name": "✅ Complete Daily Challenge", "target": 1, "type": "daily_challenge", "difficulty": "medium"},
        
        # Special
        "free_space": {"name": "🎁 FREE SPACE", "target": 1, "type": "free", "difficulty": "easy", "auto_complete": True},
    }
    
    # =========================================================
    # BADGES CONFIGURATION
    # =========================================================
    
    BADGES = {
        # Reading Badges
        "first_article": {"name": "First Step", "description": "Read your first article", "icon": "📖", "color": "#4CAF50", "rarity": "common", "points_bonus": 50},
        "news_junkie": {"name": "News Junkie", "description": "Read 100 articles", "icon": "📰", "color": "#2196F3", "rarity": "rare", "points_bonus": 500},
        "news_master": {"name": "News Master", "description": "Read 1000 articles", "icon": "🏆", "color": "#FF9800", "rarity": "epic", "points_bonus": 5000},
        "news_guru": {"name": "News Guru", "description": "Read 10000 articles", "icon": "👑", "color": "#FF5722", "rarity": "legendary", "points_bonus": 50000},
        
        # Streak Badges
        "streak_7": {"name": "On Fire", "description": "7-day reading streak", "icon": "🔥", "color": "#FF5722", "rarity": "rare", "points_bonus": 200},
        "streak_30": {"name": "Unstoppable", "description": "30-day reading streak", "icon": "💪", "color": "#9C27B0", "rarity": "epic", "points_bonus": 1000},
        "streak_100": {"name": "Legendary Streak", "description": "100-day reading streak", "icon": "⚡", "color": "#FFD700", "rarity": "legendary", "points_bonus": 5000},
        
        # Sharing Badges
        "first_share": {"name": "Social Butterfly", "description": "Share your first article", "icon": "🦋", "color": "#E91E63", "rarity": "common", "points_bonus": 50},
        "influencer": {"name": "Influencer", "description": "Share 100 articles", "icon": "📢", "color": "#FF9800", "rarity": "epic", "points_bonus": 2000},
        
        # Referral Badges
        "bronze_referrer": {"name": "Bronze Ambassador", "description": "Refer 5 friends", "icon": "🥉", "color": "#CD7F32", "rarity": "rare", "points_bonus": 500},
        "silver_referrer": {"name": "Silver Ambassador", "description": "Refer 25 friends", "icon": "🥈", "color": "#C0C0C0", "rarity": "epic", "points_bonus": 2500},
        "gold_referrer": {"name": "Gold Ambassador", "description": "Refer 100 friends", "icon": "🥇", "color": "#FFD700", "rarity": "legendary", "points_bonus": 10000},
        
        # Ad Watching Badges
        "ad_viewer": {"name": "Ad Enthusiast", "description": "Watch 100 rewarded ads", "icon": "📺", "color": "#607D8B", "rarity": "common", "points_bonus": 200},
        "ad_master": {"name": "Ad Master", "description": "Watch 1000 rewarded ads", "icon": "🎬", "color": "#9C27B0", "rarity": "epic", "points_bonus": 2000},
        
        # Level Badges
        "contributor": {"name": "Contributor", "description": "Reached Level 2", "icon": "🌟", "color": "#4CAF50", "rarity": "common"},
        "writer": {"name": "Writer", "description": "Reached Level 3", "icon": "✍️", "color": "#2196F3", "rarity": "rare"},
        "influencer": {"name": "Influencer", "description": "Reached Level 4", "icon": "⭐", "color": "#FF9800", "rarity": "rare"},
        "star": {"name": "Star", "description": "Reached Level 5", "icon": "✨", "color": "#9C27B0", "rarity": "epic"},
        "elite": {"name": "Elite", "description": "Reached Level 6", "icon": "💎", "color": "#E91E63", "rarity": "epic"},
        "legend": {"name": "Legend", "description": "Reached Level 7", "icon": "👑", "color": "#FFD700", "rarity": "legendary"},
        "mythic": {"name": "Mythic", "description": "Reached Level 8", "icon": "⚡", "color": "#FF0000", "rarity": "mythic"},
        
        # Bingo Badges
        "bingo_master": {"name": "Bingo Master", "description": "Completed a full bingo card", "icon": "🎯", "color": "#4CAF50", "rarity": "epic", "points_bonus": 1000},
    }
    
    # =========================================================
    # REWARDED AD CONFIGURATION
    # =========================================================
    
    AD_REWARD_CONFIG = {
        "rewarded_video": {
            "coins": 10,
            "daily_limit": 50,
            "cooldown_seconds": 30,
        },
        "interstitial": {
            "coins": 5,
            "daily_limit": 20,
            "cooldown_seconds": 60,
        },
        "banner": {
            "coins": 1,
            "daily_limit": 100,
            "cooldown_seconds": 10,
        },
    }
    
    # =========================================================
    # VOUCHER REDEMPTION CONFIGURATION
    # =========================================================
    
    VOUCHER_REDEMPTIONS = {
        "ad_free_week": {"name": "Ad-free for 1 week", "points": 1000, "type": "platform", "icon": "🚫"},
        "premium_month": {"name": "Premium for 1 month", "points": 5000, "type": "platform", "icon": "👑"},
        "amazon_50": {"name": "Amazon ₹50 Gift Card", "coins": 5000, "type": "affiliate", "icon": "🛍️"},
        "flipkart_100": {"name": "Flipkart ₹100 Gift Card", "coins": 10000, "type": "affiliate", "icon": "🛒"},
        "bookmyshow_100": {"name": "BookMyShow ₹100", "coins": 10000, "type": "affiliate", "icon": "🎬"},
        "swiggy_50": {"name": "Swiggy ₹50 OFF", "coins": 5000, "type": "affiliate", "icon": "🍔"},
    }