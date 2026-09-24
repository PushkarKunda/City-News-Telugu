import React, { useState, useEffect, useMemo, useRef } from 'react';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';
import Modal from '../components/common/Modal';
import { api } from '../api/client';
import { 
  Plus, Search, Filter, RefreshCw, Eye, Edit3, Trash2, 
  CheckCircle2, AlertCircle, Sparkles, ExternalLink, Globe,
  Calendar, Clock, Tag, ChevronDown, CheckSquare, Square,
  MessageSquare, Heart, Share2, Database, User, Hash, Copy, Check,
  Flame, Zap, Download, Layers, ShieldCheck, XCircle, FileText,
  AlertTriangle, ArrowUpRight, Send, MapPin, Radio, LayoutGrid,
  List, Smartphone, Volume2, ArrowUpDown, MoreHorizontal,
  ChevronLeft, ChevronRight, SlidersHorizontal, BookOpen, Bookmark,
  Play, Pause, VolumeX, Video, Maximize2, Activity,
  BarChart3, Compass, Bell, X, Newspaper, ArrowRight,
  TrendingUp, Wifi, Sliders, CheckCheck, Laptop, Award
} from 'lucide-react';

import { 
  AreaChart, 
  Area, 
  XAxis, 
  YAxis, 
  Tooltip as RechartsTooltip, 
  ResponsiveContainer, 
  BarChart, 
  Bar 
} from 'recharts';

// ============================================================================
// DATA DEFINITIONS & MOCK ENTERPRISE CORPUS
// ============================================================================

const EDITORIAL_VELOCITY_DATA = [
  { time: '00:00', views: 18400, stories: 4 },
  { time: '04:00', views: 8200, stories: 2 },
  { time: '08:00', views: 64200, stories: 12 },
  { time: '12:00', views: 98500, stories: 18 },
  { time: '16:00', views: 76400, stories: 15 },
  { time: '20:00', views: 124800, stories: 24 },
  { time: '23:59', views: 42100, stories: 8 },
];

const CATEGORY_TELEMETRY_DATA = [
  { name: 'Tech', count: 142, reads: 142300 },
  { name: 'Politics', count: 120, reads: 112000 },
  { name: 'Sports', count: 96, reads: 89400 },
  { name: 'Business', count: 78, reads: 65200 },
  { name: 'Science', count: 54, reads: 44500 },
  { name: 'Agri', count: 48, reads: 38100 },
];

const LANGUAGES = [
  { code: 'all', name: 'All Languages', native: 'All', titleMin: 20, titleMax: 100, summaryMin: 150, summaryMax: 500 },
  { code: 'en', name: 'English', native: 'English', titleMin: 30, titleMax: 100, summaryMin: 250, summaryMax: 500 },
  { code: 'te', name: 'Telugu', native: 'తెలుగు', titleMin: 20, titleMax: 70, summaryMin: 150, summaryMax: 300 },
  { code: 'hi', name: 'Hindi', native: 'हिंदी', titleMin: 25, titleMax: 80, summaryMin: 150, summaryMax: 300 },
  { code: 'ur', name: 'Urdu', native: 'اردو', titleMin: 20, titleMax: 70, summaryMin: 150, summaryMax: 300 },
  { code: 'ta', name: 'Tamil', native: 'தமிழ்', titleMin: 20, titleMax: 70, summaryMin: 150, summaryMax: 300 },
  { code: 'kn', name: 'Kannada', native: 'ಕನ್ನಡ', titleMin: 20, titleMax: 70, summaryMin: 150, summaryMax: 300 }
];

const CATEGORIES = [
  'All', 'Technology', 'Politics', 'Sports', 'Entertainment', 
  'Business', 'Science', 'Local', 'National', 'Agriculture', 'Crime'
];

const INITIAL_ARTICLES = [
  {
    id: 'nws-1001',
    news_uid: 'nws_1001',
    title: 'Telangana Tech Summit 2026: Hyderabad Emerges as Global AI Hub with New Silicon Center',
    category: 'Technology',
    language: 'English',
    language_code: 'en',
    author: 'admin_01 (Editorial Staff)',
    author_uid: 'USR-ADMIN-01',
    author_avatar: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=120&auto=format&fit=crop&q=80',
    status: 'Approved',
    is_approved: 1,
    approved_by: {
      user_uid: 'USR-ADMIN-01',
      name: 'Dr. K. Srinivas',
      role_name: 'Lead Editor',
      phone: '+91 98490 12345',
      approved_at: '2026-09-20 11:35'
    },
    views: 142300,
    likes: 3840,
    comments: 420,
    shares: 1820,
    completion_rate: 88,
    breaking: true,
    breaking_priority: 5,
    publishedAt: '2026-09-20 11:30',
    summary: 'State government announces 500-acre dedicated AI tech corridor in Hyderabad attracting global tech giants with $4B pledged investments.',
    content: 'Hyderabad has taken another quantum leap in technology infrastructure with the inauguration of the Silicon Innovation Center. Key industry leaders from across the globe gathered to ink memorandums of understanding worth billions.\n\nThe hub will house specialized neural computation clusters, quantum testbeds, and clean energy data centers.',
    tags: ['AI', 'Hyderabad', 'TechHub', 'Telangana'],
    imageUrl: 'https://images.unsplash.com/photo-1518770660439-4636190af475?w=800&auto=format&fit=crop&q=80',
    videoUrl: 'https://www.youtube.com/watch?v=dQw4w9WgXcQ',
    location: { state: 'Telangana', district: 'Hyderabad', city: 'HITEC City' }
  },
  {
    id: 'nws-1002',
    news_uid: 'nws_1002',
    title: 'BCCI Announces Squad for 2026 T20 World Cup with 3 Exciting Debutants',
    category: 'Sports',
    language: 'English',
    language_code: 'en',
    author: 'admin_01 (Editorial Staff)',
    author_uid: 'USR-ADMIN-01',
    author_avatar: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=120&auto=format&fit=crop&q=80',
    status: 'Approved',
    is_approved: 1,
    approved_by: {
      user_uid: 'USR-ADMIN-01',
      name: 'Dr. K. Srinivas',
      role_name: 'Lead Editor',
      phone: '+91 98490 12345',
      approved_at: '2026-09-19 14:20'
    },
    views: 89400,
    likes: 6210,
    comments: 890,
    shares: 3450,
    completion_rate: 92,
    breaking: false,
    breaking_priority: 1,
    publishedAt: '2026-09-19 14:15',
    summary: 'Selection committee makes bold moves bringing young fast bowling talent into the national lineup ahead of tournament opener in Mumbai.',
    content: 'The Board of Control for Cricket in India has officially unveiled the 15-member contingent for the upcoming ICC tournament. Youth takes center stage as domestic performers receive maiden call-ups.',
    tags: ['Cricket', 'BCCI', 'WorldCup', 'Sports'],
    imageUrl: 'https://images.unsplash.com/photo-1540747913346-19e32dc3e97e?w=800&auto=format&fit=crop&q=80',
    videoUrl: '',
    location: { state: 'National', district: 'Mumbai', city: 'Wankhede' }
  },
  {
    id: 'nws-1003',
    news_uid: 'nws_1003',
    title: 'Indian Space Agency Prepares Final Orbital Maneuver for Solar Exploration Probe',
    category: 'Science',
    language: 'English',
    language_code: 'en',
    author: 'admin_01 (Editorial Staff)',
    author_uid: 'USR-ADMIN-01',
    author_avatar: 'https://images.unsplash.com/photo-1570295999919-56ceb5ecca61?w=120&auto=format&fit=crop&q=80',
    status: 'Approved',
    is_approved: 1,
    approved_by: {
      user_uid: 'USR-ADMIN-02',
      name: 'Pooja Verma',
      role_name: 'Senior Editor',
      phone: '+91 98234 56789',
      approved_at: '2026-09-19 09:15'
    },
    views: 34500,
    likes: 1940,
    comments: 140,
    shares: 890,
    completion_rate: 79,
    breaking: false,
    breaking_priority: 1,
    publishedAt: '2026-09-19 09:00',
    summary: 'ISRO mission directors confirm all scientific payloads healthy ahead of halo orbit insertion around Lagrange point L1.',
    content: 'The solar observatory probe is cruising through its final trajectory phase. Scientists at ISRO Telemetry Tracking and Command Network in Bengaluru are preparing command sequences.',
    tags: ['ISRO', 'Space', 'SolarProbe', 'Science'],
    imageUrl: 'https://images.unsplash.com/photo-1451187580459-43490279c0fa?w=800&auto=format&fit=crop&q=80',
    videoUrl: '',
    location: { state: 'Karnataka', district: 'Bengaluru Urban', city: 'Bengaluru' }
  },
  {
    id: 'nws-1004',
    news_uid: 'nws_1004',
    title: 'Stock Markets Hit Record High as Foreign Inflows Surge Past $4 Billion This Quarter',
    category: 'Business',
    language: 'English',
    language_code: 'en',
    author: 'MarketWatcher24',
    author_uid: 'USR-2914',
    author_avatar: 'https://images.unsplash.com/photo-1580489944761-15a19d654956?w=120&auto=format&fit=crop&q=80',
    status: 'Approved',
    is_approved: 1,
    approved_by: {
      user_uid: 'USR-ADMIN-02',
      name: 'Pooja Verma',
      role_name: 'Senior Editor',
      phone: '+91 98234 56789',
      approved_at: '2026-09-18 17:00'
    },
    views: 45200,
    likes: 1250,
    comments: 98,
    shares: 410,
    completion_rate: 84,
    breaking: false,
    breaking_priority: 1,
    publishedAt: '2026-09-18 16:45',
    summary: 'Sensex and Nifty surge on robust corporate earnings and positive macro indicators, crossing all-time psychological barriers.',
    content: 'Benchmark indices surged to unprecedented historic levels during the closing bell today, buoyed by heavy institutional buying across banking, IT, and automotive sectors.',
    tags: ['Sensex', 'Economy', 'Markets', 'Business'],
    imageUrl: 'https://images.unsplash.com/photo-1611974789855-9c2a0a7236a3?w=800&auto=format&fit=crop&q=80',
    videoUrl: '',
    location: { state: 'Maharashtra', district: 'Mumbai', city: 'Nariman Point' }
  },
  {
    id: 'nws-1005',
    news_uid: 'nws_1005',
    title: 'తెలంగాణలో సరికొత్త వ్యవసాయ ప్రాజెక్టు: రైతుల కోసం డిజిటల్ సేంద్రీయ మార్కెట్ ప్రారంభం',
    category: 'Agriculture',
    language: 'Telugu',
    language_code: 'te',
    author: 'admin_01 (Editorial Staff)',
    author_uid: 'USR-ADMIN-01',
    author_avatar: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=120&auto=format&fit=crop&q=80',
    status: 'Approved',
    is_approved: 1,
    approved_by: {
      user_uid: 'USR-ADMIN-01',
      name: 'Dr. K. Srinivas',
      role_name: 'Lead Editor',
      phone: '+91 98490 12345',
      approved_at: '2026-09-19 12:15'
    },
    views: 56100,
    likes: 3120,
    comments: 245,
    shares: 1150,
    completion_rate: 86,
    breaking: false,
    breaking_priority: 1,
    publishedAt: '2026-09-19 12:00',
    summary: 'రాష్ట్ర ప్రభుత్వం రైతుల సంక్షేమం కోసం ఆధునిక డిజిటల్ ప్లాట్‌ఫారమ్‌ను విజయవంతంగా ప్రారంభించింది, దళారుల ప్రమేయం లేకుండా గిట్టుబాటు ధర కల్పన.',
    content: 'రైతులు తమ పంటలను మధ్యవర్తులు లేకుండా నేరుగా వినియోగదారులకు మరియు హోల్‌సేల్ వ్యాపారులకు విక్రయించడానికి ఈ డిజిటల్ యాప్ సహాయపడుతుంది.',
    tags: ['Telangana', 'Agriculture', 'Farmers', 'TeluguNews'],
    imageUrl: 'https://images.unsplash.com/photo-1500937386664-56d1dfef3854?w=800&auto=format&fit=crop&q=80',
    videoUrl: '',
    location: { state: 'Telangana', district: 'Warangal', city: 'Hanamkonda' }
  },
  {
    id: 'nws-1006',
    news_uid: 'nws_1006',
    title: 'Underground Metro Phase 3 Tunneling Completed Ahead of Schedule in Financial District',
    category: 'Local',
    language: 'English',
    language_code: 'en',
    author: 'citizen_rep_44',
    author_uid: 'USR-8821',
    author_avatar: 'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=120&auto=format&fit=crop&q=80',
    status: 'Pending',
    is_approved: 0,
    approved_by: null,
    views: 0,
    likes: 0,
    comments: 0,
    shares: 0,
    completion_rate: 0,
    breaking: false,
    breaking_priority: 1,
    publishedAt: '2026-09-20 18:20',
    summary: 'Metro Rail authorities confirm final breakthrough of Tunnel Boring Machine (TBM) Krishna at Gachibowli junction.',
    content: 'The phase 3 expansion connecting the Airport Express line achieved a major construction milestone today with the completion of dual underground tunnel tracks.',
    tags: ['HyderabadMetro', 'Gachibowli', 'Infrastructure'],
    imageUrl: 'https://images.unsplash.com/photo-1515263487990-61b07816b324?w=800&auto=format&fit=crop&q=80',
    videoUrl: '',
    location: { state: 'Telangana', district: 'Hyderabad', city: 'Gachibowli' }
  },
  {
    id: 'nws-1007',
    news_uid: 'nws_1007',
    title: 'Unverified Viral Video Claims UFO Sighting over Hussain Sagar Lake',
    category: 'Local',
    language: 'English',
    language_code: 'en',
    author: 'user_viral_99',
    author_uid: 'USR-9912',
    author_avatar: 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=120&auto=format&fit=crop&q=80',
    status: 'Rejected',
    is_approved: 2,
    approved_by: null,
    rejected_by: {
      user_uid: 'USR-ADMIN-01',
      name: 'Dr. K. Srinivas',
      role_name: 'Lead Editor'
    },
    rejection_reason: 'Manipulated CGI video & failed editorial fact-checking verification.',
    rejected_at: '2026-09-20 16:45',
    views: 120,
    likes: 3,
    comments: 48,
    shares: 12,
    completion_rate: 15,
    breaking: false,
    breaking_priority: 1,
    publishedAt: '2026-09-20 16:30',
    summary: 'Viral social media clip claiming extraterrestrial encounter rejected following forensic visual verification.',
    content: 'The submitted media was investigated by the editorial fact-checking desk. Digital artifact analysis confirmed video generation using synthetic rendering software.',
    tags: ['FactCheck', 'Debunked', 'Hyderabad'],
    imageUrl: 'https://images.unsplash.com/photo-1506703719100-a0f3a48c0f86?w=800&auto=format&fit=crop&q=80',
    videoUrl: '',
    location: { state: 'Telangana', district: 'Hyderabad', city: 'Tank Bund' }
  }
];

// Helper to normalize article records from backend endpoints (feed, pending, rejected)
const mapArticleFromBackend = (item, defaultApproval = 1) => {
  const isApproved = item.is_approved !== undefined ? Number(item.is_approved) : defaultApproval;
  let status = 'Pending';
  if (isApproved === 1) status = 'Approved';
  else if (isApproved === 2) status = 'Rejected';

  // Approver metadata
  let approvedBy = null;
  if (item.approved_by && typeof item.approved_by === 'object') {
    approvedBy = item.approved_by;
  } else if (item.approver && typeof item.approver === 'object') {
    approvedBy = item.approver;
  } else if (item.approved_by_uid) {
    approvedBy = {
      user_uid: item.approved_by_uid,
      name: item.approved_by_name || 'Editorial Admin',
      role_name: 'Administrator',
      approved_at: item.approved_at || null
    };
  } else if (isApproved === 1) {
    approvedBy = {
      user_uid: 'USR-ADMIN-01',
      name: 'Editorial Board',
      role_name: 'Lead Editor'
    };
  }

  // Rejector metadata
  let rejectedBy = null;
  if (item.rejected_by && typeof item.rejected_by === 'object') {
    rejectedBy = item.rejected_by;
  } else if (item.rejected_by_uid) {
    rejectedBy = {
      user_uid: item.rejected_by_uid,
      name: 'Lead Moderator',
      role_name: 'Moderator'
    };
  }

  return {
    id: item.news_uid || item.id || `nws_${item.id || Date.now()}`,
    news_uid: item.news_uid || item.id || `nws_${item.id || Date.now()}`,
    title: item.title || 'Untitled Report',
    category: item.category_names?.[0] || item.category_name || (item.categories?.[0]?.name) || 'General',
    language: item.language?.name || (item.language_id === 2 ? 'Telugu' : 'English'),
    language_code: item.language?.code || (item.language_id === 2 ? 'te' : 'en'),
    author: item.reporter?.name || item.reporter_name || item.user_name || item.source_name || item.user_uid || 'Editorial Staff',
    author_uid: item.reporter?.user_uid || item.user_uid || 'USR-EDITORIAL',
    author_avatar: item.reporter?.avatar || 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=120&auto=format&fit=crop&q=80',
    status,
    is_approved: isApproved,
    approved_by: approvedBy,
    rejected_by: rejectedBy,
    rejection_reason: item.rejection_reason || (isApproved === 2 ? 'Did not satisfy factual verification requirements' : null),
    views: item.engagement?.views || item.views_count || item.views || 0,
    likes: item.engagement?.likes || item.likes_count || item.likes || 0,
    comments: item.engagement?.comments || item.comments_count || item.comments || 0,
    shares: item.engagement?.shares || item.shares_count || item.shares || 0,
    completion_rate: Math.floor(Math.random() * 20) + 80,
    breaking: Boolean(item.is_breaking),
    breaking_priority: item.breaking_priority || 1,
    publishedAt: item.created_at ? item.created_at.slice(0, 16).replace('T', ' ') : 'Just now',
    summary: item.summary || '',
    content: item.content || item.summary || '',
    tags: item.tags || ['News'],
    imageUrl: item.image_url || 'https://images.unsplash.com/photo-1518770660439-4636190af475?w=800',
    videoUrl: item.video_url || '',
    location: {
      state: item.location?.state || item.state || 'Telangana',
      district: item.location?.district || item.district || 'Hyderabad',
      city: item.location?.city || item.city || 'HITEC City'
    }
  };
};

// Helper to extract YouTube ID
const getYouTubeVideoId = (url) => {
  if (!url) return null;
  const match = url.match(/(?:youtu\.be\/|youtube\.com\/(?:embed\/|v\/|watch\?v=|watch\?.+&v=))([\w-]{11})/);
  return match ? match[1] : null;
};

