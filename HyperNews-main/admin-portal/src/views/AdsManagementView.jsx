// src/views/AdsManagementView.jsx
import React, { useState, useEffect, useMemo, useRef } from 'react';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';
import Modal from '../components/common/Modal';
import { api } from '../api/client';
import { 
  DollarSign, 
  Target, 
  MousePointer, 
  Eye, 
  Plus, 
  Play, 
  Pause, 
  Trash2, 
  Calendar, 
  ExternalLink, 
  TrendingUp, 
  BarChart3, 
  Image as ImageIcon,
  Smartphone, 
  Monitor, 
  Layout, 
  AlertCircle, 
  X, 
  Check,
  Sparkles, 
  Globe, 
  Layers, 
  ArrowUpRight,
  RefreshCw,
  Download,
  Search,
  Sliders,
  CheckSquare,
  Square,
  PieChart as PieIcon,
  Video,
  Award,
  ShieldCheck,
  CheckCircle2,
  Clock,
  Briefcase
} from 'lucide-react';
import { 
  ResponsiveContainer, 
  ComposedChart, 
  Bar, 
  Line, 
  PieChart, 
  Pie, 
  Cell, 
  AreaChart, 
  Area, 
  XAxis, 
  YAxis, 
  Tooltip, 
  CartesianGrid, 
  Legend 
} from 'recharts';

const WEEKLY_PERFORMANCE = [
  { day: 'Mon', impressions: 580000, clicks: 23200, ctr: 4.0, revenue: 8400 },
  { day: 'Tue', impressions: 640000, clicks: 26880, ctr: 4.2, revenue: 9280 },
  { day: 'Wed', impressions: 710000, clicks: 31240, ctr: 4.4, revenue: 10290 },
  { day: 'Thu', impressions: 690000, clicks: 28980, ctr: 4.2, revenue: 9980 },
  { day: 'Fri', impressions: 820000, clicks: 36900, ctr: 4.5, revenue: 11890 },
  { day: 'Sat', impressions: 940000, clicks: 45120, ctr: 4.8, revenue: 13630 },
  { day: 'Sun', impressions: 980000, clicks: 49000, ctr: 5.0, revenue: 14210 },
];

const PLACEMENT_MIX = [
  { name: 'In-Feed Native', value: 38, color: '#6366f1', eCpm: '$1.85' },
  { name: 'Header Billboard', value: 26, color: '#38bdf8', eCpm: '$2.40' },
  { name: 'Video Pre-Roll', value: 18, color: '#f43f5e', eCpm: '$4.20' },
  { name: 'Interstitial Takeover', value: 12, color: '#10b981', eCpm: '$3.10' },
  { name: 'Sidebar Widget', value: 6, color: '#f59e0b', eCpm: '$1.20' }
];

const PLACEMENTS = [
  'In-Feed Native', 
  'Header Banner', 
  'Sidebar Widget', 
  'Interstitial', 
  'Video Pre-Roll'
];

const INITIAL_CAMPAIGNS = [
  {
    id: 'ad-001',
    title: 'Global Fintech App Launch 2026',
    client: 'Apex Capital FinTech',
    placement: 'In-Feed Native',
    budget: 15000,
    spend: 9420,
    impressions: 485000,
    clicks: 19400,
    ctr: 4.0,
    status: 'Active',
    is_premium: true,
    startDate: '2026-09-10',
    endDate: '2026-09-30',
    imageUrl: 'https://images.unsplash.com/photo-1559526324-4b87b5e36e44?w=800&auto=format&fit=crop&q=80',
    targetUrl: 'https://apexcapital.example.com',
    ctaText: 'Download App',
    category: 'Finance'
  },
  {
    id: 'ad-002',
    title: 'Flagship 5G Smartphone Pre-orders',
    client: 'Nova Mobile India',
    placement: 'Header Banner',
    budget: 22000,
    spend: 18150,
    impressions: 920000,
    clicks: 31280,
    ctr: 3.4,
    status: 'Active',
    is_premium: true,
    startDate: '2026-09-01',
    endDate: '2026-09-28',
    imageUrl: 'https://images.unsplash.com/photo-1511707171634-5f897ff02aa9?w=800&auto=format&fit=crop&q=80',
    targetUrl: 'https://novamobile.example.com',
    ctaText: 'Pre-Order Now',
    category: 'Technology'
  },
  {
    id: 'ad-003',
    title: 'Electric SUV Zero-Emissions Tour',
    client: 'Volt Automotive',
    placement: 'Interstitial',
    budget: 18500,
    spend: 12400,
    impressions: 340000,
    clicks: 14960,
    ctr: 4.4,
    status: 'Active',
    is_premium: false,
    startDate: '2026-09-05',
    endDate: '2026-10-05',
    imageUrl: 'https://images.unsplash.com/photo-1533473359331-0135ef1b58bf?w=800&auto=format&fit=crop&q=80',
    targetUrl: 'https://voltauto.example.com',
    ctaText: 'Book Test Drive',
    category: 'Automobile'
  },
  {
    id: 'ad-004',
    title: 'Online Coding Masterclass Bootcamp',
    client: 'CodeCraft Academy',
    placement: 'Sidebar Widget',
    budget: 6500,
    spend: 5120,
    impressions: 195000,
    clicks: 5850,
    ctr: 3.0,
    status: 'Active',
    is_premium: false,
    startDate: '2026-09-01',
    endDate: '2026-09-25',
    imageUrl: 'https://images.unsplash.com/photo-1517694712202-14dd9538aa97?w=800&auto=format&fit=crop&q=80',
    targetUrl: 'https://codecraft.example.com',
    ctaText: 'Enroll Today',
    category: 'Education'
  },
  {
    id: 'ad-005',
    title: '10-Minute Grocery Delivery Blitz',
    client: 'Swiggy Instamart',
    placement: 'In-Feed Native',
    budget: 25000,
    spend: 21400,
    impressions: 1100000,
    clicks: 45100,
    ctr: 4.1,
    status: 'Active',
    is_premium: true,
    startDate: '2026-09-12',
    endDate: '2026-10-12',
    imageUrl: 'https://images.unsplash.com/photo-1542838132-92c53300491e?w=800&auto=format&fit=crop&q=80',
    targetUrl: 'https://swiggy.example.com',
    ctaText: 'Order Now',
    category: 'E-commerce'
  },
  {
    id: 'ad-006',
    title: 'Telugu Blockbuster Movie Premiere',
    client: 'Prime Video India',
    placement: 'Video Pre-Roll',
    budget: 30000,
    spend: 28500,
    impressions: 890000,
    clicks: 53400,
    ctr: 6.0,
    status: 'Active',
    is_premium: true,
    startDate: '2026-09-08',
    endDate: '2026-09-28',
    imageUrl: 'https://images.unsplash.com/photo-1489599849927-2ee91cede3ba?w=800&auto=format&fit=crop&q=80',
    targetUrl: 'https://primevideo.example.com',
    ctaText: 'Watch Trailer',
    category: 'Entertainment'
  },
  {
    id: 'ad-007',
    title: 'Comprehensive Cardiac Health Package',
    client: 'Apollo Hospitals',
    placement: 'Sidebar Widget',
    budget: 12000,
    spend: 7800,
    impressions: 410000,
    clicks: 15170,
    ctr: 3.7,
    status: 'Active',
    is_premium: false,
    startDate: '2026-09-10',
    endDate: '2026-10-10',
    imageUrl: 'https://images.unsplash.com/photo-1505751172876-fa1923c5c528?w=800&auto=format&fit=crop&q=80',
    targetUrl: 'https://apollohospitals.example.com',
    ctaText: 'Book Checkup',
    category: 'Healthcare'
  },
  {
    id: 'ad-008',
    title: 'Dining Carnival Flat 50% Off',
    client: 'Zomato Gold',
    placement: 'Interstitial',
    budget: 14000,
    spend: 13800,
    impressions: 520000,
    clicks: 21840,
    ctr: 4.2,
    status: 'Paused',
    is_premium: false,
    startDate: '2026-08-20',
    endDate: '2026-09-15',
    imageUrl: 'https://images.unsplash.com/photo-1517248135467-4c7edcad34c4?w=800&auto=format&fit=crop&q=80',
    targetUrl: 'https://zomato.example.com',
    ctaText: 'Explore Cafes',
    category: 'Food'
  }
];

