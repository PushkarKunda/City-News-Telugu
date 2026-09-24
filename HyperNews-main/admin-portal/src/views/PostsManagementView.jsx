// src/views/PostsManagementView.jsx
import React, { useState, useEffect, useMemo, useRef } from 'react';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';
import Modal from '../components/common/Modal';
import { api } from '../api/client';
import { 
  Heart, 
  MessageSquare, 
  Share2, 
  Eye, 
  TrendingUp, 
  BarChart2, 
  PieChart as PieIcon, 
  Trash2, 
  Plus, 
  Search, 
  Filter, 
  Check, 
  Copy, 
  ExternalLink, 
  Send, 
  Sparkles, 
  Clock, 
  User, 
  Hash, 
  ShieldAlert, 
  CheckCircle2, 
  Pin, 
  RefreshCw,
  Globe,
  Flame,
  ArrowUpRight,
  LayoutGrid,
  List,
  AlertTriangle,
  X,
  Download,
  Sliders,
  ChevronRight,
  Tag,
  Activity,
  Users,
  Shield,
  MessageCircle,
  BarChart3,
  Flag,
  Edit,
  CheckSquare,
  Square,
  Radio,
  Share
} from 'lucide-react';
import { 
  ResponsiveContainer, 
  AreaChart, 
  Area, 
  BarChart, 
  Bar, 
  PieChart, 
  Pie, 
  Cell, 
  XAxis, 
  YAxis, 
  Tooltip, 
  Legend 
} from 'recharts';

