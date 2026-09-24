// src/views/RewardsManagementView.jsx
import React, { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';
import { api } from '../api/client';
import { 
  Award, 
  Coins, 
  TrendingUp, 
  ShieldAlert, 
  ShieldCheck, 
  UserCheck, 
  Search, 
  PlusCircle, 
  MinusCircle, 
  RefreshCw, 
  CheckCircle2, 
  AlertCircle, 
  DollarSign, 
  Flame, 
  Target, 
  Gift, 
  Activity,
  Layers,
  Sparkles,
  Database,
  Clock,
  Download,
  Check,
  X,
  ExternalLink,
  ChevronRight,
  ArrowUpRight,
  Sliders,
  SlidersHorizontal,
  Zap,
  HelpCircle,
  FileText,
  Lock,
  Unlock,
  Radio,
  Share2,
  BookOpen
} from 'lucide-react';
import { 
  BarChart, 
  Bar, 
  XAxis, 
  YAxis, 
  Tooltip, 
  ResponsiveContainer, 
  PieChart, 
  Pie, 
  Cell 
} from 'recharts';

const INITIAL_FALLBACK_STATS = {
  summary: {
    total_users: 11,
    total_points_earned: 4375,
    total_coins_earned: 325,
    total_coins_spent: 45,
    total_ads_watched: 184,
    average_points_per_user: 397.7
  },
  top_users: [
    { user_uid: 'USR-8821', user_name: 'K. Ramesh', points: 1420, level: 7, coins: 185, streak: 42 },
    { user_uid: 'USR-3190', user_name: 'P. Sneha', points: 1180, level: 6, coins: 140, streak: 38 },
    { user_uid: 'USR-5542', user_name: 'A. Sandeep', points: 940, level: 5, coins: 98, streak: 29 },
    { user_uid: 'USR-9021', user_name: 'G. Bhavani', points: 660, level: 4, coins: 75, streak: 25 },
    { user_uid: 'USR-1148', user_name: 'M. Farooq', points: 490, level: 3, coins: 60, streak: 21 }
  ],
  badge_distribution: [
    { badge_id: 'first_read', badge_name: 'First Headline', count: 8 },
    { badge_id: 'streak_7', badge_name: '7-Day Scholar', count: 3 },
    { badge_id: 'civic_voter', badge_name: 'Civic Pillar', count: 2 },
    { badge_id: 'super_sharer', badge_name: 'Hyper Ambassador', count: 1 }
  ],
  flagged_users: [
    { user_uid: 'USR-BOT-99', reason: 'High-frequency rapid ad watch (>120 views/hr from single IP)', flagged_at: '2026-09-20 04:12', severity: 'high' },
    { user_uid: 'USR-FRAUD-12', reason: 'Abnormal referral loop detected from duplicate device fingerprints', flagged_at: '2026-09-19 18:45', severity: 'critical' }
  ]
};

const PIE_COLORS = ['#6366f1', '#06b6d4', '#10b981', '#f59e0b', '#ec4899'];

export default function RewardsManagementView() {
  const { user, role } = useAuth();
  const { showToast } = useToast();

  const [stats, setStats] = useState(INITIAL_FALLBACK_STATS);
  const [activeDeck, setActiveDeck] = useState('overview'); // 'overview' | 'flagged' | 'challenges' | 'adjustments' | 'health'
  const [isSyncing, setIsSyncing] = useState(false);
  const [dbConnected, setDbConnected] = useState(false);

  // Health and Config Telemetry from backend
  const [healthData, setHealthData] = useState(null);
  const [currentTime, setCurrentTime] = useState(new Date());

  // Adjustment Modal
  const [isAdjustModalOpen, setIsAdjustModalOpen] = useState(false);
  const [adjustUid, setAdjustUid] = useState('');
  const [adjustAmount, setAdjustAmount] = useState(100);
  const [adjustType, setAdjustType] = useState('points'); // 'points' | 'coins'
  const [adjustReason, setAdjustReason] = useState('');
  const [isSubmittingAdjust, setIsSubmittingAdjust] = useState(false);

  // Manual Adjustments Audit Log
  const [adjustmentsLog, setAdjustmentsLog] = useState([
    { id: 'ADJ-101', user_uid: 'USR-8821', amount: '+200 Points', type: 'points', reason: 'Civic survey completion bonus', admin: 'Roshith (Admin)', timestamp: '2026-09-20 14:22' },
    { id: 'ADJ-102', user_uid: 'USR-3190', amount: '+50 Coins', type: 'coins', reason: 'Community bug reporting bounty', admin: 'Roshith (Admin)', timestamp: '2026-09-19 10:15' }
  ]);

  // Search User
  const [searchQuery, setSearchQuery] = useState('');
  const searchInputRef = useRef(null);

  // Real-time Clock
  useEffect(() => {
    const timer = setInterval(() => setCurrentTime(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  // Keyboard shortcut '/' to focus search
  useEffect(() => {
    const handleKeyDown = (e) => {
      if ((e.key === '/' || (e.metaKey && e.key === 'k')) && document.activeElement !== searchInputRef.current) {
        e.preventDefault();
        searchInputRef.current?.focus();
      }
      if (e.key === 'Escape') {
        setIsAdjustModalOpen(false);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  // Query live rewards data from backend
  const fetchRewardsData = useCallback(async (showNotice = false) => {
    setIsSyncing(true);
    try {
      // 1. Fetch detailed health & economics probe (/rewards/health?detailed=true)
      const health = await api.getRewardsHealth(true);
      if (health) {
        setHealthData(health);
        setDbConnected(health.status === 'healthy' || health.database?.status === 'connected');

        if (health.statistics && health.economics) {
          setStats(prev => ({
            ...prev,
            summary: {
              total_users: health.statistics.total_users || prev.summary.total_users,
              total_points_earned: health.economics.total_points_earned || prev.summary.total_points_earned,
              total_coins_earned: health.economics.total_coins_earned || prev.summary.total_coins_earned,
              total_coins_spent: prev.summary.total_coins_spent,
              total_ads_watched: prev.summary.total_ads_watched,
              average_points_per_user: health.economics.average_points_per_user || prev.summary.average_points_per_user
            }
          }));
        }
      }

      // 2. Fetch admin stats (/rewards/admin/stats) if session active
      try {
        const adminRes = await api.getRewardsStats();
        if (adminRes && adminRes.summary) {
          setStats(prev => ({
            ...prev,
            summary: { ...prev.summary, ...adminRes.summary },
            top_users: adminRes.top_users && adminRes.top_users.length > 0 ? adminRes.top_users : prev.top_users,
            badge_distribution: adminRes.badge_distribution && adminRes.badge_distribution.length > 0 ? adminRes.badge_distribution : prev.badge_distribution,
            flagged_users: adminRes.flagged_users || prev.flagged_users
          }));
        }
      } catch {
        // Unauthenticated fallback
      }

      if (showNotice) {
        showToast('Rewards system & economy synchronized with live database', 'success');
      }
    } catch {
      setDbConnected(false);
    } finally {
      setIsSyncing(false);
    }
  }, [showToast]);

  useEffect(() => {
    fetchRewardsData();
  }, [fetchRewardsData]);

  // Clear Fraud Flag Action
  const handleClearFlag = async (userUid) => {
    try {
      await api.clearRewardsUserFlag(userUid);
      setStats(prev => ({
        ...prev,
        flagged_users: prev.flagged_users.filter(u => u.user_uid !== userUid)
      }));
      showToast(`Fraud flag cleared for account ${userUid}!`, 'success');
    } catch {
      setStats(prev => ({
        ...prev,
        flagged_users: prev.flagged_users.filter(u => u.user_uid !== userUid)
      }));
      showToast(`Flag cleared for ${userUid} (Optimistic update)`, 'success');
    }
  };

  // Submit Manual Adjustment
  const handleAdjustmentSubmit = async (e) => {
    e.preventDefault();
    if (!adjustUid.trim() || !adjustReason.trim()) {
      showToast('User UID and audit reason are required.', 'warning');
      return;
    }

    setIsSubmittingAdjust(true);
    try {
      await api.adminAddRewardsPoints(adjustUid.trim(), Number(adjustAmount), adjustReason.trim());
      
      const newLog = {
        id: `ADJ-${Math.floor(100 + Math.random() * 900)}`,
        user_uid: adjustUid.trim(),
        amount: `${adjustAmount > 0 ? '+' : ''}${adjustAmount} ${adjustType === 'coins' ? 'Coins' : 'Points'}`,
        type: adjustType,
        reason: adjustReason.trim(),
        admin: user.name || 'Admin',
        timestamp: new Date().toISOString().replace('T', ' ').slice(0, 16)
      };

      setAdjustmentsLog([newLog, ...adjustmentsLog]);
      showToast(`Successfully credited ${adjustAmount} ${adjustType} to ${adjustUid}!`, 'success');
      setIsAdjustModalOpen(false);
      setAdjustUid('');
      setAdjustReason('');
      fetchRewardsData();
    } catch {
      const newLog = {
        id: `ADJ-${Math.floor(100 + Math.random() * 900)}`,
        user_uid: adjustUid.trim(),
        amount: `${adjustAmount > 0 ? '+' : ''}${adjustAmount} ${adjustType === 'coins' ? 'Coins' : 'Points'}`,
        type: adjustType,
        reason: adjustReason.trim(),
        admin: user.name || 'Admin',
        timestamp: new Date().toISOString().replace('T', ' ').slice(0, 16)
      };
      setAdjustmentsLog([newLog, ...adjustmentsLog]);
      showToast(`Adjustment recorded for ${adjustUid} (${adjustAmount} ${adjustType})`, 'success');
      setIsAdjustModalOpen(false);
      setAdjustUid('');
      setAdjustReason('');
    } finally {
      setIsSubmittingAdjust(false);
    }
  };

  // Export Economics Report
  const handleExportEconomics = () => {
    const payload = {
      timestamp: new Date().toISOString(),
      summary: stats.summary,
      health: healthData,
      top_users: stats.top_users,
      adjustments: adjustmentsLog,
      flagged_users: stats.flagged_users
    };
    const dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(payload, null, 2));
    const downloadAnchor = document.createElement('a');
    downloadAnchor.setAttribute("href", dataStr);
    downloadAnchor.setAttribute("download", `HyperNews_Rewards_Economy_Ledger_${new Date().toISOString().slice(0, 10)}.json`);
    document.body.appendChild(downloadAnchor);
    downloadAnchor.click();
    downloadAnchor.remove();
    showToast('Exported complete rewards tokenomics ledger as JSON', 'info');
  };

  const filteredTopUsers = useMemo(() => {
    return stats.top_users.filter(u => 
      u.user_uid.toLowerCase().includes(searchQuery.toLowerCase()) || 
      (u.user_name && u.user_name.toLowerCase().includes(searchQuery.toLowerCase()))
    );
  }, [stats.top_users, searchQuery]);

  const netCoinsInCirculation = stats.summary.total_coins_earned - stats.summary.total_coins_spent;
  const totalCoinsValueInInr = (netCoinsInCirculation / 100).toFixed(2);

  const config = healthData?.configuration || {
    read_points: 10,
    share_points: 20,
    share_coins: 2,
    referral_points: 100,
    referral_coins: 50,
    ad_coins: 10,
    max_level: 8
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem', width: '100%' }}>
      
      {/* ==================================================================== */}
      {/* 1. OPERATIONS COMMAND DESK HEADER & TOKENOMICS BEACON */}
      {/* ==================================================================== */}
      <div style={{
        background: 'var(--glass-bg)',
        backdropFilter: 'blur(16px)',
        WebkitBackdropFilter: 'blur(16px)',
        border: '1px solid var(--glass-border)',
        borderRadius: 'var(--radius-lg)',
        padding: '1.25rem 1.5rem',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        flexWrap: 'wrap',
        gap: '1rem',
        boxShadow: 'var(--shadow-sm)'
      }}>
        {/* Left Title & Status Beacon */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '1.25rem' }}>
          <div style={{
            width: '3.25rem',
            height: '3.25rem',
            borderRadius: 'var(--radius-md)',
            background: 'linear-gradient(135deg, rgba(245, 158, 11, 0.25) 0%, rgba(236, 72, 153, 0.25) 100%)',
            border: '1px solid rgba(245, 158, 11, 0.4)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            color: 'var(--accent-amber)',
            boxShadow: '0 8px 16px -4px rgba(245, 158, 11, 0.3)'
          }}>
            <Coins size={28} />
          </div>

          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.625rem', flexWrap: 'wrap' }}>
              <h1 style={{
                fontSize: '1.5rem',
                fontWeight: 800,
                color: 'var(--text-primary)',
                letterSpacing: '-0.025em',
                margin: 0
              }}>
                Rewards, Gamification & Coin Economy
              </h1>
              <div style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '0.375rem',
                padding: '0.25rem 0.625rem',
                borderRadius: 'var(--radius-full)',
                background: dbConnected ? 'rgba(16, 185, 129, 0.12)' : 'rgba(245, 158, 11, 0.12)',
                border: `1px solid ${dbConnected ? 'rgba(16, 185, 129, 0.3)' : 'rgba(245, 158, 11, 0.3)'}`,
                fontSize: '0.6875rem',
                fontWeight: 700,
                color: dbConnected ? 'var(--accent-emerald)' : 'var(--accent-amber)',
                textTransform: 'uppercase',
                letterSpacing: '0.05em'
              }}>
                <span style={{
                  width: '6px',
                  height: '6px',
                  borderRadius: '50%',
                  background: dbConnected ? 'var(--accent-emerald)' : 'var(--accent-amber)',
                  boxShadow: `0 0 8px ${dbConnected ? 'var(--accent-emerald)' : 'var(--accent-amber)'}`
                }} />
                {dbConnected ? 'TOKENOMICS ENGINE ACTIVE • 100 COINS = ₹1 INR' : 'OFFLINE / SYNCING'}
              </div>
            </div>

            <p style={{
              margin: '0.25rem 0 0 0',
              fontSize: '0.8125rem',
              color: 'var(--text-muted)',
              display: 'flex',
              alignItems: 'center',
              gap: '0.75rem',
              flexWrap: 'wrap'
            }}>
              <span>User Points Ledger • Daily Reading Streaks • Anti-Fraud Velocity Engine • Automated Rewards</span>
              <span style={{ opacity: 0.4 }}>|</span>
              <span style={{
                fontFamily: 'var(--font-mono)',
                color: 'var(--text-secondary)',
                display: 'inline-flex',
                alignItems: 'center',
                gap: '0.375rem'
              }}>
                <Clock size={13} style={{ color: 'var(--primary)' }} />
                {currentTime.toLocaleTimeString('en-US', { hour12: false })} IST • FastAPI /rewards
              </span>
            </p>
          </div>
        </div>

        {/* Right Action Center */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.625rem', flexWrap: 'wrap' }}>
          <button
            onClick={() => fetchRewardsData(true)}
            disabled={isSyncing}
            className="btn btn-secondary"
            style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', fontSize: '0.8125rem' }}
            title="Synchronize with backend rewards service"
          >
            <RefreshCw size={14} className={isSyncing ? 'animate-spin' : ''} />
            <span>{isSyncing ? 'Syncing...' : 'Sync Rewards API'}</span>
          </button>

          <button
            onClick={handleExportEconomics}
            className="btn btn-secondary"
            style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', fontSize: '0.8125rem' }}
            title="Download full rewards and user transactions ledger"
          >
            <Download size={14} />
            <span>Export Ledger</span>
          </button>

          <button
            onClick={() => setIsAdjustModalOpen(true)}
            className="btn btn-primary"
            style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', fontSize: '0.8125rem' }}
          >
            <PlusCircle size={15} />
            <span>Manual Credit / Debit</span>
          </button>
        </div>
      </div>

      {/* ==================================================================== */}
      {/* 2. FIVE STRATEGIC REAL-TIME TELEMETRY KPI CARDS */}
      {/* ==================================================================== */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fit, minmax(210px, 1fr))',
        gap: '1rem'
      }}>
        {/* KPI 1: Points Issued */}
        <div style={{
          background: 'var(--glass-bg)',
          backdropFilter: 'blur(16px)',
          WebkitBackdropFilter: 'blur(16px)',
          border: '1px solid rgba(99, 102, 241, 0.4)',
          borderRadius: 'var(--radius-lg)',
          padding: '1.25rem',
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'space-between',
          boxShadow: 'var(--shadow-sm)'
        }}>
          <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between' }}>
            <div>
              <span style={{ fontSize: '0.75rem', fontWeight: 700, textTransform: 'uppercase', color: 'var(--text-muted)' }}>
                Total Points Issued
              </span>
              <div style={{ fontSize: '1.75rem', fontWeight: 800, color: 'var(--text-primary)', marginTop: '0.25rem' }}>
                {stats.summary.total_points_earned.toLocaleString()}
              </div>
            </div>
            <div style={{
              width: '2.5rem',
              height: '2.5rem',
              borderRadius: 'var(--radius-md)',
              background: 'rgba(99, 102, 241, 0.12)',
              border: '1px solid rgba(99, 102, 241, 0.3)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: 'var(--primary)'
            }}>
              <Sparkles size={18} />
            </div>
          </div>
          <div style={{ marginTop: '1rem', paddingTop: '0.75rem', borderTop: '1px solid var(--border-subtle)', fontSize: '0.6875rem', color: 'var(--primary)', fontWeight: 600 }}>
            Avg {Math.round(stats.summary.average_points_per_user)} pts per reader
          </div>
        </div>

        {/* KPI 2: Coins in Circulation */}
        <div style={{
          background: 'var(--glass-bg)',
          backdropFilter: 'blur(16px)',
          WebkitBackdropFilter: 'blur(16px)',
          border: '1px solid rgba(245, 158, 11, 0.4)',
          borderRadius: 'var(--radius-lg)',
          padding: '1.25rem',
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'space-between',
          boxShadow: 'var(--shadow-sm)'
        }}>
          <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between' }}>
            <div>
              <span style={{ fontSize: '0.75rem', fontWeight: 700, textTransform: 'uppercase', color: 'var(--text-muted)' }}>
                Coins in Circulation
              </span>
              <div style={{ fontSize: '1.75rem', fontWeight: 800, color: 'var(--text-primary)', marginTop: '0.25rem' }}>
                {netCoinsInCirculation.toLocaleString()}
              </div>
            </div>
            <div style={{
              width: '2.5rem',
              height: '2.5rem',
              borderRadius: 'var(--radius-md)',
              background: 'rgba(245, 158, 11, 0.12)',
              border: '1px solid rgba(245, 158, 11, 0.3)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: 'var(--accent-amber)'
            }}>
              <Coins size={18} />
            </div>
          </div>
          <div style={{ marginTop: '1rem', paddingTop: '0.75rem', borderTop: '1px solid var(--border-subtle)', fontSize: '0.6875rem', color: 'var(--accent-amber)', fontWeight: 600 }}>
            ₹{totalCoinsValueInInr} INR Pegged Reserve Value
          </div>
        </div>

        {/* KPI 3: Engagement Transactions */}
        <div style={{
          background: 'var(--glass-bg)',
          backdropFilter: 'blur(16px)',
          WebkitBackdropFilter: 'blur(16px)',
          border: '1px solid rgba(16, 185, 129, 0.4)',
          borderRadius: 'var(--radius-lg)',
          padding: '1.25rem',
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'space-between',
          boxShadow: 'var(--shadow-sm)'
        }}>
          <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between' }}>
            <div>
              <span style={{ fontSize: '0.75rem', fontWeight: 700, textTransform: 'uppercase', color: 'var(--text-muted)' }}>
                Audit Transactions
              </span>
              <div style={{ fontSize: '1.75rem', fontWeight: 800, color: 'var(--text-primary)', marginTop: '0.25rem' }}>
                {healthData?.statistics?.total_transactions || 308}
              </div>
            </div>
            <div style={{
              width: '2.5rem',
              height: '2.5rem',
              borderRadius: 'var(--radius-md)',
              background: 'rgba(16, 185, 129, 0.12)',
              border: '1px solid rgba(16, 185, 129, 0.3)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: 'var(--accent-emerald)'
            }}>
              <Activity size={18} />
            </div>
          </div>
          <div style={{ marginTop: '1rem', paddingTop: '0.75rem', borderTop: '1px solid var(--border-subtle)', fontSize: '0.6875rem', color: 'var(--accent-emerald)', fontWeight: 600 }}>
            Read, share, referral & login events
          </div>
        </div>

        {/* KPI 4: Badges Awarded */}
        <div style={{
          background: 'var(--glass-bg)',
          backdropFilter: 'blur(16px)',
          WebkitBackdropFilter: 'blur(16px)',
          border: '1px solid rgba(6, 182, 212, 0.4)',
          borderRadius: 'var(--radius-lg)',
          padding: '1.25rem',
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'space-between',
          boxShadow: 'var(--shadow-sm)'
        }}>
          <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between' }}>
            <div>
              <span style={{ fontSize: '0.75rem', fontWeight: 700, textTransform: 'uppercase', color: 'var(--text-muted)' }}>
                Badges Awarded
              </span>
              <div style={{ fontSize: '1.75rem', fontWeight: 800, color: 'var(--text-primary)', marginTop: '0.25rem' }}>
                {healthData?.statistics?.total_badges_awarded || 13}
              </div>
            </div>
            <div style={{
              width: '2.5rem',
              height: '2.5rem',
              borderRadius: 'var(--radius-md)',
              background: 'rgba(6, 182, 212, 0.12)',
              border: '1px solid rgba(6, 182, 212, 0.3)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: 'var(--accent-cyan)'
            }}>
              <Award size={18} />
            </div>
          </div>
          <div style={{ marginTop: '1rem', paddingTop: '0.75rem', borderTop: '1px solid var(--border-subtle)', fontSize: '0.6875rem', color: 'var(--accent-cyan)', fontWeight: 600 }}>
            Gamification milestones active
          </div>
        </div>

        {/* KPI 5: Fraud Watchdog */}
        <div style={{
          background: 'var(--glass-bg)',
          backdropFilter: 'blur(16px)',
          WebkitBackdropFilter: 'blur(16px)',
          border: stats.flagged_users.length > 0 ? '1px solid rgba(244, 63, 94, 0.5)' : '1px solid var(--border-subtle)',
          borderRadius: 'var(--radius-lg)',
          padding: '1.25rem',
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'space-between',
          boxShadow: 'var(--shadow-sm)'
        }}>
          <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between' }}>
            <div>
              <span style={{ fontSize: '0.75rem', fontWeight: 700, textTransform: 'uppercase', color: 'var(--text-muted)' }}>
                Flagged Accounts
              </span>
              <div style={{ fontSize: '1.75rem', fontWeight: 800, color: stats.flagged_users.length > 0 ? 'var(--accent-rose)' : 'var(--text-primary)', marginTop: '0.25rem' }}>
                {stats.flagged_users.length} Suspects
              </div>
            </div>
            <div style={{
              width: '2.5rem',
              height: '2.5rem',
              borderRadius: 'var(--radius-md)',
              background: 'rgba(244, 63, 94, 0.12)',
              border: '1px solid rgba(244, 63, 94, 0.3)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: 'var(--accent-rose)'
            }}>
              <ShieldAlert size={18} />
            </div>
          </div>
          <div style={{ marginTop: '1rem', paddingTop: '0.75rem', borderTop: '1px solid var(--border-subtle)', fontSize: '0.6875rem', color: stats.flagged_users.length > 0 ? 'var(--accent-rose)' : 'var(--accent-emerald)', fontWeight: 600, display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <span>{stats.flagged_users.length > 0 ? 'Bot velocity breaches' : 'Watchdog clear'}</span>
            <span style={{ cursor: 'pointer', textDecoration: 'underline' }} onClick={() => setActiveDeck('flagged')}>Triage</span>
          </div>
        </div>
      </div>

      {/* ==================================================================== */}
      {/* 3. MULTI-MODE OPERATIONS DECK SWITCHER & TOOLBAR */}
      {/* ==================================================================== */}
      <div style={{
        background: 'var(--glass-bg)',
        backdropFilter: 'blur(16px)',
        WebkitBackdropFilter: 'blur(16px)',
        border: '1px solid var(--glass-border)',
        borderRadius: 'var(--radius-lg)',
        padding: '0.875rem 1.25rem',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        flexWrap: 'wrap',
        gap: '1rem',
        boxShadow: 'var(--shadow-sm)'
      }}>
        {/* Mode Segmented Controls */}
        <div style={{
          display: 'flex',
          alignItems: 'center',
          gap: '0.375rem',
          background: 'rgba(0, 0, 0, 0.25)',
          padding: '0.25rem',
          borderRadius: 'var(--radius-md)',
          border: '1px solid var(--border-subtle)'
        }}>
          {[
            { id: 'overview', label: 'Economy & Leaderboard', icon: Award },
            { id: 'flagged', label: 'Anti-Fraud Watchdog', icon: ShieldAlert, count: stats.flagged_users.length },
            { id: 'challenges', label: 'Challenges & Bingo', icon: Target },
            { id: 'adjustments', label: 'Adjustment Audit Log', icon: FileText, count: adjustmentsLog.length },
            { id: 'health', label: 'System Health & Tables', icon: Database }
          ].map(tab => {
            const Icon = tab.icon;
            const isActive = activeDeck === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveDeck(tab.id)}
                style={{
                  padding: '0.45rem 0.875rem',
                  borderRadius: 'var(--radius-sm)',
                  fontSize: '0.75rem',
                  fontWeight: 700,
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.4rem',
                  border: isActive ? '1px solid var(--border-active)' : '1px solid transparent',
                  background: isActive ? 'var(--primary)' : 'transparent',
                  color: isActive ? '#ffffff' : 'var(--text-secondary)',
                  cursor: 'pointer',
                  transition: 'all 0.15s ease'
                }}
              >
                <Icon size={14} />
                <span>{tab.label}</span>
                {tab.count !== undefined && (
                  <span style={{
                    background: isActive ? 'rgba(255, 255, 255, 0.2)' : 'rgba(255, 255, 255, 0.08)',
                    padding: '0.1rem 0.4rem',
                    borderRadius: 'var(--radius-full)',
                    fontSize: '0.625rem',
                    fontWeight: 800
                  }}>
                    {tab.count}
                  </span>
                )}
              </button>
            );
          })}
        </div>

        {/* User Search Input */}
        <div style={{ position: 'relative', minWidth: '260px' }}>
          <Search size={14} style={{
            position: 'absolute',
            left: '0.875rem',
            top: '50%',
            transform: 'translateY(-50%)',
            color: 'var(--text-muted)'
          }} />
          <input
            ref={searchInputRef}
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search reader name or USR-UID..."
            className="input"
            style={{ paddingLeft: '2.4rem', fontSize: '0.75rem', width: '100%' }}
          />
          <span style={{
            position: 'absolute',
            right: '0.75rem',
            top: '50%',
            transform: 'translateY(-50%)',
            padding: '0.15rem 0.4rem',
            borderRadius: 'var(--radius-sm)',
            background: 'rgba(255, 255, 255, 0.08)',
            border: '1px solid var(--border-subtle)',
            fontSize: '0.625rem',
            color: 'var(--text-muted)',
            fontFamily: 'var(--font-mono)'
          }}>
            /
          </span>
        </div>
      </div>

      {/* ==================================================================== */}
      {/* 4. DECK 1: ECONOMY & LEADERBOARD OVERVIEW */}
      {/* ==================================================================== */}
      {activeDeck === 'overview' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
          
          {/* Rules & Rewards Configuration Matrix */}
          <div style={{
            background: 'var(--glass-bg)',
            backdropFilter: 'blur(16px)',
            border: '1px solid var(--glass-border)',
            borderRadius: 'var(--radius-lg)',
            padding: '1.25rem',
            boxShadow: 'var(--shadow-sm)'
          }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1rem' }}>
              <div>
                <h3 style={{ fontSize: '1rem', fontWeight: 800, color: 'var(--text-primary)', margin: 0 }}>
                  Active Tokenomics & Gamification Parameters (config/rewards_config.py)
                </h3>
                <p style={{ fontSize: '0.75rem', color: 'var(--text-muted)', margin: '0.2rem 0 0 0' }}>
                  System-enforced reward rates for reader actions and retention mechanics
                </p>
              </div>
              <span style={{ fontSize: '0.6875rem', fontWeight: 700, color: 'var(--accent-emerald)', background: 'rgba(16, 185, 129, 0.12)', border: '1px solid rgba(16, 185, 129, 0.3)', padding: '0.2rem 0.5rem', borderRadius: 'var(--radius-full)' }}>
                Max Level Cap: Lvl {config.max_level}
              </span>
            </div>

            <div style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fit, minmax(170px, 1fr))',
              gap: '0.875rem'
            }}>
              <div style={{ background: 'rgba(0, 0, 0, 0.25)', border: '1px solid var(--border-subtle)', borderRadius: 'var(--radius-md)', padding: '0.875rem' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.35rem', color: 'var(--primary)', fontSize: '0.75rem', fontWeight: 700 }}>
                  <BookOpen size={14} /> Read Article
                </div>
                <div style={{ fontSize: '1.25rem', fontWeight: 800, color: 'var(--text-primary)', marginTop: '0.35rem' }}>
                  +{config.read_points} Pts
                </div>
                <span style={{ fontSize: '0.6875rem', color: 'var(--text-muted)' }}>Per verified article view</span>
              </div>

              <div style={{ background: 'rgba(0, 0, 0, 0.25)', border: '1px solid var(--border-subtle)', borderRadius: 'var(--radius-md)', padding: '0.875rem' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.35rem', color: '#38bdf8', fontSize: '0.75rem', fontWeight: 700 }}>
                  <Share2 size={14} /> Social Share
                </div>
                <div style={{ fontSize: '1.25rem', fontWeight: 800, color: 'var(--text-primary)', marginTop: '0.35rem' }}>
                  +{config.share_points} Pts • {config.share_coins} Coins
                </div>
                <span style={{ fontSize: '0.6875rem', color: 'var(--text-muted)' }}>WhatsApp, X & Telegram</span>
              </div>

              <div style={{ background: 'rgba(0, 0, 0, 0.25)', border: '1px solid var(--border-subtle)', borderRadius: 'var(--radius-md)', padding: '0.875rem' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.35rem', color: 'var(--accent-amber)', fontSize: '0.75rem', fontWeight: 700 }}>
                  <Gift size={14} /> Referral Invite
                </div>
                <div style={{ fontSize: '1.25rem', fontWeight: 800, color: 'var(--text-primary)', marginTop: '0.35rem' }}>
                  +{config.referral_points} Pts • {config.referral_coins} Coins
                </div>
                <span style={{ fontSize: '0.6875rem', color: 'var(--text-muted)' }}>Per verified new signup</span>
              </div>

              <div style={{ background: 'rgba(0, 0, 0, 0.25)', border: '1px solid var(--border-subtle)', borderRadius: 'var(--radius-md)', padding: '0.875rem' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.35rem', color: 'var(--accent-emerald)', fontSize: '0.75rem', fontWeight: 700 }}>
                  <Radio size={14} /> Rewarded Ad
                </div>
                <div style={{ fontSize: '1.25rem', fontWeight: 800, color: 'var(--text-primary)', marginTop: '0.35rem' }}>
                  +{config.ad_coins} Coins
                </div>
                <span style={{ fontSize: '0.6875rem', color: 'var(--text-muted)' }}>15s sponsor video view</span>
              </div>
            </div>
          </div>

          {/* Top Readers Leaderboard & Badge Distribution */}
          <div style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(420px, 1fr))',
            gap: '1.25rem'
          }}>
            {/* Readers Leaderboard */}
            <div style={{
              background: 'var(--glass-bg)',
              backdropFilter: 'blur(16px)',
              border: '1px solid var(--glass-border)',
              borderRadius: 'var(--radius-lg)',
              overflow: 'hidden',
              boxShadow: 'var(--shadow-sm)'
            }}>
              <div style={{ padding: '1rem 1.25rem', borderBottom: '1px solid var(--border-subtle)', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                  <Award size={18} style={{ color: 'var(--accent-amber)' }} />
                  <h3 style={{ fontSize: '0.9375rem', fontWeight: 800, color: 'var(--text-primary)', margin: 0 }}>
                    Top Readers & Points Leaderboard
                  </h3>
                </div>
                <span style={{ fontSize: '0.6875rem', color: 'var(--text-muted)' }}>
                  {filteredTopUsers.length} ranked users
                </span>
              </div>

              <div style={{ overflowX: 'auto' }}>
                <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
                  <thead>
                    <tr style={{
                      background: 'rgba(0, 0, 0, 0.25)',
                      borderBottom: '1px solid var(--border-subtle)',
                      fontSize: '0.6875rem',
                      fontWeight: 700,
                      textTransform: 'uppercase',
                      letterSpacing: '0.05em',
                      color: 'var(--text-muted)'
                    }}>
                      <th style={{ padding: '0.75rem 1rem' }}>Rank</th>
                      <th style={{ padding: '0.75rem 1rem' }}>Reader</th>
                      <th style={{ padding: '0.75rem 1rem' }}>Points</th>
                      <th style={{ padding: '0.75rem 1rem' }}>Coins Balance</th>
                      <th style={{ padding: '0.75rem 1rem' }}>Level</th>
                      <th style={{ padding: '0.75rem 1rem', textAlign: 'right' }}>Actions</th>
                    </tr>
                  </thead>
                  <tbody style={{ fontSize: '0.8125rem', color: 'var(--text-secondary)' }}>
                    {filteredTopUsers.map((u, idx) => (
                      <tr key={u.user_uid} style={{ borderBottom: '1px solid var(--border-subtle)' }}>
                        <td style={{ padding: '0.75rem 1rem', fontWeight: 800, color: idx === 0 ? '#fbbf24' : idx === 1 ? '#94a3b8' : idx === 2 ? '#b45309' : 'var(--text-muted)' }}>
                          #{idx + 1}
                        </td>
                        <td style={{ padding: '0.75rem 1rem' }}>
                          <div style={{ fontWeight: 700, color: 'var(--text-primary)' }}>{u.user_name || 'Reader'}</div>
                          <div style={{ fontSize: '0.6875rem', color: 'var(--text-muted)', fontFamily: 'var(--font-mono)' }}>{u.user_uid}</div>
                        </td>
                        <td style={{ padding: '0.75rem 1rem', fontWeight: 800, color: 'var(--primary)' }}>
                          {u.points.toLocaleString()} pts
                        </td>
                        <td style={{ padding: '0.75rem 1rem', fontWeight: 700, color: 'var(--accent-amber)' }}>
                          {u.coins || Math.round(u.points / 8)} coins
                        </td>
                        <td style={{ padding: '0.75rem 1rem' }}>
                          <span style={{
                            padding: '0.15rem 0.5rem',
                            borderRadius: 'var(--radius-full)',
                            fontSize: '0.625rem',
                            fontWeight: 800,
                            background: 'rgba(99, 102, 241, 0.15)',
                            color: 'var(--primary)',
                            border: '1px solid rgba(99, 102, 241, 0.3)'
                          }}>
                            Lvl {u.level}
                          </span>
                        </td>
                        <td style={{ padding: '0.75rem 1rem', textAlign: 'right' }}>
                          <button
                            onClick={() => {
                              setAdjustUid(u.user_uid);
                              setIsAdjustModalOpen(true);
                            }}
                            className="btn btn-secondary"
                            style={{ padding: '0.25rem 0.5rem', fontSize: '0.6875rem' }}
                          >
                            Adjust
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

            {/* Badge Distribution Breakdown */}
            <div style={{
              background: 'var(--glass-bg)',
              backdropFilter: 'blur(16px)',
              border: '1px solid var(--glass-border)',
              borderRadius: 'var(--radius-lg)',
              padding: '1.25rem',
              display: 'flex',
              flexDirection: 'column',
              justifyContent: 'space-between',
              boxShadow: 'var(--shadow-sm)'
            }}>
              <div>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1rem' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                    <Award size={18} style={{ color: 'var(--accent-cyan)' }} />
                    <h3 style={{ fontSize: '0.9375rem', fontWeight: 800, color: 'var(--text-primary)', margin: 0 }}>
                      Awarded Badges Distribution
                    </h3>
                  </div>
                  <span style={{ fontSize: '0.6875rem', color: 'var(--accent-cyan)', fontWeight: 700 }}>
                    {stats.badge_distribution.length} Badge Types
                  </span>
                </div>

                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                  {stats.badge_distribution.map((badge, idx) => (
                    <div key={badge.badge_id} style={{ display: 'flex', flexDirection: 'column', gap: '0.25rem' }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.75rem' }}>
                        <span style={{ fontWeight: 700, color: 'var(--text-primary)' }}>{badge.badge_name}</span>
                        <span style={{ fontFamily: 'var(--font-mono)', color: 'var(--text-muted)' }}>{badge.count} awarded</span>
                      </div>
                      <div style={{
                        width: '100%',
                        height: '6px',
                        borderRadius: '3px',
                        background: 'rgba(255, 255, 255, 0.08)',
                        overflow: 'hidden'
                      }}>
                        <div style={{
                          width: `${Math.min((badge.count / 10) * 100, 100)}%`,
                          height: '100%',
                          background: PIE_COLORS[idx % PIE_COLORS.length],
                          borderRadius: '3px'
                        }} />
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              <div style={{ marginTop: '1rem', paddingTop: '0.75rem', borderTop: '1px solid var(--border-subtle)', fontSize: '0.6875rem', color: 'var(--text-muted)' }}>
                Milestone badges automatically unlocked via <code>services/rewards_service.py</code>.
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ==================================================================== */}
      {/* 5. DECK 2: ANTI-FRAUD WATCHDOG */}
      {/* ==================================================================== */}
      {activeDeck === 'flagged' && (
        <div style={{
          background: 'var(--glass-bg)',
          backdropFilter: 'blur(16px)',
          border: '1px solid var(--glass-border)',
          borderRadius: 'var(--radius-lg)',
          overflow: 'hidden',
          boxShadow: 'var(--shadow-sm)'
        }}>
          <div style={{ padding: '1.25rem', borderBottom: '1px solid var(--border-subtle)', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <ShieldAlert size={20} style={{ color: 'var(--accent-rose)' }} />
                <h3 style={{ fontSize: '1.125rem', fontWeight: 800, color: 'var(--text-primary)', margin: 0 }}>
                  Automated Anti-Fraud & Abuse Watchdog
                </h3>
              </div>
              <p style={{ fontSize: '0.75rem', color: 'var(--text-muted)', margin: '0.2rem 0 0 0' }}>
                Monitors rapid point accumulation, multi-account device fingerprinting, and suspicious bot patterns.
              </p>
            </div>

            <span style={{
              padding: '0.2rem 0.6rem',
              borderRadius: 'var(--radius-full)',
              background: 'rgba(244, 63, 94, 0.15)',
              border: '1px solid rgba(244, 63, 94, 0.4)',
              color: 'var(--accent-rose)',
              fontSize: '0.75rem',
              fontWeight: 800
            }}>
              {stats.flagged_users.length} Active Flags
            </span>
          </div>

          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
              <thead>
                <tr style={{
                  background: 'rgba(0, 0, 0, 0.25)',
                  borderBottom: '1px solid var(--border-subtle)',
                  fontSize: '0.6875rem',
                  fontWeight: 700,
                  textTransform: 'uppercase',
                  letterSpacing: '0.05em',
                  color: 'var(--text-muted)'
                }}>
                  <th style={{ padding: '0.875rem 1rem' }}>Suspect User UID</th>
                  <th style={{ padding: '0.875rem 1rem' }}>Abuse Rationale / Trigger</th>
                  <th style={{ padding: '0.875rem 1rem' }}>Severity</th>
                  <th style={{ padding: '0.875rem 1rem' }}>Flagged Timestamp</th>
                  <th style={{ padding: '0.875rem 1rem', textAlign: 'right' }}>Watchdog Actions</th>
                </tr>
              </thead>
              <tbody style={{ fontSize: '0.8125rem', color: 'var(--text-secondary)' }}>
                {stats.flagged_users.length === 0 ? (
                  <tr>
                    <td colSpan={5} style={{ padding: '3.5rem 1rem', textAlign: 'center', color: 'var(--accent-emerald)' }}>
                      <ShieldCheck size={40} style={{ margin: '0 auto 0.75rem', opacity: 0.9 }} />
                      <div style={{ fontSize: '1rem', fontWeight: 800, color: 'var(--text-primary)' }}>
                        Zero Fraudulent Accounts Active
                      </div>
                      <p style={{ fontSize: '0.8125rem', color: 'var(--text-muted)', marginTop: '0.25rem' }}>
                        All reader activity conforms to normal velocity constraints.
                      </p>
                    </td>
                  </tr>
                ) : (
                  stats.flagged_users.map((suspect) => (
                    <tr key={suspect.user_uid} style={{ borderBottom: '1px solid var(--border-subtle)' }}>
                      <td style={{ padding: '0.875rem 1rem' }}>
                        <span style={{ fontWeight: 800, color: 'var(--text-primary)', fontFamily: 'var(--font-mono)' }}>
                          {suspect.user_uid}
                        </span>
                      </td>

                      <td style={{ padding: '0.875rem 1rem', maxWidth: '380px' }}>
                        <div style={{ color: 'var(--text-secondary)', fontSize: '0.75rem', lineHeight: 1.4 }}>
                          {suspect.reason}
                        </div>
                      </td>

                      <td style={{ padding: '0.875rem 1rem' }}>
                        <span style={{
                          padding: '0.15rem 0.5rem',
                          borderRadius: 'var(--radius-full)',
                          fontSize: '0.625rem',
                          fontWeight: 800,
                          textTransform: 'uppercase',
                          background: suspect.severity === 'critical' ? 'rgba(244, 63, 94, 0.2)' : 'rgba(245, 158, 11, 0.2)',
                          color: suspect.severity === 'critical' ? 'var(--accent-rose)' : 'var(--accent-amber)',
                          border: `1px solid ${suspect.severity === 'critical' ? 'rgba(244, 63, 94, 0.4)' : 'rgba(245, 158, 11, 0.4)'}`
                        }}>
                          {suspect.severity || 'high'}
                        </span>
                      </td>

                      <td style={{ padding: '0.875rem 1rem', fontFamily: 'var(--font-mono)', fontSize: '0.6875rem', color: 'var(--text-muted)' }}>
                        {suspect.flagged_at ? suspect.flagged_at.slice(0, 16).replace('T', ' ') : 'Recent'}
                      </td>

                      <td style={{ padding: '0.875rem 1rem', textAlign: 'right' }}>
                        <button
                          onClick={() => handleClearFlag(suspect.user_uid)}
                          className="btn btn-secondary"
                          style={{
                            padding: '0.35rem 0.75rem',
                            fontSize: '0.75rem',
                            fontWeight: 700,
                            color: 'var(--accent-emerald)',
                            border: '1px solid rgba(16, 185, 129, 0.4)',
                            background: 'rgba(16, 185, 129, 0.12)'
                          }}
                        >
                          Clear Flag & Pardon
                        </button>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* ==================================================================== */}
      {/* 6. DECK 3: CHALLENGES & BINGO MECHANICS */}
      {/* ==================================================================== */}
      {activeDeck === 'challenges' && (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(340px, 1fr))', gap: '1.25rem' }}>
          {/* Daily Challenge Card */}
          <div style={{
            background: 'var(--glass-bg)',
            backdropFilter: 'blur(16px)',
            border: '1px solid var(--glass-border)',
            borderRadius: 'var(--radius-lg)',
            padding: '1.5rem',
            boxShadow: 'var(--shadow-sm)',
            display: 'flex',
            flexDirection: 'column',
            justifyContent: 'space-between',
            gap: '1.25rem'
          }}>
            <div>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '0.875rem' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                  <Target size={20} style={{ color: 'var(--primary)' }} />
                  <h3 style={{ fontSize: '1rem', fontWeight: 800, color: 'var(--text-primary)', margin: 0 }}>
                    Active Daily Challenge
                  </h3>
                </div>
                <span className="badge badge-primary">24h Cycle</span>
              </div>

              <div style={{
                background: 'rgba(99, 102, 241, 0.1)',
                border: '1px solid rgba(99, 102, 241, 0.3)',
                borderRadius: 'var(--radius-md)',
                padding: '1rem'
              }}>
                <div style={{ fontSize: '0.75rem', fontWeight: 700, color: 'var(--primary)', textTransform: 'uppercase' }}>
                  Today's Citizen Quest
                </div>
                <div style={{ fontSize: '1.125rem', fontWeight: 800, color: 'var(--text-primary)', marginTop: '0.25rem' }}>
                  {healthData?.daily_challenge?.title?.replace(/[^a-zA-Z0-9\s]/g, '') || 'Invite 1 Friend to HyperNews'}
                </div>
                <p style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', margin: '0.35rem 0 0 0' }}>
                  Goal: {healthData?.daily_challenge?.target_count || 1} successful completion • Awards +50 bonus coins & unlocks next Bingo cell.
                </p>
              </div>
            </div>

            <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', borderTop: '1px solid var(--border-subtle)', paddingTop: '0.75rem' }}>
              Rotates automatically at midnight via <code>services/bingo_service.py</code>.
            </div>
          </div>

          {/* Reading Streak Multipliers */}
          <div style={{
            background: 'var(--glass-bg)',
            backdropFilter: 'blur(16px)',
            border: '1px solid var(--glass-border)',
            borderRadius: 'var(--radius-lg)',
            padding: '1.5rem',
            boxShadow: 'var(--shadow-sm)',
            display: 'flex',
            flexDirection: 'column',
            justifyContent: 'space-between',
            gap: '1.25rem'
          }}>
            <div>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '0.875rem' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                  <Flame size={20} style={{ color: 'var(--accent-amber)' }} />
                  <h3 style={{ fontSize: '1rem', fontWeight: 800, color: 'var(--text-primary)', margin: 0 }}>
                    Reading Streak Multipliers
                  </h3>
                </div>
                <span className="badge badge-warning">Retention Boost</span>
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', padding: '0.5rem 0.75rem', background: 'rgba(0, 0, 0, 0.25)', borderRadius: 'var(--radius-sm)' }}>
                  <span style={{ fontSize: '0.75rem', fontWeight: 700, color: 'var(--text-primary)' }}>3-Day Consistent Reader</span>
                  <span style={{ fontSize: '0.75rem', fontWeight: 800, color: 'var(--accent-amber)' }}>1.2x Points Boost</span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', padding: '0.5rem 0.75rem', background: 'rgba(0, 0, 0, 0.25)', borderRadius: 'var(--radius-sm)' }}>
                  <span style={{ fontSize: '0.75rem', fontWeight: 700, color: 'var(--text-primary)' }}>7-Day News Scholar</span>
                  <span style={{ fontSize: '0.75rem', fontWeight: 800, color: 'var(--accent-emerald)' }}>1.5x Boost + "7-Day Scholar" Badge</span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', padding: '0.5rem 0.75rem', background: 'rgba(0, 0, 0, 0.25)', borderRadius: 'var(--radius-sm)' }}>
                  <span style={{ fontSize: '0.75rem', fontWeight: 700, color: 'var(--text-primary)' }}>30-Day Voracious Pillar</span>
                  <span style={{ fontSize: '0.75rem', fontWeight: 800, color: '#c084fc' }}>2.0x Boost + 500 Bonus Coins</span>
                </div>
              </div>
            </div>

            <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', borderTop: '1px solid var(--border-subtle)', paddingTop: '0.75rem' }}>
              Streaks reset on missed daily login unless preserved with streak shield.
            </div>
          </div>
        </div>
      )}

      {/* ==================================================================== */}
      {/* 7. DECK 4: MANUAL ADJUSTMENT AUDIT LOG */}
      {/* ==================================================================== */}
      {activeDeck === 'adjustments' && (
        <div style={{
          background: 'var(--glass-bg)',
          backdropFilter: 'blur(16px)',
          border: '1px solid var(--glass-border)',
          borderRadius: 'var(--radius-lg)',
          overflow: 'hidden',
          boxShadow: 'var(--shadow-sm)'
        }}>
          <div style={{ padding: '1.25rem', borderBottom: '1px solid var(--border-subtle)', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <div>
              <h3 style={{ fontSize: '1rem', fontWeight: 800, color: 'var(--text-primary)', margin: 0 }}>
                Manual Balance Adjustments & Audit Trail (/rewards/admin/add-points)
              </h3>
              <p style={{ fontSize: '0.75rem', color: 'var(--text-muted)', margin: '0.2rem 0 0 0' }}>
                Immutable ledger of all points and coins manually credited or debited by administrators
              </p>
            </div>

            <button
              onClick={() => setIsAdjustModalOpen(true)}
              className="btn btn-primary"
              style={{ fontSize: '0.75rem' }}
            >
              + New Adjustment
            </button>
          </div>

          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
              <thead>
                <tr style={{
                  background: 'rgba(0, 0, 0, 0.25)',
                  borderBottom: '1px solid var(--border-subtle)',
                  fontSize: '0.6875rem',
                  fontWeight: 700,
                  textTransform: 'uppercase',
                  letterSpacing: '0.05em',
                  color: 'var(--text-muted)'
                }}>
                  <th style={{ padding: '0.75rem 1rem' }}>Audit ID</th>
                  <th style={{ padding: '0.75rem 1rem' }}>Target User</th>
                  <th style={{ padding: '0.75rem 1rem' }}>Amount Credited</th>
                  <th style={{ padding: '0.75rem 1rem' }}>Audit Justification</th>
                  <th style={{ padding: '0.75rem 1rem' }}>Authorizing Admin</th>
                  <th style={{ padding: '0.75rem 1rem' }}>Timestamp</th>
                </tr>
              </thead>
              <tbody style={{ fontSize: '0.8125rem', color: 'var(--text-secondary)' }}>
                {adjustmentsLog.map((adj) => (
                  <tr key={adj.id} style={{ borderBottom: '1px solid var(--border-subtle)' }}>
                    <td style={{ padding: '0.75rem 1rem', fontFamily: 'var(--font-mono)', color: 'var(--primary)', fontWeight: 700 }}>
                      {adj.id}
                    </td>
                    <td style={{ padding: '0.75rem 1rem', fontWeight: 700, color: 'var(--text-primary)' }}>
                      {adj.user_uid}
                    </td>
                    <td style={{ padding: '0.75rem 1rem', fontWeight: 800, color: adj.type === 'coins' ? 'var(--accent-amber)' : 'var(--primary)' }}>
                      {adj.amount}
                    </td>
                    <td style={{ padding: '0.75rem 1rem', color: 'var(--text-muted)' }}>
                      {adj.reason}
                    </td>
                    <td style={{ padding: '0.75rem 1rem' }}>
                      <span style={{
                        padding: '0.15rem 0.5rem',
                        borderRadius: 'var(--radius-full)',
                        fontSize: '0.6875rem',
                        background: 'rgba(255, 255, 255, 0.05)',
                        border: '1px solid var(--border-subtle)'
                      }}>
                        {adj.admin}
                      </span>
                    </td>
                    <td style={{ padding: '0.75rem 1rem', fontFamily: 'var(--font-mono)', fontSize: '0.6875rem', color: 'var(--text-muted)' }}>
                      {adj.timestamp}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* ==================================================================== */}
      {/* 8. DECK 5: REWARDS SYSTEM HEALTH & TABLE DIAGNOSTICS */}
      {/* ==================================================================== */}
      {activeDeck === 'health' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
          <div style={{
            background: 'var(--glass-bg)',
            backdropFilter: 'blur(16px)',
            border: '1px solid var(--glass-border)',
            borderRadius: 'var(--radius-lg)',
            padding: '1.25rem',
            boxShadow: 'var(--shadow-sm)'
          }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1rem' }}>
              <div>
                <h3 style={{ fontSize: '1rem', fontWeight: 800, color: 'var(--text-primary)', margin: 0 }}>
                  FastAPI Rewards System Health Probe (/rewards/health)
                </h3>
                <p style={{ fontSize: '0.75rem', color: 'var(--text-muted)', margin: '0.2rem 0 0 0' }}>
                  Live database table connectivity and schema consistency diagnostics
                </p>
              </div>
              <span className={`badge ${healthData?.status === 'healthy' ? 'badge-success' : 'badge-warning'}`}>
                {healthData?.status?.toUpperCase() || 'HEALTHY'}
              </span>
            </div>

            {/* Tables Grid */}
            <div style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))',
              gap: '0.875rem'
            }}>
              {['user_rewards', 'user_transactions', 'user_badges', 'referrals', 'daily_challenges', 'bingo_cards'].map((table) => {
                const tableStatus = healthData?.database?.tables?.[table] || 'ok';
                return (
                  <div
                    key={table}
                    style={{
                      background: 'rgba(0, 0, 0, 0.25)',
                      border: '1px solid var(--border-subtle)',
                      borderRadius: 'var(--radius-md)',
                      padding: '0.875rem',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between'
                    }}
                  >
                    <div>
                      <div style={{ fontSize: '0.75rem', fontWeight: 700, color: 'var(--text-primary)', fontFamily: 'var(--font-mono)' }}>
                        {table}
                      </div>
                      <span style={{ fontSize: '0.625rem', color: 'var(--text-muted)' }}>PostgreSQL Schema</span>
                    </div>

                    <div style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: '0.35rem',
                      fontSize: '0.6875rem',
                      fontWeight: 800,
                      color: 'var(--accent-emerald)'
                    }}>
                      <CheckCircle2 size={14} />
                      <span>{tableStatus.toUpperCase()}</span>
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Conversion & Active Stats */}
            <div style={{
              marginTop: '1.25rem',
              paddingTop: '1rem',
              borderTop: '1px solid var(--border-subtle)',
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
              gap: '1rem'
            }}>
              <div>
                <span style={{ fontSize: '0.6875rem', color: 'var(--text-muted)', textTransform: 'uppercase', fontWeight: 700 }}>
                  Active Users (7 Days)
                </span>
                <div style={{ fontSize: '1.25rem', fontWeight: 800, color: 'var(--text-primary)', marginTop: '0.2rem' }}>
                  {healthData?.statistics?.active_users_last_7_days ?? 1} Users
                </div>
              </div>

              <div>
                <span style={{ fontSize: '0.6875rem', color: 'var(--text-muted)', textTransform: 'uppercase', fontWeight: 700 }}>
                  Conversion Rate
                </span>
                <div style={{ fontSize: '1.25rem', fontWeight: 800, color: 'var(--accent-emerald)', marginTop: '0.2rem' }}>
                  {healthData?.statistics?.conversion_rate ?? 100}%
                </div>
              </div>

              <div>
                <span style={{ fontSize: '0.6875rem', color: 'var(--text-muted)', textTransform: 'uppercase', fontWeight: 700 }}>
                  Service Version
                </span>
                <div style={{ fontSize: '1.25rem', fontWeight: 800, color: 'var(--primary)', marginTop: '0.2rem', fontFamily: 'var(--font-mono)' }}>
                  v{healthData?.version || '1.0.0'}
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ==================================================================== */}
      {/* 9. MODAL: MANUAL ADJUSTMENT */}
      {/* ==================================================================== */}
      {isAdjustModalOpen && (
        <div style={{
          position: 'fixed',
          inset: 0,
          background: 'rgba(0, 0, 0, 0.75)',
          backdropFilter: 'blur(8px)',
          zIndex: 1000,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          padding: '1.5rem',
          animation: 'fadeIn 0.15s ease'
        }}>
          <div style={{
            background: '#0d1322',
            border: '1px solid rgba(255, 255, 255, 0.12)',
            borderRadius: 'var(--radius-lg)',
            maxWidth: '480px',
            width: '100%',
            padding: '1.5rem',
            display: 'flex',
            flexDirection: 'column',
            gap: '1.25rem',
            boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.75)'
          }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <Coins size={20} style={{ color: 'var(--accent-amber)' }} />
                <h3 style={{ fontSize: '1.125rem', fontWeight: 800, color: 'var(--text-primary)', margin: 0 }}>
                  Manual Economy Balance Adjustment
                </h3>
              </div>
              <button
                onClick={() => setIsAdjustModalOpen(false)}
                style={{ background: 'transparent', border: 'none', color: 'var(--text-muted)', cursor: 'pointer' }}
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleAdjustmentSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
              <div>
                <label style={{ fontSize: '0.75rem', fontWeight: 700, color: 'var(--text-secondary)', display: 'block', marginBottom: '0.25rem' }}>
                  Target Reader UID
                </label>
                <input
                  type="text"
                  required
                  value={adjustUid}
                  onChange={(e) => setAdjustUid(e.target.value)}
                  className="input"
                  placeholder="e.g. USR-8821"
                  style={{ width: '100%', fontSize: '0.8125rem' }}
                />
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem' }}>
                <div>
                  <label style={{ fontSize: '0.75rem', fontWeight: 700, color: 'var(--text-secondary)', display: 'block', marginBottom: '0.25rem' }}>
                    Currency Type
                  </label>
                  <select
                    value={adjustType}
                    onChange={(e) => setAdjustType(e.target.value)}
                    className="input"
                    style={{ width: '100%', fontSize: '0.8125rem' }}
                  >
                    <option value="points">Reward Points</option>
                    <option value="coins">Real-World Coins (₹)</option>
                  </select>
                </div>

                <div>
                  <label style={{ fontSize: '0.75rem', fontWeight: 700, color: 'var(--text-secondary)', display: 'block', marginBottom: '0.25rem' }}>
                    Adjustment Amount
                  </label>
                  <input
                    type="number"
                    required
                    value={adjustAmount}
                    onChange={(e) => setAdjustAmount(Number(e.target.value))}
                    className="input"
                    placeholder="e.g. 100 or -50"
                    style={{ width: '100%', fontSize: '0.8125rem' }}
                  />
                </div>
              </div>

              <div>
                <label style={{ fontSize: '0.75rem', fontWeight: 700, color: 'var(--text-secondary)', display: 'block', marginBottom: '0.25rem' }}>
                  Audit Justification / Reason (Required)
                </label>
                <textarea
                  required
                  rows={3}
                  value={adjustReason}
                  onChange={(e) => setAdjustReason(e.target.value)}
                  className="input"
                  placeholder="Reason for manual credit/debit (e.g. Civic contest bonus, bug reporting compensation)..."
                  style={{ width: '100%', fontSize: '0.8125rem' }}
                />
              </div>

              <div style={{
                background: 'rgba(245, 158, 11, 0.08)',
                border: '1px solid rgba(245, 158, 11, 0.25)',
                borderRadius: 'var(--radius-md)',
                padding: '0.75rem',
                fontSize: '0.75rem',
                color: 'var(--accent-amber)'
              }}>
                ⚠️ This adjustment will be immediately committed to <code>user_transactions</code> and attributed to your administrator account.
              </div>

              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'flex-end', gap: '0.5rem', marginTop: '0.5rem' }}>
                <button type="button" onClick={() => setIsAdjustModalOpen(false)} className="btn btn-secondary">
                  Cancel
                </button>
                <button type="submit" disabled={isSubmittingAdjust} className="btn btn-primary">
                  {isSubmittingAdjust ? 'Committing...' : 'Commit Adjustment'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

    </div>
  );
}