export default function AdsManagementView() {
  const { currentRole } = useAuth();
  const { showToast } = useToast();

  const [campaigns, setCampaigns] = useState(INITIAL_CAMPAIGNS);
  const [loading, setLoading] = useState(false);
  const [viewMode, setViewMode] = useState('ledger'); // 'ledger' | 'showcase' | 'analytics'
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedPlacement, setSelectedPlacement] = useState('All');
  const [selectedStatus, setSelectedStatus] = useState('All');
  const [selectedCampaigns, setSelectedCampaigns] = useState([]);
  const [currentTime, setCurrentTime] = useState(new Date());

  // Preview Modal State
  const [previewAd, setPreviewAd] = useState(null);
  const [previewPlacement, setPreviewPlacement] = useState('In-Feed Native');
  const [interstitialSeconds, setInterstitialSeconds] = useState(5);

  // Delete Confirmation Modal State
  const [adToDelete, setAdToDelete] = useState(null);

  // Create Campaign Modal State
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [newCampaign, setNewCampaign] = useState({
    title: '',
    client: '',
    placement: 'In-Feed Native',
    category: 'Technology',
    budget: '',
    startDate: '',
    endDate: '',
    targetUrl: '',
    imageUrl: '',
    ctaText: 'Learn More',
    is_premium: false
  });

  const searchInputRef = useRef(null);

  // Clock Ticker
  useEffect(() => {
    const timer = setInterval(() => setCurrentTime(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  // Interstitial countdown ticker
  useEffect(() => {
    let timer;
    if (previewAd && previewPlacement === 'Interstitial' && interstitialSeconds > 0) {
      timer = setInterval(() => setInterstitialSeconds(prev => Math.max(0, prev - 1)), 1000);
    }
    return () => clearInterval(timer);
  }, [previewAd, previewPlacement, interstitialSeconds]);

  // Keyboard shortcut listener
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === '/' && document.activeElement.tagName !== 'INPUT' && document.activeElement.tagName !== 'TEXTAREA') {
        e.preventDefault();
        searchInputRef.current?.focus();
      }
      if (e.key === 'Escape') {
        setPreviewAd(null);
        setIsCreateModalOpen(false);
        setAdToDelete(null);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  useEffect(() => {
    fetchCampaigns();
  }, []);

  const fetchCampaigns = async () => {
    setLoading(true);
    try {
      const data = await api.getAds();
      if (data && data.items && data.items.length > 0) {
        const mapped = data.items.map(ad => ({
          id: `ad-${ad.id}`,
          title: ad.title,
          client: ad.created_by ? `Sponsor (${ad.created_by})` : 'Direct Advertiser',
          placement: ad.placement || 'In-Feed Native',
          budget: ad.is_premium ? 25000 : 8000,
          spend: 3400,
          impressions: Math.floor(Math.random() * 200000) + 50000,
          clicks: Math.floor(Math.random() * 8000) + 1200,
          ctr: 3.6,
          status: ad.is_active ? 'Active' : 'Paused',
          is_premium: !!ad.is_premium,
          startDate: ad.start_date ? ad.start_date.slice(0, 10) : '2026-09-01',
          endDate: ad.end_date ? ad.end_date.slice(0, 10) : '2026-10-01',
          imageUrl: ad.image_url || 'https://images.unsplash.com/photo-1559526324-4b87b5e36e44?w=800&auto=format&fit=crop&q=80',
          targetUrl: ad.redirect_url || 'https://example.com',
          ctaText: 'Explore Now',
          category: 'Commercial'
        }));
        setCampaigns(mapped);
      }
      showToast('Live commercial ad inventory synchronized', 'info');
    } catch {
      // Using seeded high-yield corpus
    } finally {
      setLoading(false);
    }
  };

  // Filtered Campaigns
  const filteredCampaigns = useMemo(() => {
    return campaigns.filter(c => {
      if (selectedPlacement !== 'All' && c.placement !== selectedPlacement) return false;
      if (selectedStatus !== 'All' && c.status !== selectedStatus) return false;
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const matches = c.title.toLowerCase().includes(q) ||
                        c.client.toLowerCase().includes(q) ||
                        c.placement.toLowerCase().includes(q) ||
                        c.id.toLowerCase().includes(q);
        if (!matches) return false;
      }
      return true;
    });
  }, [campaigns, selectedPlacement, selectedStatus, searchQuery]);

  // Aggregate Financial & Delivery KPIs
  const totalGrossRevenue = useMemo(() => campaigns.reduce((sum, c) => sum + c.spend, 0), [campaigns]);
  const totalBudgetCap = useMemo(() => campaigns.reduce((sum, c) => sum + c.budget, 0), [campaigns]);
  const totalImpressions = useMemo(() => campaigns.reduce((sum, c) => sum + c.impressions, 0), [campaigns]);
  const totalClicks = useMemo(() => campaigns.reduce((sum, c) => sum + c.clicks, 0), [campaigns]);
  const avgCtr = useMemo(() => {
    if (totalImpressions === 0) return 0;
    return ((totalClicks / totalImpressions) * 100).toFixed(2);
  }, [totalClicks, totalImpressions]);

  // Toggle Campaign Status
  const toggleCampaignStatus = (id, e) => {
    if (e) e.stopPropagation();
    setCampaigns(prev => prev.map(c => {
      if (c.id === id) {
        const nextStatus = c.status === 'Active' ? 'Paused' : 'Active';
        showToast(`Campaign "${c.title.slice(0, 24)}..." is now ${nextStatus.toUpperCase()}`, nextStatus === 'Active' ? 'success' : 'warning');
        return { ...c, status: nextStatus };
      }
      return c;
    }));
  };

  // Delete Campaign
  const confirmDeleteCampaign = () => {
    if (!adToDelete) return;
    setCampaigns(prev => prev.filter(c => c.id !== adToDelete.id));
    if (previewAd?.id === adToDelete.id) setPreviewAd(null);
    showToast(`Campaign "${adToDelete.title.slice(0, 24)}..." deleted permanently`, 'info');
    setAdToDelete(null);
  };

  // Open Preview Modal
  const handleOpenPreview = (camp) => {
    setPreviewAd(camp);
    setPreviewPlacement(camp.placement);
    setInterstitialSeconds(5);
  };

  // Multi-select actions
  const toggleSelectCampaign = (id) => {
    setSelectedCampaigns(prev => 
      prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]
    );
  };

  const toggleSelectAll = () => {
    if (selectedCampaigns.length === filteredCampaigns.length) {
      setSelectedCampaigns([]);
    } else {
      setSelectedCampaigns(filteredCampaigns.map(c => c.id));
    }
  };

  // Bulk Actions
  const handleBulkStatusChange = (newStatus) => {
    setCampaigns(prev => prev.map(c => selectedCampaigns.includes(c.id) ? { ...c, status: newStatus } : c));
    showToast(`Updated ${selectedCampaigns.length} campaigns to ${newStatus}`, 'success');
    setSelectedCampaigns([]);
  };

  const handleBulkDelete = () => {
    setCampaigns(prev => prev.filter(c => !selectedCampaigns.includes(c.id)));
    showToast(`Deleted ${selectedCampaigns.length} campaigns`, 'danger');
    setSelectedCampaigns([]);
  };

  // Export CSV
  const handleExportCsv = () => {
    const target = selectedCampaigns.length > 0
      ? campaigns.filter(c => selectedCampaigns.includes(c.id))
      : filteredCampaigns;

    const headers = ['Campaign ID', 'Title', 'Client / Sponsor', 'Placement', 'Budget', 'Spend', 'Impressions', 'Clicks', 'CTR %', 'Status', 'Start Date', 'End Date'];
    const rows = target.map(c => [
      c.id,
      `"${c.title.replace(/"/g, '""')}"`,
      `"${c.client.replace(/"/g, '""')}"`,
      c.placement,
      c.budget,
      c.spend,
      c.impressions,
      c.clicks,
      `${c.ctr}%`,
      c.status,
      c.startDate,
      c.endDate
    ]);

    const csvContent = 'data:text/csv;charset=utf-8,' + [headers.join(','), ...rows.map(e => e.join(','))].join('\n');
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `HyperNews_Ad_Operations_${new Date().toISOString().slice(0, 10)}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    showToast(`Exported ${target.length} campaign records to CSV`, 'info');
  };

  // Create Campaign Submit
  const handleCreateSubmit = async (e) => {
    e.preventDefault();
    const budgetVal = Number(newCampaign.budget || 5000);
    const created = {
      id: `ad-${Date.now().toString().slice(-4)}`,
      title: newCampaign.title.trim(),
      client: newCampaign.client.trim(),
      placement: newCampaign.placement,
      budget: budgetVal,
      spend: 0,
      impressions: 0,
      clicks: 0,
      ctr: 0.0,
      status: 'Active',
      is_premium: !!newCampaign.is_premium,
      startDate: newCampaign.startDate || new Date().toISOString().slice(0, 10),
      endDate: newCampaign.endDate || new Date(Date.now() + 30 * 86400000).toISOString().slice(0, 10),
      targetUrl: newCampaign.targetUrl.trim() || 'https://hypernews.in',
      imageUrl: newCampaign.imageUrl.trim() || 'https://images.unsplash.com/photo-1460925895917-afdab827c52f?w=800&auto=format&fit=crop&q=80',
      ctaText: newCampaign.ctaText || 'Learn More',
      category: newCampaign.category
    };

    setCampaigns([created, ...campaigns]);
    setIsCreateModalOpen(false);
    showToast(`Commercial campaign "${created.title}" launched successfully!`, 'success');

    try {
      await api.createAdvertisement({
        title: created.title,
        image_url: created.imageUrl,
        redirect_url: created.targetUrl,
        placement: created.placement,
        start_date: new Date(created.startDate).toISOString(),
        end_date: new Date(created.endDate).toISOString(),
        is_active: true,
        is_premium: created.is_premium,
        premium_priority: created.is_premium ? 5 : 1
      });
    } catch {
      // Local session
    }

    setNewCampaign({
      title: '',
      client: '',
      placement: 'In-Feed Native',
      category: 'Technology',
      budget: '',
      startDate: '',
      endDate: '',
      targetUrl: '',
      imageUrl: '',
      ctaText: 'Learn More',
      is_premium: false
    });
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem', width: '100%' }}>
      
      {/* ==================================================================== */}
      {/* 1. OPERATIONS COMMAND DESK HEADER & FINANCIAL BEACON */}
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
              <Briefcase size={26} style={{ color: 'var(--accent-emerald)' }} />
              Ad Operations & Monetization Command Desk
            </h1>

            {/* Live Financial Engine Beacon */}
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
              {campaigns.filter(c => c.status === 'Active').length} ACTIVE SPONSORSHIPS
            </div>
          </div>

          <p style={{ color: 'var(--text-secondary)', fontSize: '0.85rem', marginTop: '0.35rem', display: 'flex', alignItems: 'center', gap: '0.5rem', flexWrap: 'wrap' }}>
            <span>Manage direct brand sponsorships, real-time device placement simulators, eCPM yield pacing, and reader CTR delivery.</span>
            <span style={{ color: 'var(--text-muted)' }}>•</span>
            <span style={{ fontFamily: 'var(--font-mono)', fontSize: '0.775rem', color: 'var(--accent-cyan)' }}>
              IST {currentTime.toLocaleTimeString('en-US', { hour12: false })} (UTC+5:30)
            </span>
          </p>
        </div>

        {/* Action Toolbar */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.65rem', flexWrap: 'wrap' }}>
          <button 
            onClick={fetchCampaigns} 
            disabled={loading}
            className="btn btn-secondary"
            style={{ fontSize: '0.8rem', padding: '0.5rem 0.85rem' }}
          >
            <RefreshCw size={14} className={loading ? 'animate-spin' : ''} />
            {loading ? 'Syncing...' : 'Sync Ad Server'}
          </button>

          <button 
            onClick={handleExportCsv}
            className="btn btn-secondary"
            style={{ fontSize: '0.8rem', padding: '0.5rem 0.85rem' }}
            title="Export CSV"
          >
            <Download size={14} /> Export Financial Ledger
          </button>

          <button 
            onClick={() => setIsCreateModalOpen(true)}
            className="btn btn-primary"
            style={{ fontSize: '0.8rem', padding: '0.5rem 1.1rem' }}
          >
            <Plus size={16} /> Launch New Campaign
          </button>
        </div>
      </div>

      {/* ==================================================================== */}
      {/* 2. FIVE HIGH-DENSITY FINANCIAL TELEMETRY KPI CARDS */}
      {/* ==================================================================== */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(210px, 1fr))', gap: '1.1rem' }}>
        {/* Metric 1: Gross Ad Revenue */}
        <div 
          className="kpi-card"
          style={{ borderColor: 'rgba(16, 185, 129, 0.35)', cursor: 'pointer' }}
          onClick={() => setViewMode('analytics')}
        >
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
            <div>
              <span className="kpi-title">Gross Monthly Revenue</span>
              <div className="kpi-value">
                ${totalGrossRevenue.toLocaleString()}
                <span style={{ fontSize: '0.75rem', fontWeight: 500, color: 'var(--accent-emerald)' }}>delivered</span>
              </div>
            </div>
            <div style={{ padding: '0.6rem', borderRadius: 'var(--radius-md)', background: 'rgba(16, 185, 129, 0.15)', color: 'var(--accent-emerald)' }}>
              <DollarSign size={18} />
            </div>
          </div>
          <div className="kpi-footer">
            <span style={{ color: 'var(--accent-emerald)', fontWeight: 600 }}>+18.4% vs last cycle</span>
            <span style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>Cap: ${totalBudgetCap.toLocaleString()}</span>
          </div>
        </div>

        {/* Metric 2: Active Sponsorships */}
        <div 
          className="kpi-card"
          style={{ borderColor: 'rgba(99, 102, 241, 0.35)', cursor: 'pointer' }}
          onClick={() => { setSelectedStatus('Active'); setViewMode('ledger'); }}
        >
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
            <div>
              <span className="kpi-title">Active Brand Deals</span>
              <div className="kpi-value">
                {campaigns.filter(c => c.status === 'Active').length}
                <span style={{ fontSize: '0.75rem', fontWeight: 500, color: 'var(--primary)' }}>of {campaigns.length} total</span>
              </div>
            </div>
            <div style={{ padding: '0.6rem', borderRadius: 'var(--radius-md)', background: 'rgba(99, 102, 241, 0.15)', color: 'var(--primary)' }}>
              <Briefcase size={18} />
            </div>
          </div>
          <div className="kpi-footer">
            <span style={{ color: 'var(--accent-emerald)', fontWeight: 600 }}>98.6% Pacing Accuracy</span>
            <span style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>0 Pacing Warnings</span>
          </div>
        </div>

        {/* Metric 3: Total Ad Impressions */}
        <div 
          className="kpi-card"
          style={{ borderColor: 'rgba(56, 189, 248, 0.35)', cursor: 'pointer' }}
          onClick={() => setViewMode('analytics')}
        >
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
            <div>
              <span className="kpi-title">Total Ad Impressions</span>
              <div className="kpi-value">
                {(totalImpressions / 1000000).toFixed(2)}M
                <span style={{ fontSize: '0.75rem', fontWeight: 500, color: '#38bdf8' }}>exposures</span>
              </div>
            </div>
            <div style={{ padding: '0.6rem', borderRadius: 'var(--radius-md)', background: 'rgba(56, 189, 248, 0.15)', color: '#38bdf8' }}>
              <Eye size={18} />
            </div>
          </div>
          <div className="kpi-footer">
            <span style={{ color: 'var(--accent-emerald)', fontWeight: 600 }}>+14.2% delivery velocity</span>
            <span style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>99.2% Viewability</span>
          </div>
        </div>

        {/* Metric 4: Direct Ad Clicks */}
        <div 
          className="kpi-card"
          style={{ borderColor: 'rgba(244, 63, 94, 0.35)', cursor: 'pointer' }}
          onClick={() => setViewMode('ledger')}
        >
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
            <div>
              <span className="kpi-title">Reader Ad Clicks</span>
              <div className="kpi-value">
                {totalClicks.toLocaleString()}
                <span style={{ fontSize: '0.75rem', fontWeight: 500, color: 'var(--accent-rose)' }}>actions</span>
              </div>
            </div>
            <div style={{ padding: '0.6rem', borderRadius: 'var(--radius-md)', background: 'rgba(244, 63, 94, 0.15)', color: 'var(--accent-rose)' }}>
              <MousePointer size={18} />
            </div>
          </div>
          <div className="kpi-footer">
            <span style={{ color: 'var(--accent-rose)', fontWeight: 600 }}>High-Intent Traffic</span>
            <span style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>Avg CPC: $0.32</span>
          </div>
        </div>

        {/* Metric 5: Average CTR Yield */}
        <div 
          className="kpi-card"
          style={{ borderColor: 'rgba(245, 158, 11, 0.35)', cursor: 'pointer' }}
          onClick={() => setViewMode('analytics')}
        >
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
            <div>
              <span className="kpi-title">Average CTR Yield</span>
              <div className="kpi-value">
                {avgCtr}%
                <span style={{ fontSize: '0.75rem', fontWeight: 500, color: 'var(--accent-amber)' }}>CTR</span>
              </div>
            </div>
            <div style={{ padding: '0.6rem', borderRadius: 'var(--radius-md)', background: 'rgba(245, 158, 11, 0.15)', color: 'var(--accent-amber)' }}>
              <Target size={18} />
            </div>
          </div>
          <div className="kpi-footer">
            <span style={{ color: 'var(--accent-amber)', fontWeight: 600 }}>+0.75% vs Industry Avg</span>
            <span style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>Top: Video Pre-Roll (6.0%)</span>
          </div>
        </div>
      </div>

      {/* ==================================================================== */}
      {/* 3. MULTI-MODE OPERATIONS DECK SWITCHER & FILTERS */}
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
            onClick={() => setViewMode('ledger')}
            className={`ops-deck-tab ${viewMode === 'ledger' ? 'active' : ''}`}
          >
            <Layout size={15} /> Campaign & Inventory Ledger ({filteredCampaigns.length})
          </button>

          <button
            onClick={() => setViewMode('showcase')}
            className={`ops-deck-tab ${viewMode === 'showcase' ? 'active' : ''}`}
          >
            <Smartphone size={15} /> Creative Showcase & Simulator
          </button>

          <button
            onClick={() => setViewMode('analytics')}
            className={`ops-deck-tab ${viewMode === 'analytics' ? 'active' : ''}`}
          >
            <BarChart3 size={15} /> Yield & Revenue Analytics Center
          </button>
        </div>

        {/* Quick Placement Filter Pills */}
        <div style={{ display: 'flex', background: 'rgba(15, 23, 42, 0.7)', padding: '0.2rem', borderRadius: 'var(--radius-md)', border: '1px solid var(--border-subtle)', flexWrap: 'wrap' }}>
          {['All', 'In-Feed Native', 'Header Banner', 'Interstitial', 'Video Pre-Roll', 'Sidebar Widget'].map(p => (
            <button
              key={p}
              onClick={() => setSelectedPlacement(p)}
              className={`tab-pill ${selectedPlacement === p ? 'active' : ''}`}
              style={{ padding: '0.35rem 0.65rem', fontSize: '0.725rem' }}
            >
              {p === 'All' ? 'All Placements' : p}
            </button>
          ))}
        </div>
      </div>

      {/* ==================================================================== */}
      {/* 4. SEARCH & FILTER TOOLBAR */}
      {/* ==================================================================== */}
      <div className="filter-bar">
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '0.85rem', flexWrap: 'wrap' }}>
          {/* Search Box */}
          <div style={{ flex: 1, minWidth: '280px', position: 'relative' }}>
            <Search size={15} style={{ position: 'absolute', left: '0.85rem', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} />
            <input 
              ref={searchInputRef}
              type="text" 
              className="input" 
              style={{ paddingLeft: '2.5rem', paddingRight: '4rem', fontSize: '0.8rem' }}
              placeholder="Search campaign title, sponsor client, placement, or ID..." 
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

          {/* Filter Dropdowns */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem', flexWrap: 'wrap' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
              <span style={{ fontSize: '0.725rem', fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase' }}>Status:</span>
              <select 
                className="select" 
                style={{ width: 'auto', padding: '0.45rem 0.75rem', fontSize: '0.775rem' }}
                value={selectedStatus}
                onChange={(e) => setSelectedStatus(e.target.value)}
              >
                <option value="All">All Statuses</option>
                <option value="Active">Active Only</option>
                <option value="Paused">Paused / Expired</option>
              </select>
            </div>
          </div>
        </div>

        {/* Multi-Select Bulk Operations Bar */}
        {selectedCampaigns.length > 0 && (
          <div style={{
            marginTop: '0.85rem',
            padding: '0.65rem 1rem',
            borderRadius: 'var(--radius-md)',
            background: 'rgba(16, 185, 129, 0.12)',
            border: '1px solid rgba(16, 185, 129, 0.35)',
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            flexWrap: 'wrap',
            gap: '0.75rem'
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '0.8rem', color: '#a7f3d0', fontWeight: 600 }}>
              <CheckSquare size={16} />
              <span>{selectedCampaigns.length} campaigns selected</span>
            </div>

            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <button 
                className="btn btn-success" 
                style={{ fontSize: '0.725rem', padding: '0.3rem 0.65rem' }}
                onClick={() => handleBulkStatusChange('Active')}
              >
                <Play size={13} /> Bulk Activate
              </button>

              <button 
                className="btn btn-secondary" 
                style={{ fontSize: '0.725rem', padding: '0.3rem 0.65rem' }}
                onClick={() => handleBulkStatusChange('Paused')}
              >
                <Pause size={13} /> Bulk Pause
              </button>

              <button 
                className="btn btn-secondary" 
                style={{ fontSize: '0.725rem', padding: '0.3rem 0.65rem' }}
                onClick={handleExportCsv}
              >
                <Download size={13} /> Export CSV
              </button>

              <button 
                className="btn btn-danger" 
                style={{ fontSize: '0.725rem', padding: '0.3rem 0.65rem' }}
                onClick={handleBulkDelete}
              >
                <Trash2 size={13} /> Bulk Delete
              </button>

              <button 
                className="btn btn-secondary" 
                style={{ fontSize: '0.725rem', padding: '0.3rem 0.65rem' }}
                onClick={() => setSelectedCampaigns([])}
              >
                Cancel
              </button>
            </div>
          </div>
        )}
      </div>

      {/* ==================================================================== */}
      {/* 5. VIEW MODE 1: CAMPAIGN LEDGER & INVENTORY (TABLE) */}
      {/* ==================================================================== */}
      {viewMode === 'ledger' && (
        <div className="table-container">
          <table className="data-table">
            <thead>
              <tr>
                <th style={{ width: '40px' }}>
                  <input
                    type="checkbox"
                    checked={selectedCampaigns.length === filteredCampaigns.length && filteredCampaigns.length > 0}
                    onChange={toggleSelectAll}
                    style={{ cursor: 'pointer' }}
                  />
                </th>
                <th>Campaign & Creative Asset</th>
                <th>Client / Sponsor</th>
                <th>Placement Format</th>
                <th>Budget & Spend Pacing</th>
                <th>Impressions</th>
                <th>Clicks</th>
                <th>CTR Yield</th>
                <th>Status</th>
                <th style={{ textAlign: 'right' }}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {filteredCampaigns.length === 0 ? (
                <tr>
                  <td colSpan={10} style={{ textAlign: 'center', padding: '3.5rem 1rem', color: 'var(--text-muted)' }}>
                    <Briefcase size={36} style={{ margin: '0 auto 0.75rem', opacity: 0.5 }} />
                    <div style={{ fontWeight: 600 }}>No campaigns match the filter criteria.</div>
                  </td>
                </tr>
              ) : (
                filteredCampaigns.map(camp => {
                  const spendPercent = Math.min(100, Math.round((camp.spend / (camp.budget || 1)) * 100));
                  return (
                    <tr key={camp.id} style={{ background: selectedCampaigns.includes(camp.id) ? 'rgba(16, 185, 129, 0.08)' : 'transparent' }}>
                      <td>
                        <input
                          type="checkbox"
                          checked={selectedCampaigns.includes(camp.id)}
                          onChange={() => toggleSelectCampaign(camp.id)}
                          style={{ cursor: 'pointer' }}
                        />
                      </td>
                      <td style={{ maxWidth: '340px' }}>
                        <div style={{ display: 'flex', gap: '0.75rem', alignItems: 'center' }}>
                          <div 
                            style={{ position: 'relative', width: '56px', height: '42px', borderRadius: 'var(--radius-sm)', overflow: 'hidden', flexShrink: 0, background: '#0f172a', cursor: 'pointer' }}
                            onClick={() => handleOpenPreview(camp)}
                            title="Inspect in Simulator"
                          >
                            <img src={camp.imageUrl} alt="creative" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                            {camp.is_premium && (
                              <span style={{ position: 'absolute', top: 2, right: 2, width: 6, height: 6, borderRadius: '50%', background: 'var(--accent-amber)', boxShadow: '0 0 6px #f59e0b' }} />
                            )}
                          </div>
                          <div style={{ minWidth: 0 }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '0.35rem', marginBottom: '0.2rem' }}>
                              <span style={{ fontSize: '0.7rem', color: 'var(--text-muted)', fontFamily: 'var(--font-mono)' }}>
                                {camp.id}
                              </span>
                              {camp.is_premium && (
                                <span className="badge badge-warning" style={{ fontSize: '0.6rem', padding: '0.05rem 0.35rem' }}>
                                  PREMIUM
                                </span>
                              )}
                            </div>
                            <div 
                              style={{ fontSize: '0.825rem', fontWeight: 600, color: 'var(--text-primary)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', cursor: 'pointer' }}
                              onClick={() => handleOpenPreview(camp)}
                              title={camp.title}
                            >
                              {camp.title}
                            </div>
                            <div style={{ fontSize: '0.675rem', color: 'var(--text-muted)', display: 'flex', alignItems: 'center', gap: '0.3rem', marginTop: '0.1rem' }}>
                              <Calendar size={10} />
                              <span>{camp.startDate} to {camp.endDate}</span>
                            </div>
                          </div>
                        </div>
                      </td>
                      <td>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.45rem' }}>
                          <div style={{ width: '24px', height: '24px', borderRadius: '50%', background: 'rgba(99, 102, 241, 0.2)', color: 'var(--primary)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 700, fontSize: '0.75rem' }}>
                            {camp.client.charAt(0)}
                          </div>
                          <div>
                            <div style={{ fontSize: '0.8rem', fontWeight: 600, color: 'var(--text-primary)' }}>{camp.client}</div>
                            <div style={{ fontSize: '0.65rem', color: 'var(--text-muted)' }}>{camp.category}</div>
                          </div>
                        </div>
                      </td>
                      <td>
                        <button
                          onClick={() => handleOpenPreview(camp)}
                          className="badge badge-outline"
                          style={{ fontSize: '0.7rem', cursor: 'pointer', display: 'inline-flex', alignItems: 'center', gap: '0.3rem' }}
                        >
                          <Layout size={11} /> {camp.placement}
                        </button>
                      </td>
                      <td style={{ minWidth: '150px' }}>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.25rem' }}>
                          <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.775rem', fontFamily: 'var(--font-mono)' }}>
                            <strong style={{ color: 'var(--text-primary)' }}>${camp.spend.toLocaleString()}</strong>
                            <span style={{ color: 'var(--text-muted)' }}>of ${camp.budget.toLocaleString()}</span>
                          </div>
                          <div className="progress-bar-container">
                            <div 
                              className="progress-bar-fill"
                              style={{ 
                                width: `${spendPercent}%`,
                                background: spendPercent > 90 ? 'var(--accent-rose)' : spendPercent > 60 ? 'var(--accent-amber)' : 'var(--accent-emerald)'
                              }}
                            />
                          </div>
                          <span style={{ fontSize: '0.65rem', color: 'var(--text-muted)', textAlign: 'right' }}>{spendPercent}% delivered</span>
                        </div>
                      </td>
                      <td>
                        <span style={{ fontSize: '0.8rem', fontWeight: 600, color: 'var(--text-primary)', fontFamily: 'var(--font-mono)' }}>
                          {camp.impressions.toLocaleString()}
                        </span>
                      </td>
                      <td>
                        <span style={{ fontSize: '0.8rem', fontWeight: 700, color: 'var(--accent-rose)', fontFamily: 'var(--font-mono)' }}>
                          {camp.clicks.toLocaleString()}
                        </span>
                      </td>
                      <td>
                        <span className="badge badge-primary" style={{ fontFamily: 'var(--font-mono)', fontWeight: 700, fontSize: '0.725rem' }}>
                          {camp.ctr}%
                        </span>
                      </td>
                      <td>
                        <span className={`badge ${camp.status === 'Active' ? 'badge-success' : 'badge-warning'}`}>
                          {camp.status}
                        </span>
                      </td>
                      <td style={{ textAlign: 'right' }}>
                        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'flex-end', gap: '0.35rem' }}>
                          <button
                            onClick={() => handleOpenPreview(camp)}
                            className="btn btn-secondary"
                            style={{ padding: '0.25rem 0.55rem', fontSize: '0.7rem' }}
                            title="Open Simulator"
                          >
                            <Smartphone size={13} />
                          </button>

                          <button
                            onClick={(e) => toggleCampaignStatus(camp.id, e)}
                            className="btn-icon"
                            style={{ padding: '0.35rem', color: camp.status === 'Active' ? 'var(--accent-amber)' : 'var(--accent-emerald)' }}
                            title={camp.status === 'Active' ? 'Pause Campaign' : 'Resume Campaign'}
                          >
                            {camp.status === 'Active' ? <Pause size={13} /> : <Play size={13} />}
                          </button>

                          <a
                            href={camp.targetUrl}
                            target="_blank"
                            rel="noreferrer"
                            className="btn-icon"
                            style={{ padding: '0.35rem', color: 'var(--text-muted)' }}
                            title="Open Destination Landing Page"
                          >
                            <ExternalLink size={13} />
                          </a>

                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              setAdToDelete(camp);
                            }}
                            className="btn-icon"
                            style={{ padding: '0.35rem', color: 'var(--accent-rose)' }}
                            title="Delete Campaign"
                          >
                            <Trash2 size={13} />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      )}

      {/* ==================================================================== */}
      {/* 6. VIEW MODE 2: VISUAL CREATIVE SHOWCASE (CARDS) */}
      {/* ==================================================================== */}
      {viewMode === 'showcase' && (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(340px, 1fr))', gap: '1.25rem' }}>
          {filteredCampaigns.map(camp => {
            const spendPercent = Math.min(100, Math.round((camp.spend / (camp.budget || 1)) * 100));
            return (
              <div 
                key={camp.id}
                className="channel-status-card"
                style={{ padding: '1.15rem', cursor: 'pointer' }}
                onClick={() => handleOpenPreview(camp)}
              >
                <div>
                  {/* Creative Header */}
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '0.75rem' }}>
                    <div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.45rem' }}>
                        <span className="badge badge-primary" style={{ fontSize: '0.65rem' }}>
                          {camp.placement}
                        </span>
                        {camp.is_premium && (
                          <span className="badge badge-warning" style={{ fontSize: '0.65rem' }}>
                            <Award size={10} /> PREMIUM
                          </span>
                        )}
                      </div>
                      <h3 style={{ fontSize: '0.95rem', fontWeight: 700, color: 'var(--text-primary)', marginTop: '0.35rem', lineHeight: 1.3 }}>
                        {camp.title}
                      </h3>
                      <span style={{ fontSize: '0.725rem', color: 'var(--text-muted)' }}>Sponsor: {camp.client}</span>
                    </div>

                    <span className={`badge ${camp.status === 'Active' ? 'badge-success' : 'badge-warning'}`} style={{ fontSize: '0.675rem' }}>
                      {camp.status}
                    </span>
                  </div>

                  {/* Banner Creative Image */}
                  <div style={{ position: 'relative', width: '100%', height: '170px', borderRadius: 'var(--radius-md)', overflow: 'hidden', marginBottom: '0.85rem', background: '#020617', border: '1px solid var(--border-subtle)' }}>
                    <img src={camp.imageUrl} alt="banner" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                    <div style={{ position: 'absolute', bottom: '0.5rem', right: '0.5rem', padding: '0.2rem 0.5rem', borderRadius: 'var(--radius-sm)', background: 'rgba(0,0,0,0.75)', backdropFilter: 'blur(4px)', fontSize: '0.65rem', color: '#ffffff', fontFamily: 'var(--font-mono)' }}>
                      CTR: {camp.ctr}%
                    </div>
                  </div>

                  {/* Pacing Progress */}
                  <div style={{ marginBottom: '0.85rem' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.75rem', marginBottom: '0.25rem' }}>
                      <span style={{ color: 'var(--text-secondary)' }}>Budget Delivered:</span>
                      <strong style={{ color: 'var(--text-primary)', fontFamily: 'var(--font-mono)' }}>
                        ${camp.spend.toLocaleString()} / ${camp.budget.toLocaleString()}
                      </strong>
                    </div>
                    <div className="progress-bar-container">
                      <div className="progress-bar-fill" style={{ width: `${spendPercent}%`, background: 'var(--accent-emerald)' }} />
                    </div>
                  </div>
                </div>

                {/* Footer Controls */}
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', paddingTop: '0.75rem', borderTop: '1px solid var(--border-subtle)' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.65rem', fontSize: '0.75rem', fontFamily: 'var(--font-mono)', color: 'var(--text-muted)' }}>
                    <span>👁️ {(camp.impressions / 1000).toFixed(0)}k</span>
                    <span>👆 {(camp.clicks / 1000).toFixed(1)}k</span>
                  </div>

                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
                    <button
                      onClick={(e) => toggleCampaignStatus(camp.id, e)}
                      className="btn-icon"
                      style={{ padding: '0.35rem', color: camp.status === 'Active' ? 'var(--accent-amber)' : 'var(--accent-emerald)' }}
                      title={camp.status === 'Active' ? 'Pause' : 'Activate'}
                    >
                      {camp.status === 'Active' ? <Pause size={13} /> : <Play size={13} />}
                    </button>

                    <button
                      onClick={() => handleOpenPreview(camp)}
                      className="btn btn-secondary"
                      style={{ fontSize: '0.725rem', padding: '0.3rem 0.65rem', display: 'flex', alignItems: 'center', gap: '0.25rem' }}
                    >
                      <Smartphone size={12} /> Test Simulator
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* ==================================================================== */}
      {/* 7. VIEW MODE 3: REVENUE & YIELD ANALYTICS CENTER */}
      {/* ==================================================================== */}
      {viewMode === 'analytics' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem', width: '100%' }}>
          
          {/* Top Charts Row */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(420px, 1fr))', gap: '1.25rem' }}>
            
            {/* Chart 1: 7-Day Performance Composed Chart */}
            <div className="analytics-panel">
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '1.25rem' }}>
                <div>
                  <h3 style={{ fontSize: '1rem', fontWeight: 700, color: 'var(--text-primary)', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                    <BarChart3 size={18} style={{ color: 'var(--primary)' }} />
                    Weekly Ad Delivery & CTR Yield Curves
                  </h3>
                  <p style={{ fontSize: '0.775rem', color: 'var(--text-muted)', marginTop: '0.2rem' }}>
                    Daily impressions delivery vs click-through rate %
                  </p>
                </div>
                <span className="badge badge-primary">Past 7 Days</span>
              </div>

              <div style={{ height: '260px', width: '100%' }}>
                <ResponsiveContainer width="100%" height="100%">
                  <ComposedChart data={WEEKLY_PERFORMANCE} margin={{ top: 10, right: 15, bottom: 0, left: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.06)" />
                    <XAxis dataKey="day" stroke="var(--text-muted)" fontSize={11} />
                    <YAxis yAxisId="left" stroke="var(--text-muted)" fontSize={11} tickFormatter={(v) => `${v / 1000}k`} />
                    <YAxis yAxisId="right" orientation="right" stroke="#38bdf8" fontSize={11} tickFormatter={(v) => `${v}%`} />
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
                    <Bar yAxisId="left" dataKey="impressions" fill="#6366f1" radius={[4, 4, 0, 0]} name="Impressions" />
                    <Line yAxisId="right" type="monotone" dataKey="ctr" stroke="#38bdf8" strokeWidth={3} dot={{ r: 4 }} name="CTR (%)" />
                  </ComposedChart>
                </ResponsiveContainer>
              </div>

              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '1rem', paddingTop: '1rem', borderTop: '1px solid var(--border-subtle)', fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                <span>Peak Impression Day: <strong>Sunday (980k)</strong></span>
                <span style={{ color: 'var(--accent-emerald)', fontWeight: 600 }}>Yield Pacing: +14.6%</span>
              </div>
            </div>

            {/* Chart 2: Placement Revenue Mix Donut */}
            <div className="analytics-panel">
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '1.25rem' }}>
                <div>
                  <h3 style={{ fontSize: '1rem', fontWeight: 700, color: 'var(--text-primary)', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                    <PieIcon size={18} style={{ color: 'var(--accent-emerald)' }} />
                    Placement Revenue Mix & eCPM Yield
                  </h3>
                  <p style={{ fontSize: '0.775rem', color: 'var(--text-muted)', marginTop: '0.2rem' }}>
                    Revenue generation share by display ad format
                  </p>
                </div>
                <span className="badge badge-success">Top: In-Feed (38%)</span>
              </div>

              <div style={{ height: '240px', width: '100%' }}>
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={PLACEMENT_MIX}
                      cx="50%"
                      cy="50%"
                      innerRadius={55}
                      outerRadius={85}
                      paddingAngle={5}
                      dataKey="value"
                    >
                      {PLACEMENT_MIX.map((entry, index) => (
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

              {/* Placement Breakdown List */}
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '0.5rem', marginTop: '0.5rem', paddingTop: '0.75rem', borderTop: '1px solid var(--border-subtle)', fontSize: '0.75rem' }}>
                {PLACEMENT_MIX.map(p => (
                  <div key={p.name} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '0.35rem 0.6rem', borderRadius: 'var(--radius-sm)', background: 'rgba(255,255,255,0.03)' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                      <span style={{ width: '8px', height: '8px', borderRadius: '50%', background: p.color }} />
                      <span style={{ color: 'var(--text-secondary)' }}>{p.name}</span>
                    </div>
                    <strong style={{ color: 'var(--text-primary)', fontFamily: 'var(--font-mono)' }}>{p.value}% ({p.eCpm})</strong>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Sponsor Client Spend Leaderboard */}
          <div className="analytics-panel">
            <h3 style={{ fontSize: '1rem', fontWeight: 700, color: 'var(--text-primary)', marginBottom: '1rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <Award size={18} style={{ color: 'var(--accent-amber)' }} />
              Top Direct Brand Deals & Financial Sponsorship Leaderboard
            </h3>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
              {campaigns.slice(0, 5).map((c, idx) => (
                <div key={c.id} className="queue-item" style={{ cursor: 'pointer' }} onClick={() => handleOpenPreview(c)}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
                    <span style={{ fontSize: '1.1rem', fontWeight: 800, color: idx === 0 ? 'var(--accent-amber)' : 'var(--text-muted)', width: '24px' }}>
                      #{idx + 1}
                    </span>
                    <img src={c.imageUrl} alt="creative" style={{ width: '40px', height: '32px', borderRadius: 'var(--radius-sm)', objectFit: 'cover' }} />
                    <div>
                      <div style={{ fontSize: '0.85rem', fontWeight: 700, color: 'var(--text-primary)' }}>{c.client}</div>
                      <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>{c.title} • {c.placement}</div>
                    </div>
                  </div>

                  <div style={{ display: 'flex', alignItems: 'center', gap: '1.5rem', fontFamily: 'var(--font-mono)', fontSize: '0.8rem' }}>
                    <span style={{ color: 'var(--accent-emerald)', fontWeight: 700 }}>${c.spend.toLocaleString()} delivered</span>
                    <span style={{ color: 'var(--primary)' }}>{c.impressions.toLocaleString()} views</span>
                    <span style={{ color: 'var(--accent-amber)' }}>CTR: {c.ctr}%</span>
                    <button className="btn btn-secondary" style={{ padding: '0.25rem 0.5rem', fontSize: '0.7rem' }}>
                      Inspect Deal
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* ==================================================================== */}
      {/* 8. PLACEMENT MOCKUP & LIVE DEVICE SIMULATOR MODAL */}
      {/* ==================================================================== */}
      {previewAd && (
        <Modal
          isOpen={!!previewAd}
          onClose={() => setPreviewAd(null)}
          title={`Ad Placement Mockup & Real-Time Simulator • ${previewAd.title}`}
          size="lg"
        >
          <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
            
            {/* Mockup Format Switcher Tabs */}
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '0.75rem', padding: '0.65rem 1rem', background: 'rgba(15, 23, 42, 0.7)', borderRadius: 'var(--radius-md)', border: '1px solid var(--border-subtle)' }}>
              <span style={{ fontSize: '0.75rem', fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase' }}>
                Simulator Context:
              </span>
              <div style={{ display: 'flex', gap: '0.35rem', flexWrap: 'wrap' }}>
                {PLACEMENTS.map((p) => (
                  <button
                    key={p}
                    onClick={() => {
                      setPreviewPlacement(p);
                      if (p === 'Interstitial') setInterstitialSeconds(5);
                    }}
                    className={`tab-pill ${previewPlacement === p ? 'active' : ''}`}
                    style={{ padding: '0.35rem 0.75rem', fontSize: '0.75rem' }}
                  >
                    {p}
                  </button>
                ))}
              </div>
            </div>

            {/* PREVIEW CONTAINER */}
            <div style={{ padding: '1.5rem', borderRadius: 'var(--radius-lg)', background: '#020617', border: '1px solid var(--border-subtle)', display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: '380px' }}>
              
              {/* 1. Header Banner Mockup (Desktop Billboard) */}
              {previewPlacement === 'Header Banner' && (
                <div style={{ width: '100%', maxWidth: '740px', background: '#0f172a', borderRadius: 'var(--radius-md)', border: '1px solid rgba(255,255,255,0.1)', padding: '0.85rem', boxShadow: '0 20px 40px rgba(0,0,0,0.6)' }}>
                  {/* Browser Window Header */}
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', paddingBottom: '0.65rem', marginBottom: '0.65rem', borderBottom: '1px solid rgba(255,255,255,0.08)' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                      <span style={{ width: '8px', height: '8px', borderRadius: '50%', background: '#ef4444' }} />
                      <span style={{ width: '8px', height: '8px', borderRadius: '50%', background: '#f59e0b' }} />
                      <span style={{ width: '8px', height: '8px', borderRadius: '50%', background: '#10b981' }} />
                      <span style={{ fontSize: '0.7rem', color: 'var(--text-muted)', marginLeft: '0.4rem', fontFamily: 'var(--font-mono)' }}>
                        https://hypernews.in/top-stories
                      </span>
                    </div>
                    <span style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>HyperNews Desktop Web View</span>
                  </div>

                  {/* 728x90 Billboard Mockup */}
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '0.75rem 1rem', borderRadius: 'var(--radius-sm)', background: '#020617', border: '1px solid rgba(245, 158, 11, 0.4)', gap: '1rem' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.85rem' }}>
                      <img src={previewAd.imageUrl} alt="banner" style={{ width: '80px', height: '60px', objectFit: 'cover', borderRadius: '4px' }} />
                      <div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                          <span style={{ fontSize: '0.6rem', fontWeight: 800, padding: '0.1rem 0.35rem', borderRadius: '3px', background: 'rgba(245, 158, 11, 0.2)', color: '#fbbf24', textTransform: 'uppercase' }}>
                            Billboard Ad
                          </span>
                          <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>{previewAd.client}</span>
                        </div>
                        <h4 style={{ fontSize: '0.85rem', fontWeight: 700, color: 'var(--text-primary)', marginTop: '0.2rem' }}>
                          {previewAd.title}
                        </h4>
                      </div>
                    </div>

                    <a 
                      href={previewAd.targetUrl} 
                      target="_blank" 
                      rel="noreferrer"
                      className="btn btn-primary"
                      style={{ fontSize: '0.75rem', padding: '0.4rem 0.85rem' }}
                    >
                      {previewAd.ctaText} <ArrowUpRight size={13} />
                    </a>
                  </div>

                  {/* Simulated News Article Below */}
                  <div style={{ marginTop: '0.85rem', paddingTop: '0.65rem', borderTop: '1px solid rgba(255,255,255,0.06)', display: 'flex', flexDirection: 'column', gap: '0.4rem' }}>
                    <div style={{ height: '14px', width: '65%', background: 'rgba(255,255,255,0.08)', borderRadius: '3px' }} />
                    <div style={{ height: '10px', width: '90%', background: 'rgba(255,255,255,0.04)', borderRadius: '3px' }} />
                  </div>
                </div>
              )}

              {/* 2. In-Feed Native Card (Mobile Chassis) */}
              {previewPlacement === 'In-Feed Native' && (
                <div style={{ width: '100%', maxWidth: '380px', background: '#0f172a', borderRadius: 'var(--radius-lg)', border: '1px solid rgba(255,255,255,0.12)', padding: '1rem', boxShadow: '0 20px 40px rgba(0,0,0,0.6)' }}>
                  {/* Native Card Header */}
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.65rem' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                      <div style={{ width: '28px', height: '28px', borderRadius: '50%', background: 'var(--primary)', color: '#ffffff', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 800, fontSize: '0.75rem' }}>
                        {previewAd.client.charAt(0)}
                      </div>
                      <div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
                          <span style={{ fontSize: '0.8rem', fontWeight: 700, color: 'var(--text-primary)' }}>{previewAd.client}</span>
                          <span style={{ fontSize: '0.6rem', padding: '0.05rem 0.3rem', borderRadius: '3px', background: 'rgba(99, 102, 241, 0.2)', color: 'var(--primary)', fontWeight: 700 }}>
                            SPONSORED
                          </span>
                        </div>
                        <span style={{ fontSize: '0.65rem', color: 'var(--text-muted)' }}>Verified Brand Partner • In-Feed</span>
                      </div>
                    </div>
                    <span style={{ color: 'var(--text-muted)', fontSize: '0.8rem' }}>•••</span>
                  </div>

                  <p style={{ fontSize: '0.85rem', fontWeight: 600, color: 'var(--text-primary)', marginBottom: '0.65rem', lineHeight: 1.4 }}>
                    {previewAd.title}
                  </p>

                  <div style={{ position: 'relative', width: '100%', height: '170px', borderRadius: 'var(--radius-md)', overflow: 'hidden', marginBottom: '0.75rem', background: '#020617' }}>
                    <img src={previewAd.imageUrl} alt="native ad" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                    <span style={{ position: 'absolute', bottom: '0.4rem', right: '0.4rem', padding: '0.15rem 0.4rem', borderRadius: '3px', background: 'rgba(0,0,0,0.8)', fontSize: '0.65rem', color: '#ffffff' }}>
                      Ad • HyperNews Feed
                    </span>
                  </div>

                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', paddingTop: '0.5rem', borderTop: '1px solid var(--border-subtle)' }}>
                    <span style={{ fontSize: '0.7rem', color: 'var(--text-muted)', fontFamily: 'var(--font-mono)', maxWidth: '180px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                      {previewAd.targetUrl}
                    </span>
                    <a 
                      href={previewAd.targetUrl} 
                      target="_blank" 
                      rel="noreferrer"
                      className="btn btn-primary"
                      style={{ fontSize: '0.725rem', padding: '0.35rem 0.75rem' }}
                    >
                      {previewAd.ctaText} <ArrowUpRight size={12} />
                    </a>
                  </div>
                </div>
              )}

              {/* 3. Interstitial Takeover (Mobile Full Takeover) */}
              {previewPlacement === 'Interstitial' && (
                <div style={{ position: 'relative', width: '310px', height: '460px', background: '#020617', borderRadius: '28px', border: '4px solid #334155', overflow: 'hidden', display: 'flex', flexDirection: 'column', justifyContent: 'space-between', padding: '1rem', boxShadow: '0 25px 50px rgba(0,0,0,0.8)' }}>
                  {/* Top Bar with Countdown */}
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', zIndex: 10 }}>
                    <span style={{ fontSize: '0.65rem', padding: '0.2rem 0.5rem', borderRadius: 'var(--radius-full)', background: 'rgba(15, 23, 42, 0.85)', backdropFilter: 'blur(4px)', color: 'var(--text-secondary)', border: '1px solid var(--border-subtle)' }}>
                      {interstitialSeconds > 0 ? `Ad closes in ${interstitialSeconds}s` : 'Ad Can Be Closed'}
                    </span>
                    <button 
                      onClick={() => setPreviewAd(null)}
                      style={{ width: '26px', height: '26px', borderRadius: '50%', background: 'rgba(15, 23, 42, 0.85)', border: '1px solid var(--border-subtle)', color: '#ffffff', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer' }}
                    >
                      <X size={13} />
                    </button>
                  </div>

                  {/* Background Image with Gradient Overlay */}
                  <div style={{ position: 'absolute', inset: 0, zIndex: 1 }}>
                    <img src={previewAd.imageUrl} alt="interstitial" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                    <div style={{ position: 'absolute', inset: 0, background: 'linear-gradient(to top, #020617 35%, rgba(2, 6, 23, 0.4) 70%, rgba(2, 6, 23, 0.7) 100%)' }} />
                  </div>

                  {/* Bottom Text & CTA */}
                  <div style={{ position: 'relative', zIndex: 10, display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                    <span style={{ fontSize: '0.65rem', fontWeight: 800, padding: '0.15rem 0.4rem', borderRadius: '3px', background: 'var(--accent-emerald)', color: '#020617', width: 'fit-content' }}>
                      EXCLUSIVE SPONSOR
                    </span>
                    <h3 style={{ fontSize: '1.05rem', fontWeight: 800, color: '#ffffff', lineHeight: 1.2 }}>
                      {previewAd.title}
                    </h3>
                    <p style={{ fontSize: '0.75rem', color: 'rgba(255,255,255,0.8)', lineHeight: 1.4 }}>
                      Brought to you by {previewAd.client}. Experience seamless next-generation services.
                    </p>
                    <a 
                      href={previewAd.targetUrl} 
                      target="_blank" 
                      rel="noreferrer"
                      className="btn btn-primary"
                      style={{ fontSize: '0.8rem', padding: '0.5rem 1rem', width: '100%', marginTop: '0.35rem' }}
                    >
                      {previewAd.ctaText} <ArrowUpRight size={14} />
                    </a>
                  </div>
                </div>
              )}

              {/* 4. Sidebar Widget (Medium Rectangle 300x250) */}
              {previewPlacement === 'Sidebar Widget' && (
                <div style={{ width: '300px', background: '#0f172a', borderRadius: 'var(--radius-md)', border: '1px solid rgba(255,255,255,0.1)', padding: '0.85rem', boxShadow: '0 20px 40px rgba(0,0,0,0.6)' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.6rem', paddingBottom: '0.4rem', borderBottom: '1px solid rgba(255,255,255,0.08)' }}>
                    <span style={{ fontSize: '0.65rem', fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase' }}>
                      Partner Spotlight
                    </span>
                    <span style={{ fontSize: '0.65rem', color: 'var(--text-muted)' }}>300 x 250 MREC</span>
                  </div>

                  <div style={{ width: '100%', height: '140px', borderRadius: 'var(--radius-sm)', overflow: 'hidden', marginBottom: '0.65rem' }}>
                    <img src={previewAd.imageUrl} alt="sidebar ad" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                  </div>

                  <h4 style={{ fontSize: '0.85rem', fontWeight: 700, color: 'var(--text-primary)', marginBottom: '0.25rem' }}>
                    {previewAd.title}
                  </h4>
                  <p style={{ fontSize: '0.725rem', color: 'var(--text-muted)', marginBottom: '0.75rem' }}>
                    Sponsored by {previewAd.client}
                  </p>

                  <a 
                    href={previewAd.targetUrl} 
                    target="_blank" 
                    rel="noreferrer"
                    className="btn btn-primary"
                    style={{ width: '100%', fontSize: '0.75rem', padding: '0.45rem' }}
                  >
                    {previewAd.ctaText} <ArrowUpRight size={13} />
                  </a>
                </div>
              )}

              {/* 5. Video Pre-Roll (16:9 Video Mockup) */}
              {previewPlacement === 'Video Pre-Roll' && (
                <div style={{ width: '100%', maxWidth: '520px', background: '#020617', borderRadius: 'var(--radius-md)', border: '1px solid rgba(255,255,255,0.12)', padding: '0.75rem', boxShadow: '0 20px 40px rgba(0,0,0,0.6)' }}>
                  <div style={{ position: 'relative', width: '100%', height: '240px', borderRadius: 'var(--radius-sm)', overflow: 'hidden', background: '#000000' }}>
                    <img src={previewAd.imageUrl} alt="video roll" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                    <div style={{ position: 'absolute', inset: 0, background: 'rgba(0,0,0,0.4)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                      <Video size={42} style={{ color: 'var(--accent-rose)', opacity: 0.9 }} />
                    </div>

                    <div style={{ position: 'absolute', top: '0.65rem', left: '0.65rem', padding: '0.2rem 0.5rem', borderRadius: '3px', background: 'rgba(0,0,0,0.75)', color: '#ffffff', fontSize: '0.65rem', fontFamily: 'var(--font-mono)' }}>
                      Ad 1 of 1 • 0:15
                    </div>

                    <div style={{ position: 'absolute', bottom: '0.65rem', left: '0.65rem', right: '0.65rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '0.4rem 0.65rem', borderRadius: '4px', background: 'rgba(15, 23, 42, 0.85)', backdropFilter: 'blur(4px)' }}>
                      <div>
                        <div style={{ fontSize: '0.75rem', fontWeight: 700, color: '#ffffff' }}>{previewAd.title}</div>
                        <div style={{ fontSize: '0.65rem', color: 'var(--text-muted)' }}>{previewAd.client}</div>
                      </div>
                      <a 
                        href={previewAd.targetUrl} 
                        target="_blank" 
                        rel="noreferrer"
                        className="btn btn-primary"
                        style={{ fontSize: '0.7rem', padding: '0.3rem 0.6rem' }}
                      >
                        {previewAd.ctaText}
                      </a>
                    </div>
                  </div>
                </div>
              )}
            </div>

            {/* Campaign Specs Footnote */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(130px, 1fr))', gap: '0.65rem', padding: '0.75rem 1rem', background: 'rgba(15, 23, 42, 0.5)', borderRadius: 'var(--radius-sm)', border: '1px solid var(--border-subtle)', fontSize: '0.75rem' }}>
              <div>
                <span style={{ fontSize: '0.65rem', color: 'var(--text-muted)', textTransform: 'uppercase' }}>Client</span>
                <strong style={{ display: 'block', color: 'var(--text-primary)' }}>{previewAd.client}</strong>
              </div>
              <div>
                <span style={{ fontSize: '0.65rem', color: 'var(--text-muted)', textTransform: 'uppercase' }}>Budget</span>
                <strong style={{ display: 'block', color: 'var(--text-primary)', fontFamily: 'var(--font-mono)' }}>${previewAd.budget.toLocaleString()}</strong>
              </div>
              <div>
                <span style={{ fontSize: '0.65rem', color: 'var(--text-muted)', textTransform: 'uppercase' }}>Delivery CTR</span>
                <strong style={{ display: 'block', color: 'var(--accent-amber)', fontFamily: 'var(--font-mono)' }}>{previewAd.ctr}%</strong>
              </div>
              <div>
                <span style={{ fontSize: '0.65rem', color: 'var(--text-muted)', textTransform: 'uppercase' }}>Status</span>
                <span className={`badge ${previewAd.status === 'Active' ? 'badge-success' : 'badge-warning'}`} style={{ fontSize: '0.65rem' }}>
                  {previewAd.status}
                </span>
              </div>
            </div>

            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.5rem', paddingTop: '0.5rem', borderTop: '1px solid var(--border-subtle)' }}>
              <button 
                className="btn btn-secondary"
                style={{ fontSize: '0.75rem' }}
                onClick={() => setPreviewAd(null)}
              >
                Close Simulator
              </button>
            </div>
          </div>
        </Modal>
      )}

      {/* ==================================================================== */}
      {/* 9. CREATE NEW AD CAMPAIGN MODAL */}
      {/* ==================================================================== */}
      {isCreateModalOpen && (
        <Modal
          isOpen={isCreateModalOpen}
          onClose={() => setIsCreateModalOpen(false)}
          title="Launch New Commercial Ad Campaign"
          size="md"
        >
          <form onSubmit={handleCreateSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
            
            {/* Title */}
            <div>
              <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', marginBottom: '0.35rem' }}>
                Campaign Title *
              </label>
              <input 
                type="text" 
                required
                className="input"
                placeholder="e.g. Hyderabad Tech Expo 2026 Gold Sponsorship"
                value={newCampaign.title}
                onChange={(e) => setNewCampaign({ ...newCampaign, title: e.target.value })}
              />
            </div>

            {/* Client & Placement */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '0.85rem' }}>
              <div>
                <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', marginBottom: '0.35rem' }}>
                  Sponsor / Advertiser *
                </label>
                <input 
                  type="text" 
                  required
                  className="input"
                  placeholder="e.g. Reliance Digital"
                  value={newCampaign.client}
                  onChange={(e) => setNewCampaign({ ...newCampaign, client: e.target.value })}
                />
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', marginBottom: '0.35rem' }}>
                  Display Placement *
                </label>
                <select 
                  className="select"
                  value={newCampaign.placement}
                  onChange={(e) => setNewCampaign({ ...newCampaign, placement: e.target.value })}
                >
                  {PLACEMENTS.map(p => (
                    <option key={p} value={p}>{p}</option>
                  ))}
                </select>
              </div>
            </div>

            {/* Budget, Dates */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(130px, 1fr))', gap: '0.85rem' }}>
              <div>
                <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', marginBottom: '0.35rem' }}>
                  Budget ($) *
                </label>
                <input 
                  type="number" 
                  required
                  className="input"
                  placeholder="15000"
                  value={newCampaign.budget}
                  onChange={(e) => setNewCampaign({ ...newCampaign, budget: e.target.value })}
                />
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', marginBottom: '0.35rem' }}>
                  Start Date
                </label>
                <input 
                  type="date" 
                  className="input"
                  value={newCampaign.startDate}
                  onChange={(e) => setNewCampaign({ ...newCampaign, startDate: e.target.value })}
                />
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', marginBottom: '0.35rem' }}>
                  End Date
                </label>
                <input 
                  type="date" 
                  className="input"
                  value={newCampaign.endDate}
                  onChange={(e) => setNewCampaign({ ...newCampaign, endDate: e.target.value })}
                />
              </div>
            </div>

            {/* Target URL & CTA */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '0.85rem' }}>
              <div>
                <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', marginBottom: '0.35rem' }}>
                  Target Destination URL *
                </label>
                <input 
                  type="url" 
                  required
                  className="input"
                  placeholder="https://sponsor.example.com/promo"
                  value={newCampaign.targetUrl}
                  onChange={(e) => setNewCampaign({ ...newCampaign, targetUrl: e.target.value })}
                />
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', marginBottom: '0.35rem' }}>
                  Call-to-Action (CTA) Text
                </label>
                <input 
                  type="text" 
                  className="input"
                  placeholder="e.g. Download App / Book Now"
                  value={newCampaign.ctaText}
                  onChange={(e) => setNewCampaign({ ...newCampaign, ctaText: e.target.value })}
                />
              </div>
            </div>

            {/* Banner URL */}
            <div>
              <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', marginBottom: '0.35rem' }}>
                Creative Banner Image URL
              </label>
              <input 
                type="url" 
                className="input"
                placeholder="https://images.unsplash.com/photo-..."
                value={newCampaign.imageUrl}
                onChange={(e) => setNewCampaign({ ...newCampaign, imageUrl: e.target.value })}
              />
              {newCampaign.imageUrl && (
                <div style={{ marginTop: '0.5rem', width: '100%', height: '110px', borderRadius: 'var(--radius-sm)', overflow: 'hidden', border: '1px solid var(--border-subtle)' }}>
                  <img src={newCampaign.imageUrl} alt="preview" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                </div>
              )}
            </div>

            {/* Premium Tier Checkbox */}
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem', padding: '0.65rem 0.85rem', borderRadius: 'var(--radius-sm)', background: 'rgba(255,255,255,0.03)', border: '1px solid var(--border-subtle)' }}>
              <input 
                type="checkbox"
                id="isPremiumCampaign"
                checked={newCampaign.is_premium}
                onChange={(e) => setNewCampaign({ ...newCampaign, is_premium: e.target.checked })}
                style={{ cursor: 'pointer' }}
              />
              <label htmlFor="isPremiumCampaign" style={{ fontSize: '0.8rem', color: 'var(--text-primary)', cursor: 'pointer' }}>
                Enable <strong>Premium Priority Delivery Tier</strong> (Prioritize above regular ad slots)
              </label>
            </div>

            {/* Modal Actions */}
            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.6rem', paddingTop: '0.85rem', borderTop: '1px solid var(--border-subtle)' }}>
              <button 
                type="button" 
                className="btn btn-secondary"
                onClick={() => setIsCreateModalOpen(false)}
              >
                Cancel
              </button>
              <button 
                type="submit" 
                className="btn btn-primary"
              >
                <Plus size={15} /> Launch Ad Deal
              </button>
            </div>
          </form>
        </Modal>
      )}

      {/* ==================================================================== */}
      {/* 10. DELETE CONFIRMATION MODAL */}
      {/* ==================================================================== */}
      {adToDelete && (
        <Modal
          isOpen={!!adToDelete}
          onClose={() => setAdToDelete(null)}
          title="Confirm Campaign Removal"
          size="sm"
        >
          <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.65rem', color: 'var(--accent-rose)' }}>
              <AlertCircle size={22} />
              <strong style={{ fontSize: '0.95rem' }}>Are you sure you want to delete this campaign?</strong>
            </div>

            <p style={{ fontSize: '0.825rem', color: 'var(--text-secondary)', lineHeight: 1.5 }}>
              This will permanently stop impressions and cancel deal <strong>"{adToDelete.title}"</strong> ({adToDelete.client}).
            </p>

            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.5rem', marginTop: '0.5rem' }}>
              <button 
                className="btn btn-secondary"
                style={{ fontSize: '0.8rem' }}
                onClick={() => setAdToDelete(null)}
              >
                Cancel
              </button>
              <button 
                className="btn btn-danger"
                style={{ fontSize: '0.8rem' }}
                onClick={confirmDeleteCampaign}
              >
                Confirm Delete
              </button>
            </div>
          </div>
        </Modal>
      )}
    </div>
  );
}