// Seeded Local Community Posts Corpus
const INITIAL_POSTS = [
  {
    id: 1,
    post_uid: 'pst_100001',
    user_uid: 'usr_raj1',
    userName: 'Rajesh Kumar',
    userHandle: 'rajesh_k',
    userRole: 'Community Contributor',
    userAvatar: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=200&auto=format&fit=crop&q=80',
    content: 'Just visited the newly inaugurated T-Hub 3.0 AI Innovation Center in Hyderabad! The campus is world-class with dedicated quantum computing and robotic testbeds. Great day for Indian technology! 🚀 #TechNews #Hyderabad #AI',
    imageUrl: 'https://images.unsplash.com/photo-1486406146926-c627a92ad1ab?w=800&auto=format&fit=crop&q=80',
    hashtags: ['TechNews', 'Hyderabad', 'AI'],
    likeCount: 142,
    commentCount: 18,
    shareCount: 34,
    views: 3420,
    isLiked: false,
    isPinned: true,
    isFlagged: false,
    createdAt: '2026-09-20 10:30',
    location: 'HITEC City, Hyderabad',
    comments: [
      { id: 101, user_uid: 'usr_priy', userName: 'Priya Sharma', userAvatar: 'https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=200', text: 'Totally agree! The quantum lab facilities are remarkable.', timeAgo: '2h ago', likes: 14 },
      { id: 102, user_uid: 'usr_kav1', userName: 'Kavita Reddy', userAvatar: 'https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?w=200', text: 'Proud to see Hyderabad leading the AI hardware revolution!', timeAgo: '1h ago', likes: 8 },
      { id: 103, user_uid: 'usr_vik1', userName: 'Vikram Rao', userAvatar: 'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=200', text: 'Are they accepting student internship cohorts for winter 2026?', timeAgo: '30m ago', likes: 4 }
    ],
    shareBreakdown: [
      { name: 'WhatsApp', value: 16, color: '#25D366' },
      { name: 'Twitter/X', value: 10, color: '#38bdf8' },
      { name: 'Facebook', value: 5, color: '#1877F2' },
      { name: 'Direct Copy', value: 3, color: '#a855f7' }
    ],
    engagementTrend: [
      { time: '00:00', likes: 12, comments: 2, shares: 3 },
      { time: '04:00', likes: 25, comments: 4, shares: 6 },
      { time: '08:00', likes: 68, comments: 9, shares: 15 },
      { time: '12:00', likes: 105, comments: 14, shares: 24 },
      { time: '16:00', likes: 128, comments: 16, shares: 30 },
      { time: '20:00', likes: 142, comments: 18, shares: 34 }
    ]
  },
  {
    id: 2,
    post_uid: 'pst_100002',
    user_uid: 'usr_priy',
    userName: 'Priya Sharma',
    userHandle: 'priya_s',
    userRole: 'Verified Journalist',
    userAvatar: 'https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=200&auto=format&fit=crop&q=80',
    content: 'Incredible atmosphere at the Rajiv Gandhi International Stadium today! The energy from the crowd was unmatched. Rohit Sharma’s masterclass century was something to remember for years! 🏏 #CricketWorldCup #Hyderabad',
    imageUrl: 'https://images.unsplash.com/photo-1540747913346-19e32dc3e97e?w=800&auto=format&fit=crop&q=80',
    hashtags: ['CricketWorldCup', 'Hyderabad'],
    likeCount: 289,
    commentCount: 42,
    shareCount: 85,
    views: 8900,
    isLiked: false,
    isPinned: false,
    isFlagged: false,
    createdAt: '2026-09-19 18:45',
    location: 'Uppal, Hyderabad',
    comments: [
      { id: 201, user_uid: 'usr_vik1', userName: 'Vikram Rao', userAvatar: 'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=200', text: 'Unbelievable game yesterday, what a thriller finish!', timeAgo: '1d ago', likes: 22 },
      { id: 202, user_uid: 'usr_anil', userName: 'Anil Varma', userAvatar: 'https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?w=200', text: 'The pull shot in the 18th over was pure class.', timeAgo: '18h ago', likes: 17 }
    ],
    shareBreakdown: [
      { name: 'WhatsApp', value: 42, color: '#25D366' },
      { name: 'Twitter/X', value: 26, color: '#38bdf8' },
      { name: 'Facebook', value: 12, color: '#1877F2' },
      { name: 'Direct Copy', value: 5, color: '#a855f7' }
    ],
    engagementTrend: [
      { time: '00:00', likes: 20, comments: 5, shares: 10 },
      { time: '04:00', likes: 50, comments: 12, shares: 25 },
      { time: '08:00', likes: 110, comments: 20, shares: 45 },
      { time: '12:00', likes: 190, comments: 28, shares: 62 },
      { time: '16:00', likes: 250, comments: 36, shares: 75 },
      { time: '20:00', likes: 289, comments: 42, shares: 85 }
    ]
  },
  {
    id: 3,
    post_uid: 'pst_100003',
    user_uid: 'usr_kav1',
    userName: 'Kavita Reddy',
    userHandle: 'kavita_r',
    userRole: 'Civic Reporter',
    userAvatar: 'https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?w=200&auto=format&fit=crop&q=80',
    content: 'Early morning walk along the newly renovated Durgam Cheruvu cable bridge promenade. The lake cleanup and solar lighting installations make it look absolutely stunning at sunrise. 🌅 #Hyderabad #Telangana #GreenEnergy',
    imageUrl: 'https://images.unsplash.com/photo-1519501025264-65ba15a82390?w=800&auto=format&fit=crop&q=80',
    hashtags: ['Hyderabad', 'Telangana', 'GreenEnergy'],
    likeCount: 98,
    commentCount: 12,
    shareCount: 15,
    views: 2150,
    isLiked: false,
    isPinned: false,
    isFlagged: false,
    createdAt: '2026-09-19 07:15',
    location: 'Madhapur, Hyderabad',
    comments: [
      { id: 301, user_uid: 'usr_anil', userName: 'Anil Varma', userAvatar: 'https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?w=200', text: 'The lake cleanup is such a refreshing change.', timeAgo: '1d ago', likes: 5 }
    ],
    shareBreakdown: [
      { name: 'WhatsApp', value: 8, color: '#25D366' },
      { name: 'Twitter/X', value: 4, color: '#38bdf8' },
      { name: 'Facebook', value: 2, color: '#1877F2' },
      { name: 'Direct Copy', value: 1, color: '#a855f7' }
    ],
    engagementTrend: [
      { time: '00:00', likes: 5, comments: 1, shares: 1 },
      { time: '04:00', likes: 18, comments: 3, shares: 4 },
      { time: '08:00', likes: 45, comments: 6, shares: 8 },
      { time: '12:00', likes: 72, comments: 9, shares: 11 },
      { time: '16:00', likes: 88, comments: 11, shares: 13 },
      { time: '20:00', likes: 98, comments: 12, shares: 15 }
    ]
  },
  {
    id: 4,
    post_uid: 'pst_100004',
    user_uid: 'usr_vik1',
    userName: 'Vikram Rao',
    userHandle: 'vikram_r',
    userRole: 'Tech Editor',
    userAvatar: 'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=200&auto=format&fit=crop&q=80',
    content: 'Exciting milestone for Indian space tech startups: Three new private launch vehicle engines successfully static-fire tested at Sriharikota! The new era of commercial space flight is here. 🛰️ #StartupIndia #TechNews',
    imageUrl: 'https://images.unsplash.com/photo-1517976487507-5803b91d2572?w=800&auto=format&fit=crop&q=80',
    hashtags: ['StartupIndia', 'TechNews'],
    likeCount: 312,
    commentCount: 27,
    shareCount: 64,
    views: 7400,
    isLiked: false,
    isPinned: false,
    isFlagged: false,
    createdAt: '2026-09-18 15:20',
    location: 'Sriharikota / Hyderabad',
    comments: [
      { id: 401, user_uid: 'usr_sneh', userName: 'Sneha Patel', userAvatar: 'https://images.unsplash.com/photo-1580489944761-15a19d654956?w=200', text: 'SpaceX level agility coming to Indian startups now!', timeAgo: '2d ago', likes: 19 }
    ],
    shareBreakdown: [
      { name: 'WhatsApp', value: 28, color: '#25D366' },
      { name: 'Twitter/X', value: 22, color: '#38bdf8' },
      { name: 'Facebook', value: 9, color: '#1877F2' },
      { name: 'Direct Copy', value: 5, color: '#a855f7' }
    ],
    engagementTrend: [
      { time: '00:00', likes: 30, comments: 4, shares: 10 },
      { time: '04:00', likes: 75, comments: 8, shares: 20 },
      { time: '08:00', likes: 140, comments: 14, shares: 35 },
      { time: '12:00', likes: 220, comments: 19, shares: 48 },
      { time: '16:00', likes: 280, comments: 24, shares: 58 },
      { time: '20:00', likes: 312, comments: 27, shares: 64 }
    ]
  },
  {
    id: 5,
    post_uid: 'pst_100005',
    user_uid: 'usr_anil',
    userName: 'Anil Varma',
    userHandle: 'anil_v',
    userRole: 'Cinema Analyst',
    userAvatar: 'https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?w=200&auto=format&fit=crop&q=80',
    content: 'First look teaser for the upcoming mythological epic directed by SS Rajamouli just dropped! The VFX and visual scale look higher than anything made in Indian cinema yet. Pure goosebumps! 🔥🎬 #Tollywood #Entertainment',
    imageUrl: 'https://images.unsplash.com/photo-1489599849927-2ee91cede3ba?w=800&auto=format&fit=crop&q=80',
    hashtags: ['Tollywood', 'Entertainment'],
    likeCount: 450,
    commentCount: 78,
    shareCount: 130,
    views: 12400,
    isLiked: false,
    isPinned: false,
    isFlagged: false,
    createdAt: '2026-09-18 11:00',
    location: 'Jubilee Hills, Hyderabad',
    comments: [
      { id: 501, user_uid: 'usr_sneh', userName: 'Sneha Patel', userAvatar: 'https://images.unsplash.com/photo-1580489944761-15a19d654956?w=200', text: 'VFX standard is rivaling Hollywood productions!', timeAgo: '2d ago', likes: 31 }
    ],
    shareBreakdown: [
      { name: 'WhatsApp', value: 65, color: '#25D366' },
      { name: 'Twitter/X', value: 40, color: '#38bdf8' },
      { name: 'Facebook', value: 15, color: '#1877F2' },
      { name: 'Direct Copy', value: 10, color: '#a855f7' }
    ],
    engagementTrend: [
      { time: '00:00', likes: 45, comments: 10, shares: 15 },
      { time: '04:00', likes: 110, comments: 25, shares: 35 },
      { time: '08:00', likes: 210, comments: 42, shares: 65 },
      { time: '12:00', likes: 320, comments: 58, shares: 95 },
      { time: '16:00', likes: 395, comments: 68, shares: 115 },
      { time: '20:00', likes: 450, comments: 78, shares: 130 }
    ]
  },
  {
    id: 6,
    post_uid: 'pst_100006',
    user_uid: 'usr_sneh',
    userName: 'Sneha Patel',
    userHandle: 'sneha_p',
    userRole: 'Green Energy Advocate',
    userAvatar: 'https://images.unsplash.com/photo-1558441719-8b449c6ff670?w=800&auto=format&fit=crop&q=80',
    content: 'Electric Vehicle adoption in Telangana just crossed 25% of all new two-wheeler registrations this month! Fast-charging infrastructure is finally catching up along national highways. ⚡ #GreenEnergy #Telangana',
    imageUrl: 'https://images.unsplash.com/photo-1558441719-8b449c6ff670?w=800&auto=format&fit=crop&q=80',
    hashtags: ['GreenEnergy', 'Telangana'],
    likeCount: 185,
    commentCount: 21,
    shareCount: 39,
    views: 4800,
    isLiked: false,
    isPinned: false,
    isFlagged: false,
    createdAt: '2026-09-19 13:40',
    location: 'Warangal, Telangana',
    comments: [
      { id: 601, user_uid: 'usr_raj1', userName: 'Rajesh Kumar', userAvatar: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=200', text: 'EV infrastructure makes weekend road trips feasible now.', timeAgo: '1d ago', likes: 9 }
    ],
    shareBreakdown: [
      { name: 'WhatsApp', value: 18, color: '#25D366' },
      { name: 'Twitter/X', value: 12, color: '#38bdf8' },
      { name: 'Facebook', value: 6, color: '#1877F2' },
      { name: 'Direct Copy', value: 3, color: '#a855f7' }
    ],
    engagementTrend: [
      { time: '00:00', likes: 15, comments: 2, shares: 4 },
      { time: '04:00', likes: 35, comments: 6, shares: 9 },
      { time: '08:00', likes: 80, comments: 11, shares: 18 },
      { time: '12:00', likes: 130, comments: 15, shares: 26 },
      { time: '16:00', likes: 165, comments: 18, shares: 33 },
      { time: '20:00', likes: 185, comments: 21, shares: 39 }
    ]
  }
];

export default function PostsManagementView() {
  const { user, currentRole } = useAuth();
  const { showToast } = useToast();

  const [posts, setPosts] = useState(INITIAL_POSTS);
  const [selectedPost, setSelectedPost] = useState(null); // When open, displays Full-Screen Dossier Modal
  const [searchQuery, setSearchQuery] = useState('');
  const [activeTab, setActiveTab] = useState('all'); // 'all' | 'trending' | 'media' | 'pinned' | 'flagged'
  const [viewMode, setViewMode] = useState('grid'); // 'grid' | 'table' | 'analytics'
  const [selectedFilter, setSelectedFilter] = useState('all');
  const [selectedHashtag, setSelectedHashtag] = useState('All');
  const [sortBy, setSortBy] = useState('recent'); // 'recent' | 'likes' | 'comments' | 'shares'
  const [selectedPosts, setSelectedPosts] = useState([]);
  const [copiedUid, setCopiedUid] = useState(null);
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [newCommentText, setNewCommentText] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [currentTime, setCurrentTime] = useState(new Date());
  const [trendingHashtags, setTrendingHashtags] = useState([
    { name: 'TechNews', usage_count: 84 },
    { name: 'Hyderabad', usage_count: 76 },
    { name: 'CricketWorldCup', usage_count: 58 },
    { name: 'AI', usage_count: 52 },
    { name: 'Telangana', usage_count: 45 },
    { name: 'Tollywood', usage_count: 39 },
    { name: 'StartupIndia', usage_count: 32 },
    { name: 'GreenEnergy', usage_count: 27 }
  ]);

  // Editing Hashtags State
  const [editingHashtagsPost, setEditingHashtagsPost] = useState(null);
  const [tagInput, setTagInput] = useState('');

  // Delete Confirm Modal State
  const [deleteTarget, setDeleteTarget] = useState(null);

  // New Post Form
  const [createForm, setCreateForm] = useState({
    content: '',
    imageUrl: '',
    hashtags: 'Hyderabad, Community, Innovation',
    postAsOfficial: true
  });

  const searchInputRef = useRef(null);

  // Live Operations Clock
  useEffect(() => {
    const timer = setInterval(() => setCurrentTime(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  // Keyboard shortcut listener (/ to focus search)
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === '/' && document.activeElement.tagName !== 'INPUT' && document.activeElement.tagName !== 'TEXTAREA') {
        e.preventDefault();
        searchInputRef.current?.focus();
      }
      if (e.key === 'Escape') {
        setSelectedPost(null);
        setIsCreateModalOpen(false);
        setEditingHashtagsPost(null);
        setDeleteTarget(null);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  // Fetch live posts & trending hashtags from backend
  const fetchLivePosts = async () => {
    setIsLoading(true);
    try {
      const [feedRes, trendingRes] = await Promise.allSettled([
        api.getPosts(50),
        api.getTrendingHashtags?.(10)
      ]);

      if (feedRes.status === 'fulfilled' && feedRes.value?.posts && feedRes.value.posts.length > 0) {
        const mapped = feedRes.value.posts.map(p => {
          const matchExisting = posts.find(ep => ep.post_uid === p.post_uid);
          return {
            id: p.id || p.post_uid,
            post_uid: p.post_uid,
            user_uid: p.user_uid || 'usr_raj1',
            userName: p.user_name || p.user_uid || 'Community Member',
            userHandle: (p.user_name || p.user_uid || 'user').toLowerCase().replace(/\s+/g, '_'),
            userRole: 'Verified Citizen',
            userAvatar: p.user_avatar || 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=200',
            content: p.content,
            imageUrl: p.image_url,
            hashtags: p.hashtags || [],
            likeCount: p.like_count || 0,
            commentCount: p.comment_count || 0,
            shareCount: p.share_count || 0,
            views: (p.like_count || 0) * 15 + 120,
            isLiked: matchExisting ? matchExisting.isLiked : false,
            isPinned: matchExisting ? matchExisting.isPinned : false,
            isFlagged: matchExisting ? matchExisting.isFlagged : false,
            createdAt: p.created_at ? p.created_at.slice(0, 16).replace('T', ' ') : 'Just now',
            location: p.location || 'Telangana, India',
            comments: matchExisting?.comments || [
              { id: Date.now() + 1, user_uid: 'usr_priy', userName: 'Priya Sharma', userAvatar: 'https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=200', text: 'Great update! Glad to see this on HyperNews.', timeAgo: '1h ago', likes: 4 }
            ],
            shareBreakdown: matchExisting?.shareBreakdown || [
              { name: 'WhatsApp', value: Math.max(1, Math.round((p.share_count || 10) * 0.45)), color: '#25D366' },
              { name: 'Twitter/X', value: Math.max(1, Math.round((p.share_count || 10) * 0.30)), color: '#38bdf8' },
              { name: 'Facebook', value: Math.max(1, Math.round((p.share_count || 10) * 0.15)), color: '#1877F2' },
              { name: 'Direct Copy', value: Math.max(1, Math.round((p.share_count || 10) * 0.10)), color: '#a855f7' }
            ],
            engagementTrend: matchExisting?.engagementTrend || [
              { time: '00:00', likes: Math.round((p.like_count || 10) * 0.1), comments: 1, shares: 1 },
              { time: '04:00', likes: Math.round((p.like_count || 10) * 0.25), comments: 3, shares: 4 },
              { time: '08:00', likes: Math.round((p.like_count || 10) * 0.5), comments: 8, shares: 12 },
              { time: '12:00', likes: Math.round((p.like_count || 10) * 0.75), comments: 12, shares: 18 },
              { time: '16:00', likes: Math.round((p.like_count || 10) * 0.9), comments: 15, shares: 24 },
              { time: '20:00', likes: p.like_count || 10, comments: p.comment_count || 4, shares: p.share_count || 6 }
            ]
          };
        });
        setPosts(mapped);
      }

      if (trendingRes.status === 'fulfilled' && trendingRes.value?.hashtags) {
        setTrendingHashtags(trendingRes.value.hashtags);
      }
      showToast('Live community stream synchronized with backend', 'info');
    } catch {
      showToast('Offline or using cached community corpus', 'warning');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchLivePosts();
  }, []);

  // Filter & Sort Logic
  const filteredPosts = useMemo(() => {
    let list = [...posts];

    // Primary Tab Filter
    if (activeTab === 'trending') {
      list = list.filter(p => (p.likeCount + p.shareCount) > 100);
    } else if (activeTab === 'media') {
      list = list.filter(p => !!p.imageUrl);
    } else if (activeTab === 'pinned') {
      list = list.filter(p => p.isPinned);
    } else if (activeTab === 'flagged') {
      list = list.filter(p => p.isFlagged);
    }

    // Secondary Filter (Dropdown)
    if (selectedFilter === 'media') {
      list = list.filter(p => !!p.imageUrl);
    } else if (selectedFilter === 'text') {
      list = list.filter(p => !p.imageUrl);
    } else if (selectedFilter === 'pinned') {
      list = list.filter(p => p.isPinned);
    }

    // Hashtag Filter
    if (selectedHashtag !== 'All') {
      list = list.filter(p => p.hashtags.some(h => h.toLowerCase() === selectedHashtag.toLowerCase()));
    }

    // Search Query
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      list = list.filter(p => 
        p.content.toLowerCase().includes(q) ||
        p.userName.toLowerCase().includes(q) ||
        p.userHandle.toLowerCase().includes(q) ||
        p.post_uid.toLowerCase().includes(q) ||
        p.hashtags.some(h => h.toLowerCase().includes(q))
      );
    }

    // Sorting
    if (sortBy === 'likes') {
      list.sort((a, b) => b.likeCount - a.likeCount);
    } else if (sortBy === 'comments') {
      list.sort((a, b) => b.commentCount - a.commentCount);
    } else if (sortBy === 'shares') {
      list.sort((a, b) => b.shareCount - a.shareCount);
    } else {
      list.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
    }

    return list;
  }, [posts, activeTab, selectedFilter, selectedHashtag, searchQuery, sortBy]);

  // Aggregate Telemetry KPIs
  const totalLikes = useMemo(() => posts.reduce((acc, p) => acc + (p.likeCount || 0), 0), [posts]);
  const totalComments = useMemo(() => posts.reduce((acc, p) => acc + (p.commentCount || 0), 0), [posts]);
  const totalShares = useMemo(() => posts.reduce((acc, p) => acc + (p.shareCount || 0), 0), [posts]);
  const totalViews = useMemo(() => posts.reduce((acc, p) => acc + (p.views || 0), 0), [posts]);

  // Top platform shares aggregation for analytics view
  const aggregateSharesByPlatform = useMemo(() => {
    const summary = { WhatsApp: 0, 'Twitter/X': 0, Facebook: 0, 'Direct Copy': 0 };
    posts.forEach(p => {
      p.shareBreakdown?.forEach(sb => {
        if (summary[sb.name] !== undefined) {
          summary[sb.name] += sb.value;
        }
      });
    });
    return [
      { name: 'WhatsApp', value: summary['WhatsApp'] || 120, color: '#25D366' },
      { name: 'Twitter/X', value: summary['Twitter/X'] || 75, color: '#38bdf8' },
      { name: 'Facebook', value: summary['Facebook'] || 45, color: '#1877F2' },
      { name: 'Direct Copy', value: summary['Direct Copy'] || 25, color: '#a855f7' }
    ];
  }, [posts]);

  // Multi-select actions
  const toggleSelectPost = (uid) => {
    setSelectedPosts(prev => 
      prev.includes(uid) ? prev.filter(x => x !== uid) : [...prev, uid]
    );
  };

  const toggleSelectAll = () => {
    if (selectedPosts.length === filteredPosts.length) {
      setSelectedPosts([]);
    } else {
      setSelectedPosts(filteredPosts.map(p => p.post_uid));
    }
  };

  // 1-Click Interactive Like
  const handleToggleLike = async (postUid, e) => {
    if (e) e.stopPropagation();
    setPosts(prev => prev.map(p => {
      if (p.post_uid === postUid) {
        const nextLiked = !p.isLiked;
        const nextCount = nextLiked ? p.likeCount + 1 : Math.max(0, p.likeCount - 1);
        const updated = { ...p, isLiked: nextLiked, likeCount: nextCount };
        if (selectedPost && selectedPost.post_uid === postUid) {
          setSelectedPost(updated);
        }
        return updated;
      }
      return p;
    }));

    try {
      await api.likePost(postUid);
    } catch {
      // Local optimistic update stays
    }
  };

  // 1-Click Toggle Pin
  const handleTogglePin = (postUid, e) => {
    if (e) e.stopPropagation();
    setPosts(prev => prev.map(p => {
      if (p.post_uid === postUid) {
        const nextPinned = !p.isPinned;
        const updated = { ...p, isPinned: nextPinned };
        if (selectedPost && selectedPost.post_uid === postUid) {
          setSelectedPost(updated);
        }
        showToast(
          nextPinned ? `Pinned ${postUid} to Top of Community Stream` : `Unpinned ${postUid}`,
          nextPinned ? 'success' : 'info'
        );
        return updated;
      }
      return p;
    }));
  };

  // Toggle Flag
  const handleToggleFlag = (postUid, e) => {
    if (e) e.stopPropagation();
    setPosts(prev => prev.map(p => {
      if (p.post_uid === postUid) {
        const nextFlagged = !p.isFlagged;
        const updated = { ...p, isFlagged: nextFlagged };
        if (selectedPost && selectedPost.post_uid === postUid) {
          setSelectedPost(updated);
        }
        showToast(
          nextFlagged ? `Flagged ${postUid} for Moderator Inspection` : `Cleared flag on ${postUid}`,
          nextFlagged ? 'warning' : 'info'
        );
        return updated;
      }
      return p;
    }));
  };

  // Handle Share Post
  const handleShare = async (postUid, platform, e) => {
    if (e) e.stopPropagation();
    
    setPosts(prev => prev.map(p => {
      if (p.post_uid === postUid) {
        const nextShares = p.shareCount + 1;
        const updatedBreakdown = (p.shareBreakdown || []).map(sb => {
          if (sb.name.toLowerCase().includes(platform.toLowerCase())) {
            return { ...sb, value: sb.value + 1 };
          }
          return sb;
        });
        const updated = { ...p, shareCount: nextShares, shareBreakdown: updatedBreakdown };
        if (selectedPost && selectedPost.post_uid === postUid) {
          setSelectedPost(updated);
        }
        return updated;
      }
      return p;
    }));

    const targetPost = posts.find(p => p.post_uid === postUid);
    const postUrl = `https://hypernews.in/posts/${postUid}`;
    const shareText = encodeURIComponent(`HyperNews Community Dispatch: "${targetPost?.content.slice(0, 100)}..."`);

    if (platform === 'whatsapp') {
      window.open(`https://wa.me/?text=${shareText}%20${encodeURIComponent(postUrl)}`, '_blank');
      showToast('Opening WhatsApp Web syndication link', 'info');
    } else if (platform === 'twitter') {
      window.open(`https://twitter.com/intent/tweet?text=${shareText}&url=${encodeURIComponent(postUrl)}`, '_blank');
      showToast('Opening Twitter/X dispatch link', 'info');
    } else if (platform === 'facebook') {
      window.open(`https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(postUrl)}`, '_blank');
      showToast('Opening Facebook syndication link', 'info');
    } else {
      navigator.clipboard.writeText(postUrl);
      setCopiedUid(postUid);
      setTimeout(() => setCopiedUid(null), 2000);
      showToast('Public Post Link copied to clipboard!', 'success');
    }

    try {
      await api.sharePost(postUid, platform);
    } catch {
      // Optimistic update retained
    }
  };

  // Add Comment (Moderator note or reply)
  const handleAddComment = async (e) => {
    e.preventDefault();
    if (!newCommentText.trim() || !selectedPost) return;

    const newComment = {
      id: Date.now(),
      user_uid: user?.user_uid || 'USR-ADMIN-01',
      userName: user?.name || 'HyperNews Editorial Desk',
      userAvatar: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=200',
      text: newCommentText.trim(),
      timeAgo: 'Just now',
      likes: 1
    };

    setPosts(prev => prev.map(p => {
      if (p.post_uid === selectedPost.post_uid) {
        const updated = {
          ...p,
          commentCount: p.commentCount + 1,
          comments: [newComment, ...(p.comments || [])]
        };
        setSelectedPost(updated);
        return updated;
      }
      return p;
    }));

    setNewCommentText('');
    showToast('Moderator response published to conversation thread', 'success');

    try {
      await api.addPostComment(selectedPost.post_uid, newComment.text);
    } catch {
      // Retained
    }
  };

  // Open Hashtags Editor
  const handleOpenHashtagEditor = (post, e) => {
    if (e) e.stopPropagation();
    setEditingHashtagsPost(post);
    setTagInput(post.hashtags.join(', '));
  };

  // Save Updated Hashtags
  const handleSaveHashtags = async () => {
    if (!editingHashtagsPost) return;
    const cleanTags = tagInput
      .split(',')
      .map(t => t.trim().replace(/^#/, ''))
      .filter(Boolean)
      .slice(0, 5); // Backend max 5 hashtags

    setPosts(prev => prev.map(p => {
      if (p.post_uid === editingHashtagsPost.post_uid) {
        const updated = { ...p, hashtags: cleanTags };
        if (selectedPost && selectedPost.post_uid === p.post_uid) {
          setSelectedPost(updated);
        }
        return updated;
      }
      return p;
    }));

    try {
      await api.updatePostHashtags(editingHashtagsPost.post_uid, cleanTags);
      showToast(`Updated taxonomy for ${editingHashtagsPost.post_uid}`, 'success');
    } catch {
      showToast('Hashtags updated in local state', 'info');
    }

    setEditingHashtagsPost(null);
  };

  // Delete Post
  const handleConfirmDelete = async () => {
    if (!deleteTarget) return;

    setPosts(prev => prev.filter(p => p.post_uid !== deleteTarget.post_uid));
    if (selectedPost && selectedPost.post_uid === deleteTarget.post_uid) {
      setSelectedPost(null);
    }
    showToast(`Removed post ${deleteTarget.post_uid} from community feed`, 'danger');

    try {
      await api.deletePost(deleteTarget.post_uid);
    } catch {
      // Removed locally
    }
    setDeleteTarget(null);
  };

  // AI Co-Pilot Hashtag Suggestion
  const handleAiSuggestTags = () => {
    const text = createForm.content.toLowerCase();
    const suggestions = [];
    if (text.includes('ai') || text.includes('tech') || text.includes('computer') || text.includes('software')) suggestions.push('TechNews', 'AI');
    if (text.includes('hyderabad') || text.includes('charminar') || text.includes('hitec') || text.includes('telangana')) suggestions.push('Hyderabad', 'Telangana');
    if (text.includes('cricket') || text.includes('match') || text.includes('stadium') || text.includes('sport')) suggestions.push('CricketWorldCup', 'SportsIndia');
    if (text.includes('movie') || text.includes('cinema') || text.includes('film') || text.includes('rajamouli')) suggestions.push('Tollywood', 'IndianCinema');
    if (text.includes('green') || text.includes('solar') || text.includes('ev') || text.includes('clean')) suggestions.push('GreenEnergy', 'CleanAir');
    
    if (suggestions.length === 0) suggestions.push('Hyderabad', 'CitizenNews', 'HyperNews');
    const combined = Array.from(new Set(suggestions)).slice(0, 5).join(', ');
    setCreateForm(prev => ({ ...prev, hashtags: combined }));
    showToast('AI Co-pilot generated 5 relevant viral hashtags!', 'success');
  };

  // Submit New Post
  const handleCreateSubmit = async (e) => {
    e.preventDefault();
    if (!createForm.content.trim()) return;

    const tags = createForm.hashtags
      .split(',')
      .map(t => t.trim().replace(/^#/, ''))
      .filter(Boolean)
      .slice(0, 5);

    const newPost = {
      id: Date.now(),
      post_uid: `pst_${Date.now().toString().slice(-6)}`,
      user_uid: createForm.postAsOfficial ? 'USR-EDITORIAL-HYPER' : (user?.user_uid || 'USR-ADMIN-01'),
      userName: createForm.postAsOfficial ? 'HyperNews Official Desk' : (user?.name || 'Administrator'),
      userHandle: createForm.postAsOfficial ? 'hypernews_desk' : (user?.username || 'admin'),
      userRole: createForm.postAsOfficial ? 'Editorial Anchor' : 'Lead Editor',
      userAvatar: createForm.postAsOfficial 
        ? 'https://images.unsplash.com/photo-1585829365295-ab7cd400c167?w=200&auto=format&fit=crop&q=80'
        : 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=200&auto=format&fit=crop&q=80',
      content: createForm.content.trim(),
      imageUrl: createForm.imageUrl.trim() || null,
      hashtags: tags,
      likeCount: 1,
      commentCount: 0,
      shareCount: 0,
      views: 45,
      isLiked: true,
      isPinned: false,
      isFlagged: false,
      createdAt: new Date().toISOString().replace('T', ' ').slice(0, 16),
      location: 'Telangana HQ',
      comments: [],
      shareBreakdown: [
        { name: 'WhatsApp', value: 0, color: '#25D366' },
        { name: 'Twitter/X', value: 0, color: '#38bdf8' },
        { name: 'Facebook', value: 0, color: '#1877F2' },
        { name: 'Direct Copy', value: 0, color: '#a855f7' }
      ],
      engagementTrend: [
        { time: '00:00', likes: 1, comments: 0, shares: 0 },
        { time: '04:00', likes: 1, comments: 0, shares: 0 }
      ]
    };

    setPosts(prev => [newPost, ...prev]);
    setIsCreateModalOpen(false);
    setCreateForm({
      content: '',
      imageUrl: '',
      hashtags: 'Hyderabad, Community, Innovation',
      postAsOfficial: true
    });
    showToast(`Published community broadcast "${newPost.post_uid}" live!`, 'success');

    try {
      await api.createPost({
        content: newPost.content,
        image_url: newPost.imageUrl,
        hashtags: tags
      });
    } catch {
      // Local session
    }
  };

  // Bulk Export CSV
  const handleExportCsv = () => {
    const target = selectedPosts.length > 0 
      ? posts.filter(p => selectedPosts.includes(p.post_uid))
      : filteredPosts;

    const headers = ['Post UID', 'Author', 'Handle', 'Content', 'Hashtags', 'Likes', 'Comments', 'Shares', 'Estimated Views', 'Created At'];
    const rows = target.map(p => [
      p.post_uid,
      `"${p.userName.replace(/"/g, '""')}"`,
      `"@${p.userHandle}"`,
      `"${p.content.replace(/"/g, '""')}"`,
      `"${p.hashtags.join(', ')}"`,
      p.likeCount,
      p.commentCount,
      p.shareCount,
      p.views,
      `"${p.createdAt}"`
    ]);

    const csvContent = 'data:text/csv;charset=utf-8,' + [headers.join(','), ...rows.map(e => e.join(','))].join('\n');
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `HyperNews_Community_Posts_${new Date().toISOString().slice(0, 10)}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    showToast(`Exported ${target.length} community posts to CSV`, 'info');
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem', width: '100%' }}>
      
      {/* ==================================================================== */}
      {/* 1. OPERATIONS COMMAND DESK HEADER & TELEMETRY BEACON */}
      {/* ==================================================================== */}
      <div style={{
        background: 'var(--glass-bg)',
        backdropFilter: 'blur(16px)',
        WebkitBackdropFilter: 'blur(16px)',
        border: '1px solid var(--glass-border)',
        borderRadius: 'var(--radius-lg)',
        padding: '1.25rem 1.5rem',
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        flexWrap: 'wrap',
        gap: '1.25rem',
        boxShadow: 'var(--glass-shadow)'
      }}>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', flexWrap: 'wrap' }}>
            <h1 style={{ fontSize: '1.6rem', fontWeight: 800, color: 'var(--text-primary)', letterSpacing: '-0.02em', display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
              <Users size={26} style={{ color: 'var(--primary)' }} />
              Community Posts & Engagement Hub
            </h1>

            {/* Live Beacon Status */}
            <div style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '0.45rem',
              padding: '0.25rem 0.65rem',
              borderRadius: 'var(--radius-full)',
              background: 'rgba(16, 185, 129, 0.12)',
              border: '1px solid rgba(16, 185, 129, 0.3)',
              color: 'var(--accent-emerald)',
              fontSize: '0.725rem',
              fontWeight: 700,
              textTransform: 'uppercase',
              letterSpacing: '0.04em'
            }}>
              <span style={{ width: '8px', height: '8px', borderRadius: '50%', background: 'var(--accent-emerald)', boxShadow: '0 0 10px #10b981' }} />
              LIVE CITIZEN STREAM
            </div>
          </div>

          <p style={{ color: 'var(--text-secondary)', fontSize: '0.85rem', marginTop: '0.35rem', display: 'flex', alignItems: 'center', gap: '0.5rem', flexWrap: 'wrap' }}>
            <span>Moderate citizen journalism dispatches, inspect viral reach across external networks, and manage community conversations.</span>
            <span style={{ color: 'var(--text-muted)' }}>•</span>
            <span style={{ fontFamily: 'var(--font-mono)', fontSize: '0.775rem', color: 'var(--accent-cyan)' }}>
              IST {currentTime.toLocaleTimeString('en-US', { hour12: false })} (UTC+5:30)
            </span>
          </p>
        </div>

        {/* Action Controls */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.65rem', flexWrap: 'wrap' }}>
          <button 
            onClick={fetchLivePosts} 
            disabled={isLoading}
            className="btn btn-secondary"
            style={{ fontSize: '0.8rem', padding: '0.5rem 0.85rem' }}
          >
            <RefreshCw size={14} className={isLoading ? 'animate-spin' : ''} />
            {isLoading ? 'Syncing...' : 'Sync Live Stream'}
          </button>

          <button 
            onClick={handleExportCsv}
            className="btn btn-secondary"
            style={{ fontSize: '0.8rem', padding: '0.5rem 0.85rem' }}
            title="Export CSV"
          >
            <Download size={14} /> Export CSV
          </button>

          <button 
            onClick={() => setIsCreateModalOpen(true)}
            className="btn btn-primary"
            style={{ fontSize: '0.8rem', padding: '0.5rem 1.1rem' }}
          >
            <Plus size={16} /> New Community Post
          </button>
        </div>
      </div>

      {/* ==================================================================== */}
      {/* 2. EXECUTIVE TELEMETRY KPI CARDS (5 HIGH-DENSITY METRICS) */}
      {/* ==================================================================== */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(210px, 1fr))', gap: '1.1rem' }}>
        {/* Metric 1: Total Posts */}
        <div 
          className="kpi-card"
          style={{ borderColor: 'rgba(99, 102, 241, 0.35)', cursor: 'pointer' }}
          onClick={() => setActiveTab('all')}
        >
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
            <div>
              <span className="kpi-title">Total Citizen Posts</span>
              <div className="kpi-value">
                {posts.length}
                <span style={{ fontSize: '0.75rem', fontWeight: 500, color: 'var(--primary)' }}>live items</span>
              </div>
            </div>
            <div style={{ padding: '0.6rem', borderRadius: 'var(--radius-md)', background: 'rgba(99, 102, 241, 0.15)', color: 'var(--primary)' }}>
              <MessageSquare size={18} />
            </div>
          </div>
          <div className="kpi-footer">
            <span style={{ color: 'var(--accent-emerald)', fontWeight: 600 }}>+4 published today</span>
            <span style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>100% indexed</span>
          </div>
        </div>

        {/* Metric 2: Reader Likes Volume */}
        <div 
          className="kpi-card"
          style={{ borderColor: 'rgba(244, 63, 94, 0.35)', cursor: 'pointer' }}
          onClick={() => { setSortBy('likes'); setActiveTab('trending'); }}
        >
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
            <div>
              <span className="kpi-title">Reader Like Volume</span>
              <div className="kpi-value">
                {totalLikes.toLocaleString()}
                <span style={{ fontSize: '0.75rem', fontWeight: 500, color: 'var(--accent-rose)' }}>hearts</span>
              </div>
            </div>
            <div style={{ padding: '0.6rem', borderRadius: 'var(--radius-md)', background: 'rgba(244, 63, 94, 0.15)', color: 'var(--accent-rose)' }}>
              <Heart size={18} />
            </div>
          </div>
          <div className="kpi-footer">
            <span style={{ color: 'var(--accent-emerald)', fontWeight: 600 }}>+18.4% velocity</span>
            <span style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>avg ~{Math.round(totalLikes / (posts.length || 1))} / post</span>
          </div>
        </div>

        {/* Metric 3: Discussion Comments */}
        <div 
          className="kpi-card"
          style={{ borderColor: 'rgba(6, 182, 212, 0.35)', cursor: 'pointer' }}
          onClick={() => setSortBy('comments')}
        >
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
            <div>
              <span className="kpi-title">Discussion Velocity</span>
              <div className="kpi-value">
                {totalComments.toLocaleString()}
                <span style={{ fontSize: '0.75rem', fontWeight: 500, color: 'var(--accent-cyan)' }}>replies</span>
              </div>
            </div>
            <div style={{ padding: '0.6rem', borderRadius: 'var(--radius-md)', background: 'rgba(6, 182, 212, 0.15)', color: 'var(--accent-cyan)' }}>
              <MessageCircle size={18} />
            </div>
          </div>
          <div className="kpi-footer">
            <span style={{ color: 'var(--accent-cyan)', fontWeight: 600 }}>Active citizen threads</span>
            <span style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>avg ~{Math.round(totalComments / (posts.length || 1))} / post</span>
          </div>
        </div>

        {/* Metric 4: External Shares */}
        <div 
          className="kpi-card"
          style={{ borderColor: 'rgba(16, 185, 129, 0.35)', cursor: 'pointer' }}
          onClick={() => setSortBy('shares')}
        >
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
            <div>
              <span className="kpi-title">Multi-Platform Shares</span>
              <div className="kpi-value">
                {totalShares.toLocaleString()}
                <span style={{ fontSize: '0.75rem', fontWeight: 500, color: 'var(--accent-emerald)' }}>dispatches</span>
              </div>
            </div>
            <div style={{ padding: '0.6rem', borderRadius: 'var(--radius-md)', background: 'rgba(16, 185, 129, 0.15)', color: 'var(--accent-emerald)' }}>
              <Share2 size={18} />
            </div>
          </div>
          <div className="kpi-footer">
            <span style={{ color: 'var(--accent-emerald)', fontWeight: 600 }}>WhatsApp (48%) Leader</span>
            <span style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>X (32%) Second</span>
          </div>
        </div>

        {/* Metric 5: Estimated Impressions */}
        <div 
          className="kpi-card"
          style={{ borderColor: 'rgba(245, 158, 11, 0.35)', cursor: 'pointer' }}
          onClick={() => setViewMode('analytics')}
        >
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
            <div>
              <span className="kpi-title">Estimated Impressions</span>
              <div className="kpi-value">
                {totalViews.toLocaleString()}
                <span style={{ fontSize: '0.75rem', fontWeight: 500, color: 'var(--accent-amber)' }}>reach</span>
              </div>
            </div>
            <div style={{ padding: '0.6rem', borderRadius: 'var(--radius-md)', background: 'rgba(245, 158, 11, 0.15)', color: 'var(--accent-amber)' }}>
              <Eye size={18} />
            </div>
          </div>
          <div className="kpi-footer">
            <span style={{ color: 'var(--accent-amber)', fontWeight: 600 }}>~12.8% Average CTR</span>
            <span style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>High Virality Index</span>
          </div>
        </div>
      </div>

      {/* ==================================================================== */}
      {/* 3. TRENDING HASHTAGS CLOUD & VIRALITY LEADERBOARD */}
      {/* ==================================================================== */}
      <div style={{
        background: 'var(--glass-bg)',
        backdropFilter: 'blur(16px)',
        border: '1px solid var(--glass-border)',
        borderRadius: 'var(--radius-lg)',
        padding: '0.85rem 1.25rem',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        flexWrap: 'wrap',
        gap: '0.75rem'
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem', flexWrap: 'wrap' }}>
          <span style={{ fontSize: '0.75rem', fontWeight: 800, color: 'var(--accent-amber)', display: 'flex', alignItems: 'center', gap: '0.35rem', textTransform: 'uppercase', letterSpacing: '0.03em' }}>
            <Flame size={15} /> Trending Hashtags:
          </span>

          <button
            onClick={() => setSelectedHashtag('All')}
            className={`tab-pill ${selectedHashtag === 'All' ? 'active' : ''}`}
            style={{ padding: '0.25rem 0.65rem', fontSize: '0.725rem' }}
          >
            All Tags
          </button>

          {trendingHashtags.map((tag, idx) => (
            <button
              key={tag.name}
              onClick={() => setSelectedHashtag(tag.name)}
              className={`tab-pill ${selectedHashtag.toLowerCase() === tag.name.toLowerCase() ? 'active' : ''}`}
              style={{ padding: '0.25rem 0.65rem', fontSize: '0.725rem', display: 'inline-flex', alignItems: 'center', gap: '0.3rem' }}
            >
              <Hash size={11} style={{ color: idx === 0 ? 'var(--accent-rose)' : 'var(--primary)' }} />
              <span>{tag.name}</span>
              <span style={{ fontSize: '0.65rem', opacity: 0.7, fontFamily: 'var(--font-mono)' }}>{tag.usage_count}</span>
            </button>
          ))}
        </div>

        {selectedHashtag !== 'All' && (
          <button
            onClick={() => setSelectedHashtag('All')}
            style={{ background: 'none', border: 'none', color: 'var(--accent-rose)', fontSize: '0.75rem', display: 'flex', alignItems: 'center', gap: '0.25rem', cursor: 'pointer' }}
          >
            <X size={13} /> Clear Tag Filter
          </button>
        )}
      </div>

      {/* ==================================================================== */}
      {/* 4. MULTI-MODE OPERATIONS DECK SWITCHER */}
      {/* ==================================================================== */}
      <div style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        flexWrap: 'wrap',
        gap: '0.75rem',
        borderBottom: '1px solid var(--border-subtle)',
        paddingBottom: '0.75rem'
      }}>
        {/* Mode Tabs */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', flexWrap: 'wrap' }}>
          <button
            onClick={() => setViewMode('grid')}
            className={`ops-deck-tab ${viewMode === 'grid' ? 'active' : ''}`}
          >
            <LayoutGrid size={15} /> Interactive Citizen Stream ({filteredPosts.length})
          </button>

          <button
            onClick={() => setViewMode('table')}
            className={`ops-deck-tab ${viewMode === 'table' ? 'active' : ''}`}
          >
            <List size={15} /> Community Moderation Ledger
          </button>

          <button
            onClick={() => setViewMode('analytics')}
            className={`ops-deck-tab ${viewMode === 'analytics' ? 'active' : ''}`}
          >
            <BarChart3 size={15} /> Virality & Distribution Center
          </button>
        </div>

        {/* Quick Lifecycle Filters */}
        <div style={{ display: 'flex', background: 'rgba(15, 23, 42, 0.7)', padding: '0.2rem', borderRadius: 'var(--radius-md)', border: '1px solid var(--border-subtle)' }}>
          {[
            { id: 'all', label: 'All Feed' },
            { id: 'trending', label: '🔥 High Virality' },
            { id: 'media', label: '📸 Media Only' },
            { id: 'pinned', label: '📌 Pinned' },
            { id: 'flagged', label: '🚩 In-Review' }
          ].map(tab => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`tab-pill ${activeTab === tab.id ? 'active' : ''}`}
              style={{ padding: '0.35rem 0.65rem', fontSize: '0.725rem' }}
            >
              {tab.label}
            </button>
          ))}
        </div>
      </div>

      {/* ==================================================================== */}
      {/* 5. FILTER & SEARCH COMMAND BAR */}
      {/* ==================================================================== */}
      <div className="filter-bar">
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '0.85rem', flexWrap: 'wrap' }}>
          {/* Search Box with Shortcut Badge */}
          <div style={{ flex: 1, minWidth: '280px', position: 'relative' }}>
            <Search size={15} style={{ position: 'absolute', left: '0.85rem', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} />
            <input 
              ref={searchInputRef}
              type="text" 
              className="input" 
              style={{ paddingLeft: '2.5rem', paddingRight: '4rem', fontSize: '0.8rem' }}
              placeholder="Search post copy, citizen reporter, #hashtags, or pst_uid..." 
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
            {searchQuery ? (
              <button 
                onClick={() => setSearchQuery('')}
                style={{ position: 'absolute', right: '0.75rem', top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', color: 'var(--text-muted)', cursor: 'pointer' }}
              >
                <X size={14} />
              </button>
            ) : (
              <div style={{ position: 'absolute', right: '0.75rem', top: '50%', transform: 'translateY(-50%)', padding: '0.15rem 0.35rem', borderRadius: '4px', background: 'rgba(255,255,255,0.06)', border: '1px solid var(--border-subtle)', fontSize: '0.65rem', color: 'var(--text-muted)', fontFamily: 'var(--font-mono)' }}>
                Press /
              </div>
            )}
          </div>

          {/* Sort Selector */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem', flexWrap: 'wrap' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
              <span style={{ fontSize: '0.725rem', fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase' }}>Media:</span>
              <select 
                className="select" 
                style={{ width: 'auto', padding: '0.45rem 0.75rem', fontSize: '0.775rem' }}
                value={selectedFilter}
                onChange={(e) => setSelectedFilter(e.target.value)}
              >
                <option value="all">All Content</option>
                <option value="media">With Images</option>
                <option value="text">Text Only</option>
                <option value="pinned">Pinned Only</option>
              </select>
            </div>

            <div style={{ display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
              <span style={{ fontSize: '0.725rem', fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase' }}>Sort:</span>
              <select 
                className="select" 
                style={{ width: 'auto', padding: '0.45rem 0.75rem', fontSize: '0.775rem' }}
                value={sortBy}
                onChange={(e) => setSortBy(e.target.value)}
              >
                <option value="recent">Most Recent</option>
                <option value="likes">Highest Likes (Hearts)</option>
                <option value="comments">Most Discussion (Comments)</option>
                <option value="shares">Viral Dispatches (Shares)</option>
              </select>
            </div>
          </div>
        </div>

        {/* Multi-Select Action Bar */}
        {selectedPosts.length > 0 && (
          <div style={{
            marginTop: '0.85rem',
            padding: '0.65rem 1rem',
            borderRadius: 'var(--radius-md)',
            background: 'rgba(99, 102, 241, 0.12)',
            border: '1px solid rgba(99, 102, 241, 0.35)',
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            flexWrap: 'wrap',
            gap: '0.75rem'
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '0.8rem', color: '#c7d2fe', fontWeight: 600 }}>
              <CheckSquare size={16} />
              <span>{selectedPosts.length} posts selected across stream</span>
            </div>

            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <button 
                className="btn btn-secondary" 
                style={{ fontSize: '0.725rem', padding: '0.3rem 0.65rem' }}
                onClick={() => {
                  setPosts(prev => prev.map(p => selectedPosts.includes(p.post_uid) ? { ...p, isPinned: true } : p));
                  showToast(`Pinned ${selectedPosts.length} posts to feed`, 'success');
                  setSelectedPosts([]);
                }}
              >
                <Pin size={13} /> Bulk Pin
              </button>

              <button 
                className="btn btn-secondary" 
                style={{ fontSize: '0.725rem', padding: '0.3rem 0.65rem' }}
                onClick={handleExportCsv}
              >
                <Download size={13} /> Export Selected
              </button>

              <button 
                className="btn btn-danger" 
                style={{ fontSize: '0.725rem', padding: '0.3rem 0.65rem' }}
                onClick={() => {
                  setPosts(prev => prev.filter(p => !selectedPosts.includes(p.post_uid)));
                  showToast(`Deleted ${selectedPosts.length} posts`, 'danger');
                  setSelectedPosts([]);
                }}
              >
                <Trash2 size={13} /> Bulk Delete
              </button>

              <button 
                className="btn btn-secondary" 
                style={{ fontSize: '0.725rem', padding: '0.3rem 0.65rem' }}
                onClick={() => setSelectedPosts([])}
              >
                Cancel
              </button>
            </div>
          </div>
        )}
      </div>

      {/* ==================================================================== */}
      {/* 6. VIEW MODE 1: INTERACTIVE CITIZEN STREAM (SOCIAL CARDS) */}
      {/* ==================================================================== */}
      {viewMode === 'grid' && (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(340px, 1fr))', gap: '1.25rem' }}>
          {filteredPosts.length === 0 ? (
            <div style={{ gridColumn: '1 / -1', textAlign: 'center', padding: '4rem 1rem', background: 'var(--glass-bg)', borderRadius: 'var(--radius-lg)', border: '1px solid var(--border-subtle)', color: 'var(--text-muted)' }}>
              <MessageSquare size={42} style={{ margin: '0 auto 0.75rem', opacity: 0.5 }} />
              <div style={{ fontWeight: 700, fontSize: '1rem', color: 'var(--text-primary)' }}>No Community Posts Found</div>
              <div style={{ fontSize: '0.8rem', marginTop: '0.25rem' }}>Try clearing filters or search queries.</div>
            </div>
          ) : (
            filteredPosts.map(post => (
              <div
                key={post.post_uid}
                className="channel-status-card"
                style={{
                  padding: '1.15rem',
                  borderColor: post.isPinned ? 'rgba(99, 102, 241, 0.45)' : post.isFlagged ? 'rgba(244, 63, 94, 0.4)' : undefined,
                  background: post.isPinned ? 'rgba(99, 102, 241, 0.05)' : undefined,
                  cursor: 'pointer'
                }}
                onClick={() => setSelectedPost(post)}
              >
                <div>
                  {/* Author Card Header */}
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '0.75rem' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.65rem' }}>
                      <div style={{ position: 'relative' }}>
                        <img 
                          src={post.userAvatar} 
                          alt="avatar" 
                          style={{ width: '40px', height: '40px', borderRadius: '50%', objectFit: 'cover', border: '1.5px solid var(--border-subtle)' }}
                        />
                        <span style={{ position: 'absolute', bottom: '0', right: '0', width: '9px', height: '9px', borderRadius: '50%', background: 'var(--accent-emerald)', border: '1.5px solid #080c14' }} />
                      </div>
                      <div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
                          <span style={{ fontSize: '0.875rem', fontWeight: 700, color: 'var(--text-primary)' }}>
                            {post.userName}
                          </span>
                          <CheckCircle2 size={13} style={{ color: 'var(--primary)' }} />
                        </div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.35rem', fontSize: '0.7rem', color: 'var(--text-muted)' }}>
                          <span style={{ fontFamily: 'var(--font-mono)', color: 'var(--accent-cyan)' }}>@{post.userHandle}</span>
                          <span>•</span>
                          <span>{post.createdAt}</span>
                        </div>
                      </div>
                    </div>

                    {/* Pin & UID Pill */}
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
                      {post.isPinned && (
                        <span className="badge badge-primary" style={{ fontSize: '0.65rem', padding: '0.1rem 0.4rem' }}>
                          <Pin size={10} /> PINNED
                        </span>
                      )}
                      {post.isFlagged && (
                        <span className="badge badge-danger" style={{ fontSize: '0.65rem', padding: '0.1rem 0.4rem' }}>
                          <Flag size={10} /> REVIEW
                        </span>
                      )}
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          navigator.clipboard.writeText(post.post_uid);
                          setCopiedUid(post.post_uid);
                          setTimeout(() => setCopiedUid(null), 1800);
                          showToast(`Copied ${post.post_uid}`, 'info');
                        }}
                        className="btn-icon"
                        style={{ padding: '0.3rem' }}
                        title="Copy UID"
                      >
                        {copiedUid === post.post_uid ? <Check size={12} style={{ color: 'var(--accent-emerald)' }} /> : <Copy size={12} />}
                      </button>
                    </div>
                  </div>

                  {/* Media Cover Image */}
                  {post.imageUrl && (
                    <div style={{ position: 'relative', width: '100%', height: '170px', borderRadius: 'var(--radius-md)', overflow: 'hidden', marginBottom: '0.85rem', background: '#020617', border: '1px solid var(--border-subtle)' }}>
                      <img 
                        src={post.imageUrl} 
                        alt="media" 
                        style={{ width: '100%', height: '100%', objectFit: 'cover', transition: 'transform 0.3s ease' }} 
                      />
                      <span style={{ position: 'absolute', top: '0.5rem', right: '0.5rem', padding: '0.15rem 0.45rem', borderRadius: '4px', background: 'rgba(0,0,0,0.7)', backdropFilter: 'blur(4px)', fontSize: '0.65rem', color: '#ffffff', fontFamily: 'var(--font-mono)' }}>
                        HD MEDIA
                      </span>
                    </div>
                  )}

                  {/* Post Content */}
                  <p style={{
                    fontSize: '0.85rem',
                    color: 'var(--text-primary)',
                    lineHeight: 1.5,
                    marginBottom: '0.75rem',
                    display: '-webkit-box',
                    WebkitLineClamp: 3,
                    WebkitBoxOrient: 'vertical',
                    overflow: 'hidden'
                  }}>
                    {post.content}
                  </p>

                  {/* Hashtags */}
                  {post.hashtags && post.hashtags.length > 0 && (
                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.35rem', marginBottom: '0.85rem' }}>
                      {post.hashtags.map(h => (
                        <span 
                          key={h} 
                          onClick={(e) => {
                            e.stopPropagation();
                            setSelectedHashtag(h);
                          }}
                          className="badge badge-neutral" 
                          style={{ fontSize: '0.675rem', cursor: 'pointer' }}
                        >
                          #{h.replace(/^#/, '')}
                        </span>
                      ))}
                    </div>
                  )}
                </div>

                {/* Card Action & Engagement Footer */}
                <div style={{ paddingTop: '0.75rem', borderTop: '1px solid var(--border-subtle)', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '0.5rem' }}>
                  {/* Engagement Counters */}
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.65rem' }}>
                    <button
                      onClick={(e) => handleToggleLike(post.post_uid, e)}
                      style={{
                        background: post.isLiked ? 'rgba(244, 63, 94, 0.15)' : 'transparent',
                        border: 'none',
                        color: post.isLiked ? 'var(--accent-rose)' : 'var(--text-muted)',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '0.3rem',
                        fontSize: '0.775rem',
                        fontWeight: 600,
                        cursor: 'pointer',
                        padding: '0.2rem 0.4rem',
                        borderRadius: '4px'
                      }}
                      title="Like / Heart"
                    >
                      <Heart size={14} fill={post.isLiked ? 'currentColor' : 'none'} />
                      <span>{post.likeCount}</span>
                    </button>

                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.3rem', fontSize: '0.775rem', color: 'var(--accent-cyan)' }} title="Comments">
                      <MessageSquare size={14} />
                      <span>{post.commentCount}</span>
                    </div>

                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.3rem', fontSize: '0.775rem', color: 'var(--accent-emerald)' }} title="Shares">
                      <Share2 size={14} />
                      <span>{post.shareCount}</span>
                    </div>
                  </div>

                  {/* Right Action Icons */}
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
                    <button
                      onClick={(e) => handleTogglePin(post.post_uid, e)}
                      className="btn-icon"
                      style={{ padding: '0.35rem', color: post.isPinned ? 'var(--primary)' : 'var(--text-muted)' }}
                      title={post.isPinned ? 'Unpin from Top' : 'Pin to Top of Stream'}
                    >
                      <Pin size={13} />
                    </button>

                    <button
                      onClick={(e) => handleOpenHashtagEditor(post, e)}
                      className="btn-icon"
                      style={{ padding: '0.35rem', color: 'var(--text-muted)' }}
                      title="Edit Hashtags (Moderator)"
                    >
                      <Tag size={13} />
                    </button>

                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        setDeleteTarget(post);
                      }}
                      className="btn-icon"
                      style={{ padding: '0.35rem', color: 'var(--accent-rose)' }}
                      title="Delete Post"
                    >
                      <Trash2 size={13} />
                    </button>

                    <button
                      onClick={() => setSelectedPost(post)}
                      className="btn btn-secondary"
                      style={{ fontSize: '0.725rem', padding: '0.3rem 0.6rem', display: 'inline-flex', alignItems: 'center', gap: '0.25rem' }}
                    >
                      <span>Analysis</span>
                      <ArrowUpRight size={12} />
                    </button>
                  </div>
                </div>
              </div>
            ))
          )}
        </div>
      )}

      {/* ==================================================================== */}
      {/* 7. VIEW MODE 2: COMMUNITY MODERATION LEDGER (TABLE) */}
      {/* ==================================================================== */}
      {viewMode === 'table' && (
        <div className="table-container">
          <table className="data-table">
            <thead>
              <tr>
                <th style={{ width: '40px' }}>
                  <input
                    type="checkbox"
                    checked={selectedPosts.length === filteredPosts.length && filteredPosts.length > 0}
                    onChange={toggleSelectAll}
                    style={{ cursor: 'pointer' }}
                  />
                </th>
                <th>Citizen Post & Media Scope</th>
                <th>Author & Role</th>
                <th>Taxonomy Hashtags</th>
                <th>Virality & Engagement</th>
                <th>Status</th>
                <th>Published At</th>
                <th style={{ textAlign: 'right' }}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {filteredPosts.length === 0 ? (
                <tr>
                  <td colSpan={8} style={{ textAlign: 'center', padding: '3.5rem 1rem', color: 'var(--text-muted)' }}>
                    <MessageSquare size={36} style={{ margin: '0 auto 0.75rem', opacity: 0.5 }} />
                    <div style={{ fontWeight: 600 }}>No posts match the active filter criteria.</div>
                  </td>
                </tr>
              ) : (
                filteredPosts.map(post => (
                  <tr key={post.post_uid} style={{ background: selectedPosts.includes(post.post_uid) ? 'rgba(99, 102, 241, 0.08)' : 'transparent' }}>
                    <td>
                      <input
                        type="checkbox"
                        checked={selectedPosts.includes(post.post_uid)}
                        onChange={() => toggleSelectPost(post.post_uid)}
                        style={{ cursor: 'pointer' }}
                      />
                    </td>
                    <td style={{ maxWidth: '360px' }}>
                      <div style={{ display: 'flex', gap: '0.75rem', alignItems: 'center' }}>
                        <div style={{ position: 'relative', width: '56px', height: '42px', borderRadius: 'var(--radius-sm)', overflow: 'hidden', flexShrink: 0, background: '#0f172a' }}>
                          {post.imageUrl ? (
                            <img src={post.imageUrl} alt="thumb" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                          ) : (
                            <div style={{ width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--text-muted)' }}>
                              <MessageSquare size={16} />
                            </div>
                          )}
                        </div>
                        <div style={{ minWidth: 0 }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '0.35rem', marginBottom: '0.2rem' }}>
                            <span style={{ fontSize: '0.7rem', color: 'var(--text-muted)', fontFamily: 'var(--font-mono)' }}>
                              {post.post_uid}
                            </span>
                            {post.isPinned && (
                              <span className="badge badge-primary" style={{ fontSize: '0.6rem', padding: '0.05rem 0.35rem' }}>
                                PINNED
                              </span>
                            )}
                          </div>
                          <div 
                            style={{ fontSize: '0.825rem', fontWeight: 600, color: 'var(--text-primary)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', cursor: 'pointer' }}
                            onClick={() => setSelectedPost(post)}
                            title={post.content}
                          >
                            {post.content}
                          </div>
                        </div>
                      </div>
                    </td>
                    <td>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.45rem' }}>
                        <img src={post.userAvatar} alt="avatar" style={{ width: '24px', height: '24px', borderRadius: '50%', objectFit: 'cover' }} />
                        <div>
                          <div style={{ fontSize: '0.8rem', fontWeight: 600, color: 'var(--text-primary)' }}>{post.userName}</div>
                          <div style={{ fontSize: '0.65rem', color: 'var(--accent-cyan)', fontFamily: 'var(--font-mono)' }}>@{post.userHandle}</div>
                        </div>
                      </div>
                    </td>
                    <td>
                      <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.25rem', maxWidth: '200px' }}>
                        {post.hashtags.map(h => (
                          <span key={h} className="badge badge-neutral" style={{ fontSize: '0.65rem' }}>
                            #{h}
                          </span>
                        ))}
                      </div>
                    </td>
                    <td>
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '0.15rem' }}>
                        <span style={{ fontSize: '0.775rem', fontWeight: 700, color: 'var(--primary)', fontFamily: 'var(--font-mono)' }}>
                          {post.views.toLocaleString()} views
                        </span>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.45rem', fontSize: '0.7rem', color: 'var(--text-muted)' }}>
                          <span style={{ color: 'var(--accent-rose)' }}>♥ {post.likeCount}</span>
                          <span style={{ color: 'var(--accent-cyan)' }}>💬 {post.commentCount}</span>
                          <span style={{ color: 'var(--accent-emerald)' }}>↗ {post.shareCount}</span>
                        </div>
                      </div>
                    </td>
                    <td>
                      {post.isFlagged ? (
                        <span className="badge badge-danger">
                          <Flag size={11} /> Flagged
                        </span>
                      ) : post.isPinned ? (
                        <span className="badge badge-primary">
                          <Pin size={11} /> Pinned
                        </span>
                      ) : (
                        <span className="badge badge-success">
                          <CheckCircle2 size={11} /> Normal
                        </span>
                      )}
                    </td>
                    <td>
                      <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)', fontFamily: 'var(--font-mono)' }}>
                        {post.createdAt}
                      </span>
                    </td>
                    <td style={{ textAlign: 'right' }}>
                      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'flex-end', gap: '0.35rem' }}>
                        <button
                          onClick={() => setSelectedPost(post)}
                          className="btn btn-secondary"
                          style={{ padding: '0.25rem 0.55rem', fontSize: '0.7rem' }}
                          title="Open Analysis Dossier"
                        >
                          <ArrowUpRight size={13} />
                        </button>
                        <button
                          onClick={(e) => handleTogglePin(post.post_uid, e)}
                          className="btn-icon"
                          style={{ padding: '0.35rem', color: post.isPinned ? 'var(--primary)' : 'var(--text-muted)' }}
                          title={post.isPinned ? 'Unpin' : 'Pin'}
                        >
                          <Pin size={13} />
                        </button>
                        <button
                          onClick={(e) => handleOpenHashtagEditor(post, e)}
                          className="btn-icon"
                          style={{ padding: '0.35rem', color: 'var(--text-muted)' }}
                          title="Edit Hashtags"
                        >
                          <Tag size={13} />
                        </button>
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            setDeleteTarget(post);
                          }}
                          className="btn-icon"
                          style={{ padding: '0.35rem', color: 'var(--accent-rose)' }}
                          title="Delete"
                        >
                          <Trash2 size={13} />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      )}

      {/* ==================================================================== */}
      {/* 8. VIEW MODE 3: VIRALITY & DISTRIBUTION CENTER (CHARTS) */}
      {/* ==================================================================== */}
      {viewMode === 'analytics' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem', width: '100%' }}>
          
          {/* Top Charts Grid */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(420px, 1fr))', gap: '1.25rem' }}>
            {/* Chart 1: Platform Share Breakdown */}
            <div className="analytics-panel">
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '1.25rem' }}>
                <div>
                  <h3 style={{ fontSize: '1rem', fontWeight: 700, color: 'var(--text-primary)', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                    <PieIcon size={18} style={{ color: 'var(--accent-emerald)' }} />
                    Multi-Platform Social Share Syndication
                  </h3>
                  <p style={{ fontSize: '0.775rem', color: 'var(--text-muted)', marginTop: '0.2rem' }}>
                    Real-time distribution across external broadcast networks
                  </p>
                </div>
                <span className="badge badge-success" style={{ fontFamily: 'var(--font-mono)' }}>
                  {totalShares} Total Shares
                </span>
              </div>

              <div style={{ height: '240px', width: '100%' }}>
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={aggregateSharesByPlatform}
                      cx="50%"
                      cy="50%"
                      innerRadius={55}
                      outerRadius={85}
                      paddingAngle={5}
                      dataKey="value"
                    >
                      {aggregateSharesByPlatform.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={entry.color} />
                      ))}
                    </Pie>
                    <Tooltip 
                      contentStyle={{
                        background: '#0f172a',
                        border: '1px solid rgba(255, 255, 255, 0.1)',
                        borderRadius: '8px',
                        color: '#f8fafc',
                        fontSize: '0.8rem'
                      }}
                    />
                  </PieChart>
                </ResponsiveContainer>
              </div>

              {/* Legend Bar */}
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '0.75rem', marginTop: '1rem', paddingTop: '1rem', borderTop: '1px solid var(--border-subtle)' }}>
                {aggregateSharesByPlatform.map(item => (
                  <div key={item.name} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '0.5rem 0.75rem', borderRadius: 'var(--radius-sm)', background: 'rgba(255,255,255,0.03)', border: '1px solid var(--border-subtle)' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.45rem' }}>
                      <span style={{ width: '10px', height: '10px', borderRadius: '50%', background: item.color }} />
                      <span style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>{item.name}</span>
                    </div>
                    <strong style={{ fontSize: '0.85rem', color: 'var(--text-primary)', fontFamily: 'var(--font-mono)' }}>{item.value}</strong>
                  </div>
                ))}
              </div>
            </div>

            {/* Chart 2: 24-Hour Velocity Curve */}
            <div className="analytics-panel">
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '1.25rem' }}>
                <div>
                  <h3 style={{ fontSize: '1rem', fontWeight: 700, color: 'var(--text-primary)', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                    <TrendingUp size={18} style={{ color: 'var(--primary)' }} />
                    24-Hour Virality Progression Curve
                  </h3>
                  <p style={{ fontSize: '0.775rem', color: 'var(--text-muted)', marginTop: '0.2rem' }}>
                    Aggregated hourly interaction volume (Likes, Comments & Shares)
                  </p>
                </div>
                <span className="badge badge-primary">
                  Live Telemetry
                </span>
              </div>

              <div style={{ height: '240px', width: '100%' }}>
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={[
                    { time: '00:00', likes: 120, comments: 24, shares: 35 },
                    { time: '04:00', likes: 210, comments: 45, shares: 60 },
                    { time: '08:00', likes: 580, comments: 110, shares: 140 },
                    { time: '12:00', likes: 920, comments: 165, shares: 220 },
                    { time: '16:00', likes: 1180, comments: 190, shares: 280 },
                    { time: '20:00', likes: 1476, comments: 216, shares: 367 }
                  ]}>
                    <defs>
                      <linearGradient id="likesGrad" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#6366f1" stopOpacity={0.4}/>
                        <stop offset="95%" stopColor="#6366f1" stopOpacity={0.0}/>
                      </linearGradient>
                      <linearGradient id="sharesGrad" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#10b981" stopOpacity={0.4}/>
                        <stop offset="95%" stopColor="#10b981" stopOpacity={0.0}/>
                      </linearGradient>
                    </defs>
                    <XAxis dataKey="time" stroke="var(--text-muted)" fontSize={11} />
                    <YAxis stroke="var(--text-muted)" fontSize={11} />
                    <Tooltip 
                      contentStyle={{
                        background: '#0f172a',
                        border: '1px solid rgba(255, 255, 255, 0.1)',
                        borderRadius: '8px',
                        color: '#f8fafc',
                        fontSize: '0.8rem'
                      }}
                    />
                    <Legend />
                    <Area type="monotone" dataKey="likes" stroke="#6366f1" fillOpacity={1} fill="url(#likesGrad)" name="Likes" />
                    <Area type="monotone" dataKey="shares" stroke="#10b981" fillOpacity={1} fill="url(#sharesGrad)" name="Shares" />
                  </AreaChart>
                </ResponsiveContainer>
              </div>

              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '1rem', paddingTop: '1rem', borderTop: '1px solid var(--border-subtle)', fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                <span>Peak Traffic Window: <strong>18:00 - 21:00 IST</strong></span>
                <span style={{ color: 'var(--accent-emerald)', fontWeight: 600 }}>High Engagement Period</span>
              </div>
            </div>
          </div>

          {/* Top 5 Viral Posts Leaderboard */}
          <div className="analytics-panel">
            <h3 style={{ fontSize: '1rem', fontWeight: 700, color: 'var(--text-primary)', marginBottom: '1rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <Flame size={18} style={{ color: 'var(--accent-rose)' }} />
              Top Viral Citizen Dispatches
            </h3>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
              {[...posts].sort((a, b) => (b.likeCount + b.shareCount) - (a.likeCount + a.shareCount)).slice(0, 5).map((p, idx) => (
                <div 
                  key={p.post_uid} 
                  className="queue-item"
                  style={{ cursor: 'pointer' }}
                  onClick={() => setSelectedPost(p)}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
                    <span style={{ fontSize: '1.1rem', fontWeight: 800, color: idx === 0 ? 'var(--accent-rose)' : idx === 1 ? 'var(--accent-amber)' : 'var(--text-muted)', width: '24px' }}>
                      #{idx + 1}
                    </span>
                    <img src={p.userAvatar} alt="avatar" style={{ width: '36px', height: '36px', borderRadius: '50%', objectFit: 'cover' }} />
                    <div>
                      <div style={{ fontSize: '0.85rem', fontWeight: 700, color: 'var(--text-primary)' }}>{p.userName}</div>
                      <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', maxWidth: '480px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                        {p.content}
                      </div>
                    </div>
                  </div>

                  <div style={{ display: 'flex', alignItems: 'center', gap: '1.5rem', fontFamily: 'var(--font-mono)', fontSize: '0.8rem' }}>
                    <span style={{ color: 'var(--accent-rose)' }}>♥ {p.likeCount}</span>
                    <span style={{ color: 'var(--accent-cyan)' }}>💬 {p.commentCount}</span>
                    <span style={{ color: 'var(--accent-emerald)' }}>↗ {p.shareCount}</span>
                    <button className="btn btn-secondary" style={{ padding: '0.25rem 0.5rem', fontSize: '0.7rem' }}>
                      Inspect
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* ==================================================================== */}
      {/* 9. FULL-SCREEN EXPANSIVE POST DOSSIER & CONVERSATION MODAL */}
      {/* ==================================================================== */}
      {selectedPost && (
        <Modal
          isOpen={!!selectedPost}
          onClose={() => setSelectedPost(null)}
          title={`Community Dispatch Dossier • ${selectedPost.post_uid}`}
          size="full"
        >
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(360px, 1fr))', gap: '1.5rem', minHeight: '620px' }}>
            
            {/* LEFT COLUMN: CITIZEN POST, MEDIA & COMMENT CONVERSATION */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
              
              {/* Author Profile Banner */}
              <div style={{
                background: 'rgba(15, 23, 42, 0.6)',
                border: '1px solid var(--border-subtle)',
                borderRadius: 'var(--radius-md)',
                padding: '1rem 1.25rem',
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                flexWrap: 'wrap',
                gap: '0.85rem'
              }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.85rem' }}>
                  <img 
                    src={selectedPost.userAvatar} 
                    alt="avatar" 
                    style={{ width: '48px', height: '48px', borderRadius: '50%', objectFit: 'cover', border: '2px solid var(--primary)' }}
                  />
                  <div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.45rem' }}>
                      <span style={{ fontSize: '1rem', fontWeight: 800, color: 'var(--text-primary)' }}>
                        {selectedPost.userName}
                      </span>
                      <CheckCircle2 size={16} style={{ color: 'var(--primary)' }} />
                      <span className="badge badge-primary" style={{ fontSize: '0.65rem' }}>
                        {selectedPost.userRole}
                      </span>
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: '0.2rem' }}>
                      <span style={{ fontFamily: 'var(--font-mono)', color: 'var(--accent-cyan)' }}>@{selectedPost.userHandle}</span>
                      <span>•</span>
                      <span style={{ fontFamily: 'var(--font-mono)' }}>{selectedPost.user_uid}</span>
                      <span>•</span>
                      <span>{selectedPost.createdAt}</span>
                    </div>
                  </div>
                </div>

                <div style={{ display: 'flex', alignItems: 'center', gap: '0.45rem' }}>
                  <button
                    onClick={(e) => handleTogglePin(selectedPost.post_uid, e)}
                    className={selectedPost.isPinned ? 'btn btn-primary' : 'btn btn-secondary'}
                    style={{ fontSize: '0.75rem', padding: '0.35rem 0.75rem' }}
                  >
                    <Pin size={13} />
                    <span>{selectedPost.isPinned ? 'Pinned on Feed' : 'Pin to Top'}</span>
                  </button>

                  <button
                    onClick={(e) => handleToggleFlag(selectedPost.post_uid, e)}
                    className={selectedPost.isFlagged ? 'btn btn-danger' : 'btn btn-secondary'}
                    style={{ fontSize: '0.75rem', padding: '0.35rem 0.75rem' }}
                  >
                    <Flag size={13} />
                    <span>{selectedPost.isFlagged ? 'Flagged' : 'Flag Post'}</span>
                  </button>
                </div>
              </div>

              {/* High-Resolution Media Preview */}
              {selectedPost.imageUrl && (
                <div style={{ borderRadius: 'var(--radius-md)', overflow: 'hidden', border: '1px solid var(--border-subtle)', background: '#020617', maxHeight: '320px', display: 'flex', justifyContent: 'center' }}>
                  <img 
                    src={selectedPost.imageUrl} 
                    alt="media" 
                    style={{ width: '100%', height: '100%', objectFit: 'cover' }} 
                  />
                </div>
              )}

              {/* Post Copy */}
              <div style={{ background: 'rgba(15, 23, 42, 0.4)', padding: '1rem 1.25rem', borderRadius: 'var(--radius-md)', border: '1px solid var(--border-subtle)' }}>
                <p style={{ fontSize: '0.925rem', color: 'var(--text-primary)', lineHeight: 1.6, whiteSpace: 'pre-line' }}>
                  {selectedPost.content}
                </p>

                {/* Hashtags */}
                {selectedPost.hashtags && selectedPost.hashtags.length > 0 && (
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.35rem', marginTop: '0.85rem', paddingTop: '0.85rem', borderTop: '1px solid var(--border-subtle)' }}>
                    {selectedPost.hashtags.map(h => (
                      <span key={h} className="badge badge-primary" style={{ fontSize: '0.725rem' }}>
                        #{h}
                      </span>
                    ))}
                  </div>
                )}
              </div>

              {/* Action Bar (Like & Share) */}
              <div style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                padding: '0.85rem 1.25rem',
                borderRadius: 'var(--radius-md)',
                background: 'rgba(15, 23, 42, 0.6)',
                border: '1px solid var(--border-subtle)',
                flexWrap: 'wrap',
                gap: '0.75rem'
              }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                  <button
                    onClick={(e) => handleToggleLike(selectedPost.post_uid, e)}
                    className="btn btn-secondary"
                    style={{
                      color: selectedPost.isLiked ? 'var(--accent-rose)' : undefined,
                      borderColor: selectedPost.isLiked ? 'var(--accent-rose)' : undefined,
                      fontSize: '0.8rem',
                      padding: '0.4rem 0.85rem'
                    }}
                  >
                    <Heart size={15} fill={selectedPost.isLiked ? 'currentColor' : 'none'} />
                    <span>{selectedPost.likeCount} Likes</span>
                  </button>

                  <span style={{ fontSize: '0.8rem', color: 'var(--accent-cyan)', display: 'flex', alignItems: 'center', gap: '0.3rem', fontWeight: 600 }}>
                    <MessageSquare size={15} /> {selectedPost.commentCount} Comments
                  </span>

                  <span style={{ fontSize: '0.8rem', color: 'var(--accent-emerald)', display: 'flex', alignItems: 'center', gap: '0.3rem', fontWeight: 600 }}>
                    <Share2 size={15} /> {selectedPost.shareCount} Shares
                  </span>
                </div>

                {/* Direct Platform Links */}
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                  <button
                    onClick={(e) => handleShare(selectedPost.post_uid, 'whatsapp', e)}
                    className="btn-icon"
                    style={{ color: '#25D366' }}
                    title="Share to WhatsApp"
                  >
                    <Globe size={15} />
                  </button>
                  <button
                    onClick={(e) => handleShare(selectedPost.post_uid, 'twitter', e)}
                    className="btn-icon"
                    style={{ color: '#38bdf8' }}
                    title="Share to Twitter / X"
                  >
                    <ExternalLink size={15} />
                  </button>
                  <button
                    onClick={(e) => handleShare(selectedPost.post_uid, 'copy', e)}
                    className="btn btn-secondary"
                    style={{ fontSize: '0.725rem', padding: '0.35rem 0.65rem' }}
                  >
                    {copiedUid === selectedPost.post_uid ? <Check size={13} style={{ color: 'var(--accent-emerald)' }} /> : <Copy size={13} />}
                    <span>{copiedUid === selectedPost.post_uid ? 'Copied' : 'Copy Link'}</span>
                  </button>
                </div>
              </div>

              {/* Live Comment Moderation Thread */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <h4 style={{ fontSize: '0.9rem', fontWeight: 700, color: 'var(--text-primary)', display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                    <MessageCircle size={16} style={{ color: 'var(--primary)' }} />
                    Conversation Thread ({selectedPost.comments?.length || 0})
                  </h4>
                  <span style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>Real-time citizen moderation</span>
                </div>

                {/* Post Moderator Reply Input */}
                <form onSubmit={handleAddComment} style={{ display: 'flex', gap: '0.5rem' }}>
                  <input 
                    type="text" 
                    className="input" 
                    style={{ flex: 1, fontSize: '0.8rem' }}
                    placeholder="Post an official editorial note or reply to this citizen report..."
                    value={newCommentText}
                    onChange={(e) => setNewCommentText(e.target.value)}
                  />
                  <button 
                    type="submit" 
                    className="btn btn-primary"
                    style={{ fontSize: '0.8rem', padding: '0.5rem 0.9rem' }}
                    disabled={!newCommentText.trim()}
                  >
                    <Send size={14} /> Reply
                  </button>
                </form>

                {/* Comment List */}
                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem', maxHeight: '200px', overflowY: 'auto' }}>
                  {(!selectedPost.comments || selectedPost.comments.length === 0) ? (
                    <p style={{ fontSize: '0.75rem', color: 'var(--text-muted)', textAlign: 'center', padding: '1.5rem 0' }}>
                      No comments posted yet.
                    </p>
                  ) : (
                    selectedPost.comments.map(c => (
                      <div key={c.id} style={{ padding: '0.65rem 0.85rem', borderRadius: 'var(--radius-sm)', background: 'rgba(15, 23, 42, 0.4)', border: '1px solid var(--border-subtle)', display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: '0.75rem' }}>
                        <div style={{ display: 'flex', alignItems: 'flex-start', gap: '0.6rem' }}>
                          <img src={c.userAvatar} alt="avatar" style={{ width: '28px', height: '28px', borderRadius: '50%', objectFit: 'cover' }} />
                          <div>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
                              <strong style={{ fontSize: '0.775rem', color: 'var(--text-primary)' }}>{c.userName}</strong>
                              <span style={{ fontSize: '0.65rem', color: 'var(--text-muted)' }}>{c.timeAgo}</span>
                            </div>
                            <p style={{ fontSize: '0.775rem', color: 'var(--text-secondary)', marginTop: '0.15rem' }}>{c.text}</p>
                          </div>
                        </div>
                        <span style={{ fontSize: '0.7rem', color: 'var(--accent-rose)', fontWeight: 600 }}>♥ {c.likes}</span>
                      </div>
                    ))
                  )}
                </div>
              </div>
            </div>

            {/* RIGHT COLUMN: VIRALITY CHARTS & HASHTAG MANAGEMENT */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
              
              {/* Share Breakdown Donut */}
              <div className="analytics-panel" style={{ padding: '1.15rem' }}>
                <h4 style={{ fontSize: '0.9rem', fontWeight: 700, color: 'var(--text-primary)', marginBottom: '0.5rem', display: 'flex', alignItems: 'center', gap: '0.45rem' }}>
                  <PieIcon size={16} style={{ color: 'var(--accent-emerald)' }} />
                  External Share Distribution
                </h4>
                <div style={{ height: '180px', width: '100%' }}>
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie
                        data={selectedPost.shareBreakdown || []}
                        cx="50%"
                        cy="50%"
                        innerRadius={40}
                        outerRadius={65}
                        paddingAngle={4}
                        dataKey="value"
                      >
                        {(selectedPost.shareBreakdown || []).map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={entry.color} />
                        ))}
                      </Pie>
                      <Tooltip 
                        contentStyle={{
                          background: '#0f172a',
                          border: '1px solid rgba(255, 255, 255, 0.1)',
                          borderRadius: '8px',
                          color: '#f8fafc',
                          fontSize: '0.75rem'
                        }}
                      />
                    </PieChart>
                  </ResponsiveContainer>
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '0.4rem', marginTop: '0.5rem', fontSize: '0.75rem' }}>
                  {(selectedPost.shareBreakdown || []).map(item => (
                    <div key={item.name} style={{ display: 'flex', justifyContent: 'space-between', padding: '0.35rem 0.5rem', borderRadius: '4px', background: 'rgba(255,255,255,0.03)' }}>
                      <span style={{ color: 'var(--text-secondary)' }}>{item.name}</span>
                      <strong style={{ color: item.color, fontFamily: 'var(--font-mono)' }}>{item.value}</strong>
                    </div>
                  ))}
                </div>
              </div>

              {/* 24-Hour Velocity Curve */}
              <div className="analytics-panel" style={{ padding: '1.15rem' }}>
                <h4 style={{ fontSize: '0.9rem', fontWeight: 700, color: 'var(--text-primary)', marginBottom: '0.5rem', display: 'flex', alignItems: 'center', gap: '0.45rem' }}>
                  <TrendingUp size={16} style={{ color: 'var(--primary)' }} />
                  24-Hour Interaction Progression
                </h4>
                <div style={{ height: '160px', width: '100%' }}>
                  <ResponsiveContainer width="100%" height="100%">
                    <AreaChart data={selectedPost.engagementTrend || []}>
                      <XAxis dataKey="time" stroke="var(--text-muted)" fontSize={10} />
                      <YAxis stroke="var(--text-muted)" fontSize={10} />
                      <Tooltip 
                        contentStyle={{
                          background: '#0f172a',
                          border: '1px solid rgba(255, 255, 255, 0.1)',
                          borderRadius: '8px',
                          color: '#f8fafc',
                          fontSize: '0.75rem'
                        }}
                      />
                      <Area type="monotone" dataKey="likes" stroke="#6366f1" fill="#6366f1" fillOpacity={0.2} name="Likes" />
                      <Area type="monotone" dataKey="shares" stroke="#10b981" fill="#10b981" fillOpacity={0.2} name="Shares" />
                    </AreaChart>
                  </ResponsiveContainer>
                </div>
              </div>

              {/* Hashtag Moderation Box */}
              <div className="analytics-panel" style={{ padding: '1.15rem' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.6rem' }}>
                  <h4 style={{ fontSize: '0.9rem', fontWeight: 700, color: 'var(--text-primary)', display: 'flex', alignItems: 'center', gap: '0.45rem' }}>
                    <Tag size={16} style={{ color: 'var(--accent-amber)' }} />
                    Editorial Taxonomy (Max 5)
                  </h4>
                  <button
                    onClick={() => handleOpenHashtagEditor(selectedPost)}
                    className="btn btn-secondary"
                    style={{ fontSize: '0.7rem', padding: '0.2rem 0.5rem' }}
                  >
                    Edit Tags
                  </button>
                </div>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.35rem' }}>
                  {selectedPost.hashtags.map(t => (
                    <span key={t} className="badge badge-primary" style={{ fontSize: '0.725rem' }}>
                      #{t}
                    </span>
                  ))}
                </div>
              </div>

              {/* Delete Button in Modal Footer */}
              <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: 'auto', paddingTop: '0.75rem', borderTop: '1px solid var(--border-subtle)' }}>
                <button
                  onClick={() => setDeleteTarget(selectedPost)}
                  className="btn btn-danger"
                  style={{ fontSize: '0.75rem', padding: '0.4rem 0.85rem' }}
                >
                  <Trash2 size={13} /> Delete This Post
                </button>
              </div>
            </div>
          </div>
        </Modal>
      )}

      {/* ==================================================================== */}
      {/* 10. NEW COMMUNITY POST COMPOSER MODAL */}
      {/* ==================================================================== */}
      {isCreateModalOpen && (
        <Modal
          isOpen={isCreateModalOpen}
          onClose={() => setIsCreateModalOpen(false)}
          title="Compose New Citizen Broadcast / Community Post"
          size="lg"
        >
          <form onSubmit={handleCreateSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
            
            {/* Post Content */}
            <div>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.35rem' }}>
                <label style={{ fontSize: '0.75rem', fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase' }}>
                  Post Copy / Update Content *
                </label>
                <span style={{ fontSize: '0.7rem', fontFamily: 'var(--font-mono)', color: createForm.content.length > 4000 ? 'var(--accent-rose)' : 'var(--text-muted)' }}>
                  {createForm.content.length} / 5000 chars
                </span>
              </div>
              <textarea 
                rows="4"
                required
                className="textarea"
                placeholder="Share a local community update, civic observation, or breaking dispatch..."
                value={createForm.content}
                onChange={(e) => setCreateForm({ ...createForm, content: e.target.value })}
              />
            </div>

            {/* Media Image URL */}
            <div>
              <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', marginBottom: '0.35rem' }}>
                Optional Media Image URL
              </label>
              <input 
                type="url"
                className="input"
                placeholder="https://images.unsplash.com/photo-..."
                value={createForm.imageUrl}
                onChange={(e) => setCreateForm({ ...createForm, imageUrl: e.target.value })}
              />
              {createForm.imageUrl && (
                <div style={{ marginTop: '0.5rem', width: '100%', height: '140px', borderRadius: 'var(--radius-sm)', overflow: 'hidden', border: '1px solid var(--border-subtle)' }}>
                  <img src={createForm.imageUrl} alt="preview" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                </div>
              )}
            </div>

            {/* Hashtags Input & AI Generator */}
            <div>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.35rem' }}>
                <label style={{ fontSize: '0.75rem', fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase' }}>
                  Hashtags (Comma Separated, Max 5)
                </label>
                <button
                  type="button"
                  onClick={handleAiSuggestTags}
                  className="btn btn-secondary"
                  style={{ fontSize: '0.7rem', padding: '0.2rem 0.5rem', color: 'var(--accent-amber)', borderColor: 'rgba(245, 158, 11, 0.4)' }}
                >
                  <Sparkles size={12} /> AI Co-pilot Generate
                </button>
              </div>
              <input 
                type="text"
                className="input"
                placeholder="Hyderabad, TechNews, AI, Telangana"
                value={createForm.hashtags}
                onChange={(e) => setCreateForm({ ...createForm, hashtags: e.target.value })}
              />
            </div>

            {/* Attribution Checkbox */}
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem', padding: '0.75rem', borderRadius: 'var(--radius-sm)', background: 'rgba(255,255,255,0.03)', border: '1px solid var(--border-subtle)' }}>
              <input 
                type="checkbox"
                id="postAsOfficial"
                checked={createForm.postAsOfficial}
                onChange={(e) => setCreateForm({ ...createForm, postAsOfficial: e.target.checked })}
                style={{ cursor: 'pointer' }}
              />
              <label htmlFor="postAsOfficial" style={{ fontSize: '0.8rem', color: 'var(--text-primary)', cursor: 'pointer' }}>
                Broadcast as <strong>HyperNews Official Desk</strong> with Verified Anchor badge
              </label>
            </div>

            {/* Modal Actions */}
            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.6rem', paddingTop: '0.85rem', borderTop: '1px solid var(--border-subtle)' }}>
              <button 
                type="button" 
                onClick={() => setIsCreateModalOpen(false)}
                className="btn btn-secondary"
              >
                Cancel
              </button>
              <button 
                type="submit" 
                className="btn btn-primary"
              >
                <Plus size={16} /> Publish Broadcast
              </button>
            </div>
          </form>
        </Modal>
      )}

      {/* ==================================================================== */}
      {/* 11. HASHTAGS MODERATION EDITOR MODAL */}
      {/* ==================================================================== */}
      {editingHashtagsPost && (
        <Modal
          isOpen={!!editingHashtagsPost}
          onClose={() => setEditingHashtagsPost(null)}
          title={`Edit Taxonomy Hashtags • ${editingHashtagsPost.post_uid}`}
          size="md"
        >
          <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
            <p style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>
              Moderator role permission: Edit or re-classify up to 5 community hashtags to ensure algorithmic relevance and prevent spam tags.
            </p>

            <div>
              <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', marginBottom: '0.35rem' }}>
                Hashtags (Comma separated)
              </label>
              <input 
                type="text"
                className="input"
                value={tagInput}
                onChange={(e) => setTagInput(e.target.value)}
                placeholder="TechNews, Hyderabad, AI"
              />
            </div>

            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.5rem', marginTop: '0.5rem' }}>
              <button 
                onClick={() => setEditingHashtagsPost(null)}
                className="btn btn-secondary"
                style={{ fontSize: '0.8rem' }}
              >
                Cancel
              </button>
              <button 
                onClick={handleSaveHashtags}
                className="btn btn-primary"
                style={{ fontSize: '0.8rem' }}
              >
                Save Hashtags
              </button>
            </div>
          </div>
        </Modal>
      )}

      {/* ==================================================================== */}
      {/* 12. DELETE CONFIRMATION MODAL */}
      {/* ==================================================================== */}
      {deleteTarget && (
        <Modal
          isOpen={!!deleteTarget}
          onClose={() => setDeleteTarget(null)}
          title="Confirm Community Post Deletion"
          size="sm"
        >
          <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.65rem', color: 'var(--accent-rose)' }}>
              <AlertTriangle size={22} />
              <strong style={{ fontSize: '0.95rem' }}>Are you sure you want to delete this post?</strong>
            </div>

            <p style={{ fontSize: '0.825rem', color: 'var(--text-secondary)', lineHeight: 1.5 }}>
              This will permanently remove dispatch <code style={{ fontFamily: 'var(--font-mono)', color: 'var(--primary)' }}>{deleteTarget.post_uid}</code> by <strong>{deleteTarget.userName}</strong> from the citizen feed.
            </p>

            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.5rem', marginTop: '0.5rem' }}>
              <button 
                onClick={() => setDeleteTarget(null)}
                className="btn btn-secondary"
                style={{ fontSize: '0.8rem' }}
              >
                Cancel
              </button>
              <button 
                onClick={handleConfirmDelete}
                className="btn btn-danger"
                style={{ fontSize: '0.8rem' }}
              >
                Yes, Delete Post
              </button>
            </div>
          </div>
        </Modal>
      )}
    </div>
  );
}