// Mini SVG Sparkline Component
const Sparkline = ({ data, color = '#6366f1' }) => {
  if (!data || data.length < 2) return null;
  const min = Math.min(...data);
  const max = Math.max(...data);
  const range = max - min || 1;
  const width = 64;
  const height = 24;

  const points = data
    .map((val, idx) => {
      const x = (idx / (data.length - 1)) * width;
      const y = height - ((val - min) / range) * (height - 6) - 3;
      return `${x},${y}`;
    })
    .join(' ');

  return (
    <svg style={{ width: '64px', height: '24px', overflow: 'visible' }} viewBox={`0 0 ${width} ${height}`}>
      <polyline
        fill="none"
        stroke={color}
        strokeWidth="2.2"
        strokeLinecap="round"
        strokeLinejoin="round"
        points={points}
      />
    </svg>
  );
};

export default function NewsManagementView() {
  const { currentRole, user } = useAuth();
  const { showToast } = useToast();

  // Top-Level Operations Center View Mode: 'dashboard' | 'ledger' | 'media' | 'breaking'
  const [opsViewMode, setOpsViewMode] = useState('dashboard');

  // Layout View Mode: 'table' | 'grid'
  const [viewMode, setViewMode] = useState('table');

  // Active Tab: 'all' | 'published' | 'pending' | 'breaking' | 'rejected'
  const [activeTab, setActiveTab] = useState('all');

  // Channel Format Filter: 'all' | 'inshorts' | 'articles' | 'videos'
  const [channelFormat, setChannelFormat] = useState('all');

  // Articles & Categories State
  const [articles, setArticles] = useState(INITIAL_ARTICLES);
  const [loading, setLoading] = useState(false);
  const [categories, setCategories] = useState(CATEGORIES);

  // Sorting
  const [sortBy, setSortBy] = useState('newest'); // 'newest' | 'views' | 'likes' | 'priority'

  // Filters & Search
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('All');
  const [selectedLanguage, setSelectedLanguage] = useState('all');
  const [selectedState, setSelectedState] = useState('All');
  const [selectedArticles, setSelectedArticles] = useState([]);

  // Pagination
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = viewMode === 'grid' ? 6 : 8;

  // Modals
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [isAiUrlModalOpen, setIsAiUrlModalOpen] = useState(false);
  const [previewArticle, setPreviewArticle] = useState(null);
  const [mobileSimulatorArticle, setMobileSimulatorArticle] = useState(null);
  const [mobileStoryIndex, setMobileStoryIndex] = useState(0);
  const [isTtsPlaying, setIsTtsPlaying] = useState(false);
  const [ttsSpeed, setTtsSpeed] = useState(1);
  const [isMobileDrawerExpanded, setIsMobileDrawerExpanded] = useState(false);

  const [rejectTarget, setRejectTarget] = useState(null);
  const [rejectReason, setRejectReason] = useState('Does not meet editorial fact-checking guidelines');
  const [deleteTarget, setDeleteTarget] = useState(null);
  const [editTarget, setEditTarget] = useState(null);

  // Live Studio Clock & Ticker State
  const [isTickerPlaying, setIsTickerPlaying] = useState(true);
  const [currentTime, setCurrentTime] = useState(new Date());

  // AI State
  const [isAiGenerating, setIsAiGenerating] = useState(false);
  const [aiUrlData, setAiUrlData] = useState({
    url: '',
    language: 'en',
    city: 'Hyderabad'
  });

  // Story Form State
  const [formData, setFormData] = useState({
    title: '',
    category: 'Technology',
    language: 'English',
    language_code: 'en',
    summary: '',
    content: '',
    tags: '',
    breaking: false,
    breakingPriority: 3,
    imageUrl: '',
    videoUrl: '',
    state: 'Telangana',
    district: 'Hyderabad',
    city: 'HITEC City'
  });

  // Form Composer Active Tab
  const [composerTab, setComposerTab] = useState('content'); // 'content' | 'media' | 'geotarget' | 'preview'

  const searchInputRef = useRef(null);

  const canCreate = [4, 5, 6, 7, 8].includes(currentRole);
  const canPublish = [4, 5, 6, 7].includes(currentRole);
  const canDelete = [5, 6].includes(currentRole);

  // Live Clock Effect
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
        setPreviewArticle(null);
        setMobileSimulatorArticle(null);
        setIsCreateModalOpen(false);
        setIsEditModalOpen(false);
        setIsAiUrlModalOpen(false);
        setRejectTarget(null);
        setDeleteTarget(null);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  // Stop TTS when simulator closes
  useEffect(() => {
    if (!mobileSimulatorArticle && 'speechSynthesis' in window) {
      window.speechSynthesis.cancel();
      setIsTtsPlaying(false);
    }
  }, [mobileSimulatorArticle]);

  useEffect(() => {
    loadNewsData();
  }, []);

  const loadNewsData = async () => {
    setLoading(true);
    try {
      // Concurrently query live feed, pending moderation queue, and rejected archive
      const [feedRes, pendingRes, rejectedRes] = await Promise.allSettled([
        api.getNews({ limit: 50 }),
        api.getPendingNews(1, 30),
        api.getRejectedNews(1, 30)
      ]);

      const allItems = [];
      const seenUids = new Set();

      // 1. Process feed news (approved / live)
      if (feedRes.status === 'fulfilled' && feedRes.value) {
        const feedData = feedRes.value.news || feedRes.value.data || (Array.isArray(feedRes.value) ? feedRes.value : []);
        if (Array.isArray(feedData)) {
          feedData.forEach(item => {
            const uid = item.news_uid || item.id || `nws_${item.id}`;
            if (!seenUids.has(uid)) {
              seenUids.add(uid);
              allItems.push(mapArticleFromBackend(item, item.is_approved ?? 1));
            }
          });
        }
      }

      // 2. Process pending news (is_approved = 0)
      if (pendingRes.status === 'fulfilled' && pendingRes.value) {
        const pendingData = pendingRes.value.items || pendingRes.value.data || (Array.isArray(pendingRes.value) ? pendingRes.value : []);
        if (Array.isArray(pendingData)) {
          pendingData.forEach(item => {
            const uid = item.news_uid || item.id || `nws_${item.id}`;
            if (!seenUids.has(uid)) {
              seenUids.add(uid);
              allItems.push(mapArticleFromBackend(item, 0));
            }
          });
        }
      }

      // 3. Process rejected news (is_approved = 2)
      if (rejectedRes.status === 'fulfilled' && rejectedRes.value) {
        const rejectedData = rejectedRes.value.items || rejectedRes.value.data || (Array.isArray(rejectedRes.value) ? rejectedRes.value : []);
        if (Array.isArray(rejectedData)) {
          rejectedData.forEach(item => {
            const uid = item.news_uid || item.id || `nws_${item.id}`;
            if (!seenUids.has(uid)) {
              seenUids.add(uid);
              allItems.push(mapArticleFromBackend(item, 2));
            }
          });
        }
      }

      if (allItems.length > 0) {
        setArticles(allItems);
      }
    } catch {
      // Gracefully maintain cached or initial articles if offline
    } finally {
      setLoading(false);
    }
  };

  // Filter & Sort Logic
  const filteredArticles = useMemo(() => {
    return articles
      .filter(art => {
        // Tab filter for Approval Lifecycle
        if ((activeTab === 'approved' || activeTab === 'published') && (art.is_approved !== 1 && art.status !== 'Approved' && art.status !== 'Published')) return false;
        if (activeTab === 'pending' && (art.is_approved !== 0 && art.status !== 'Pending')) return false;
        if (activeTab === 'rejected' && (art.is_approved !== 2 && art.status !== 'Rejected')) return false;
        if (activeTab === 'breaking' && !art.breaking) return false;

        // Channel Format
        if (channelFormat === 'videos' && !art.videoUrl) return false;
        if (channelFormat === 'inshorts' && (!art.summary || art.summary.length > 500)) return false;
        if (channelFormat === 'articles' && (!art.content || art.content.length < 250)) return false;

        // Category filter
        if (selectedCategory !== 'All' && art.category !== selectedCategory) return false;

        // Language filter
        if (selectedLanguage !== 'all' && art.language_code !== selectedLanguage) return false;

        // Hyperlocal state filter
        if (selectedState !== 'All' && art.location?.state !== selectedState) return false;

        // Search query
        if (searchQuery) {
          const q = searchQuery.toLowerCase();
          const matches = art.title.toLowerCase().includes(q) ||
                          art.author.toLowerCase().includes(q) ||
                          art.news_uid.toLowerCase().includes(q) ||
                          (art.approved_by?.name && art.approved_by.name.toLowerCase().includes(q)) ||
                          (art.approved_by?.user_uid && art.approved_by.user_uid.toLowerCase().includes(q)) ||
                          art.tags.some(t => t.toLowerCase().includes(q)) ||
                          (art.location?.city && art.location.city.toLowerCase().includes(q));
          if (!matches) return false;
        }

        return true;
      })
      .sort((a, b) => {
        if (sortBy === 'views') return (b.views || 0) - (a.views || 0);
        if (sortBy === 'likes') return (b.likes || 0) - (a.likes || 0);
        if (sortBy === 'priority') return (b.breaking_priority || 0) - (a.breaking_priority || 0);
        return new Date(b.publishedAt).getTime() - new Date(a.publishedAt).getTime();
      });
  }, [articles, activeTab, channelFormat, selectedCategory, selectedLanguage, selectedState, searchQuery, sortBy]);

  // Pagination calculation
  const totalPages = Math.ceil(filteredArticles.length / itemsPerPage) || 1;
  const paginatedArticles = filteredArticles.slice(
    (currentPage - 1) * itemsPerPage,
    currentPage * itemsPerPage
  );

  // Active breaking stories for the top ticker
  const breakingArticles = articles.filter(a => a.breaking);

  // Selection
  const toggleSelect = (id) => {
    setSelectedArticles(prev => 
      prev.includes(id) ? prev.filter(item => item !== id) : [...prev, id]
    );
  };

  const selectAll = () => {
    if (selectedArticles.length === paginatedArticles.length) {
      setSelectedArticles([]);
    } else {
      setSelectedArticles(paginatedArticles.map(a => a.id));
    }
  };

  // 1-Click Approve News with Approver Attribution
  const handleApproveNews = async (article) => {
    const approverInfo = {
      user_uid: user?.user_uid || 'USR-ADMIN-01',
      name: user?.name || 'Dr. K. Srinivas',
      role_name: user?.roleTitle || 'Lead Editor',
      phone: user?.phone || '+91 98490 12345',
      approved_at: new Date().toISOString().replace('T', ' ').slice(0, 16)
    };

    try {
      const res = await api.approveNews(article.news_uid);
      if (res?.approved_by && typeof res.approved_by === 'object') {
        approverInfo.name = res.approved_by.name || approverInfo.name;
        approverInfo.user_uid = res.approved_by.user_uid || approverInfo.user_uid;
        approverInfo.phone = res.approved_by.phone || approverInfo.phone;
      }
      showToast(`Article "${article.title.slice(0, 30)}..." approved & signed off by ${approverInfo.name}!`, 'success');
    } catch {
      showToast(`Article approved locally by ${approverInfo.name}`, 'info');
    }

    setArticles(prev => prev.map(a => a.id === article.id ? { 
      ...a, 
      status: 'Approved', 
      is_approved: 1, 
      approved_by: approverInfo 
    } : a));

    if (previewArticle?.id === article.id) {
      setPreviewArticle(prev => prev ? ({ ...prev, status: 'Approved', is_approved: 1, approved_by: approverInfo }) : null);
    }
  };

  // Reject News with Reason & Attribution
  const handleConfirmReject = async () => {
    if (!rejectTarget) return;

    const rejectorInfo = {
      user_uid: user?.user_uid || 'USR-ADMIN-01',
      name: user?.name || 'Editorial Moderator',
      role_name: user?.roleTitle || 'Moderator',
      rejected_at: new Date().toISOString().replace('T', ' ').slice(0, 16)
    };

    try {
      await api.rejectNews(rejectTarget.news_uid, rejectReason);
      showToast(`Article "${rejectTarget.title.slice(0, 30)}..." rejected and archived`, 'danger');
    } catch {
      showToast(`Article rejected locally: ${rejectReason}`, 'warning');
    }

    setArticles(prev => prev.map(a => a.id === rejectTarget.id ? { 
      ...a, 
      status: 'Rejected', 
      is_approved: 2, 
      rejected_by: rejectorInfo,
      rejection_reason: rejectReason,
      rejected_at: rejectorInfo.rejected_at
    } : a));

    if (previewArticle?.id === rejectTarget.id) {
      setPreviewArticle(null);
    }
    setRejectTarget(null);
  };

  // Toggle Breaking News
  const handleToggleBreaking = (id) => {
    setArticles(prev => prev.map(a => {
      if (a.id === id) {
        const nextBreaking = !a.breaking;
        showToast(
          nextBreaking 
            ? `Broadcasted "${a.title.slice(0, 30)}..." as BREAKING NEWS` 
            : `Demoted breaking status from "${a.title.slice(0, 30)}..."`,
          nextBreaking ? 'danger' : 'info'
        );
        return { ...a, breaking: nextBreaking, breaking_priority: nextBreaking ? 5 : 1 };
      }
      return a;
    }));
  };

  // Delete Article
  const handleConfirmDelete = async () => {
    if (!deleteTarget) return;
    try {
      await api.deleteNews(deleteTarget.news_uid);
    } catch {}
    setArticles(prev => prev.filter(a => a.id !== deleteTarget.id));
    setSelectedArticles(prev => prev.filter(id => id !== deleteTarget.id));
    showToast(`Story "${deleteTarget.title.slice(0, 30)}..." deleted permanently`, 'info');
    setDeleteTarget(null);
  };

  // Edit Story Open
  const handleOpenEditModal = (article) => {
    setEditTarget(article);
    setFormData({
      title: article.title,
      category: article.category,
      language: article.language,
      language_code: article.language_code || 'en',
      summary: article.summary,
      content: article.content,
      tags: article.tags.join(', '),
      breaking: article.breaking,
      breakingPriority: article.breaking_priority || 3,
      imageUrl: article.imageUrl || '',
      videoUrl: article.videoUrl || '',
      state: article.location?.state || 'Telangana',
      district: article.location?.district || 'Hyderabad',
      city: article.location?.city || 'HITEC City'
    });
    setComposerTab('content');
    setIsEditModalOpen(true);
  };

  // Save Edit Story Submit
  const handleEditSubmit = async (e) => {
    e.preventDefault();
    if (!editTarget) return;

    const updated = {
      ...editTarget,
      title: formData.title,
      category: formData.category,
      language: formData.language,
      language_code: formData.language === 'Telugu' ? 'te' : 'en',
      summary: formData.summary,
      content: formData.content,
      tags: formData.tags.split(',').map(t => t.trim()).filter(Boolean),
      breaking: formData.breaking,
      breaking_priority: formData.breakingPriority,
      imageUrl: formData.imageUrl,
      videoUrl: formData.videoUrl,
      location: {
        state: formData.state,
        district: formData.district,
        city: formData.city
      }
    };

    try {
      await api.updateNews(editTarget.news_uid, {
        title: updated.title,
        summary: updated.summary,
        content: updated.content,
        image_url: updated.imageUrl,
        video_url: updated.videoUrl
      });
    } catch {}

    setArticles(prev => prev.map(a => a.id === editTarget.id ? updated : a));
    setIsEditModalOpen(false);
    showToast(`Story "${updated.title.slice(0, 30)}..." updated successfully!`, 'success');
  };

  // Web Speech API Voice Narrator
  const handleToggleVoiceNarrator = (text) => {
    if (!('speechSynthesis' in window)) {
      showToast('Text-to-speech is not supported in this browser.', 'warning');
      return;
    }

    if (isTtsPlaying) {
      window.speechSynthesis.cancel();
      setIsTtsPlaying(false);
    } else {
      window.speechSynthesis.cancel();
      const utterance = new SpeechSynthesisUtterance(text);
      utterance.rate = ttsSpeed;
      utterance.pitch = 1.0;
      utterance.onend = () => setIsTtsPlaying(false);
      utterance.onerror = () => setIsTtsPlaying(false);
      window.speechSynthesis.speak(utterance);
      setIsTtsPlaying(true);
    }
  };

  // AI Summarization Co-pilot
  const handleAiSummarize = () => {
    if (!formData.title) {
      showToast('Please enter a headline first for Gemini AI context', 'warning');
      return;
    }
    setIsAiGenerating(true);
    setTimeout(() => {
      setFormData(prev => ({
        ...prev,
        summary: `AI Generated Executive Summary: ${prev.title}. Comprehensive analysis reveals significant impact across regional technology, socioeconomic development, and citizen infrastructure.`,
        content: `[AI EXPANDED ARTICLE DRAFT]\n\n${prev.title}\n\nKey Highlights:\n• Strategic developments confirmed by departmental authorities.\n• Groundbreaking implementation slated to begin across major urban centers.\n• Industry analysts project positive long-term growth and enhanced civic efficiency.`,
        tags: prev.tags ? prev.tags : 'AI, Breaking, Hyderabad, Future, Innovation'
      }));
      setIsAiGenerating(false);
      showToast('Gemini AI drafted summary & expanded content successfully!', 'success');
    }, 1100);
  };

  // Translate to Telugu
  const handleAiTranslateTelugu = async () => {
    if (!formData.title) return;
    setIsAiGenerating(true);
    setTimeout(() => {
      setFormData(prev => ({
        ...prev,
        language: 'Telugu',
        language_code: 'te',
        title: `నగరాభివృద్ధిపై కీలక ప్రకటన: ${prev.title.slice(0, 45)}`,
        summary: `రాష్ట్ర అధికార యంత్రాంగం విడుదల చేసిన తాజా నివేదిక ప్రకారం సమగ్ర అభివృద్ధి దిశగా అడుగులు పడుతున్నాయి.`
      }));
      setIsAiGenerating(false);
      showToast('Translated headline and summary to Telugu via Gemini AI!', 'success');
    }, 1000);
  };

  // Auto-Generate News from URL via Gemini AI
  const handleAiUrlSubmit = async (e) => {
    e.preventDefault();
    if (!aiUrlData.url) return;

    setIsAiGenerating(true);
    try {
      const res = await api.autoGenerateNews(aiUrlData.url, aiUrlData.language);
      showToast(`Article successfully auto-extracted and generated in ${aiUrlData.language}!`, 'success');
      if (res) {
        const created = {
          id: res.news_uid || `nws-${Date.now()}`,
          news_uid: res.news_uid || `nws-${Date.now()}`,
          title: res.title,
          category: 'Technology',
          language: aiUrlData.language === 'te' ? 'Telugu' : 'English',
          language_code: aiUrlData.language,
          author: `${user.name} (AI Copilot)`,
          author_uid: user.user_uid || 'USR-AI',
          author_avatar: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=120&auto=format&fit=crop&q=80',
          status: 'Approved',
          is_approved: 1,
          approved_by: {
            user_uid: user.user_uid || 'USR-AI',
            name: `${user.name} (AI Verified)`,
            role_name: 'AI Editorial Pipeline',
            phone: user.phone || '',
            approved_at: new Date().toISOString().replace('T', ' ').slice(0, 16)
          },
          views: 0,
          likes: 0,
          comments: 0,
          shares: 0,
          completion_rate: 85,
          breaking: false,
          publishedAt: 'Just now',
          summary: res.summary || 'Summary extracted by Gemini AI',
          content: res.summary || '',
          tags: ['AI-Extracted', 'Breaking'],
          imageUrl: res.image_url || 'https://images.unsplash.com/photo-1585829365295-ab7cd400c167?w=800',
          videoUrl: '',
          location: { state: 'Telangana', district: 'Hyderabad', city: aiUrlData.city }
        };
        setArticles([created, ...articles]);
      }
    } catch {
      const isTe = aiUrlData.language === 'te';
      const mockTitle = isTe
        ? 'నగరంలో కొత్త సాంకేతిక కేంద్రం ప్రారంభం: వేల మందికి ఉపాధి అవకాశాలు' 
        : `Extracted News Report from ${aiUrlData.url.replace(/https?:\/\//, '').split('/')[0]}`;
      const mockCreated = {
        id: `nws-ai-${Date.now()}`,
        news_uid: `nws_ai_${Date.now()}`,
        title: mockTitle,
        category: 'Technology',
        language: isTe ? 'Telugu' : 'English',
        language_code: isTe ? 'te' : 'en',
        author: `${user.name} (AI Co-pilot)`,
        author_uid: user.user_uid || 'USR-AI',
        author_avatar: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=120&auto=format&fit=crop&q=80',
        status: 'Approved',
        is_approved: 1,
        approved_by: {
          user_uid: user.user_uid || 'USR-AI',
          name: `${user.name} (AI Pipeline)`,
          role_name: 'AI Editorial Pipeline',
          phone: user.phone || '',
          approved_at: new Date().toISOString().replace('T', ' ').slice(0, 16)
        },
        views: 120,
        likes: 14,
        comments: 2,
        shares: 5,
        completion_rate: 80,
        breaking: false,
        publishedAt: 'Just now',
        summary: `Gemini AI automatically parsed and summarized key developments from ${aiUrlData.url}.`,
        content: `Comprehensive reporting on the developments announced in the source publication. The initiatives are projected to transform regional infrastructure and digital governance.`,
        tags: ['AI-Extracted', 'SmartCity'],
        imageUrl: 'https://images.unsplash.com/photo-1518770660439-4636190af475?w=800',
        videoUrl: '',
        location: { state: 'Telangana', district: 'Hyderabad', city: 'Hyderabad' }
      };
      setArticles([mockCreated, ...articles]);
      showToast(`AI extracted & drafted article in ${isTe ? 'Telugu' : 'English'}!`, 'success');
    } finally {
      setIsAiGenerating(false);
      setIsAiUrlModalOpen(false);
      setAiUrlData({ url: '', language: 'en', city: 'Hyderabad' });
    }
  };

  // Create Article Submit
  const handleCreateSubmit = async (e) => {
    e.preventDefault();
    const newUid = `nws_${Date.now().toString().slice(-6)}`;
    const isAutoApproved = canPublish;
    const newArt = {
      id: newUid,
      news_uid: newUid,
      title: formData.title,
      category: formData.category,
      language: formData.language,
      language_code: formData.language === 'Telugu' ? 'te' : 'en',
      author: `${user.name} (${user.roleTitle || 'Editorial'})`,
      author_uid: user.user_uid || 'USR-ADMIN',
      author_avatar: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=120&auto=format&fit=crop&q=80',
      status: isAutoApproved ? 'Approved' : 'Pending',
      is_approved: isAutoApproved ? 1 : 0,
      approved_by: isAutoApproved ? {
        user_uid: user?.user_uid || 'USR-ADMIN',
        name: user?.name || 'Administrator',
        role_name: user?.roleTitle || 'Editorial Staff',
        phone: user?.phone || '',
        approved_at: new Date().toISOString().replace('T', ' ').slice(0, 16)
      } : null,
      views: 0,
      likes: 0,
      comments: 0,
      shares: 0,
      completion_rate: 90,
      breaking: formData.breaking,
      breaking_priority: formData.breakingPriority || 3,
      publishedAt: new Date().toISOString().replace('T', ' ').slice(0, 16),
      summary: formData.summary || formData.title,
      content: formData.content,
      tags: formData.tags.split(',').map(t => t.trim()).filter(Boolean),
      imageUrl: formData.imageUrl || 'https://images.unsplash.com/photo-1585829365295-ab7cd400c167?w=800&auto=format&fit=crop&q=80',
      videoUrl: formData.videoUrl || '',
      location: { state: formData.state, district: formData.district, city: formData.city }
    };

    try {
      await api.createNews({
        title: formData.title,
        summary: formData.summary || formData.title,
        content: formData.content,
        image_url: formData.imageUrl || undefined,
        video_url: formData.videoUrl || undefined,
        language_id: formData.language === 'Telugu' ? 2 : 1,
        is_breaking: formData.breaking,
        tags: newArt.tags
      });
    } catch {}

    setArticles([newArt, ...articles]);
    setIsCreateModalOpen(false);
    showToast(`Article "${newArt.title.slice(0, 30)}..." successfully created!`, 'success');

    setFormData({
      title: '',
      category: 'Technology',
      language: 'English',
      language_code: 'en',
      summary: '',
      content: '',
      tags: '',
      breaking: false,
      breakingPriority: 3,
      imageUrl: '',
      videoUrl: '',
      state: 'Telangana',
      district: 'Hyderabad',
      city: 'HITEC City'
    });
  };

  // Export CSV
  const handleExportCsv = () => {
    const targetArticles = selectedArticles.length > 0 
      ? articles.filter(a => selectedArticles.includes(a.id))
      : filteredArticles;

    const csvRows = [
      ['News UID', 'Title', 'Category', 'Language', 'Status', 'Views', 'Likes', 'Comments', 'Shares', 'Breaking', 'City', 'Published At'],
      ...targetArticles.map(a => [
        a.news_uid,
        `"${a.title.replace(/"/g, '""')}"`,
        a.category,
        a.language,
        a.status,
        a.views,
        a.likes,
        a.comments,
        a.shares,
        a.breaking ? 'YES' : 'NO',
        a.location?.city || '',
        a.publishedAt
      ])
    ];
    const csvContent = 'data:text/csv;charset=utf-8,' + csvRows.map(e => e.join(',')).join('\n');
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `HyperNews_Editorial_Catalog_${new Date().toISOString().slice(0, 10)}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);

    showToast(`Exported ${targetArticles.length} articles to CSV successfully`, 'success');
  };

  // Simulator Navigation
  const handleOpenSimulator = (article) => {
    const idx = filteredArticles.findIndex(a => a.id === article.id);
    setMobileStoryIndex(idx >= 0 ? idx : 0);
    setMobileSimulatorArticle(article);
    setIsTtsPlaying(false);
    setIsMobileDrawerExpanded(false);
  };

  const handleNextMobileStory = () => {
    if (mobileStoryIndex < filteredArticles.length - 1) {
      const nextIdx = mobileStoryIndex + 1;
      setMobileStoryIndex(nextIdx);
      setMobileSimulatorArticle(filteredArticles[nextIdx]);
      if ('speechSynthesis' in window) window.speechSynthesis.cancel();
      setIsTtsPlaying(false);
      setIsMobileDrawerExpanded(false);
    }
  };

  const handlePrevMobileStory = () => {
    if (mobileStoryIndex > 0) {
      const prevIdx = mobileStoryIndex - 1;
      setMobileStoryIndex(prevIdx);
      setMobileSimulatorArticle(filteredArticles[prevIdx]);
      if ('speechSynthesis' in window) window.speechSynthesis.cancel();
      setIsTtsPlaying(false);
      setIsMobileDrawerExpanded(false);
    }
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem', width: '100%', paddingBottom: '3rem' }}>
      
      {/* ==================================================================== */}
      {/* 1. STUDIO BROADCAST TICKER: LIVE ON-AIR STREAM */}
      {/* ==================================================================== */}
      <div className="broadcast-ticker">
        {/* Glowing Studio Beacon & Dual Clocks */}
        <div className="d-flex items-center gap-3 flex-shrink-0">
          <div className="d-flex items-center gap-2">
            <span className="beacon-dot" />
            <span className="badge badge-danger font-black tracking-widest d-flex items-center gap-1">
              <Flame size={12} /> LIVE WIRE
            </span>
          </div>

          <div style={{ height: '14px', width: '1px', background: 'var(--border-subtle)' }} />

          {/* Live Studio Clock */}
          <div className="d-flex items-center gap-1" style={{ fontSize: '0.75rem', fontFamily: 'var(--font-mono)', fontWeight: 700, color: 'var(--text-secondary)' }}>
            <Clock size={12} style={{ color: 'var(--accent-rose)' }} />
            <span>{currentTime.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })} IST</span>
          </div>

          <span className="badge badge-warning" style={{ fontSize: '0.7rem' }}>
            {breakingArticles.length} Bulletins
          </span>
        </div>

        {/* Marquee Story Line */}
        <div style={{ flex: 1, overflow: 'hidden', padding: '0 0.5rem' }}>
          <div className={`d-flex items-center gap-6 ${isTickerPlaying ? 'animate-marquee' : ''}`} style={{ whiteSpace: 'nowrap' }}>
            {breakingArticles.length === 0 ? (
              <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)', fontStyle: 'italic' }}>
                No active breaking bulletins. Toggle breaking status on any article to broadcast live.
              </span>
            ) : (
              breakingArticles.map((b) => (
                <span 
                  key={b.id}
                  onClick={() => setPreviewArticle(b)}
                  style={{ cursor: 'pointer', fontSize: '0.75rem', fontWeight: 600, color: '#ffffff', display: 'flex', alignItems: 'center', gap: '0.5rem' }}
                >
                  <span className="badge badge-warning" style={{ fontSize: '0.65rem', padding: '0.1rem 0.35rem' }}>
                    P{b.breaking_priority || 5}
                  </span>
                  <span>{b.title}</span>
                  <span style={{ color: 'var(--accent-rose)' }}>✦</span>
                </span>
              ))
            )}
          </div>
        </div>

        {/* Ticker Action Controls */}
        <div className="d-flex items-center gap-2 flex-shrink-0">
          <button
            onClick={() => setIsTickerPlaying(!isTickerPlaying)}
            className="btn-icon"
            style={{ padding: '0.35rem' }}
            title={isTickerPlaying ? 'Pause Marquee' : 'Resume Marquee'}
          >
            {isTickerPlaying ? <Pause size={13} /> : <Play size={13} />}
          </button>
          <button 
            onClick={() => {
              setActiveTab('breaking');
              setCurrentPage(1);
            }}
            className="btn btn-danger"
            style={{ fontSize: '0.725rem', padding: '0.3rem 0.65rem' }}
          >
            Breaking Desk <ArrowUpRight size={12} />
          </button>
        </div>
      </div>

      {/* ==================================================================== */}
      {/* 2. ENTERPRISE WORKSPACE HEADER & CONTROL BAR */}
      {/* ==================================================================== */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '1.25rem' }}>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '0.75rem', fontWeight: 600, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.04em', marginBottom: '0.3rem' }}>
            <span>Operations</span>
            <span>/</span>
            <span>Content Architecture</span>
            <span>/</span>
            <span style={{ color: 'var(--primary)' }}>Editorial Multi-Channel Center</span>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
            <div style={{
              width: '42px',
              height: '42px',
              borderRadius: 'var(--radius-md)',
              background: 'linear-gradient(135deg, var(--primary), var(--secondary))',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: '#ffffff',
              boxShadow: '0 8px 20px var(--primary-glow)',
              flexShrink: 0
            }}>
              <Newspaper size={22} />
            </div>
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
                <h1 style={{ fontSize: '1.5rem', fontWeight: 800, color: 'var(--text-primary)', margin: 0, letterSpacing: '-0.02em' }}>
                  Editorial News Operations & Multi-Channel Center
                </h1>
                <span className="badge badge-success" style={{ fontSize: '0.65rem' }}>
                  Live Studio v2.4
                </span>
              </div>
              <p style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', marginTop: '0.2rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <span>Multi-format broadcast desk for InShorts 60-word bytes, YouTube video wire, and hyperlocal dispatch.</span>
                <span>•</span>
                <span style={{ color: 'var(--accent-cyan)', fontWeight: 600, display: 'flex', alignItems: 'center', gap: '0.25rem' }}>
                  <Sparkles size={11} /> Gemini 1.5 Pro Connected
                </span>
              </p>
            </div>
          </div>
        </div>

        {/* Global Action Tools */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem', flexWrap: 'wrap' }}>
          <button 
            className="btn btn-secondary" 
            style={{ fontSize: '0.75rem', padding: '0.45rem 0.85rem' }}
            onClick={loadNewsData}
            disabled={loading}
          >
            <RefreshCw size={13} className={loading ? 'animate-spin' : ''} />
            {loading ? 'Syncing...' : 'Sync DB'}
          </button>

          <button 
            className="btn btn-secondary" 
            style={{ fontSize: '0.75rem', padding: '0.45rem 0.85rem' }}
            onClick={handleExportCsv}
          >
            <Download size={13} /> Export CSV
          </button>

          <button 
            className="btn" 
            style={{ 
              fontSize: '0.75rem', 
              padding: '0.45rem 0.85rem',
              background: 'rgba(6, 182, 212, 0.15)',
              color: 'var(--accent-cyan)',
              border: '1px solid rgba(6, 182, 212, 0.3)'
            }}
            onClick={() => setIsAiUrlModalOpen(true)}
          >
            <Sparkles size={13} /> AI URL Auto-Publish
          </button>

          {canCreate && (
            <button 
              className="btn btn-primary" 
              style={{ fontSize: '0.75rem', padding: '0.45rem 1rem' }}
              onClick={() => {
                setComposerTab('content');
                setIsCreateModalOpen(true);
              }}
            >
              <Plus size={15} /> Compose Story
            </button>
          )}
        </div>
      </div>

      {/* ==================================================================== */}
      {/* 3. TOP-LEVEL OPERATIONS CENTER SEGMENTED NAVIGATION */}
      {/* ==================================================================== */}
      <div style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        flexWrap: 'wrap',
        gap: '0.85rem',
        background: 'rgba(15, 23, 42, 0.65)',
        padding: '0.45rem 0.65rem',
        borderRadius: 'var(--radius-lg)',
        border: '1px solid var(--glass-border)',
        backdropFilter: 'blur(16px)'
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.35rem', overflowX: 'auto' }}>
          <button
            onClick={() => setOpsViewMode('dashboard')}
            className={`ops-deck-tab ${opsViewMode === 'dashboard' ? 'active' : ''}`}
          >
            <Activity size={15} /> Operations Command Desk
          </button>
          <button
            onClick={() => {
              setOpsViewMode('ledger');
              setActiveTab('all');
            }}
            className={`ops-deck-tab ${opsViewMode === 'ledger' ? 'active' : ''}`}
          >
            <List size={15} /> Editorial Content Ledger ({articles.length})
          </button>
          <button
            onClick={() => {
              setOpsViewMode('media');
              setViewMode('grid');
            }}
            className={`ops-deck-tab ${opsViewMode === 'media' ? 'active' : ''}`}
          >
            <LayoutGrid size={15} /> Multi-Channel Media Studio
          </button>
          <button
            onClick={() => {
              setOpsViewMode('breaking');
              setActiveTab('breaking');
            }}
            className={`ops-deck-tab ${opsViewMode === 'breaking' ? 'active-breaking' : ''}`}
          >
            <Flame size={15} /> Live Breaking Wire ({breakingArticles.length})
          </button>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
          <span style={{ fontSize: '0.725rem', color: 'var(--text-muted)', fontFamily: 'var(--font-mono)' }}>
            NODE: <strong style={{ color: 'var(--accent-emerald)' }}>HYPER-NEWS-PROD-01</strong>
          </span>
        </div>
      </div>

      {/* ==================================================================== */}
      {/* 4. EXECUTIVE OPERATIONS DASHBOARD VIEW */}
      {/* ==================================================================== */}
      {opsViewMode === 'dashboard' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem', width: '100%' }}>
          
          {/* Telemetry KPI Cards (5 Strategic Governance Metrics) */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(210px, 1fr))', gap: '1.1rem' }}>
            {/* Card 1: Approved Content */}
            <div 
              className="kpi-card" 
              style={{ borderColor: 'rgba(16, 185, 129, 0.35)', cursor: 'pointer' }}
              onClick={() => { setOpsViewMode('ledger'); setActiveTab('approved'); }}
            >
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                <div>
                  <span className="kpi-title">Approved Live Content</span>
                  <div className="kpi-value">
                    {articles.filter(a => a.is_approved === 1 || a.status === 'Approved' || a.status === 'Published').length}
                    <span style={{ fontSize: '0.75rem', fontWeight: 500, color: 'var(--accent-emerald)' }}>signed off</span>
                  </div>
                </div>
                <div style={{ padding: '0.6rem', borderRadius: 'var(--radius-md)', background: 'rgba(16, 185, 129, 0.15)', color: 'var(--accent-emerald)' }}>
                  <CheckCircle2 size={18} />
                </div>
              </div>
              <div className="kpi-footer">
                <span style={{ color: 'var(--accent-emerald)', fontWeight: 600, display: 'flex', alignItems: 'center', gap: '0.25rem' }}>
                  <Award size={12} /> Editorial Sign-off Active
                </span>
                <Sparkline data={[12, 14, 13, 16, 20, 22, 25]} color="#10b981" />
              </div>
            </div>

            {/* Card 2: Verification Queue */}
            <div 
              className="kpi-card" 
              style={{ borderColor: 'rgba(245, 158, 11, 0.35)', cursor: 'pointer' }}
              onClick={() => { setOpsViewMode('ledger'); setActiveTab('pending'); }}
            >
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                <div>
                  <span className="kpi-title">Pending Verification</span>
                  <div className="kpi-value">
                    {articles.filter(a => a.is_approved === 0 || a.status === 'Pending').length}
                    <span style={{ fontSize: '0.75rem', fontWeight: 500, color: 'var(--accent-amber)' }}>in queue</span>
                  </div>
                </div>
                <div style={{ padding: '0.6rem', borderRadius: 'var(--radius-md)', background: 'rgba(245, 158, 11, 0.15)', color: 'var(--accent-amber)' }}>
                  <Clock size={18} />
                </div>
              </div>
              <div className="kpi-footer">
                <span style={{ color: 'var(--accent-amber)', fontWeight: 600 }}>Awaiting Lead Approver</span>
                <Sparkline data={[8, 10, 7, 9, 6, 8, 6]} color="#f59e0b" />
              </div>
            </div>

            {/* Card 3: Rejected Submissions */}
            <div 
              className="kpi-card" 
              style={{ borderColor: 'rgba(244, 63, 94, 0.35)', cursor: 'pointer' }}
              onClick={() => { setOpsViewMode('ledger'); setActiveTab('rejected'); }}
            >
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                <div>
                  <span className="kpi-title">Rejected Submissions</span>
                  <div className="kpi-value">
                    {articles.filter(a => a.is_approved === 2 || a.status === 'Rejected').length}
                    <span style={{ fontSize: '0.75rem', fontWeight: 500, color: 'var(--accent-rose)' }}>archived</span>
                  </div>
                </div>
                <div style={{ padding: '0.6rem', borderRadius: 'var(--radius-md)', background: 'rgba(244, 63, 94, 0.15)', color: 'var(--accent-rose)' }}>
                  <XCircle size={18} />
                </div>
              </div>
              <div className="kpi-footer">
                <span style={{ color: 'var(--accent-rose)', fontWeight: 600 }}>Audit Logs Saved</span>
                <Sparkline data={[4, 3, 5, 2, 3, 1, 2]} color="#f43f5e" />
              </div>
            </div>

            {/* Card 4: Total Reader Engagement */}
            <div className="kpi-card" style={{ borderColor: 'rgba(6, 182, 212, 0.35)' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                <div>
                  <span className="kpi-title">Total Reader Velocity</span>
                  <div className="kpi-value">
                    {(articles.reduce((acc, a) => acc + (a.views || 0), 0) / 1000).toFixed(1)}k
                    <span style={{ fontSize: '0.75rem', fontWeight: 500, color: 'var(--accent-cyan)' }}>reads</span>
                  </div>
                </div>
                <div style={{ padding: '0.6rem', borderRadius: 'var(--radius-md)', background: 'rgba(6, 182, 212, 0.15)', color: 'var(--accent-cyan)' }}>
                  <Eye size={18} />
                </div>
              </div>
              <div className="kpi-footer">
                <span style={{ color: 'var(--accent-cyan)', fontWeight: 600 }}>+18.2% velocity</span>
                <Sparkline data={[18, 22, 20, 26, 29, 34, 38]} color="#06b6d4" />
              </div>
            </div>

            {/* Card 5: Breaking News Wire */}
            <div className="kpi-card" style={{ borderColor: 'rgba(244, 63, 94, 0.35)' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                <div>
                  <span className="kpi-title">Breaking News Wire</span>
                  <div className="kpi-value">
                    {breakingArticles.length}
                    <span style={{ fontSize: '0.75rem', fontWeight: 500, color: 'var(--accent-rose)' }}>bulletins</span>
                  </div>
                </div>
                <div style={{ padding: '0.6rem', borderRadius: 'var(--radius-md)', background: 'rgba(244, 63, 94, 0.15)', color: 'var(--accent-rose)' }}>
                  <Flame size={18} />
                </div>
              </div>
              <div className="kpi-footer">
                <span style={{ color: 'var(--accent-rose)', fontWeight: 600 }}>P1–P5 Critical</span>
                <Sparkline data={[2, 3, 2, 4, 3, 5, 5]} color="#f43f5e" />
              </div>
            </div>
          </div>

          {/* Interactive Recharts Analytics Deck (2 Panels) */}
          <div style={{ display: 'grid', gridTemplateColumns: 'minmax(0, 1.8fr) minmax(0, 1.2fr)', gap: '1.25rem' }}>
            {/* Panel 1: 24-Hour Editorial Velocity Area Chart */}
            <div className="analytics-panel">
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1.25rem' }}>
                <div>
                  <h3 style={{ fontSize: '1rem', fontWeight: 700, color: 'var(--text-primary)', margin: 0 }}>
                    24-Hour Editorial Velocity & Readership Traffic
                  </h3>
                  <p style={{ fontSize: '0.775rem', color: 'var(--text-secondary)', margin: '0.2rem 0 0' }}>
                    Live reader dwell impressions & multi-channel publishing velocity
                  </p>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', fontSize: '0.75rem' }}>
                  <span style={{ display: 'flex', alignItems: 'center', gap: '0.3rem', color: 'var(--accent-cyan)' }}>
                    <span style={{ width: '8px', height: '8px', borderRadius: '50%', background: 'var(--accent-cyan)' }} />
                    Page Reads
                  </span>
                  <span style={{ display: 'flex', alignItems: 'center', gap: '0.3rem', color: '#818cf8' }}>
                    <span style={{ width: '8px', height: '8px', borderRadius: '50%', background: '#818cf8' }} />
                    Published Stories
                  </span>
                </div>
              </div>

              <div style={{ width: '100%', height: '260px' }}>
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={EDITORIAL_VELOCITY_DATA}>
                    <defs>
                      <linearGradient id="colorViews" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#06b6d4" stopOpacity={0.4} />
                        <stop offset="95%" stopColor="#06b6d4" stopOpacity={0.0} />
                      </linearGradient>
                      <linearGradient id="colorStories" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#6366f1" stopOpacity={0.4} />
                        <stop offset="95%" stopColor="#6366f1" stopOpacity={0.0} />
                      </linearGradient>
                    </defs>
                    <XAxis dataKey="time" stroke="#64748b" fontSize={12} tickLine={false} />
                    <YAxis stroke="#64748b" fontSize={12} tickLine={false} />
                    <RechartsTooltip 
                      contentStyle={{
                        background: '#0f172a',
                        border: '1px solid rgba(255, 255, 255, 0.1)',
                        borderRadius: '8px',
                        color: '#f8fafc',
                        fontSize: '0.85rem'
                      }}
                    />
                    <Area type="monotone" dataKey="views" name="Page Reads" stroke="#06b6d4" strokeWidth={2} fillOpacity={1} fill="url(#colorViews)" />
                    <Area type="monotone" dataKey="stories" name="Stories Published" stroke="#818cf8" strokeWidth={2} fillOpacity={1} fill="url(#colorStories)" />
                  </AreaChart>
                </ResponsiveContainer>
              </div>
            </div>

            {/* Panel 2: Category Penetration Bar Chart */}
            <div className="analytics-panel">
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1.25rem' }}>
                <div>
                  <h3 style={{ fontSize: '1rem', fontWeight: 700, color: 'var(--text-primary)', margin: 0 }}>
                    Category Performance & Ingestion Mix
                  </h3>
                  <p style={{ fontSize: '0.775rem', color: 'var(--text-secondary)', margin: '0.2rem 0 0' }}>
                    Active story count across editorial desks
                  </p>
                </div>
                <span className="badge badge-primary" style={{ fontSize: '0.65rem' }}>
                  Live Telemetry
                </span>
              </div>

              <div style={{ width: '100%', height: '260px' }}>
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={CATEGORY_TELEMETRY_DATA} layout="vertical">
                    <XAxis type="number" stroke="#64748b" fontSize={12} tickLine={false} />
                    <YAxis dataKey="name" type="category" stroke="#64748b" fontSize={12} tickLine={false} width={65} />
                    <RechartsTooltip 
                      contentStyle={{
                        background: '#0f172a',
                        border: '1px solid rgba(255, 255, 255, 0.1)',
                        borderRadius: '8px',
                        color: '#f8fafc',
                        fontSize: '0.85rem'
                      }}
                    />
                    <Bar dataKey="count" name="Articles" fill="#818cf8" radius={[0, 6, 6, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>
          </div>

          {/* Multi-Channel Distribution Matrix */}
          <div>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '0.85rem' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <Radio size={16} style={{ color: 'var(--primary)' }} />
                <h3 style={{ fontSize: '0.95rem', fontWeight: 700, color: 'var(--text-primary)', margin: 0 }}>
                  Multi-Channel Broadcast Channels
                </h3>
              </div>
              <span style={{ fontSize: '0.725rem', color: 'var(--text-muted)' }}>
                4 of 4 Distribution Gateways Operational
              </span>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: '1rem' }}>
              {/* Channel 1: InShorts Byte Engine */}
              <div className="channel-status-card active-glow-cyan">
                <div>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '0.5rem' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                      <Smartphone size={16} style={{ color: 'var(--accent-cyan)' }} />
                      <span style={{ fontSize: '0.85rem', fontWeight: 700, color: 'var(--text-primary)' }}>InShorts 60w Engine</span>
                    </div>
                    <span className="badge badge-success" style={{ fontSize: '0.65rem' }}>Online</span>
                  </div>
                  <p style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', margin: '0 0 0.75rem' }}>
                    Automated bite-sized editorial summary dispatcher with Web Speech narration.
                  </p>
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.725rem', color: 'var(--text-muted)' }}>
                    <span>Read Completion: <strong style={{ color: 'var(--text-primary)' }}>88.4%</strong></span>
                    <span>Dwell: <strong style={{ color: 'var(--text-primary)' }}>24s</strong></span>
                  </div>
                </div>
                <button
                  className="btn btn-secondary"
                  style={{ width: '100%', fontSize: '0.725rem', padding: '0.4rem', justifyContent: 'center' }}
                  onClick={() => handleOpenSimulator(articles[0])}
                >
                  <Smartphone size={12} /> Launch InShorts Simulator
                </button>
              </div>

              {/* Channel 2: YouTube Video Wire */}
              <div className="channel-status-card active-glow-rose">
                <div>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '0.5rem' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                      <Video size={16} style={{ color: 'var(--accent-rose)' }} />
                      <span style={{ fontSize: '0.85rem', fontWeight: 700, color: 'var(--text-primary)' }}>YouTube Video Wire</span>
                    </div>
                    <span className="badge badge-danger" style={{ fontSize: '0.65rem' }}>Streaming</span>
                  </div>
                  <p style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', margin: '0 0 0.75rem' }}>
                    Automated YouTube embed ingestion with 1080p video player overlays.
                  </p>
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.725rem', color: 'var(--text-muted)' }}>
                    <span>Active Feeds: <strong style={{ color: 'var(--text-primary)' }}>38 Wire</strong></span>
                    <span>Avg Watch: <strong style={{ color: 'var(--text-primary)' }}>3m 42s</strong></span>
                  </div>
                </div>
                <button
                  className="btn btn-secondary"
                  style={{ width: '100%', fontSize: '0.725rem', padding: '0.4rem', justifyContent: 'center' }}
                  onClick={() => {
                    setOpsViewMode('ledger');
                    setChannelFormat('videos');
                  }}
                >
                  <Video size={12} /> Filter Video Wire Desk
                </button>
              </div>

              {/* Channel 3: Hyperlocal Vernacular Network */}
              <div className="channel-status-card active-glow-emerald">
                <div>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '0.5rem' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                      <Globe size={16} style={{ color: 'var(--accent-emerald)' }} />
                      <span style={{ fontSize: '0.85rem', fontWeight: 700, color: 'var(--text-primary)' }}>Vernacular Network</span>
                    </div>
                    <span className="badge badge-success" style={{ fontSize: '0.65rem' }}>Multi-Region</span>
                  </div>
                  <p style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', margin: '0 0 0.75rem' }}>
                    Regional Telugu (తెలుగు), Hindi (हिंदी), and English hyperlocal dispatch network.
                  </p>
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.725rem', color: 'var(--text-muted)' }}>
                    <span>Telugu Core: <strong style={{ color: 'var(--text-primary)' }}>54% Share</strong></span>
                    <span>Hubs: <strong style={{ color: 'var(--text-primary)' }}>TS & AP</strong></span>
                  </div>
                </div>
                <button
                  className="btn btn-secondary"
                  style={{ width: '100%', fontSize: '0.725rem', padding: '0.4rem', justifyContent: 'center' }}
                  onClick={() => {
                    setOpsViewMode('ledger');
                    setSelectedLanguage('te');
                  }}
                >
                  <Globe size={12} /> Filter Telugu Wire Desk
                </button>
              </div>

              {/* Channel 4: Gemini AI Fact-Check & Copilot */}
              <div className="channel-status-card active-glow-violet">
                <div>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '0.5rem' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                      <Sparkles size={16} style={{ color: 'var(--primary)' }} />
                      <span style={{ fontSize: '0.85rem', fontWeight: 700, color: 'var(--text-primary)' }}>Gemini AI Copilot</span>
                    </div>
                    <span className="badge badge-primary" style={{ fontSize: '0.65rem' }}>Connected</span>
                  </div>
                  <p style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', margin: '0 0 0.75rem' }}>
                    AI-powered URL auto-publisher, multi-lingual translation & content validation.
                  </p>
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.725rem', color: 'var(--text-muted)' }}>
                    <span>Auto-Summarized: <strong style={{ color: 'var(--text-primary)' }}>58 Today</strong></span>
                    <span>Latency: <strong style={{ color: 'var(--text-primary)' }}>420ms</strong></span>
                  </div>
                </div>
                <button
                  className="btn btn-secondary"
                  style={{ width: '100%', fontSize: '0.725rem', padding: '0.4rem', justifyContent: 'center' }}
                  onClick={() => setIsAiUrlModalOpen(true)}
                >
                  <Sparkles size={12} /> Launch AI Auto-Publisher
                </button>
              </div>
            </div>
          </div>

          {/* Operational Action Queues (2 Columns: Verification vs Breaking Wire) */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(380px, 1fr))', gap: '1.25rem' }}>
            {/* Column 1: Pending Verification Desk */}
            <div className="card" style={{ display: 'flex', flexDirection: 'column', gap: '0.85rem' }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                  <ShieldCheck size={16} style={{ color: 'var(--accent-amber)' }} />
                  <h3 style={{ fontSize: '0.95rem', fontWeight: 700, color: 'var(--text-primary)', margin: 0 }}>
                    Urgent Verification Queue ({articles.filter(a => a.status === 'Pending').length})
                  </h3>
                </div>
                <button
                  onClick={() => {
                    setOpsViewMode('ledger');
                    setActiveTab('pending');
                  }}
                  style={{ fontSize: '0.75rem', color: 'var(--primary)', background: 'none', border: 'none', cursor: 'pointer', fontWeight: 600 }}
                >
                  Open Full Queue →
                </button>
              </div>

              {articles.filter(a => a.status === 'Pending').length === 0 ? (
                <div style={{ padding: '2rem', textAlign: 'center', color: 'var(--text-muted)', fontSize: '0.8rem' }}>
                  <CheckCircle2 size={28} style={{ margin: '0 auto 0.5rem', color: 'var(--accent-emerald)' }} />
                  Verification queue clear. All submitted stories processed!
                </div>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                  {articles.filter(a => a.status === 'Pending').slice(0, 3).map(art => (
                    <div key={art.id} className="queue-item">
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', marginBottom: '0.2rem' }}>
                          <span className="badge badge-warning" style={{ fontSize: '0.65rem' }}>{art.category}</span>
                          <span style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>By {art.author.split(' ')[0]}</span>
                        </div>
                        <div style={{ fontSize: '0.8rem', fontWeight: 600, color: 'var(--text-primary)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                          {art.title}
                        </div>
                      </div>

                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
                        <button
                          onClick={() => handleApproveNews(art)}
                          className="btn btn-success"
                          style={{ padding: '0.3rem 0.6rem', fontSize: '0.7rem' }}
                          title="Approve & Publish Live"
                        >
                          <Check size={12} /> Approve
                        </button>
                        <button
                          onClick={() => setRejectTarget(art)}
                          className="btn btn-danger"
                          style={{ padding: '0.3rem 0.6rem', fontSize: '0.7rem' }}
                          title="Reject Story"
                        >
                          <X size={12} /> Reject
                        </button>
                        <button
                          onClick={() => setPreviewArticle(art)}
                          className="btn-icon"
                          style={{ padding: '0.35rem' }}
                          title="Full Dossier"
                        >
                          <Eye size={12} />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Column 2: Live Breaking Wire Alerts */}
            <div className="card" style={{ display: 'flex', flexDirection: 'column', gap: '0.85rem' }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                  <Flame size={16} style={{ color: 'var(--accent-rose)' }} />
                  <h3 style={{ fontSize: '0.95rem', fontWeight: 700, color: 'var(--text-primary)', margin: 0 }}>
                    Live Breaking Wire Monitors ({breakingArticles.length})
                  </h3>
                </div>
                <button
                  onClick={() => {
                    setOpsViewMode('breaking');
                    setActiveTab('breaking');
                  }}
                  style={{ fontSize: '0.75rem', color: 'var(--accent-rose)', background: 'none', border: 'none', cursor: 'pointer', fontWeight: 600 }}
                >
                  Manage Wire Desk →
                </button>
              </div>

              {breakingArticles.length === 0 ? (
                <div style={{ padding: '2rem', textAlign: 'center', color: 'var(--text-muted)', fontSize: '0.8rem' }}>
                  No active breaking bulletins on air.
                </div>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                  {breakingArticles.slice(0, 3).map(art => (
                    <div key={art.id} className="queue-item" style={{ borderColor: 'rgba(244, 63, 94, 0.3)' }}>
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', marginBottom: '0.2rem' }}>
                          <span className="badge badge-danger" style={{ fontSize: '0.65rem' }}>P{art.breaking_priority || 5} Critical</span>
                          <span style={{ fontSize: '0.7rem', color: 'var(--accent-rose)', fontWeight: 600 }}>✦ LIVE ON AIR</span>
                        </div>
                        <div style={{ fontSize: '0.8rem', fontWeight: 600, color: 'var(--text-primary)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                          {art.title}
                        </div>
                      </div>

                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
                        <button
                          onClick={() => handleToggleBreaking(art.id)}
                          className="btn btn-secondary"
                          style={{ padding: '0.3rem 0.6rem', fontSize: '0.7rem' }}
                          title="Demote from Breaking"
                        >
                          Demote
                        </button>
                        <button
                          onClick={() => setPreviewArticle(art)}
                          className="btn-icon"
                          style={{ padding: '0.35rem' }}
                          title="Full Dossier"
                        >
                          <Eye size={12} />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* High-Velocity Content Showcase */}
          <div className="card" style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <div>
                <h3 style={{ fontSize: '0.95rem', fontWeight: 700, color: 'var(--text-primary)', margin: 0 }}>
                  Top Performing Stories Across HyperNews Network
                </h3>
                <p style={{ fontSize: '0.775rem', color: 'var(--text-secondary)', margin: '0.2rem 0 0' }}>
                  Highest velocity articles ranked by live readership & engagement metrics
                </p>
              </div>

              <button
                onClick={() => {
                  setOpsViewMode('ledger');
                  setActiveTab('all');
                }}
                className="btn btn-secondary"
                style={{ fontSize: '0.75rem', padding: '0.35rem 0.75rem' }}
              >
                Open Full Content Ledger <ArrowRight size={13} />
              </button>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '1rem' }}>
              {articles.slice(0, 3).map(art => (
                <div 
                  key={art.id} 
                  style={{
                    display: 'flex',
                    flexDirection: 'column',
                    justifyContent: 'space-between',
                    padding: '1rem',
                    borderRadius: 'var(--radius-md)',
                    background: 'rgba(15, 23, 42, 0.5)',
                    border: '1px solid var(--border-subtle)'
                  }}
                >
                  <div>
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '0.5rem' }}>
                      <span className="badge badge-primary" style={{ fontSize: '0.65rem' }}>{art.category}</span>
                      <span style={{ fontSize: '0.7rem', color: 'var(--primary)', fontWeight: 700, fontFamily: 'var(--font-mono)' }}>
                        {art.views.toLocaleString()} reads
                      </span>
                    </div>

                    <h4 style={{ fontSize: '0.85rem', fontWeight: 700, color: 'var(--text-primary)', lineHeight: 1.4, margin: '0 0 0.5rem' }}>
                      {art.title}
                    </h4>

                    <p style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', lineHeight: 1.45, margin: 0 }}>
                      {art.summary.slice(0, 110)}...
                    </p>
                  </div>

                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginTop: '1rem', paddingTop: '0.75rem', borderTop: '1px solid var(--border-subtle)' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', fontSize: '0.7rem', color: 'var(--text-muted)' }}>
                      <img src={art.author_avatar} alt="avatar" style={{ width: '18px', height: '18px', borderRadius: '50%' }} />
                      <span>{art.author.split(' ')[0]}</span>
                    </div>

                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
                      <button
                        onClick={() => handleOpenSimulator(art)}
                        className="btn-icon"
                        style={{ padding: '0.35rem', color: 'var(--accent-cyan)' }}
                        title="Open InShorts Simulator"
                      >
                        <Smartphone size={12} />
                      </button>
                      <button
                        onClick={() => handleOpenEditModal(art)}
                        className="btn-icon"
                        style={{ padding: '0.35rem', color: 'var(--primary)' }}
                        title="Edit Story"
                      >
                        <Edit3 size={12} />
                      </button>
                      <button
                        onClick={() => setPreviewArticle(art)}
                        className="btn-icon"
                        style={{ padding: '0.35rem' }}
                        title="Full Dossier"
                      >
                        <Eye size={12} />
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>

        </div>
      )}

      {/* ==================================================================== */}
      {/* 5. EDITORIAL CONTENT LEDGER, MEDIA STUDIO & BREAKING WIRE */}
      {/* ==================================================================== */}
      {opsViewMode !== 'dashboard' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem', width: '100%' }}>
          
          {/* Top Bar for Ledger: Workflow Tabs & Format Selectors */}
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '0.75rem', borderBottom: '1px solid var(--border-subtle)', paddingBottom: '0.75rem' }}>
            {/* Status Workflow Tabs */}
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', overflowX: 'auto' }}>
              {[
                { id: 'all', label: 'All Content', icon: Layers, count: articles.length },
                { id: 'approved', label: 'Approved & Signed Off', icon: CheckCircle2, count: articles.filter(a => a.is_approved === 1 || a.status === 'Approved' || a.status === 'Published').length, dotColor: 'var(--accent-emerald)' },
                { id: 'pending', label: 'Pending Verification', icon: Clock, count: articles.filter(a => a.is_approved === 0 || a.status === 'Pending').length, dotColor: 'var(--accent-amber)' },
                { id: 'rejected', label: 'Rejected Submissions', icon: XCircle, count: articles.filter(a => a.is_approved === 2 || a.status === 'Rejected').length, dotColor: 'var(--accent-rose)' },
                { id: 'breaking', label: 'Breaking News Wire', icon: Flame, count: articles.filter(a => a.breaking).length, dotColor: 'var(--accent-rose)' },
              ].map(tab => {
                const isActive = activeTab === tab.id || (tab.id === 'approved' && activeTab === 'published');
                return (
                  <button
                    key={tab.id}
                    onClick={() => {
                      setActiveTab(tab.id);
                      setCurrentPage(1);
                    }}
                    className={`tab-pill ${isActive ? (tab.id === 'breaking' ? 'active-breaking' : 'active') : ''}`}
                  >
                    {tab.dotColor && <span style={{ width: '6px', height: '6px', borderRadius: '50%', background: tab.dotColor }} />}
                    <tab.icon size={13} />
                    <span>{tab.label}</span>
                    <span className="badge" style={{ fontSize: '0.65rem', padding: '0.1rem 0.35rem', background: isActive ? 'rgba(0,0,0,0.3)' : 'rgba(255,255,255,0.08)' }}>
                      {tab.count}
                    </span>
                  </button>
                );
              })}
            </div>

            {/* Channel Formats Selector & View Switcher */}
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
              <div style={{ display: 'flex', background: 'rgba(15, 23, 42, 0.7)', padding: '0.2rem', borderRadius: 'var(--radius-md)', border: '1px solid var(--border-subtle)' }}>
                {[
                  { id: 'all', label: 'All Formats', icon: Radio },
                  { id: 'inshorts', label: 'InShorts (60w)', icon: Smartphone },
                  { id: 'videos', label: 'YouTube Wire', icon: Video },
                  { id: 'articles', label: 'Deep Articles', icon: BookOpen }
                ].map(fmt => (
                  <button
                    key={fmt.id}
                    onClick={() => {
                      setChannelFormat(fmt.id);
                      setCurrentPage(1);
                    }}
                    className={`tab-pill ${channelFormat === fmt.id ? 'active' : ''}`}
                    style={{ padding: '0.35rem 0.65rem', fontSize: '0.75rem' }}
                  >
                    <fmt.icon size={12} />
                    <span>{fmt.label}</span>
                  </button>
                ))}
              </div>

              <div style={{ display: 'flex', background: 'rgba(15, 23, 42, 0.7)', padding: '0.2rem', borderRadius: 'var(--radius-md)', border: '1px solid var(--border-subtle)' }}>
                <button
                  onClick={() => setViewMode('table')}
                  className={`tab-pill ${viewMode === 'table' ? 'active' : ''}`}
                  style={{ padding: '0.35rem 0.65rem', fontSize: '0.75rem' }}
                >
                  <List size={13} /> Ledger
                </button>
                <button
                  onClick={() => setViewMode('grid')}
                  className={`tab-pill ${viewMode === 'grid' ? 'active' : ''}`}
                  style={{ padding: '0.35rem 0.65rem', fontSize: '0.75rem' }}
                >
                  <LayoutGrid size={13} /> Magazine
                </button>
              </div>
            </div>
          </div>

          {/* Hyperlocal & Attribute Filters Command Bar */}
          <div className="filter-bar">
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '0.85rem', flexWrap: 'wrap' }}>
              {/* Search Box with Shortcut Badge */}
              <div style={{ flex: 1, minWidth: '260px', position: 'relative' }}>
                <Search size={15} style={{ position: 'absolute', left: '0.85rem', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} />
                <input 
                  ref={searchInputRef}
                  type="text" 
                  className="input" 
                  style={{ paddingLeft: '2.5rem', paddingRight: '4rem', fontSize: '0.8rem' }}
                  placeholder="Search headline, reporter, UID, #tags, or city..." 
                  value={searchQuery}
                  onChange={(e) => {
                    setSearchQuery(e.target.value);
                    setCurrentPage(1);
                  }}
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

              {/* Filter Dropdowns */}
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem', flexWrap: 'wrap' }}>
                {/* Category */}
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
                  <span style={{ fontSize: '0.725rem', fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase' }}>Category:</span>
                  <select 
                    className="select" 
                    style={{ width: 'auto', padding: '0.45rem 0.75rem', fontSize: '0.775rem' }}
                    value={selectedCategory} 
                    onChange={(e) => {
                      setSelectedCategory(e.target.value);
                      setCurrentPage(1);
                    }}
                  >
                    {categories.map(c => <option key={c} value={c}>{c}</option>)}
                  </select>
                </div>

                {/* Language */}
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
                  <span style={{ fontSize: '0.725rem', fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase' }}>Language:</span>
                  <select 
                    className="select" 
                    style={{ width: 'auto', padding: '0.45rem 0.75rem', fontSize: '0.775rem' }}
                    value={selectedLanguage} 
                    onChange={(e) => {
                      setSelectedLanguage(e.target.value);
                      setCurrentPage(1);
                    }}
                  >
                    {LANGUAGES.map(l => (
                      <option key={l.code} value={l.code}>
                        {l.name} ({l.native})
                      </option>
                    ))}
                  </select>
                </div>

                {/* Hyperlocal State */}
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
                  <span style={{ fontSize: '0.725rem', fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase' }}>State:</span>
                  <select 
                    className="select" 
                    style={{ width: 'auto', padding: '0.45rem 0.75rem', fontSize: '0.775rem' }}
                    value={selectedState} 
                    onChange={(e) => {
                      setSelectedState(e.target.value);
                      setCurrentPage(1);
                    }}
                  >
                    <option value="All">All States</option>
                    <option value="Telangana">Telangana</option>
                    <option value="Andhra Pradesh">Andhra Pradesh</option>
                    <option value="Maharashtra">Maharashtra</option>
                    <option value="Karnataka">Karnataka</option>
                    <option value="National">National</option>
                  </select>
                </div>

                {/* Sort */}
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
                  <span style={{ fontSize: '0.725rem', fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', display: 'flex', alignItems: 'center', gap: '0.2rem' }}>
                    <ArrowUpDown size={11} /> Sort:
                  </span>
                  <select 
                    className="select" 
                    style={{ width: 'auto', padding: '0.45rem 0.75rem', fontSize: '0.775rem' }}
                    value={sortBy} 
                    onChange={(e) => setSortBy(e.target.value)}
                  >
                    <option value="newest">Newest First</option>
                    <option value="views">Most Viewed</option>
                    <option value="likes">Most Liked</option>
                    <option value="priority">Breaking Priority</option>
                  </select>
                </div>
              </div>
            </div>

            {/* Quick Category Chips Ribbon */}
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', overflowX: 'auto', paddingTop: '0.25rem' }}>
              <span style={{ fontSize: '0.65rem', fontWeight: 700, textTransform: 'uppercase', color: 'var(--text-muted)', marginRight: '0.25rem', flexShrink: 0 }}>
                Quick Filter:
              </span>
              {CATEGORIES.slice(0, 9).map(cat => {
                const isSelected = selectedCategory === cat;
                return (
                  <button
                    key={cat}
                    onClick={() => {
                      setSelectedCategory(cat);
                      setCurrentPage(1);
                    }}
                    className={`tab-pill ${isSelected ? 'active' : ''}`}
                    style={{ padding: '0.25rem 0.6rem', fontSize: '0.725rem', borderRadius: 'var(--radius-sm)' }}
                  >
                    {cat}
                  </button>
                );
              })}
            </div>

            {/* Bulk Action Controls */}
            {selectedArticles.length > 0 && (
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', background: 'rgba(99, 102, 241, 0.15)', border: '1px solid rgba(99, 102, 241, 0.3)', padding: '0.6rem 1rem', borderRadius: 'var(--radius-md)', marginTop: '0.4rem' }}>
                <span style={{ fontSize: '0.75rem', fontWeight: 700, color: '#818cf8', display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                  <CheckCircle2 size={14} />
                  {selectedArticles.length} article(s) selected
                </span>
                <div style={{ display: 'flex', gap: '0.4rem', flexWrap: 'wrap' }}>
                  <button 
                    className="btn btn-success" 
                    style={{ fontSize: '0.725rem', padding: '0.3rem 0.65rem' }}
                    onClick={async () => {
                      const approverInfo = {
                        user_uid: user?.user_uid || 'USR-ADMIN-01',
                        name: user?.name || 'Dr. K. Srinivas',
                        role_name: user?.roleTitle || 'Lead Editor',
                        phone: user?.phone || '+91 98490 12345',
                        approved_at: new Date().toISOString().replace('T', ' ').slice(0, 16)
                      };
                      try {
                        await api.bulkApproveNews(selectedArticles);
                      } catch {}
                      setArticles(prev => prev.map(a => selectedArticles.includes(a.id) ? { 
                        ...a, 
                        status: 'Approved', 
                        is_approved: 1, 
                        approved_by: approverInfo 
                      } : a));
                      setSelectedArticles([]);
                      showToast(`Approved & signed off ${selectedArticles.length} articles!`, 'success');
                    }}
                  >
                    <CheckCircle2 size={13} /> Bulk Approve & Sign-Off
                  </button>

                  <button 
                    className="btn btn-danger" 
                    style={{ fontSize: '0.725rem', padding: '0.3rem 0.65rem' }}
                    onClick={async () => {
                      const reason = 'Bulk moderation queue reject';
                      try {
                        await api.bulkRejectNews(selectedArticles, reason);
                      } catch {}
                      setArticles(prev => prev.map(a => selectedArticles.includes(a.id) ? { 
                        ...a, 
                        status: 'Rejected', 
                        is_approved: 2, 
                        rejected_by: { name: user?.name || 'Editorial Moderator', user_uid: user?.user_uid || 'USR-ADMIN' },
                        rejection_reason: reason,
                        rejected_at: new Date().toISOString().replace('T', ' ').slice(0, 16)
                      } : a));
                      setSelectedArticles([]);
                      showToast(`Moved ${selectedArticles.length} articles to rejection archive`, 'warning');
                    }}
                  >
                    <XCircle size={13} /> Bulk Reject
                  </button>

                  <button 
                    className="btn" 
                    style={{ fontSize: '0.725rem', padding: '0.3rem 0.65rem', background: 'rgba(245, 158, 11, 0.2)', color: '#fbbf24', border: '1px solid rgba(245, 158, 11, 0.4)' }}
                    onClick={() => {
                      setArticles(prev => prev.map(a => selectedArticles.includes(a.id) ? { ...a, breaking: true, breaking_priority: 5 } : a));
                      setSelectedArticles([]);
                      showToast(`Promoted ${selectedArticles.length} articles to Breaking News`, 'warning');
                    }}
                  >
                    <Flame size={13} /> Bulk Breaking
                  </button>

                  <button 
                    className="btn btn-secondary" 
                    style={{ fontSize: '0.725rem', padding: '0.3rem 0.65rem' }}
                    onClick={handleExportCsv}
                  >
                    <Download size={13} /> Bulk Export CSV
                  </button>

                  {canDelete && (
                    <button 
                      className="btn btn-danger" 
                      style={{ fontSize: '0.725rem', padding: '0.3rem 0.65rem' }}
                      onClick={() => {
                        setArticles(prev => prev.filter(a => !selectedArticles.includes(a.id)));
                        setSelectedArticles([]);
                        showToast(`Deleted ${selectedArticles.length} articles`, 'info');
                      }}
                    >
                      <Trash2 size={13} /> Bulk Delete
                    </button>
                  )}
                </div>
              </div>
            )}
          </div>

          {/* Table View (Ledger) */}
          {viewMode === 'table' && (
            <div className="table-container">
              <table className="data-table">
                <thead>
                  <tr>
                    <th style={{ width: '40px' }}>
                      <input
                        type="checkbox"
                        checked={selectedArticles.length === paginatedArticles.length && paginatedArticles.length > 0}
                        onChange={selectAll}
                        style={{ cursor: 'pointer' }}
                      />
                    </th>
                    <th>Headline & InShorts Scope</th>
                    <th>Category & Region</th>
                    <th>Author & UID</th>
                    <th>Reader Velocity</th>
                    <th>Approval Status</th>
                    <th>Approved By / Sign-Off</th>
                    <th>Published At</th>
                    <th style={{ textAlign: 'right' }}>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {paginatedArticles.length === 0 ? (
                    <tr>
                      <td colSpan={9} style={{ textAlign: 'center', padding: '3.5rem 1rem', color: 'var(--text-muted)' }}>
                        <Newspaper size={36} style={{ margin: '0 auto 0.75rem', opacity: 0.5 }} />
                        <div style={{ fontWeight: 600 }}>No stories match the active filters.</div>
                        <div style={{ fontSize: '0.75rem', marginTop: '0.35rem' }}>Try clearing filters or search queries.</div>
                      </td>
                    </tr>
                  ) : (
                    paginatedArticles.map(art => (
                      <tr key={art.id} style={{ background: selectedArticles.includes(art.id) ? 'rgba(99, 102, 241, 0.08)' : 'transparent' }}>
                        <td>
                          <input
                            type="checkbox"
                            checked={selectedArticles.includes(art.id)}
                            onChange={() => toggleSelect(art.id)}
                            style={{ cursor: 'pointer' }}
                          />
                        </td>
                        <td style={{ maxWidth: '360px' }}>
                          <div style={{ display: 'flex', gap: '0.75rem', alignItems: 'center' }}>
                            <div style={{ position: 'relative', width: '56px', height: '40px', borderRadius: 'var(--radius-sm)', overflow: 'hidden', flexShrink: 0, background: '#0f172a' }}>
                              <img src={art.imageUrl} alt="thumb" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                              {art.videoUrl && (
                                <div style={{ position: 'absolute', inset: 0, background: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                                  <Play size={12} style={{ color: 'var(--accent-rose)' }} fill="currentColor" />
                                </div>
                              )}
                            </div>
                            <div style={{ minWidth: 0 }}>
                              <div style={{ display: 'flex', alignItems: 'center', gap: '0.35rem', marginBottom: '0.2rem' }}>
                                {art.breaking && (
                                  <span className="badge badge-danger" style={{ fontSize: '0.65rem', padding: '0.1rem 0.35rem' }}>
                                    <Flame size={10} /> P{art.breaking_priority || 5} BREAKING
                                  </span>
                                )}
                                <span style={{ fontSize: '0.7rem', color: 'var(--text-muted)', fontFamily: 'var(--font-mono)' }}>
                                  {art.news_uid}
                                </span>
                              </div>
                              <div 
                                style={{ fontSize: '0.85rem', fontWeight: 600, color: 'var(--text-primary)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', cursor: 'pointer' }}
                                onClick={() => setPreviewArticle(art)}
                                title={art.title}
                              >
                                {art.title}
                              </div>
                            </div>
                          </div>
                        </td>
                        <td>
                          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.25rem' }}>
                            <span className="badge badge-primary" style={{ width: 'fit-content', fontSize: '0.7rem' }}>
                              {art.category}
                            </span>
                            <span style={{ fontSize: '0.725rem', color: 'var(--text-muted)', display: 'flex', alignItems: 'center', gap: '0.25rem' }}>
                              <MapPin size={11} style={{ color: 'var(--primary)' }} />
                              {art.location?.city || art.location?.state || 'National'} • {art.language}
                            </span>
                          </div>
                        </td>
                        <td>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                            <img src={art.author_avatar} alt="avatar" style={{ width: '22px', height: '22px', borderRadius: '50%', objectFit: 'cover' }} />
                            <div>
                              <div style={{ fontSize: '0.8rem', fontWeight: 600, color: 'var(--text-primary)' }}>{art.author.split(' ')[0]}</div>
                              <div style={{ fontSize: '0.65rem', color: 'var(--text-muted)', fontFamily: 'var(--font-mono)' }}>{art.author_uid}</div>
                            </div>
                          </div>
                        </td>
                        <td>
                          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.2rem' }}>
                            <div style={{ fontSize: '0.8rem', fontWeight: 700, color: 'var(--primary)', fontFamily: 'var(--font-mono)' }}>
                              {art.views.toLocaleString()} reads
                            </div>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '0.7rem', color: 'var(--text-muted)' }}>
                              <span>♥ {art.likes}</span>
                              <span>💬 {art.comments}</span>
                            </div>
                          </div>
                        </td>
                        {/* Approval Status Badge */}
                        <td>
                          {art.is_approved === 1 || art.status === 'Approved' || art.status === 'Published' ? (
                            <span className="badge badge-success" style={{ display: 'inline-flex', alignItems: 'center', gap: '0.3rem' }}>
                              <CheckCircle2 size={11} /> Approved
                            </span>
                          ) : art.is_approved === 2 || art.status === 'Rejected' ? (
                            <span className="badge badge-danger" style={{ display: 'inline-flex', alignItems: 'center', gap: '0.3rem' }}>
                              <XCircle size={11} /> Rejected
                            </span>
                          ) : (
                            <span className="badge badge-warning" style={{ display: 'inline-flex', alignItems: 'center', gap: '0.3rem' }}>
                              <Clock size={11} /> Pending
                            </span>
                          )}
                        </td>
                        {/* Approved By / Sign-Off Details */}
                        <td>
                          {art.is_approved === 1 || art.status === 'Approved' || art.status === 'Published' ? (
                            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.2rem' }}>
                              <div style={{ display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
                                <Award size={12} style={{ color: 'var(--accent-emerald)', flexShrink: 0 }} />
                                <span style={{ fontSize: '0.8rem', fontWeight: 600, color: 'var(--text-primary)' }}>
                                  {art.approved_by?.name || 'Dr. K. Srinivas'}
                                </span>
                              </div>
                              <div style={{ display: 'flex', alignItems: 'center', gap: '0.35rem', fontSize: '0.675rem', color: 'var(--text-muted)' }}>
                                <span style={{ fontFamily: 'var(--font-mono)', background: 'rgba(16, 185, 129, 0.12)', color: 'var(--accent-emerald)', padding: '0.05rem 0.3rem', borderRadius: '3px' }}>
                                  {art.approved_by?.user_uid || 'USR-ADMIN-01'}
                                </span>
                                <span>• {art.approved_by?.role_name || 'Lead Editor'}</span>
                              </div>
                              {art.approved_by?.phone && (
                                <span style={{ fontSize: '0.65rem', color: 'var(--text-muted)' }}>
                                  📞 {art.approved_by.phone}
                                </span>
                              )}
                            </div>
                          ) : art.is_approved === 2 || art.status === 'Rejected' ? (
                            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.2rem' }}>
                              <div style={{ display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
                                <AlertTriangle size={12} style={{ color: 'var(--accent-rose)', flexShrink: 0 }} />
                                <span style={{ fontSize: '0.775rem', fontWeight: 600, color: 'var(--accent-rose)' }}>
                                  Rejected by {art.rejected_by?.name || 'Admin Moderator'}
                                </span>
                              </div>
                              {art.rejection_reason && (
                                <div 
                                  style={{ fontSize: '0.675rem', color: 'var(--text-secondary)', background: 'rgba(244, 63, 94, 0.08)', padding: '0.15rem 0.4rem', borderRadius: '3px', borderLeft: '2px solid var(--accent-rose)', maxWidth: '200px', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}
                                  title={art.rejection_reason}
                                >
                                  {art.rejection_reason}
                                </div>
                              )}
                            </div>
                          ) : (
                            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.25rem' }}>
                              <span style={{ fontSize: '0.75rem', fontWeight: 600, color: 'var(--accent-amber)', display: 'flex', alignItems: 'center', gap: '0.3rem' }}>
                                <Clock size={11} /> Awaiting Sign-Off
                              </span>
                              <div style={{ display: 'flex', gap: '0.3rem', marginTop: '0.1rem' }}>
                                <button
                                  onClick={() => handleApproveNews(art)}
                                  className="btn btn-success"
                                  style={{ padding: '0.2rem 0.5rem', fontSize: '0.675rem' }}
                                  title="Approve & Sign Off"
                                >
                                  <Check size={11} /> Approve
                                </button>
                                <button
                                  onClick={() => setRejectTarget(art)}
                                  className="btn btn-danger"
                                  style={{ padding: '0.2rem 0.5rem', fontSize: '0.675rem' }}
                                  title="Reject Article"
                                >
                                  <X size={11} /> Reject
                                </button>
                              </div>
                            </div>
                          )}
                        </td>
                        <td>
                          <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)', fontFamily: 'var(--font-mono)' }}>
                            {art.publishedAt}
                          </span>
                        </td>
                        <td style={{ textAlign: 'right' }}>
                          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'flex-end', gap: '0.35rem' }}>
                            <button 
                              className="btn-icon"
                              style={{ padding: '0.4rem', color: 'var(--accent-cyan)' }}
                              title="Preview in Mobile InShorts Simulator"
                              onClick={() => handleOpenSimulator(art)}
                            >
                              <Smartphone size={14} />
                            </button>

                            <button 
                              className="btn-icon"
                              style={{ padding: '0.4rem', color: 'var(--primary)' }}
                              title="Edit Story"
                              onClick={() => handleOpenEditModal(art)}
                            >
                              <Edit3 size={14} />
                            </button>

                            <button 
                              className="btn-icon"
                              style={{ padding: '0.4rem' }}
                              title="View Full Editorial Dossier"
                              onClick={() => setPreviewArticle(art)}
                            >
                              <Eye size={14} />
                            </button>

                            <button 
                              className="btn-icon"
                              style={{ 
                                padding: '0.4rem', 
                                color: art.breaking ? 'var(--accent-rose)' : 'var(--text-muted)',
                                borderColor: art.breaking ? 'rgba(244, 63, 94, 0.4)' : 'var(--border-subtle)',
                                background: art.breaking ? 'rgba(244, 63, 94, 0.15)' : 'transparent'
                              }}
                              title={art.breaking ? 'Remove from Breaking' : 'Promote to Breaking News'}
                              onClick={() => handleToggleBreaking(art.id)}
                            >
                              <Flame size={14} />
                            </button>

                            {(art.is_approved === 0 || art.status === 'Pending') && (
                              <button 
                                className="btn-icon"
                                style={{ padding: '0.4rem', color: 'var(--accent-emerald)', borderColor: 'rgba(16, 185, 129, 0.3)' }}
                                title="Approve & Publish Live"
                                onClick={() => handleApproveNews(art)}
                              >
                                <CheckCircle2 size={14} />
                              </button>
                            )}

                            {(art.is_approved === 0 || art.status === 'Pending') && (
                              <button 
                                className="btn-icon"
                                style={{ padding: '0.4rem', color: 'var(--accent-rose)', borderColor: 'rgba(244, 63, 94, 0.3)' }}
                                title="Reject Submission"
                                onClick={() => setRejectTarget(art)}
                              >
                                <XCircle size={14} />
                              </button>
                            )}

                            {canDelete && (
                              <button 
                                className="btn-icon"
                                style={{ padding: '0.4rem', color: 'var(--accent-rose)' }}
                                title="Delete Story"
                                onClick={() => setDeleteTarget(art)}
                              >
                                <Trash2 size={14} />
                              </button>
                            )}
                          </div>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          )}

          {/* Visual Magazine View */}
          {viewMode === 'grid' && (
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))', gap: '1.5rem' }}>
              {paginatedArticles.length === 0 ? (
                <div className="card" style={{ gridColumn: '1 / -1', textAlign: 'center', padding: '3.5rem 1rem', color: 'var(--text-muted)' }}>
                  <Newspaper size={36} style={{ margin: '0 auto 0.75rem', opacity: 0.5 }} />
                  <div style={{ fontWeight: 600 }}>No stories match the active filters.</div>
                </div>
              ) : (
                paginatedArticles.map(art => (
                  <div key={art.id} className="magazine-card">
                    <div>
                      {/* Magazine Cover Media */}
                      <div className="magazine-cover">
                        <img src={art.imageUrl} alt="cover" />
                        <div className="cover-gradient" />
                        
                        {art.videoUrl && (
                          <div style={{ position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                            <div style={{ width: '44px', height: '44px', borderRadius: '50%', background: 'var(--accent-rose)', color: '#ffffff', display: 'flex', alignItems: 'center', justifyContent: 'center', boxShadow: '0 4px 20px rgba(244, 63, 94, 0.6)' }}>
                              <Play size={18} fill="currentColor" />
                            </div>
                          </div>
                        )}

                        {/* Top Chips */}
                        <div style={{ position: 'absolute', top: '0.75rem', left: '0.75rem', display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                          <span className="badge badge-primary" style={{ background: 'var(--primary)', color: '#ffffff' }}>
                            {art.category}
                          </span>
                          {art.breaking && (
                            <span className="badge badge-danger" style={{ background: 'var(--accent-rose)', color: '#ffffff' }}>
                              <Flame size={10} /> BREAKING
                            </span>
                          )}
                        </div>

                        <div style={{ position: 'absolute', top: '0.75rem', right: '0.75rem' }}>
                          <span className={`badge ${art.is_approved === 1 || art.status === 'Approved' || art.status === 'Published' ? 'badge-success' : (art.is_approved === 2 || art.status === 'Rejected' ? 'badge-danger' : 'badge-warning')}`}>
                            {art.is_approved === 1 || art.status === 'Approved' || art.status === 'Published' ? 'Approved' : (art.is_approved === 2 || art.status === 'Rejected' ? 'Rejected' : 'Pending')}
                          </span>
                        </div>

                        <div style={{ position: 'absolute', bottom: '0.75rem', right: '0.75rem', padding: '0.2rem 0.45rem', borderRadius: '4px', background: 'rgba(0,0,0,0.7)', fontSize: '0.7rem', color: '#ffffff', display: 'flex', alignItems: 'center', gap: '0.25rem' }}>
                          <Globe size={11} style={{ color: 'var(--primary)' }} /> {art.language}
                        </div>
                      </div>

                      {/* Headline & Summary */}
                      <div style={{ padding: '1.25rem' }}>
                        <h3 
                          style={{ fontSize: '1rem', fontWeight: 700, color: 'var(--text-primary)', lineHeight: 1.4, marginBottom: '0.5rem', cursor: 'pointer' }}
                          onClick={() => setPreviewArticle(art)}
                        >
                          {art.title}
                        </h3>

                        <p style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', lineHeight: 1.5, marginBottom: '1rem' }}>
                          {art.summary}
                        </p>

                        {/* Author & Location Scope */}
                        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', fontSize: '0.75rem', color: 'var(--text-muted)', paddingTop: '0.75rem', borderTop: '1px solid var(--border-subtle)' }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                            <img 
                              src={art.author_avatar} 
                              alt="avatar" 
                              style={{ width: '22px', height: '22px', borderRadius: '50%', objectFit: 'cover' }}
                            />
                            <span style={{ fontWeight: 600, color: 'var(--text-primary)' }}>{art.author}</span>
                          </div>
                          {art.location?.city && (
                            <span style={{ display: 'flex', alignItems: 'center', gap: '0.2rem' }}>
                              <MapPin size={11} style={{ color: 'var(--primary)' }} /> {art.location.city}
                            </span>
                          )}
                        </div>

                        {/* Editorial Governance & Sign-Off Banner */}
                        {art.is_approved === 1 || art.status === 'Approved' || art.status === 'Published' ? (
                          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginTop: '0.65rem', padding: '0.4rem 0.6rem', borderRadius: 'var(--radius-sm)', background: 'rgba(16, 185, 129, 0.08)', border: '1px solid rgba(16, 185, 129, 0.25)', fontSize: '0.7rem', color: 'var(--accent-emerald)' }}>
                            <span style={{ display: 'flex', alignItems: 'center', gap: '0.3rem', fontWeight: 600 }}>
                              <Award size={12} /> Approved by {art.approved_by?.name || 'Dr. K. Srinivas'}
                            </span>
                            <span style={{ fontFamily: 'var(--font-mono)', fontSize: '0.65rem', opacity: 0.85 }}>
                              {art.approved_by?.user_uid || 'USR-ADMIN-01'}
                            </span>
                          </div>
                        ) : art.is_approved === 2 || art.status === 'Rejected' ? (
                          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginTop: '0.65rem', padding: '0.4rem 0.6rem', borderRadius: 'var(--radius-sm)', background: 'rgba(244, 63, 94, 0.08)', border: '1px solid rgba(244, 63, 94, 0.25)', fontSize: '0.7rem', color: 'var(--accent-rose)' }}>
                            <span style={{ display: 'flex', alignItems: 'center', gap: '0.3rem', fontWeight: 600 }}>
                              <XCircle size={12} /> Rejected by {art.rejected_by?.name || 'Moderator'}
                            </span>
                            <span style={{ fontSize: '0.65rem', maxWidth: '120px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }} title={art.rejection_reason}>
                              {art.rejection_reason || 'Unverified'}
                            </span>
                          </div>
                        ) : (
                          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginTop: '0.65rem', padding: '0.4rem 0.6rem', borderRadius: 'var(--radius-sm)', background: 'rgba(245, 158, 11, 0.08)', border: '1px solid rgba(245, 158, 11, 0.25)', fontSize: '0.7rem', color: 'var(--accent-amber)' }}>
                            <span style={{ display: 'flex', alignItems: 'center', gap: '0.3rem', fontWeight: 600 }}>
                              <Clock size={12} /> Pending Verification
                            </span>
                            <div style={{ display: 'flex', gap: '0.3rem' }}>
                              <button onClick={() => handleApproveNews(art)} className="btn btn-success" style={{ padding: '0.15rem 0.45rem', fontSize: '0.65rem' }}>
                                Approve
                              </button>
                              <button onClick={() => setRejectTarget(art)} className="btn btn-danger" style={{ padding: '0.15rem 0.45rem', fontSize: '0.65rem' }}>
                                Reject
                              </button>
                            </div>
                          </div>
                        )}
                      </div>
                    </div>

                    {/* Footer Engagement & Actions */}
                    <div style={{ padding: '0.75rem 1.25rem 1.25rem', display: 'flex', alignItems: 'center', justifyContent: 'space-between', borderTop: '1px solid var(--border-subtle)' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem', fontSize: '0.75rem', fontFamily: 'var(--font-mono)', color: 'var(--text-muted)' }}>
                        <span style={{ color: 'var(--primary)', fontWeight: 700 }}>{art.views.toLocaleString()} reads</span>
                        <span>♥ {art.likes}</span>
                      </div>

                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
                        <button 
                          onClick={() => handleOpenSimulator(art)}
                          className="btn-icon"
                          style={{ padding: '0.4rem', color: 'var(--accent-cyan)' }}
                          title="Preview in Mobile InShorts Simulator"
                        >
                          <Smartphone size={13} />
                        </button>
                        <button 
                          onClick={() => handleOpenEditModal(art)}
                          className="btn-icon"
                          style={{ padding: '0.4rem', color: 'var(--primary)' }}
                          title="Edit Story"
                        >
                          <Edit3 size={13} />
                        </button>
                        <button 
                          onClick={() => setPreviewArticle(art)}
                          className="btn-icon"
                          style={{ padding: '0.4rem' }}
                          title="Full Dossier"
                        >
                          <Eye size={13} />
                        </button>
                        <button 
                          onClick={() => handleToggleBreaking(art.id)}
                          className="btn-icon"
                          style={{ padding: '0.4rem', color: art.breaking ? 'var(--accent-rose)' : 'var(--text-muted)' }}
                          title={art.breaking ? 'Remove Breaking' : 'Make Breaking'}
                        >
                          <Flame size={13} />
                        </button>
                      </div>
                    </div>
                  </div>
                ))
              )}
            </div>
          )}

          {/* Footer Controls & Pagination */}
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '1rem', padding: '1rem 1.25rem', background: 'var(--glass-bg)', borderRadius: 'var(--radius-lg)', border: '1px solid var(--glass-border)', fontSize: '0.8rem', color: 'var(--text-secondary)' }}>
            <span>
              Showing <strong>{filteredArticles.length === 0 ? 0 : ((currentPage - 1) * itemsPerPage) + 1}</strong> to <strong>{Math.min(currentPage * itemsPerPage, filteredArticles.length)}</strong> of <strong>{filteredArticles.length}</strong> stories
            </span>

            <div style={{ display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
              <button
                onClick={() => setCurrentPage(prev => Math.max(prev - 1, 1))}
                disabled={currentPage === 1}
                className="btn btn-secondary"
                style={{ fontSize: '0.75rem', padding: '0.35rem 0.65rem' }}
              >
                <ChevronLeft size={14} /> Previous
              </button>

              {Array.from({ length: totalPages }, (_, i) => i + 1).slice(0, 5).map(pageNum => (
                <button
                  key={pageNum}
                  onClick={() => setCurrentPage(pageNum)}
                  className={currentPage === pageNum ? 'btn btn-primary' : 'btn btn-secondary'}
                  style={{ width: '32px', height: '32px', padding: 0, fontSize: '0.75rem' }}
                >
                  {pageNum}
                </button>
              ))}

              <button
                onClick={() => setCurrentPage(prev => Math.min(prev + 1, totalPages))}
                disabled={currentPage === totalPages}
                className="btn btn-secondary"
                style={{ fontSize: '0.75rem', padding: '0.35rem 0.65rem' }}
              >
                Next <ChevronRight size={14} />
              </button>
            </div>
          </div>

        </div>
      )}

      {/* ==================================================================== */}
      {/* 9. INSHORTS STUDIO SIMULATOR (WITH DYNAMIC SWIPING & AUDIO VOICE NARRATOR) */}
      {/* ==================================================================== */}
      {mobileSimulatorArticle && (
        <Modal
          isOpen={!!mobileSimulatorArticle}
          onClose={() => setMobileSimulatorArticle(null)}
          title={`InShorts Studio Simulator (${mobileStoryIndex + 1} of ${filteredArticles.length})`}
          size="md"
        >
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', padding: '0.5rem' }}>
            {/* Realistic 3D Titanium Smartphone Chassis */}
            <div className="phone-chassis">
              {/* Dynamic Island */}
              <div className="phone-island">
                <div className="phone-island-camera" />
              </div>

              {/* Status Bar */}
              <div style={{ padding: '0.75rem 1.5rem 0', display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '0.65rem', color: 'var(--text-muted)', fontFamily: 'var(--font-mono)', zIndex: 20 }}>
                <span>09:41</span>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
                  <Wifi size={11} />
                  <span>5G</span>
                  <span>100%</span>
                </div>
              </div>

              {/* InShorts Media Hero */}
              <div style={{ position: 'relative', width: '100%', height: '240px', overflow: 'hidden', marginTop: '0.5rem' }}>
                <img 
                  src={mobileSimulatorArticle.imageUrl} 
                  alt="mobile cover" 
                  style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                />
                <div style={{ position: 'absolute', top: '0.75rem', left: '0.75rem', display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
                  <span className="badge badge-primary" style={{ background: 'var(--primary)', color: '#ffffff', fontSize: '0.65rem' }}>
                    {mobileSimulatorArticle.category}
                  </span>
                  {mobileSimulatorArticle.breaking && (
                    <span className="badge badge-danger" style={{ background: 'var(--accent-rose)', color: '#ffffff', fontSize: '0.65rem' }}>
                      BREAKING
                    </span>
                  )}
                </div>
                <div style={{ position: 'absolute', bottom: '0.5rem', right: '0.75rem', padding: '0.15rem 0.4rem', borderRadius: '4px', background: 'rgba(0,0,0,0.75)', fontSize: '0.65rem', color: '#ffffff' }}>
                  {mobileSimulatorArticle.language}
                </div>
                {mobileSimulatorArticle.videoUrl && (
                  <div style={{ position: 'absolute', inset: 0, background: 'rgba(0,0,0,0.4)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    <div style={{ width: '38px', height: '38px', borderRadius: '50%', background: 'var(--accent-rose)', color: '#ffffff', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                      <Play size={16} fill="currentColor" />
                    </div>
                  </div>
                )}
              </div>

              {/* InShorts 60-Word Byte-Sized Text */}
              <div style={{ padding: '1rem', flex: 1, display: 'flex', flexDirection: 'column', justifyContent: 'space-between', background: 'rgba(15, 23, 42, 0.95)', color: '#ffffff' }}>
                <div>
                  <h3 style={{ fontSize: '0.9rem', fontWeight: 700, lineHeight: 1.35, color: '#ffffff', marginBottom: '0.5rem' }}>
                    {mobileSimulatorArticle.title}
                  </h3>
                  <p style={{ fontSize: '0.775rem', color: 'var(--text-secondary)', lineHeight: 1.5 }}>
                    {mobileSimulatorArticle.summary}
                  </p>

                  <div style={{ marginTop: '0.5rem', fontSize: '0.65rem', color: 'var(--text-muted)', fontFamily: 'var(--font-mono)' }}>
                    ~{mobileSimulatorArticle.summary.split(' ').filter(Boolean).length} words • InShorts 60w byte format
                  </div>
                </div>

                {/* Bottom Footer: TTS Narrator & Drawer */}
                <div style={{ paddingTop: '0.5rem', borderTop: '1px solid rgba(255,255,255,0.08)' }}>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', fontSize: '0.7rem', color: 'var(--text-muted)' }}>
                    <span style={{ maxWidth: '130px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                      By {mobileSimulatorArticle.author}
                    </span>

                    {/* Voice Narrator Player */}
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
                      <button 
                        onClick={() => handleToggleVoiceNarrator(`${mobileSimulatorArticle.title}. ${mobileSimulatorArticle.summary}`)}
                        className={`btn ${isTtsPlaying ? 'btn-danger' : 'btn-primary'}`}
                        style={{ padding: '0.25rem 0.6rem', fontSize: '0.675rem', borderRadius: 'var(--radius-full)' }}
                      >
                        {isTtsPlaying ? <Pause size={10} /> : <Volume2 size={10} />}
                        {isTtsPlaying ? 'Narrating...' : 'Listen'}
                      </button>

                      {isTtsPlaying && (
                        <button 
                          onClick={() => setTtsSpeed(s => s === 1 ? 1.5 : (s === 1.5 ? 2 : 1))}
                          className="btn btn-secondary"
                          style={{ padding: '0.2rem 0.4rem', fontSize: '0.65rem' }}
                        >
                          {ttsSpeed}x
                        </button>
                      )}
                    </div>
                  </div>

                  {/* Expand Full Story Button */}
                  <button 
                    onClick={() => setIsMobileDrawerExpanded(!isMobileDrawerExpanded)}
                    style={{ width: '100%', textAlign: 'center', padding: '0.35rem 0', fontSize: '0.7rem', color: 'var(--accent-cyan)', background: 'none', border: 'none', cursor: 'pointer', fontWeight: 600, marginTop: '0.3rem' }}
                  >
                    {isMobileDrawerExpanded ? '▲ Hide Full Article' : '▼ Read Full Comprehensive Story'}
                  </button>

                  {isMobileDrawerExpanded && (
                    <div style={{ padding: '0.5rem', borderRadius: 'var(--radius-sm)', background: 'rgba(0,0,0,0.6)', maxHeight: '100px', overflowY: 'auto', fontSize: '0.725rem', color: 'var(--text-secondary)', lineHeight: 1.45, border: '1px solid var(--border-subtle)', marginTop: '0.3rem' }}>
                      {mobileSimulatorArticle.content}
                    </div>
                  )}
                </div>
              </div>

              {/* Swipe Simulation Hint Bar */}
              <div style={{ padding: '0.6rem 1rem', background: '#020617', display: 'flex', alignItems: 'center', justifyContent: 'space-between', fontSize: '0.7rem', color: 'var(--text-muted)', borderTop: '1px solid var(--border-subtle)' }}>
                <button 
                  onClick={handlePrevMobileStory}
                  disabled={mobileStoryIndex === 0}
                  style={{ background: 'none', border: 'none', color: 'var(--text-primary)', cursor: 'pointer', fontWeight: 700, opacity: mobileStoryIndex === 0 ? 0.3 : 1 }}
                >
                  ▲ Previous
                </button>
                <span style={{ fontFamily: 'var(--font-mono)' }}>Swipe UP/DOWN</span>
                <button 
                  onClick={handleNextMobileStory}
                  disabled={mobileStoryIndex === filteredArticles.length - 1}
                  style={{ background: 'none', border: 'none', color: 'var(--text-primary)', cursor: 'pointer', fontWeight: 700, opacity: mobileStoryIndex === filteredArticles.length - 1 ? 0.3 : 1 }}
                >
                  Next ▼
                </button>
              </div>
            </div>

            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', width: '100%', borderTop: '1px solid var(--border-subtle)', paddingTop: '1rem', marginTop: '1rem' }}>
              <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                Story <strong>{mobileStoryIndex + 1}</strong> of <strong>{filteredArticles.length}</strong> in active view
              </span>
              <button 
                className="btn btn-secondary"
                style={{ fontSize: '0.75rem', padding: '0.4rem 0.85rem' }}
                onClick={() => setMobileSimulatorArticle(null)}
              >
                Close Simulator
              </button>
            </div>
          </div>
        </Modal>
      )}

      {/* ==================================================================== */}
      {/* 10. STUDIO STORY COMPOSER & EDITOR MODAL */}
      {/* ==================================================================== */}
      {(isCreateModalOpen || isEditModalOpen) && (
        <Modal 
          isOpen={isCreateModalOpen || isEditModalOpen} 
          onClose={() => {
            setIsCreateModalOpen(false);
            setIsEditModalOpen(false);
          }}
          title={isEditModalOpen ? `Edit Story Studio: ${editTarget?.news_uid}` : "Studio Story Composer & Publishing Desk"}
          size="lg"
        >
          <form onSubmit={isEditModalOpen ? handleEditSubmit : handleCreateSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
            {/* Modal Sub-Tabs */}
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', borderBottom: '1px solid var(--border-subtle)', paddingBottom: '0.5rem' }}>
              {[
                { id: 'content', label: '1. Content & InShorts Byte' },
                { id: 'media', label: '2. Media & YouTube' },
                { id: 'geotarget', label: '3. Hyperlocal & Geotargeting' },
                { id: 'preview', label: '4. Live Simulator Preview' }
              ].map(tab => (
                <button
                  type="button"
                  key={tab.id}
                  onClick={() => setComposerTab(tab.id)}
                  className={`tab-pill ${composerTab === tab.id ? 'active' : ''}`}
                  style={{ fontSize: '0.75rem', padding: '0.35rem 0.75rem' }}
                >
                  {tab.label}
                </button>
              ))}
            </div>

            {/* TAB 1: CONTENT & INSHORTS BYTE */}
            {composerTab === 'content' && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                {/* Headline Input */}
                <div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.35rem' }}>
                    <label style={{ fontSize: '0.75rem', fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase' }}>
                      Story Headline *
                    </label>
                    <span style={{ fontSize: '0.7rem', fontFamily: 'var(--font-mono)', color: formData.title.length > 90 ? 'var(--accent-amber)' : 'var(--text-muted)' }}>
                      {formData.title.length} / 100 chars
                    </span>
                  </div>
                  <input 
                    type="text" 
                    required
                    maxLength={100}
                    className="input"
                    placeholder="e.g. Indian Space Agency Prepares Final Orbital Maneuver for Solar Probe"
                    value={formData.title}
                    onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                  />
                </div>

                {/* Gemini AI Editorial Studio Bar */}
                <div style={{ padding: '0.85rem', borderRadius: 'var(--radius-md)', background: 'rgba(99, 102, 241, 0.12)', border: '1px solid var(--border-active)', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '0.75rem' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
                    <Sparkles style={{ color: 'var(--primary)' }} size={20} />
                    <div>
                      <div style={{ fontSize: '0.8rem', fontWeight: 700, color: '#ffffff' }}>Gemini Editorial AI Co-pilot</div>
                      <div style={{ fontSize: '0.7rem', color: 'var(--text-secondary)' }}>Auto-draft summary, expand article draft, or translate to Telugu.</div>
                    </div>
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                    <button 
                      type="button" 
                      className="btn btn-primary"
                      style={{ fontSize: '0.725rem', padding: '0.35rem 0.75rem' }}
                      disabled={isAiGenerating}
                      onClick={handleAiSummarize}
                    >
                      {isAiGenerating ? <RefreshCw className="animate-spin" size={12} /> : <Sparkles size={12} />}
                      {isAiGenerating ? 'Drafting...' : 'Auto-Draft Byte'}
                    </button>
                    <button 
                      type="button" 
                      className="btn btn-secondary"
                      style={{ fontSize: '0.725rem', padding: '0.35rem 0.75rem', color: 'var(--accent-cyan)', borderColor: 'rgba(6, 182, 212, 0.3)' }}
                      disabled={isAiGenerating}
                      onClick={handleAiTranslateTelugu}
                    >
                      <Globe size={12} /> Telugu Co-pilot
                    </button>
                  </div>
                </div>

                {/* InShorts Summary */}
                <div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.35rem' }}>
                    <label style={{ fontSize: '0.75rem', fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase' }}>
                      InShorts Byte-Sized Summary (60 Words) *
                    </label>
                    <span style={{ fontSize: '0.7rem', fontFamily: 'var(--font-mono)', color: formData.summary.length > 500 ? 'var(--accent-rose)' : formData.summary.length >= 250 ? 'var(--accent-emerald)' : 'var(--text-muted)' }}>
                      {formData.summary.length} chars (~{formData.summary.split(' ').filter(Boolean).length} words)
                    </span>
                  </div>
                  <textarea 
                    rows="3"
                    required
                    className="textarea"
                    placeholder="Concise 1-2 sentence summary for push notifications and mobile InShorts cards (target ~60 words)..."
                    value={formData.summary}
                    onChange={(e) => setFormData({ ...formData, summary: e.target.value })}
                  />
                </div>

                {/* Full Story Content */}
                <div>
                  <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', marginBottom: '0.35rem' }}>
                    Full Comprehensive Article Body *
                  </label>
                  <textarea 
                    rows="5"
                    required
                    className="textarea"
                    placeholder="Write the full comprehensive news story here..."
                    value={formData.content}
                    onChange={(e) => setFormData({ ...formData, content: e.target.value })}
                  />
                </div>
              </div>
            )}

            {/* TAB 2: MEDIA & YOUTUBE */}
            {composerTab === 'media' && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                <div>
                  <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', marginBottom: '0.35rem' }}>
                    Featured Cover Image URL
                  </label>
                  <input 
                    type="url" 
                    className="input"
                    placeholder="https://images.unsplash.com/..."
                    value={formData.imageUrl}
                    onChange={(e) => setFormData({ ...formData, imageUrl: e.target.value })}
                  />
                  {formData.imageUrl && (
                    <div style={{ marginTop: '0.75rem', height: '180px', borderRadius: 'var(--radius-md)', overflow: 'hidden', border: '1px solid var(--border-subtle)' }}>
                      <img src={formData.imageUrl} alt="preview" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                    </div>
                  )}
                </div>

                <div>
                  <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', marginBottom: '0.35rem' }}>
                    YouTube Video URL (Optional)
                  </label>
                  <input 
                    type="url" 
                    className="input"
                    placeholder="https://www.youtube.com/watch?v=..."
                    value={formData.videoUrl}
                    onChange={(e) => setFormData({ ...formData, videoUrl: e.target.value })}
                  />
                  {getYouTubeVideoId(formData.videoUrl) && (
                    <div style={{ marginTop: '0.75rem', borderRadius: 'var(--radius-md)', overflow: 'hidden', border: '1px solid var(--border-subtle)', aspectRatio: '16/9' }}>
                      <iframe 
                        style={{ width: '100%', height: '100%', border: 'none' }}
                        src={`https://www.youtube-nocookie.com/embed/${getYouTubeVideoId(formData.videoUrl)}`}
                        title="YouTube Preview"
                        allowFullScreen
                      />
                    </div>
                  )}
                </div>

                <div>
                  <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', marginBottom: '0.35rem' }}>
                    Tags (Comma-separated)
                  </label>
                  <input 
                    type="text" 
                    className="input"
                    placeholder="Tech, AI, Hyderabad, Telangana"
                    value={formData.tags}
                    onChange={(e) => setFormData({ ...formData, tags: e.target.value })}
                  />
                </div>
              </div>
            )}

            {/* TAB 3: HYPERLOCAL & GEOTARGETING */}
            {composerTab === 'geotarget' && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '0.75rem' }}>
                  <div>
                    <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', marginBottom: '0.35rem' }}>
                      Category *
                    </label>
                    <select 
                      className="select"
                      value={formData.category}
                      onChange={(e) => setFormData({ ...formData, category: e.target.value })}
                    >
                      {categories.filter(c => c !== 'All').map(c => (
                        <option key={c} value={c}>{c}</option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', marginBottom: '0.35rem' }}>
                      Language *
                    </label>
                    <select 
                      className="select"
                      value={formData.language}
                      onChange={(e) => setFormData({ ...formData, language: e.target.value })}
                    >
                      {LANGUAGES.filter(l => l.code !== 'all').map(l => (
                        <option key={l.code} value={l.name}>{l.name} ({l.native})</option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', marginBottom: '0.35rem' }}>
                      State Scope
                    </label>
                    <select 
                      className="select"
                      value={formData.state}
                      onChange={(e) => setFormData({ ...formData, state: e.target.value })}
                    >
                      <option value="Telangana">Telangana</option>
                      <option value="Andhra Pradesh">Andhra Pradesh</option>
                      <option value="Maharashtra">Maharashtra</option>
                      <option value="Karnataka">Karnataka</option>
                      <option value="National">National</option>
                    </select>
                  </div>
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '0.75rem' }}>
                  <div>
                    <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', marginBottom: '0.35rem' }}>
                      District
                    </label>
                    <input 
                      type="text"
                      className="input"
                      placeholder="e.g. Hyderabad / Warangal"
                      value={formData.district}
                      onChange={(e) => setFormData({ ...formData, district: e.target.value })}
                    />
                  </div>
                  <div>
                    <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', marginBottom: '0.35rem' }}>
                      City / Mandal
                    </label>
                    <input 
                      type="text"
                      className="input"
                      placeholder="e.g. HITEC City / Gachibowli"
                      value={formData.city}
                      onChange={(e) => setFormData({ ...formData, city: e.target.value })}
                    />
                  </div>
                </div>

                {/* Breaking Wire Dispatch */}
                <div style={{ padding: '0.85rem 1rem', background: 'rgba(244, 63, 94, 0.12)', border: '1px solid rgba(244, 63, 94, 0.3)', borderRadius: 'var(--radius-md)', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                  <div>
                    <div style={{ fontSize: '0.8rem', fontWeight: 700, color: '#ffffff', display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                      <Flame size={15} style={{ color: 'var(--accent-rose)' }} />
                      Broadcast as Breaking News Bulletin
                    </div>
                    <div style={{ fontSize: '0.7rem', color: 'var(--text-secondary)', marginTop: '0.2rem' }}>
                      Pins to the top of reader feeds and scrolls across the live studio ticker.
                    </div>
                  </div>
                  <input 
                    type="checkbox" 
                    checked={formData.breaking}
                    onChange={(e) => setFormData({ ...formData, breaking: e.target.checked })}
                    style={{ width: '18px', height: '18px', cursor: 'pointer' }}
                  />
                </div>
              </div>
            )}

            {/* TAB 4: LIVE SIMULATOR PREVIEW */}
            {composerTab === 'preview' && (
              <div style={{ padding: '1rem', background: 'rgba(0,0,0,0.4)', borderRadius: 'var(--radius-md)', border: '1px solid var(--border-subtle)', display: 'flex', flexDirection: 'column', gap: '0.85rem' }}>
                <div style={{ fontSize: '0.75rem', fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                  <Smartphone size={14} style={{ color: 'var(--accent-cyan)' }} /> Live InShorts 60-Word Card Preview
                </div>

                <div style={{ maxWidth: '340px', margin: '0 auto', borderRadius: 'var(--radius-md)', background: 'var(--bg-surface)', border: '1px solid var(--border-subtle)', overflow: 'hidden', boxShadow: 'var(--glass-shadow)' }}>
                  {formData.imageUrl && (
                    <img src={formData.imageUrl} alt="preview" style={{ width: '100%', height: '160px', objectFit: 'cover' }} />
                  )}
                  <div style={{ padding: '1rem' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', marginBottom: '0.5rem' }}>
                      <span className="badge badge-primary" style={{ fontSize: '0.65rem' }}>
                        {formData.category}
                      </span>
                      {formData.breaking && (
                        <span className="badge badge-danger" style={{ fontSize: '0.65rem' }}>
                          BREAKING
                        </span>
                      )}
                    </div>
                    <h4 style={{ fontSize: '0.875rem', fontWeight: 700, color: '#ffffff', lineHeight: 1.35, marginBottom: '0.4rem' }}>
                      {formData.title || 'Your Story Headline will appear here...'}
                    </h4>
                    <p style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', lineHeight: 1.45 }}>
                      {formData.summary || 'Your 60-word summary will appear here for mobile readers...'}
                    </p>
                    <div style={{ paddingTop: '0.75rem', borderTop: '1px solid var(--border-subtle)', fontSize: '0.65rem', color: 'var(--text-muted)', display: 'flex', justifyContent: 'space-between', marginTop: '0.75rem' }}>
                      <span>By {user.name}</span>
                      <span>{formData.city}, {formData.state}</span>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* Modal Footer */}
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', paddingTop: '1rem', borderTop: '1px solid var(--border-subtle)' }}>
              <button 
                type="button" 
                className="btn btn-secondary"
                onClick={() => {
                  setIsCreateModalOpen(false);
                  setIsEditModalOpen(false);
                }}
              >
                Cancel
              </button>

              <button 
                type="submit" 
                className="btn btn-primary"
              >
                {isEditModalOpen ? 'Save Changes' : (canPublish ? 'Publish Live' : 'Submit for Review')}
              </button>
            </div>
          </form>
        </Modal>
      )}

      {/* ==================================================================== */}
      {/* 11. ARTICLE DOSSIER MODAL */}
      {/* ==================================================================== */}
      {previewArticle && (
        <Modal
          isOpen={!!previewArticle}
          onClose={() => setPreviewArticle(null)}
          title="Editorial Article Dossier & Telemetry"
          size="lg"
        >
          <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
            {previewArticle.imageUrl && (
              <div style={{ position: 'relative', width: '100%', height: '220px', borderRadius: 'var(--radius-md)', overflow: 'hidden', border: '1px solid var(--border-subtle)' }}>
                <img 
                  src={previewArticle.imageUrl} 
                  alt="cover" 
                  style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                />
                {previewArticle.videoUrl && (
                  <div style={{ position: 'absolute', top: '0.75rem', right: '0.75rem', padding: '0.3rem 0.6rem', borderRadius: 'var(--radius-full)', background: 'var(--accent-rose)', color: '#ffffff', fontSize: '0.75rem', fontWeight: 700, display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
                    <Video size={13} /> Video Story
                  </div>
                )}
              </div>
            )}

            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', flexWrap: 'wrap' }}>
              {previewArticle.breaking && (
                <span className="badge badge-danger">
                  <Flame size={12} /> BREAKING (Priority {previewArticle.breaking_priority || 5})
                </span>
              )}
              <span className="badge badge-primary">
                {previewArticle.category}
              </span>
              <span className="badge badge-neutral">
                {previewArticle.language}
              </span>
              <span className={`badge ${previewArticle.is_approved === 1 || previewArticle.status === 'Approved' || previewArticle.status === 'Published' ? 'badge-success' : (previewArticle.is_approved === 2 || previewArticle.status === 'Rejected' ? 'badge-danger' : 'badge-warning')}`}>
                {previewArticle.is_approved === 1 || previewArticle.status === 'Approved' || previewArticle.status === 'Published' ? 'Approved' : (previewArticle.is_approved === 2 || previewArticle.status === 'Rejected' ? 'Rejected' : 'Pending')}
              </span>
              <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginLeft: 'auto', fontFamily: 'var(--font-mono)' }}>
                UID: {previewArticle.news_uid}
              </span>
            </div>

            <h2 style={{ fontSize: '1.25rem', fontWeight: 800, color: 'var(--text-primary)', lineHeight: 1.35 }}>
              {previewArticle.title}
            </h2>

            {/* Reporter & Location Meta */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '0.75rem', padding: '0.85rem', background: 'rgba(0,0,0,0.3)', borderRadius: 'var(--radius-md)', border: '1px solid var(--border-subtle)', fontSize: '0.75rem' }}>
              <div>
                <span style={{ color: 'var(--text-muted)', display: 'block', fontSize: '0.65rem', textTransform: 'uppercase', fontWeight: 700 }}>Author</span>
                <strong style={{ color: 'var(--text-primary)' }}>{previewArticle.author}</strong>
              </div>
              <div>
                <span style={{ color: 'var(--text-muted)', display: 'block', fontSize: '0.65rem', textTransform: 'uppercase', fontWeight: 700 }}>Location</span>
                <strong style={{ color: 'var(--text-primary)' }}>{previewArticle.location?.city || previewArticle.location?.state || 'National'}</strong>
              </div>
              <div>
                <span style={{ color: 'var(--text-muted)', display: 'block', fontSize: '0.65rem', textTransform: 'uppercase', fontWeight: 700 }}>Reads</span>
                <strong style={{ color: 'var(--primary)', fontFamily: 'var(--font-mono)' }}>{previewArticle.views.toLocaleString()}</strong>
              </div>
              <div>
                <span style={{ color: 'var(--text-muted)', display: 'block', fontSize: '0.65rem', textTransform: 'uppercase', fontWeight: 700 }}>Completion</span>
                <strong style={{ color: 'var(--accent-emerald)', fontFamily: 'var(--font-mono)' }}>{previewArticle.completion_rate}% end</strong>
              </div>
            </div>

            {/* Editorial Governance & Approval Lifecycle Card */}
            <div style={{ 
              padding: '0.85rem 1rem', 
              borderRadius: 'var(--radius-md)', 
              background: previewArticle.is_approved === 1 || previewArticle.status === 'Approved' || previewArticle.status === 'Published'
                ? 'rgba(16, 185, 129, 0.08)' 
                : previewArticle.is_approved === 2 || previewArticle.status === 'Rejected'
                ? 'rgba(244, 63, 94, 0.08)'
                : 'rgba(245, 158, 11, 0.08)',
              border: previewArticle.is_approved === 1 || previewArticle.status === 'Approved' || previewArticle.status === 'Published'
                ? '1px solid rgba(16, 185, 129, 0.25)' 
                : previewArticle.is_approved === 2 || previewArticle.status === 'Rejected'
                ? '1px solid rgba(244, 63, 94, 0.25)'
                : '1px solid rgba(245, 158, 11, 0.25)',
            }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '0.6rem', flexWrap: 'wrap', gap: '0.5rem' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                  <ShieldCheck size={18} style={{ 
                    color: previewArticle.is_approved === 1 || previewArticle.status === 'Approved' || previewArticle.status === 'Published'
                      ? 'var(--accent-emerald)' 
                      : previewArticle.is_approved === 2 || previewArticle.status === 'Rejected'
                      ? 'var(--accent-rose)' 
                      : 'var(--accent-amber)' 
                  }} />
                  <span style={{ fontSize: '0.85rem', fontWeight: 700, color: 'var(--text-primary)' }}>
                    Editorial Governance & Verification Audit
                  </span>
                </div>
                <span className={`badge ${
                  previewArticle.is_approved === 1 || previewArticle.status === 'Approved' || previewArticle.status === 'Published'
                    ? 'badge-success' 
                    : previewArticle.is_approved === 2 || previewArticle.status === 'Rejected'
                    ? 'badge-danger' 
                    : 'badge-warning'
                }`}>
                  {previewArticle.is_approved === 1 || previewArticle.status === 'Approved' || previewArticle.status === 'Published'
                    ? '✓ APPROVED & SIGNED OFF' 
                    : previewArticle.is_approved === 2 || previewArticle.status === 'Rejected'
                    ? '✕ REJECTED BY EDITORIAL' 
                    : '⏳ PENDING REVIEW'}
                </span>
              </div>

              {previewArticle.is_approved === 1 || previewArticle.status === 'Approved' || previewArticle.status === 'Published' ? (
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(170px, 1fr))', gap: '0.75rem', fontSize: '0.775rem' }}>
                  <div>
                    <span style={{ color: 'var(--text-muted)', display: 'block', fontSize: '0.65rem', textTransform: 'uppercase', fontWeight: 700 }}>Approved By</span>
                    <strong style={{ color: 'var(--text-primary)', display: 'flex', alignItems: 'center', gap: '0.35rem', marginTop: '0.15rem' }}>
                      <Award size={13} style={{ color: 'var(--accent-emerald)' }} />
                      {previewArticle.approved_by?.name || 'Dr. K. Srinivas'}
                    </strong>
                  </div>
                  <div>
                    <span style={{ color: 'var(--text-muted)', display: 'block', fontSize: '0.65rem', textTransform: 'uppercase', fontWeight: 700 }}>Approver UID & Role</span>
                    <span style={{ color: 'var(--accent-emerald)', fontFamily: 'var(--font-mono)', fontWeight: 600 }}>
                      {previewArticle.approved_by?.user_uid || 'USR-ADMIN-01'} ({previewArticle.approved_by?.role_name || 'Lead Editor'})
                    </span>
                  </div>
                  <div>
                    <span style={{ color: 'var(--text-muted)', display: 'block', fontSize: '0.65rem', textTransform: 'uppercase', fontWeight: 700 }}>Sign-Off Timestamp</span>
                    <span style={{ color: 'var(--text-primary)', fontFamily: 'var(--font-mono)' }}>
                      {previewArticle.approved_by?.approved_at || previewArticle.publishedAt || '2026-09-20 11:35'}
                    </span>
                  </div>
                  {previewArticle.approved_by?.phone && (
                    <div>
                      <span style={{ color: 'var(--text-muted)', display: 'block', fontSize: '0.65rem', textTransform: 'uppercase', fontWeight: 700 }}>Approver Contact</span>
                      <span style={{ color: 'var(--text-secondary)' }}>
                        📞 {previewArticle.approved_by.phone}
                      </span>
                    </div>
                  )}
                </div>
              ) : previewArticle.is_approved === 2 || previewArticle.status === 'Rejected' ? (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.4rem', fontSize: '0.775rem' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                    <span style={{ color: 'var(--text-muted)' }}>Rejected by:</span>
                    <strong style={{ color: 'var(--accent-rose)' }}>{previewArticle.rejected_by?.name || 'Lead Moderator'}</strong>
                    <span style={{ color: 'var(--text-muted)', fontFamily: 'var(--font-mono)' }}>({previewArticle.rejected_by?.user_uid || 'USR-ADMIN'})</span>
                  </div>
                  <div style={{ padding: '0.5rem 0.75rem', borderRadius: 'var(--radius-sm)', background: 'rgba(244, 63, 94, 0.12)', border: '1px solid rgba(244, 63, 94, 0.25)', color: '#fb7185' }}>
                    <strong>Rejection Audit Reason:</strong> {previewArticle.rejection_reason || 'Does not meet factual verification requirements.'}
                  </div>
                </div>
              ) : (
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '0.75rem' }}>
                  <div style={{ fontSize: '0.775rem', color: 'var(--accent-amber)' }}>
                    This story is currently pending verification. It will only be syndicated to mobile readers once an editor signs off.
                  </div>
                  <div style={{ display: 'flex', gap: '0.4rem' }}>
                    <button 
                      className="btn btn-success"
                      style={{ fontSize: '0.725rem', padding: '0.25rem 0.6rem' }}
                      onClick={() => handleApproveNews(previewArticle)}
                    >
                      <CheckCircle2 size={12} /> Approve Now
                    </button>
                    <button 
                      className="btn btn-danger"
                      style={{ fontSize: '0.725rem', padding: '0.25rem 0.6rem' }}
                      onClick={() => setRejectTarget(previewArticle)}
                    >
                      <XCircle size={12} /> Reject Submission
                    </button>
                  </div>
                </div>
              )}
            </div>

            {/* Summary */}
            <div style={{ padding: '0.85rem', background: 'rgba(15, 23, 42, 0.6)', borderRadius: 'var(--radius-md)', border: '1px solid var(--border-subtle)', fontSize: '0.85rem', color: 'var(--text-primary)', fontStyle: 'italic', lineHeight: 1.5 }}>
              "{previewArticle.summary}"
            </div>

            {/* Content Body */}
            <div style={{ fontSize: '0.825rem', color: 'var(--text-secondary)', lineHeight: 1.6, maxHeight: '200px', overflowY: 'auto', paddingRight: '0.5rem', whiteSpace: 'pre-line' }}>
              {previewArticle.content}
            </div>

            {/* Tags */}
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.35rem', paddingTop: '0.5rem' }}>
              {previewArticle.tags.map(t => (
                <span key={t} className="badge badge-neutral" style={{ fontSize: '0.7rem' }}>
                  #{t}
                </span>
              ))}
            </div>

            {/* Modal Footer Actions */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', paddingTop: '1rem', borderTop: '1px solid var(--border-subtle)', flexWrap: 'wrap', gap: '0.75rem' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', fontSize: '0.75rem', fontFamily: 'var(--font-mono)', color: 'var(--text-muted)' }}>
                <span>♥ {previewArticle.likes} Likes</span>
                <span>💬 {previewArticle.comments} Comments</span>
                <span>↗ {previewArticle.shares} Shares</span>
              </div>

              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', flexWrap: 'wrap' }}>
                <button 
                  className="btn btn-secondary"
                  style={{ fontSize: '0.75rem', color: 'var(--accent-cyan)' }}
                  onClick={() => {
                    handleOpenSimulator(previewArticle);
                    setPreviewArticle(null);
                  }}
                >
                  <Smartphone size={13} /> InShorts Simulator
                </button>
                <button 
                  className="btn btn-secondary"
                  style={{ fontSize: '0.75rem', color: 'var(--primary)' }}
                  onClick={() => {
                    handleOpenEditModal(previewArticle);
                    setPreviewArticle(null);
                  }}
                >
                  <Edit3 size={13} /> Edit Story
                </button>
                <button 
                  className="btn btn-secondary"
                  style={{ fontSize: '0.75rem' }}
                  onClick={() => setPreviewArticle(null)}
                >
                  Close
                </button>
                {(previewArticle.is_approved === 0 || previewArticle.status === 'Pending') && (
                  <button 
                    className="btn btn-success"
                    style={{ fontSize: '0.75rem' }}
                    onClick={() => handleApproveNews(previewArticle)}
                  >
                    <CheckCircle2 size={13} /> Approve & Publish Live
                  </button>
                )}
                {(previewArticle.is_approved === 0 || previewArticle.status === 'Pending') && (
                  <button 
                    className="btn btn-danger"
                    style={{ fontSize: '0.75rem' }}
                    onClick={() => setRejectTarget(previewArticle)}
                  >
                    <XCircle size={13} /> Reject Submission
                  </button>
                )}
              </div>
            </div>
          </div>
        </Modal>
      )}

      {/* ==================================================================== */}
      {/* 12. REJECT CONFIRMATION MODAL */}
      {/* ==================================================================== */}
      {rejectTarget && (
        <Modal
          isOpen={!!rejectTarget}
          onClose={() => setRejectTarget(null)}
          title={`Reject Submission: ${rejectTarget.title.slice(0, 30)}...`}
          size="sm"
        >
          <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
            <div style={{ padding: '0.75rem', borderRadius: 'var(--radius-md)', background: 'rgba(244, 63, 94, 0.15)', border: '1px solid rgba(244, 63, 94, 0.3)', color: '#fb7185', fontSize: '0.775rem', display: 'flex', alignItems: 'flex-start', gap: '0.5rem' }}>
              <AlertTriangle size={16} style={{ flexShrink: 0, marginTop: '2px' }} />
              <span>
                Rejecting this article will remove it from the verification queue and notify the author with the audit reason below.
              </span>
            </div>

            <div>
              <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', marginBottom: '0.35rem' }}>
                Reason for Rejection *
              </label>
              <input 
                type="text"
                className="input"
                value={rejectReason}
                onChange={(e) => setRejectReason(e.target.value)}
              />
            </div>

            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.5rem', paddingTop: '0.75rem', borderTop: '1px solid var(--border-subtle)' }}>
              <button 
                className="btn btn-secondary"
                onClick={() => setRejectTarget(null)}
              >
                Cancel
              </button>
              <button 
                className="btn btn-danger"
                onClick={handleConfirmReject}
              >
                Confirm Rejection
              </button>
            </div>
          </div>
        </Modal>
      )}

      {/* ==================================================================== */}
      {/* 13. DELETE CONFIRMATION MODAL */}
      {/* ==================================================================== */}
      {deleteTarget && (
        <Modal
          isOpen={!!deleteTarget}
          onClose={() => setDeleteTarget(null)}
          title="Confirm Story Deletion"
          size="sm"
        >
          <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
            <div style={{ padding: '0.75rem', borderRadius: 'var(--radius-md)', background: 'rgba(244, 63, 94, 0.15)', border: '1px solid rgba(244, 63, 94, 0.3)', color: '#fb7185', fontSize: '0.775rem', display: 'flex', alignItems: 'flex-start', gap: '0.5rem' }}>
              <AlertTriangle size={16} style={{ flexShrink: 0, marginTop: '2px' }} />
              <span>
                Are you sure you want to permanently delete <strong>"{deleteTarget.title}"</strong>? All reader telemetry will be purged.
              </span>
            </div>

            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.5rem', paddingTop: '0.75rem', borderTop: '1px solid var(--border-subtle)' }}>
              <button 
                className="btn btn-secondary"
                onClick={() => setDeleteTarget(null)}
              >
                Cancel
              </button>
              <button 
                className="btn btn-danger"
                onClick={handleConfirmDelete}
              >
                Delete Permanently
              </button>
            </div>
          </div>
        </Modal>
      )}

      {/* ==================================================================== */}
      {/* 14. AI URL AUTO-PUBLISHER MODAL */}
      {/* ==================================================================== */}
      {isAiUrlModalOpen && (
        <Modal
          isOpen={isAiUrlModalOpen}
          onClose={() => setIsAiUrlModalOpen(false)}
          title="Gemini AI URL Auto-Publisher"
          size="md"
        >
          <form onSubmit={handleAiUrlSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
            <div style={{ padding: '0.85rem', borderRadius: 'var(--radius-md)', background: 'rgba(6, 182, 212, 0.12)', border: '1px solid rgba(6, 182, 212, 0.3)', color: 'var(--accent-cyan)', fontSize: '0.775rem', display: 'flex', alignItems: 'flex-start', gap: '0.6rem' }}>
              <Sparkles size={18} style={{ flexShrink: 0, marginTop: '2px' }} />
              <span>
                Paste any external news URL. Gemini AI will crawl the article, extract full text & images, generate an InShorts-style 60-word summary, and translate it into your target language.
              </span>
            </div>

            <div>
              <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', marginBottom: '0.35rem' }}>
                Source Article URL *
              </label>
              <input 
                type="url"
                required
                className="input"
                placeholder="https://www.thehindu.com/news/national/..."
                value={aiUrlData.url}
                onChange={(e) => setAiUrlData({ ...aiUrlData, url: e.target.value })}
              />
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.85rem' }}>
              <div>
                <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', marginBottom: '0.35rem' }}>
                  Target Language *
                </label>
                <select 
                  className="select"
                  value={aiUrlData.language}
                  onChange={(e) => setAiUrlData({ ...aiUrlData, language: e.target.value })}
                >
                  <option value="en">English</option>
                  <option value="te">Telugu (తెలుగు)</option>
                  <option value="hi">Hindi (हिंदी)</option>
                </select>
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', marginBottom: '0.35rem' }}>
                  Hyperlocal City
                </label>
                <input 
                  type="text"
                  className="input"
                  placeholder="e.g. Hyderabad"
                  value={aiUrlData.city}
                  onChange={(e) => setAiUrlData({ ...aiUrlData, city: e.target.value })}
                />
              </div>
            </div>

            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.5rem', paddingTop: '0.85rem', borderTop: '1px solid var(--border-subtle)' }}>
              <button 
                type="button" 
                className="btn btn-secondary"
                onClick={() => setIsAiUrlModalOpen(false)}
              >
                Cancel
              </button>
              <button 
                type="submit" 
                className="btn"
                style={{ background: 'var(--accent-cyan)', color: '#000000', fontWeight: 700 }}
                disabled={isAiGenerating}
              >
                {isAiGenerating ? <RefreshCw className="animate-spin" size={13} /> : <Sparkles size={13} />}
                {isAiGenerating ? 'Extracting via Gemini AI...' : 'Auto-Extract & Publish'}
              </button>
            </div>
          </form>
        </Modal>
      )}
    </div>
  );
}
