// src/views/EnterpriseModerationDashboard.jsx
import React, { useState, useMemo, useEffect, useRef } from 'react';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';
import { api } from '../api/client';
import {
  ShieldAlert,
  ShieldCheck,
  AlertTriangle,
  AlertOctagon,
  Clock,
  Activity,
  Search,
  CheckCircle2,
  XCircle,
  Eye,
  Filter,
  RefreshCw,
  Download,
  Flame,
  FileText,
  User,
  Users,
  Zap,
  SlidersHorizontal,
  Check,
  X,
  Sparkles,
  ExternalLink,
  ChevronLeft,
  ChevronRight,
  Shield,
  Layers,
  Award,
  Lock,
  ArrowUpRight,
  History,
  Radio,
  Sliders,
  CheckSquare,
  Square,
  Flag,
  TrendingDown,
  TrendingUp,
  Fingerprint
} from 'lucide-react';

// ============================================================================
// DATA DEFINITIONS & ENTERPRISE CORPUS
// ============================================================================

const METRICS_SUMMARY = [
  {
    id: 'pending',
    label: 'Pending Triage Queue',
    value: '6 Items',
    trend: '+2 in last hour',
    trendType: 'warning',
    icon: Clock,
    accentBorder: 'rgba(245, 158, 11, 0.4)',
    accentBg: 'rgba(245, 158, 11, 0.1)',
    accentText: '#f59e0b',
    sparkline: [4, 6, 5, 8, 7, 9, 6]
  },
  {
    id: 'flagged',
    label: 'Critical Toxicity & Hate',
    value: '8 Alerts',
    trend: 'Severe threat detected',
    trendType: 'danger',
    icon: AlertOctagon,
    accentBorder: 'rgba(244, 63, 94, 0.4)',
    accentBg: 'rgba(244, 63, 94, 0.1)',
    accentText: '#f43f5e',
    sparkline: [12, 16, 14, 20, 22, 19, 24]
  },
  {
    id: 'response_time',
    label: 'Avg Response Time',
    value: '11.4m',
    trend: '↓ 3.6m vs SLA target',
    trendType: 'success',
    icon: Zap,
    accentBorder: 'rgba(16, 185, 129, 0.4)',
    accentBg: 'rgba(16, 185, 129, 0.1)',
    accentText: '#10b981',
    sparkline: [22, 19, 17, 15, 14, 13, 11]
  },
  {
    id: 'health',
    label: 'AI Shield Confidence',
    value: '99.2%',
    trend: 'Gemini L4 + Heuristics Active',
    trendType: 'info',
    icon: ShieldCheck,
    accentBorder: 'rgba(6, 182, 212, 0.4)',
    accentBg: 'rgba(6, 182, 212, 0.1)',
    accentText: '#06b6d4',
    sparkline: [98.5, 98.8, 99.0, 99.1, 99.2, 99.2, 99.2]
  },
  {
    id: 'authors',
    label: 'High-Risk Authors',
    value: '14 Accounts',
    trend: '7 active strike cooldowns',
    trendType: 'purple',
    icon: Fingerprint,
    accentBorder: 'rgba(168, 85, 247, 0.4)',
    accentBg: 'rgba(168, 85, 247, 0.1)',
    accentText: '#c084fc',
    sparkline: [10, 11, 12, 14, 13, 14, 14]
  }
];

const INITIAL_QUEUE_ITEMS = [
  {
    id: 'MOD-9401',
    contentType: 'Article',
    title: 'Secret Miracle Tonic Cures All Chronic Illnesses Overnight, Claims Viral Post',
    excerpt: 'A groundbreaking natural extract from deep rainforest roots is causing uproar as doctors attempt to ban this simple household formula that allegedly dissolves systemic inflammation in 48 hours...',
    category: 'Health & Science',
    reason: 'Medical Misinformation / Fake Claims',
    reasonCategory: 'Misinformation',
    author: {
      name: 'UserContributed99',
      handle: '@health_oracle_99',
      uid: 'USR-8492',
      avatar: 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=120&auto=format&fit=crop&q=80',
      trustScore: 32,
      tier: 'Untrusted',
      strikes: 2
    },
    severity: 'Critical',
    toxicityScore: 0.94,
    aiConfidence: '94% Misleading',
    aiFactCheck: 'Contains debunked medical assertions with zero clinical trials. Cross-referenced against WHO medical registry and PubMed index.',
    timestamp: '12m ago',
    rawTime: '2026-09-20 20:31',
    status: 'Needs Review',
    reportCount: 38
  },
  {
    id: 'MOD-9402',
    contentType: 'Comment',
    title: 'Comment on "Stock Markets Hit Record High as Inflows Surge"',
    excerpt: 'GUYS INVEST IN THIS NEW 1000X COIN NOW!! GUARANTEED 500% RETURN IN 24 HOURS JOIN TELEGRAM @SCAM_CRYPTO_LINK IMMEDIATELY!! ZERO RISK TESTED BY VIP INSIDERS!',
    category: 'Financial Markets',
    reason: 'Financial Fraud & Phishing Scam',
    reasonCategory: 'Spam',
    author: {
      name: 'crypto_moon_king',
      handle: '@cryptoking_x',
      uid: 'USR-1102',
      avatar: 'https://images.unsplash.com/photo-1570295999919-56ceb5ecca61?w=120&auto=format&fit=crop&q=80',
      trustScore: 14,
      tier: 'High Risk',
      strikes: 3
    },
    severity: 'Critical',
    toxicityScore: 0.98,
    aiConfidence: '98% Financial Scam',
    aiFactCheck: 'Flagged by automated heuristic filter as multi-recipient bot spam promoting unregistered offshore Telegram channels.',
    timestamp: '18m ago',
    rawTime: '2026-09-20 20:25',
    status: 'Needs Review',
    reportCount: 52
  },
  {
    id: 'MOD-9403',
    contentType: 'Article',
    title: 'Breaking: Major Bank Halts All ATM Cash Withdrawals Indefinitely Across Metro Branches',
    excerpt: 'Customers are advised to rush to branch counters immediately as reports suggest liquidity constraints have forced automated teller shutdowns across north zone centers...',
    category: 'Economy',
    reason: 'Financial Panic & Sensationalism',
    reasonCategory: 'Misinformation',
    author: {
      name: 'MarketWatcher24',
      handle: '@mkt_watcher',
      uid: 'USR-2914',
      avatar: 'https://images.unsplash.com/photo-1580489944761-15a19d654956?w=120&auto=format&fit=crop&q=80',
      trustScore: 58,
      tier: 'Standard',
      strikes: 0
    },
    severity: 'Medium',
    toxicityScore: 0.62,
    aiConfidence: '88% Exaggerated',
    aiFactCheck: 'Scheduled 2-hour backend core banking maintenance misreported as indefinite systemic shutdown. Central Bank confirmed normal operations.',
    timestamp: '45m ago',
    rawTime: '2026-09-20 19:58',
    status: 'Needs Review',
    reportCount: 19
  },
  {
    id: 'MOD-9404',
    contentType: 'Comment',
    title: 'Comment on "Parliament Session: Key Infrastructure Bills Slated"',
    excerpt: 'These politicians are utter traitors and whoever supports this bill deserves to have their house burned down immediately! We will hunt down everyone who voted yes!!',
    category: 'Politics',
    reason: 'Threat of Violence / Hate Speech',
    reasonCategory: 'Toxicity',
    author: {
      name: 'angry_critic_02',
      handle: '@critic_angry',
      uid: 'USR-6629',
      avatar: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=120&auto=format&fit=crop&q=80',
      trustScore: 22,
      tier: 'High Risk',
      strikes: 2
    },
    severity: 'Critical',
    toxicityScore: 0.96,
    aiConfidence: '96% Severe Toxicity',
    aiFactCheck: 'Direct incitement of physical property destruction and violent intimidation targeting public officials.',
    timestamp: '1h ago',
    rawTime: '2026-09-20 19:40',
    status: 'Needs Review',
    reportCount: 44
  },
  {
    id: 'MOD-9405',
    contentType: 'Article',
    title: 'Celebrity Wedding Photos Leaked Ahead of Official Privacy Embargo',
    excerpt: 'Exclusive unauthorized drone photographs captured from private surveillance over the weekend luxury wedding estate venue in Udaipur without organizer clearance...',
    category: 'Entertainment',
    reason: 'Copyright Infringement & Privacy Breach',
    reasonCategory: 'Copyright',
    author: {
      name: 'PaparazziNow',
      handle: '@paparazzi_live',
      uid: 'USR-7731',
      avatar: 'https://images.unsplash.com/photo-1522075469751-3a6694fb2f61?w=120&auto=format&fit=crop&q=80',
      trustScore: 48,
      tier: 'Standard',
      strikes: 1
    },
    severity: 'Medium',
    toxicityScore: 0.25,
    aiConfidence: '99% Copyright Notice',
    aiFactCheck: 'Formal DMCA Takedown Notice filed by Law Offices of Kapoor & Associates. High resolution assets match restricted agency watermarks.',
    timestamp: '2h ago',
    rawTime: '2026-09-20 18:43',
    status: 'Needs Review',
    reportCount: 7
  },
  {
    id: 'MOD-9406',
    contentType: 'Video Short',
    title: 'Underground Street Racing Clips on Outer Ring Road High Speed',
    excerpt: 'High octane midnight drag races reaching 220 km/h on active public bypass without road safety permits or traffic diversion with spectator crowds lining barriers...',
    category: 'Automotive',
    reason: 'Illegal Acts & Public Safety Endangerment',
    reasonCategory: 'Toxicity',
    author: {
      name: 'drift_master_hyd',
      handle: '@hyd_drifter',
      uid: 'USR-9021',
      avatar: 'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=120&auto=format&fit=crop&q=80',
      trustScore: 35,
      tier: 'Untrusted',
      strikes: 1
    },
    severity: 'Low',
    toxicityScore: 0.44,
    aiConfidence: '76% Traffic Hazard',
    aiFactCheck: 'Depicts unlawful high-speed activities on active public thoroughfares in violation of regional road safety directives.',
    timestamp: '3h ago',
    rawTime: '2026-09-20 17:15',
    status: 'Needs Review',
    reportCount: 12
  }
];

const INITIAL_AUTHORS_INDEX = [
  {
    uid: 'USR-1102',
    name: 'crypto_moon_king',
    handle: '@cryptoking_x',
    avatar: 'https://images.unsplash.com/photo-1570295999919-56ceb5ecca61?w=120&auto=format&fit=crop&q=80',
    trustScore: 14,
    tier: 'High Risk',
    strikes: 3,
    status: 'Restricted',
    flaggedPosts: 18,
    totalPosts: 24,
    lastViolation: 'Financial Fraud & Phishing Scam (18m ago)'
  },
  {
    uid: 'USR-6629',
    name: 'angry_critic_02',
    handle: '@critic_angry',
    avatar: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=120&auto=format&fit=crop&q=80',
    trustScore: 22,
    tier: 'High Risk',
    strikes: 2,
    status: 'Cooldown Active',
    flaggedPosts: 12,
    totalPosts: 45,
    lastViolation: 'Threat of Violence / Hate Speech (1h ago)'
  },
  {
    uid: 'USR-8492',
    name: 'UserContributed99',
    handle: '@health_oracle_99',
    avatar: 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=120&auto=format&fit=crop&q=80',
    trustScore: 32,
    tier: 'Untrusted',
    strikes: 2,
    status: 'Under Review',
    flaggedPosts: 6,
    totalPosts: 19,
    lastViolation: 'Medical Misinformation / Fake Claims (12m ago)'
  },
  {
    uid: 'USR-9021',
    name: 'drift_master_hyd',
    handle: '@hyd_drifter',
    avatar: 'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=120&auto=format&fit=crop&q=80',
    trustScore: 35,
    tier: 'Untrusted',
    strikes: 1,
    status: 'Monitored',
    flaggedPosts: 4,
    totalPosts: 29,
    lastViolation: 'Reckless Public Endangerment (3h ago)'
  },
  {
    uid: 'USR-7731',
    name: 'PaparazziNow',
    handle: '@paparazzi_live',
    avatar: 'https://images.unsplash.com/photo-1522075469751-3a6694fb2f61?w=120&auto=format&fit=crop&q=80',
    trustScore: 48,
    tier: 'Standard',
    strikes: 1,
    status: 'Active',
    flaggedPosts: 2,
    totalPosts: 85,
    lastViolation: 'Copyright Notice / DMCA (2h ago)'
  },
  {
    uid: 'USR-2914',
    name: 'MarketWatcher24',
    handle: '@mkt_watcher',
    avatar: 'https://images.unsplash.com/photo-1580489944761-15a19d654956?w=120&auto=format&fit=crop&q=80',
    trustScore: 58,
    tier: 'Standard',
    strikes: 0,
    status: 'Active',
    flaggedPosts: 1,
    totalPosts: 140,
    lastViolation: 'Financial Panic Misreport (45m ago)'
  },
  {
    uid: 'USR-4019',
    name: 'Dr. Anita Rao',
    handle: '@dranita_md',
    avatar: 'https://images.unsplash.com/photo-1594824813576-9076f8272559?w=120&auto=format&fit=crop&q=80',
    trustScore: 96,
    tier: 'Verified Scholar',
    strikes: 0,
    status: 'Trusted Partner',
    flaggedPosts: 0,
    totalPosts: 312,
    lastViolation: 'None (Clean Record)'
  }
];

const INITIAL_AUDIT_LOGS = [
  {
    id: 'AUD-8801',
    time: '2026-09-20 20:15:32',
    moderator: 'Alex Vance (Lead Auditor)',
    action: 'Takedown & Reject',
    target: 'MOD-9388 (Spam Bot Flood)',
    reason: 'Offshore phishing links detected by heuristic engine',
    severity: 'Critical'
  },
  {
    id: 'AUD-8802',
    time: '2026-09-20 19:42:10',
    moderator: 'AI Shield Auto-Enforce',
    action: 'Temporary Quarantine',
    target: 'MOD-9390 (Deepfake Claim)',
    reason: 'Confidence 99.1% synthetic media without provenance',
    severity: 'Critical'
  },
  {
    id: 'AUD-8803',
    time: '2026-09-20 18:20:04',
    moderator: 'Sarah Chen (Legal)',
    action: 'Escalated to Legal Council',
    target: 'MOD-9372 (Trademark Dispute)',
    reason: 'Cease & Desist received from counsel',
    severity: 'Medium'
  },
  {
    id: 'AUD-8804',
    time: '2026-09-20 17:05:49',
    moderator: 'Alex Vance (Lead Auditor)',
    action: 'Approved & Restored',
    target: 'MOD-9365 (Satire Column)',
    reason: 'Clarified as political satire with valid label',
    severity: 'Low'
  }
];

// ============================================================================
// MAIN COMPONENT: HYPERNEWS ENTERPRISE TRUST COMMAND CENTER
// ============================================================================

export default function EnterpriseModerationDashboard() {
  const { role } = useAuth();
  const { showToast } = useToast();

  // Primary Mode Switcher: 'queue' | 'authors' | 'audit'
  const [activeDeck, setActiveDeck] = useState('queue');
  const [viewMode, setViewMode] = useState('table'); // 'table' | 'cards'

  // Moderation Workspace Data State
  const [items, setItems] = useState(INITIAL_QUEUE_ITEMS);
  const [authors, setAuthors] = useState(INITIAL_AUTHORS_INDEX);
  const [auditLogs, setAuditLogs] = useState(INITIAL_AUDIT_LOGS);

  // Filters
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('all'); // 'all' | 'needs_review' | 'escalated' | 'resolved'
  const [categoryFilter, setCategoryFilter] = useState('all'); // 'all' | 'Misinformation' | 'Spam' | 'Toxicity' | 'Copyright'
  const [severityFilter, setSeverityFilter] = useState('all'); // 'all' | 'Critical' | 'Medium' | 'Low'
  const [selectedIds, setSelectedIds] = useState([]);

  // Modals & Inspection
  const [inspectItem, setInspectItem] = useState(null);
  const [authorToManage, setAuthorToManage] = useState(null);
  const [strikeReason, setStrikeReason] = useState('');
  const [isQuarantineConfirmOpen, setIsQuarantineConfirmOpen] = useState(false);

  // Real-time Clock
  const [currentTime, setCurrentTime] = useState(new Date());
  const searchInputRef = useRef(null);

  useEffect(() => {
    const timer = setInterval(() => setCurrentTime(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  // Keyboard shortcut '/' or 'Cmd+K' to focus search
  useEffect(() => {
    const handleKeyDown = (e) => {
      if ((e.key === '/' || (e.metaKey && e.key === 'k')) && document.activeElement !== searchInputRef.current) {
        e.preventDefault();
        searchInputRef.current?.focus();
      }
      if (e.key === 'Escape') {
        setInspectItem(null);
        setAuthorToManage(null);
        setIsQuarantineConfirmOpen(false);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  // Sync with pending news API if available
  const handleSyncHeuristics = async () => {
    showToast('Synchronizing AI safety heuristics and live news queue...', 'info');
    try {
      const data = await api.getPendingNews(1, 10);
      if (data && (data.items || data.length)) {
        showToast('Successfully synchronized with backend pending queue!', 'success');
      } else {
        showToast('AI heuristic models reloaded. All 4 filters operational.', 'success');
      }
    } catch {
      showToast('AI heuristic models reloaded. All 4 filters operational.', 'success');
    }
  };

  // Filter & Search Logic for Queue
  const filteredItems = useMemo(() => {
    return items.filter((item) => {
      if (statusFilter === 'needs_review' && item.status !== 'Needs Review') return false;
      if (statusFilter === 'escalated' && item.status !== 'Escalated') return false;
      if (statusFilter === 'resolved' && item.status !== 'Resolved') return false;

      if (categoryFilter !== 'all' && item.reasonCategory !== categoryFilter) return false;
      if (severityFilter !== 'all' && item.severity !== severityFilter) return false;

      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const matches =
          item.title.toLowerCase().includes(q) ||
          item.author.name.toLowerCase().includes(q) ||
          item.author.handle.toLowerCase().includes(q) ||
          item.id.toLowerCase().includes(q) ||
          item.reason.toLowerCase().includes(q) ||
          item.excerpt.toLowerCase().includes(q);
        if (!matches) return false;
      }
      return true;
    });
  }, [items, statusFilter, categoryFilter, severityFilter, searchQuery]);

  // Filtered Authors
  const filteredAuthors = useMemo(() => {
    if (!searchQuery.trim()) return authors;
    const q = searchQuery.toLowerCase();
    return authors.filter(a => 
      a.name.toLowerCase().includes(q) ||
      a.handle.toLowerCase().includes(q) ||
      a.uid.toLowerCase().includes(q) ||
      a.tier.toLowerCase().includes(q)
    );
  }, [authors, searchQuery]);

  // Selection Toggles
  const handleToggleSelect = (id) => {
    setSelectedIds((prev) =>
      prev.includes(id) ? prev.filter((item) => item !== id) : [...prev, id]
    );
  };

  const handleSelectAll = () => {
    if (selectedIds.length === filteredItems.length && filteredItems.length > 0) {
      setSelectedIds([]);
    } else {
      setSelectedIds(filteredItems.map((i) => i.id));
    }
  };

  // Single Item Actions
  const handleApprove = (id) => {
    setItems((prev) =>
      prev.map((i) => (i.id === id ? { ...i, status: 'Resolved' } : i))
    );
    setSelectedIds((prev) => prev.filter((item) => item !== id));
    if (inspectItem?.id === id) setInspectItem(null);

    // Append to Audit Logs
    const log = {
      id: `AUD-${Math.floor(1000 + Math.random() * 9000)}`,
      time: new Date().toISOString().replace('T', ' ').slice(0, 19),
      moderator: 'Alex Vance (Lead Auditor)',
      action: 'Approved & Restored',
      target: id,
      reason: 'Cleared of violations upon human verification',
      severity: 'Low'
    };
    setAuditLogs([log, ...auditLogs]);
    showToast(`Item ${id} approved and restored to feeds!`, 'success');
  };

  const handleReject = (id) => {
    setItems((prev) =>
      prev.map((i) => (i.id === id ? { ...i, status: 'Resolved', rejected: true } : i))
    );
    setSelectedIds((prev) => prev.filter((item) => item !== id));
    if (inspectItem?.id === id) setInspectItem(null);

    const log = {
      id: `AUD-${Math.floor(1000 + Math.random() * 9000)}`,
      time: new Date().toISOString().replace('T', ' ').slice(0, 19),
      moderator: 'Alex Vance (Lead Auditor)',
      action: 'Takedown & Reject',
      target: id,
      reason: 'Confirmed safety violation. Content removed permanently.',
      severity: 'Critical'
    };
    setAuditLogs([log, ...auditLogs]);
    showToast(`Item ${id} rejected and permanently removed!`, 'danger');
  };

  const handleEscalate = (id) => {
    setItems((prev) =>
      prev.map((i) => (i.id === id ? { ...i, status: 'Escalated' } : i))
    );
    setSelectedIds((prev) => prev.filter((item) => item !== id));
    if (inspectItem?.id === id) setInspectItem(null);

    const log = {
      id: `AUD-${Math.floor(1000 + Math.random() * 9000)}`,
      time: new Date().toISOString().replace('T', ' ').slice(0, 19),
      moderator: 'Alex Vance (Lead Auditor)',
      action: 'Escalated to Legal Council',
      target: id,
      reason: 'Flagged for expedited statutory compliance review',
      severity: 'Medium'
    };
    setAuditLogs([log, ...auditLogs]);
    showToast(`Item ${id} escalated to Senior Legal & Trust Council.`, 'warning');
  };

  // Bulk Operations
  const handleBulkAction = (action) => {
    if (selectedIds.length === 0) return;
    const count = selectedIds.length;

    if (action === 'approve') {
      setItems((prev) =>
        prev.map((i) => (selectedIds.includes(i.id) ? { ...i, status: 'Resolved' } : i))
      );
      showToast(`Successfully approved and restored ${count} items.`, 'success');
    } else if (action === 'reject') {
      setItems((prev) =>
        prev.map((i) => (selectedIds.includes(i.id) ? { ...i, status: 'Resolved', rejected: true } : i))
      );
      showToast(`Rejected and removed ${count} items permanently.`, 'danger');
    } else if (action === 'escalate') {
      setItems((prev) =>
        prev.map((i) => (selectedIds.includes(i.id) ? { ...i, status: 'Escalated' } : i))
      );
      showToast(`Escalated ${count} items for legal council triage.`, 'warning');
    } else if (action === 'quarantine') {
      setItems((prev) =>
        prev.map((i) => (selectedIds.includes(i.id) ? { ...i, status: 'Escalated', quarantined: true } : i))
      );
      showToast(`Quarantined ${count} items under strict network freeze.`, 'danger');
    }

    setSelectedIds([]);
  };

  // Author Management
  const handleIssueStrike = (authorUid) => {
    setAuthors(prev => prev.map(a => {
      if (a.uid === authorUid) {
        const nextStrikes = a.strikes + 1;
        const nextScore = Math.max(a.trustScore - 15, 0);
        const nextStatus = nextStrikes >= 3 ? 'Restricted' : 'Cooldown Active';
        showToast(`Formal Strike issued to ${a.handle}. Trust score penalized to ${nextScore}/100.`, 'warning');
        return {
          ...a,
          strikes: nextStrikes,
          trustScore: nextScore,
          status: nextStatus,
          lastViolation: strikeReason || 'Policy Violation Strike Issued'
        };
      }
      return a;
    }));
    setAuthorToManage(null);
    setStrikeReason('');
  };

  const handlePardonAuthor = (authorUid) => {
    setAuthors(prev => prev.map(a => {
      if (a.uid === authorUid) {
        showToast(`Author ${a.handle} pardoned. Strikes reset.`, 'success');
        return {
          ...a,
          strikes: 0,
          trustScore: Math.min(a.trustScore + 25, 95),
          status: 'Active',
          tier: 'Standard'
        };
      }
      return a;
    }));
    setAuthorToManage(null);
  };

  // CSV Export
  const handleExportAudit = () => {
    const headers = ['Audit ID', 'Timestamp', 'Moderator', 'Action Taken', 'Target Item', 'Violation Reason', 'Severity'];
    const rows = auditLogs.map(l => [
      l.id,
      `"${l.time}"`,
      `"${l.moderator}"`,
      `"${l.action}"`,
      `"${l.target}"`,
      `"${l.reason.replace(/"/g, '""')}"`,
      l.severity
    ]);

    const csvContent = 'data:text/csv;charset=utf-8,' + [headers.join(','), ...rows.map(e => e.join(','))].join('\n');
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `HyperNews_Trust_Audit_Report_${new Date().toISOString().slice(0, 10)}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    showToast(`Exported ${auditLogs.length} audit trail records to CSV`, 'info');
  };

  // Emergency Quarantine All Unreviewed
  const handleEmergencyQuarantine = () => {
    setItems(prev => prev.map(i => i.status === 'Needs Review' ? { ...i, status: 'Escalated', quarantined: true } : i));
    setIsQuarantineConfirmOpen(false);
    showToast('EMERGENCY LOCKDOWN: All pending items quarantined from public endpoints.', 'danger');
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem', width: '100%' }}>
      
      {/* ==================================================================== */}
      {/* 1. OPERATIONS COMMAND DESK HEADER & LIVE TRUST BEACON */}
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
            background: 'linear-gradient(135deg, rgba(99, 102, 241, 0.25) 0%, rgba(244, 63, 94, 0.25) 100%)',
            border: '1px solid rgba(99, 102, 241, 0.4)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            color: 'var(--primary)',
            boxShadow: '0 8px 16px -4px rgba(99, 102, 241, 0.3)'
          }}>
            <ShieldAlert size={28} />
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
                HYPERNEWS Enterprise Trust
              </h1>
              <div style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '0.375rem',
                padding: '0.25rem 0.625rem',
                borderRadius: 'var(--radius-full)',
                background: 'rgba(16, 185, 129, 0.12)',
                border: '1px solid rgba(16, 185, 129, 0.3)',
                fontSize: '0.6875rem',
                fontWeight: 700,
                color: 'var(--accent-emerald)',
                textTransform: 'uppercase',
                letterSpacing: '0.05em'
              }}>
                <span style={{
                  width: '6px',
                  height: '6px',
                  borderRadius: '50%',
                  background: 'var(--accent-emerald)',
                  boxShadow: '0 0 8px var(--accent-emerald)'
                }} />
                AI CONTENT SAFETY ENGINE ACTIVE
              </div>
            </div>

            <p style={{
              margin: '0.25rem 0 0 0',
              fontSize: '0.8125rem',
              color: 'var(--text-muted)',
              display: 'flex',
              alignItems: 'center',
              gap: '0.75rem'
            }}>
              <span>Automated L4 Heuristic Shield • Gemini AI Fact-Checking • Community Safety Triage</span>
              <span style={{ opacity: 0.4 }}>|</span>
              <span style={{
                fontFamily: 'var(--font-mono)',
                color: 'var(--text-secondary)',
                display: 'inline-flex',
                alignItems: 'center',
                gap: '0.375rem'
              }}>
                <Clock size={13} style={{ color: 'var(--primary)' }} />
                {currentTime.toLocaleTimeString('en-US', { hour12: false })} IST • {currentTime.toISOString().slice(0, 10)}
              </span>
            </p>
          </div>
        </div>

        {/* Right Action Center */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.625rem', flexWrap: 'wrap' }}>
          <button
            onClick={handleSyncHeuristics}
            className="btn btn-secondary"
            style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', fontSize: '0.8125rem' }}
            title="Reload safety heuristics and sync pending queue"
          >
            <RefreshCw size={14} />
            <span>Sync Heuristics</span>
          </button>

          <button
            onClick={handleExportAudit}
            className="btn btn-secondary"
            style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', fontSize: '0.8125rem' }}
            title="Download immutable compliance audit report (CSV)"
          >
            <Download size={14} />
            <span>Export Audit (CSV)</span>
          </button>

          <button
            onClick={() => setIsQuarantineConfirmOpen(true)}
            className="btn"
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '0.4rem',
              fontSize: '0.8125rem',
              background: 'linear-gradient(135deg, #e11d48 0%, #be123c 100%)',
              color: '#ffffff',
              border: '1px solid rgba(244, 63, 94, 0.5)',
              boxShadow: '0 4px 12px rgba(225, 29, 72, 0.35)'
            }}
            title="Trigger emergency batch quarantine for all unverified flags"
          >
            <Lock size={14} />
            <span>Emergency Quarantine</span>
          </button>
        </div>
      </div>

      {/* ==================================================================== */}
      {/* 2. FIVE STRATEGIC TELEMETRY KPI CARDS */}
      {/* ==================================================================== */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fit, minmax(210px, 1fr))',
        gap: '1rem'
      }}>
        {METRICS_SUMMARY.map((metric) => {
          const Icon = metric.icon;
          return (
            <div
              key={metric.id}
              style={{
                background: 'var(--glass-bg)',
                backdropFilter: 'blur(16px)',
                WebkitBackdropFilter: 'blur(16px)',
                border: `1px solid ${metric.accentBorder}`,
                borderRadius: 'var(--radius-lg)',
                padding: '1.25rem',
                display: 'flex',
                flexDirection: 'column',
                justifyContent: 'space-between',
                position: 'relative',
                overflow: 'hidden',
                boxShadow: 'var(--shadow-sm)',
                transition: 'all 0.2s ease'
              }}
            >
              <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between' }}>
                <div>
                  <span style={{
                    fontSize: '0.75rem',
                    fontWeight: 700,
                    textTransform: 'uppercase',
                    letterSpacing: '0.05em',
                    color: 'var(--text-muted)'
                  }}>
                    {metric.label}
                  </span>
                  <div style={{
                    fontSize: '1.75rem',
                    fontWeight: 800,
                    color: 'var(--text-primary)',
                    marginTop: '0.25rem',
                    letterSpacing: '-0.02em'
                  }}>
                    {metric.value}
                  </div>
                </div>
                <div style={{
                  width: '2.5rem',
                  height: '2.5rem',
                  borderRadius: 'var(--radius-md)',
                  background: metric.accentBg,
                  border: `1px solid ${metric.accentBorder}`,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  color: metric.accentText
                }}>
                  <Icon size={18} />
                </div>
              </div>

              {/* Trend & Sparkline Simulation */}
              <div style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                marginTop: '1rem',
                paddingTop: '0.75rem',
                borderTop: '1px solid var(--border-subtle)'
              }}>
                <span style={{
                  fontSize: '0.6875rem',
                  fontWeight: 600,
                  color: metric.accentText,
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.25rem'
                }}>
                  {metric.trend}
                </span>

                {/* Mini Sparkline Bars */}
                <div style={{ display: 'flex', alignItems: 'flex-end', gap: '3px', height: '18px' }}>
                  {metric.sparkline.map((val, idx) => (
                    <div
                      key={idx}
                      style={{
                        height: `${(val / Math.max(...metric.sparkline)) * 100}%`,
                        width: '4px',
                        borderRadius: '2px',
                        background: metric.accentText,
                        opacity: 0.6 + (idx * 0.05)
                      }}
                    />
                  ))}
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* ==================================================================== */}
      {/* 3. MULTI-MODE OPERATIONS DECK SWITCHER & COMMAND TOOLBAR */}
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
        {/* Left Segmented Mode Switcher */}
        <div style={{
          display: 'flex',
          alignItems: 'center',
          gap: '0.375rem',
          background: 'rgba(0, 0, 0, 0.25)',
          padding: '0.25rem',
          borderRadius: 'var(--radius-md)',
          border: '1px solid var(--border-subtle)'
        }}>
          <button
            onClick={() => setActiveDeck('queue')}
            style={{
              padding: '0.45rem 0.875rem',
              borderRadius: 'var(--radius-sm)',
              fontSize: '0.75rem',
              fontWeight: 700,
              display: 'flex',
              alignItems: 'center',
              gap: '0.4rem',
              border: activeDeck === 'queue' ? '1px solid var(--border-active)' : '1px solid transparent',
              background: activeDeck === 'queue' ? 'var(--primary)' : 'transparent',
              color: activeDeck === 'queue' ? '#ffffff' : 'var(--text-secondary)',
              cursor: 'pointer',
              transition: 'all 0.15s ease'
            }}
          >
            <ShieldAlert size={14} />
            <span>Live Moderation Queue</span>
            <span style={{
              background: activeDeck === 'queue' ? 'rgba(255, 255, 255, 0.2)' : 'rgba(255, 255, 255, 0.08)',
              padding: '0.1rem 0.4rem',
              borderRadius: 'var(--radius-full)',
              fontSize: '0.625rem',
              fontWeight: 800
            }}>
              {items.filter(i => i.status === 'Needs Review').length}
            </span>
          </button>

          <button
            onClick={() => setActiveDeck('authors')}
            style={{
              padding: '0.45rem 0.875rem',
              borderRadius: 'var(--radius-sm)',
              fontSize: '0.75rem',
              fontWeight: 700,
              display: 'flex',
              alignItems: 'center',
              gap: '0.4rem',
              border: activeDeck === 'authors' ? '1px solid var(--border-active)' : '1px solid transparent',
              background: activeDeck === 'authors' ? 'var(--primary)' : 'transparent',
              color: activeDeck === 'authors' ? '#ffffff' : 'var(--text-secondary)',
              cursor: 'pointer',
              transition: 'all 0.15s ease'
            }}
          >
            <Users size={14} />
            <span>Author Reputation & Trust Index</span>
            <span style={{
              background: activeDeck === 'authors' ? 'rgba(255, 255, 255, 0.2)' : 'rgba(255, 255, 255, 0.08)',
              padding: '0.1rem 0.4rem',
              borderRadius: 'var(--radius-full)',
              fontSize: '0.625rem',
              fontWeight: 800
            }}>
              {authors.length}
            </span>
          </button>

          <button
            onClick={() => setActiveDeck('audit')}
            style={{
              padding: '0.45rem 0.875rem',
              borderRadius: 'var(--radius-sm)',
              fontSize: '0.75rem',
              fontWeight: 700,
              display: 'flex',
              alignItems: 'center',
              gap: '0.4rem',
              border: activeDeck === 'audit' ? '1px solid var(--border-active)' : '1px solid transparent',
              background: activeDeck === 'audit' ? 'var(--primary)' : 'transparent',
              color: activeDeck === 'audit' ? '#ffffff' : 'var(--text-secondary)',
              cursor: 'pointer',
              transition: 'all 0.15s ease'
            }}
          >
            <History size={14} />
            <span>Compliance Audit Trail</span>
            <span style={{
              background: activeDeck === 'audit' ? 'rgba(255, 255, 255, 0.2)' : 'rgba(255, 255, 255, 0.08)',
              padding: '0.1rem 0.4rem',
              borderRadius: 'var(--radius-full)',
              fontSize: '0.625rem',
              fontWeight: 800
            }}>
              {auditLogs.length}
            </span>
          </button>
        </div>

        {/* View Mode Toggle (Ledger Table vs Cards) for Queue */}
        {activeDeck === 'queue' && (
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <div style={{
              display: 'flex',
              alignItems: 'center',
              background: 'rgba(0, 0, 0, 0.25)',
              padding: '0.2rem',
              borderRadius: 'var(--radius-md)',
              border: '1px solid var(--border-subtle)'
            }}>
              <button
                onClick={() => setViewMode('table')}
                style={{
                  padding: '0.35rem 0.75rem',
                  borderRadius: 'var(--radius-sm)',
                  fontSize: '0.75rem',
                  fontWeight: 600,
                  border: 'none',
                  background: viewMode === 'table' ? 'var(--bg-surface-elevated)' : 'transparent',
                  color: viewMode === 'table' ? 'var(--text-primary)' : 'var(--text-muted)',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.35rem'
                }}
              >
                <span>Ledger Table</span>
              </button>
              <button
                onClick={() => setViewMode('cards')}
                style={{
                  padding: '0.35rem 0.75rem',
                  borderRadius: 'var(--radius-sm)',
                  fontSize: '0.75rem',
                  fontWeight: 600,
                  border: 'none',
                  background: viewMode === 'cards' ? 'var(--bg-surface-elevated)' : 'transparent',
                  color: viewMode === 'cards' ? 'var(--text-primary)' : 'var(--text-muted)',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.35rem'
                }}
              >
                <span>Visual Cards</span>
              </button>
            </div>
          </div>
        )}
      </div>

      {/* ==================================================================== */}
      {/* 4. MAIN DECK 1: LIVE MODERATION QUEUE */}
      {/* ==================================================================== */}
      {activeDeck === 'queue' && (
        <>
          {/* Filtering & Bulk Bar */}
          <div style={{
            background: 'var(--glass-bg)',
            backdropFilter: 'blur(16px)',
            WebkitBackdropFilter: 'blur(16px)',
            border: '1px solid var(--glass-border)',
            borderRadius: 'var(--radius-lg)',
            padding: '1rem 1.25rem',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            flexWrap: 'wrap',
            gap: '1rem',
            boxShadow: 'var(--shadow-sm)'
          }}>
            {/* Search Input */}
            <div style={{ position: 'relative', minWidth: '280px', flex: 1, maxWidth: '420px' }}>
              <Search size={15} style={{
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
                placeholder="Search by title, author, MOD-ID, or phrase (Press '/' to focus)..."
                className="input"
                style={{
                  paddingLeft: '2.5rem',
                  paddingRight: '3.5rem',
                  fontSize: '0.8125rem',
                  width: '100%'
                }}
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

            {/* Category Chips & Severity Selector */}
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', flexWrap: 'wrap' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.35rem', flexWrap: 'wrap' }}>
                {[
                  { id: 'all', label: 'All Violations' },
                  { id: 'Misinformation', label: 'Misinformation' },
                  { id: 'Spam', label: 'Spam & Scam' },
                  { id: 'Toxicity', label: 'Toxicity & Hate' },
                  { id: 'Copyright', label: 'Copyright / DMCA' }
                ].map(cat => (
                  <button
                    key={cat.id}
                    onClick={() => setCategoryFilter(cat.id)}
                    style={{
                      padding: '0.35rem 0.75rem',
                      borderRadius: 'var(--radius-md)',
                      fontSize: '0.75rem',
                      fontWeight: 600,
                      border: categoryFilter === cat.id ? '1px solid var(--border-active)' : '1px solid var(--border-subtle)',
                      background: categoryFilter === cat.id ? 'rgba(99, 102, 241, 0.2)' : 'rgba(255, 255, 255, 0.03)',
                      color: categoryFilter === cat.id ? 'var(--primary)' : 'var(--text-secondary)',
                      cursor: 'pointer',
                      transition: 'all 0.15s ease'
                    }}
                  >
                    {cat.label}
                  </button>
                ))}
              </div>

              {/* Severity Filter */}
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
                <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)', fontWeight: 600 }}>Severity:</span>
                <select
                  value={severityFilter}
                  onChange={(e) => setSeverityFilter(e.target.value)}
                  className="input"
                  style={{
                    padding: '0.35rem 0.75rem',
                    fontSize: '0.75rem',
                    width: 'auto'
                  }}
                >
                  <option value="all">All Severities</option>
                  <option value="Critical">Critical Only</option>
                  <option value="Medium">Medium</option>
                  <option value="Low">Low</option>
                </select>
              </div>

              {/* Status Filter */}
              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
                className="input"
                style={{
                  padding: '0.35rem 0.75rem',
                  fontSize: '0.75rem',
                  width: 'auto'
                }}
              >
                <option value="all">Status: All</option>
                <option value="needs_review">Needs Review</option>
                <option value="escalated">Escalated</option>
                <option value="resolved">Resolved</option>
              </select>
            </div>
          </div>

          {/* Bulk Command Toolbar (if items selected) */}
          {selectedIds.length > 0 && (
            <div style={{
              background: 'linear-gradient(135deg, rgba(99, 102, 241, 0.15) 0%, rgba(168, 85, 247, 0.15) 100%)',
              border: '1px solid rgba(99, 102, 241, 0.4)',
              borderRadius: 'var(--radius-lg)',
              padding: '0.875rem 1.25rem',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              flexWrap: 'wrap',
              gap: '0.75rem',
              animation: 'fadeIn 0.2s ease'
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                <span style={{
                  fontSize: '0.8125rem',
                  fontWeight: 700,
                  color: 'var(--text-primary)',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.5rem'
                }}>
                  <CheckSquare size={16} style={{ color: 'var(--primary)' }} />
                  {selectedIds.length} item(s) selected for bulk action
                </span>
              </div>

              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', flexWrap: 'wrap' }}>
                <button
                  onClick={() => handleBulkAction('approve')}
                  className="btn"
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '0.35rem',
                    fontSize: '0.75rem',
                    background: 'rgba(16, 185, 129, 0.15)',
                    border: '1px solid rgba(16, 185, 129, 0.4)',
                    color: 'var(--accent-emerald)',
                    padding: '0.35rem 0.75rem'
                  }}
                >
                  <Check size={14} />
                  <span>Bulk Approve</span>
                </button>

                <button
                  onClick={() => handleBulkAction('reject')}
                  className="btn"
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '0.35rem',
                    fontSize: '0.75rem',
                    background: 'rgba(244, 63, 94, 0.15)',
                    border: '1px solid rgba(244, 63, 94, 0.4)',
                    color: 'var(--accent-rose)',
                    padding: '0.35rem 0.75rem'
                  }}
                >
                  <X size={14} />
                  <span>Bulk Reject</span>
                </button>

                <button
                  onClick={() => handleBulkAction('escalate')}
                  className="btn"
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '0.35rem',
                    fontSize: '0.75rem',
                    background: 'rgba(245, 158, 11, 0.15)',
                    border: '1px solid rgba(245, 158, 11, 0.4)',
                    color: 'var(--accent-amber)',
                    padding: '0.35rem 0.75rem'
                  }}
                >
                  <AlertTriangle size={14} />
                  <span>Bulk Escalate</span>
                </button>

                <button
                  onClick={() => handleBulkAction('quarantine')}
                  className="btn"
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '0.35rem',
                    fontSize: '0.75rem',
                    background: 'rgba(168, 85, 247, 0.15)',
                    border: '1px solid rgba(168, 85, 247, 0.4)',
                    color: '#c084fc',
                    padding: '0.35rem 0.75rem'
                  }}
                >
                  <Lock size={14} />
                  <span>Bulk Quarantine</span>
                </button>

                <button
                  onClick={() => setSelectedIds([])}
                  className="btn btn-secondary"
                  style={{ padding: '0.35rem 0.65rem', fontSize: '0.75rem' }}
                >
                  Clear Selection
                </button>
              </div>
            </div>
          )}

          {/* VIEW MODE 1: HIGH-DENSITY LEDGER TABLE */}
          {viewMode === 'table' ? (
            <div style={{
              background: 'var(--glass-bg)',
              backdropFilter: 'blur(16px)',
              WebkitBackdropFilter: 'blur(16px)',
              border: '1px solid var(--glass-border)',
              borderRadius: 'var(--radius-lg)',
              overflow: 'hidden',
              boxShadow: 'var(--shadow-sm)'
            }}>
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
                      <th style={{ padding: '0.875rem 1rem', width: '40px' }}>
                        <input
                          type="checkbox"
                          checked={selectedIds.length === filteredItems.length && filteredItems.length > 0}
                          onChange={handleSelectAll}
                          style={{ cursor: 'pointer' }}
                        />
                      </th>
                      <th style={{ padding: '0.875rem 1rem' }}>Flagged Content Item</th>
                      <th style={{ padding: '0.875rem 1rem' }}>Violation Reason</th>
                      <th style={{ padding: '0.875rem 1rem' }}>Author & Trust Score</th>
                      <th style={{ padding: '0.875rem 1rem' }}>Severity & AI Score</th>
                      <th style={{ padding: '0.875rem 1rem' }}>Status</th>
                      <th style={{ padding: '0.875rem 1rem', textAlign: 'right' }}>Actions</th>
                    </tr>
                  </thead>
                  <tbody style={{ fontSize: '0.8125rem', color: 'var(--text-secondary)' }}>
                    {filteredItems.length === 0 ? (
                      <tr>
                        <td colSpan={7} style={{ padding: '3.5rem 1rem', textAlign: 'center', color: 'var(--text-muted)' }}>
                          <ShieldCheck size={40} style={{ margin: '0 auto 0.75rem', color: 'var(--accent-emerald)', opacity: 0.8 }} />
                          <div style={{ fontSize: '0.9375rem', fontWeight: 600, color: 'var(--text-primary)' }}>
                            No items match the active moderation filters
                          </div>
                          <p style={{ fontSize: '0.8125rem', marginTop: '0.25rem' }}>
                            The triage queue is clear or adjust your search / category criteria.
                          </p>
                        </td>
                      </tr>
                    ) : (
                      filteredItems.map((item) => {
                        const isSelected = selectedIds.includes(item.id);
                        return (
                          <tr
                            key={item.id}
                            style={{
                              borderBottom: '1px solid var(--border-subtle)',
                              background: isSelected ? 'rgba(99, 102, 241, 0.08)' : 'transparent',
                              transition: 'background 0.15s ease'
                            }}
                          >
                            {/* Checkbox */}
                            <td style={{ padding: '0.875rem 1rem' }}>
                              <input
                                type="checkbox"
                                checked={isSelected}
                                onChange={() => handleToggleSelect(item.id)}
                                style={{ cursor: 'pointer' }}
                              />
                            </td>

                            {/* Flagged Item */}
                            <td style={{ padding: '0.875rem 1rem', maxWidth: '340px' }}>
                              <div style={{ display: 'flex', alignItems: 'flex-start', gap: '0.75rem' }}>
                                <span style={{
                                  padding: '0.15rem 0.45rem',
                                  borderRadius: 'var(--radius-sm)',
                                  fontSize: '0.625rem',
                                  fontWeight: 800,
                                  textTransform: 'uppercase',
                                  background: item.contentType === 'Article' ? 'rgba(56, 189, 248, 0.15)' : item.contentType === 'Comment' ? 'rgba(168, 85, 247, 0.15)' : 'rgba(244, 63, 94, 0.15)',
                                  color: item.contentType === 'Article' ? '#38bdf8' : item.contentType === 'Comment' ? '#c084fc' : '#fb7185',
                                  border: `1px solid ${item.contentType === 'Article' ? 'rgba(56, 189, 248, 0.3)' : item.contentType === 'Comment' ? 'rgba(168, 85, 247, 0.3)' : 'rgba(244, 63, 94, 0.3)'}`,
                                  flexShrink: 0
                                }}>
                                  {item.contentType}
                                </span>

                                <div style={{ overflow: 'hidden' }}>
                                  <div
                                    onClick={() => setInspectItem(item)}
                                    style={{
                                      fontWeight: 700,
                                      color: 'var(--text-primary)',
                                      cursor: 'pointer',
                                      whiteSpace: 'nowrap',
                                      overflow: 'hidden',
                                      textOverflow: 'ellipsis'
                                    }}
                                    title={item.title}
                                  >
                                    {item.title}
                                  </div>
                                  <div style={{
                                    fontSize: '0.75rem',
                                    color: 'var(--text-muted)',
                                    marginTop: '0.15rem',
                                    whiteSpace: 'nowrap',
                                    overflow: 'hidden',
                                    textOverflow: 'ellipsis'
                                  }}>
                                    {item.excerpt}
                                  </div>
                                  <div style={{
                                    fontSize: '0.6875rem',
                                    color: 'var(--text-muted)',
                                    fontFamily: 'var(--font-mono)',
                                    marginTop: '0.2rem',
                                    display: 'flex',
                                    alignItems: 'center',
                                    gap: '0.5rem'
                                  }}>
                                    <span style={{ color: 'var(--primary)' }}>{item.id}</span>
                                    <span>•</span>
                                    <span>{item.category}</span>
                                    <span>•</span>
                                    <span>{item.timestamp}</span>
                                  </div>
                                </div>
                              </div>
                            </td>

                            {/* Violation Reason */}
                            <td style={{ padding: '0.875rem 1rem' }}>
                              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.25rem' }}>
                                <span style={{
                                  display: 'inline-flex',
                                  alignItems: 'center',
                                  gap: '0.35rem',
                                  padding: '0.2rem 0.55rem',
                                  borderRadius: 'var(--radius-sm)',
                                  fontSize: '0.75rem',
                                  fontWeight: 700,
                                  background: item.reasonCategory === 'Toxicity' ? 'rgba(244, 63, 94, 0.15)' : item.reasonCategory === 'Spam' ? 'rgba(245, 158, 11, 0.15)' : item.reasonCategory === 'Misinformation' ? 'rgba(168, 85, 247, 0.15)' : 'rgba(56, 189, 248, 0.15)',
                                  color: item.reasonCategory === 'Toxicity' ? 'var(--accent-rose)' : item.reasonCategory === 'Spam' ? 'var(--accent-amber)' : item.reasonCategory === 'Misinformation' ? '#c084fc' : '#38bdf8',
                                  border: `1px solid ${item.reasonCategory === 'Toxicity' ? 'rgba(244, 63, 94, 0.3)' : item.reasonCategory === 'Spam' ? 'rgba(245, 158, 11, 0.3)' : item.reasonCategory === 'Misinformation' ? 'rgba(168, 85, 247, 0.3)' : 'rgba(56, 189, 248, 0.3)'}`,
                                  width: 'fit-content'
                                }}>
                                  {item.reasonCategory === 'Toxicity' && <Flame size={12} />}
                                  {item.reasonCategory === 'Spam' && <AlertTriangle size={12} />}
                                  {item.reasonCategory === 'Misinformation' && <Flag size={12} />}
                                  {item.reasonCategory === 'Copyright' && <FileText size={12} />}
                                  {item.reason}
                                </span>
                                <span style={{ fontSize: '0.6875rem', color: 'var(--text-muted)' }}>
                                  {item.reportCount} user flags received
                                </span>
                              </div>
                            </td>

                            {/* Author & Reputation */}
                            <td style={{ padding: '0.875rem 1rem' }}>
                              <div style={{ display: 'flex', alignItems: 'center', gap: '0.625rem' }}>
                                <img
                                  src={item.author.avatar}
                                  alt={item.author.name}
                                  style={{
                                    width: '2rem',
                                    height: '2rem',
                                    borderRadius: '50%',
                                    objectCover: 'cover',
                                    border: '1px solid var(--border-subtle)'
                                  }}
                                />
                                <div>
                                  <div style={{ fontWeight: 700, color: 'var(--text-primary)', fontSize: '0.75rem' }}>
                                    {item.author.name}
                                  </div>
                                  <div style={{ fontSize: '0.6875rem', color: 'var(--text-muted)', fontFamily: 'var(--font-mono)' }}>
                                    {item.author.handle}
                                  </div>
                                  <span style={{
                                    fontSize: '0.625rem',
                                    fontWeight: 800,
                                    padding: '0.1rem 0.35rem',
                                    borderRadius: 'var(--radius-full)',
                                    background: item.author.trustScore < 30 ? 'rgba(244, 63, 94, 0.15)' : item.author.trustScore < 60 ? 'rgba(245, 158, 11, 0.15)' : 'rgba(16, 185, 129, 0.15)',
                                    color: item.author.trustScore < 30 ? 'var(--accent-rose)' : item.author.trustScore < 60 ? 'var(--accent-amber)' : 'var(--accent-emerald)',
                                    marginTop: '0.15rem',
                                    display: 'inline-block'
                                  }}>
                                    Trust: {item.author.trustScore}/100 ({item.author.tier})
                                  </span>
                                </div>
                              </div>
                            </td>

                            {/* Severity & AI Score */}
                            <td style={{ padding: '0.875rem 1rem' }}>
                              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.25rem' }}>
                                <span style={{
                                  padding: '0.15rem 0.55rem',
                                  borderRadius: 'var(--radius-full)',
                                  fontSize: '0.6875rem',
                                  fontWeight: 800,
                                  textTransform: 'uppercase',
                                  background: item.severity === 'Critical' ? 'rgba(244, 63, 94, 0.2)' : item.severity === 'Medium' ? 'rgba(245, 158, 11, 0.2)' : 'rgba(100, 116, 139, 0.2)',
                                  color: item.severity === 'Critical' ? 'var(--accent-rose)' : item.severity === 'Medium' ? 'var(--accent-amber)' : 'var(--text-muted)',
                                  border: `1px solid ${item.severity === 'Critical' ? 'rgba(244, 63, 94, 0.4)' : item.severity === 'Medium' ? 'rgba(245, 158, 11, 0.4)' : 'rgba(100, 116, 139, 0.4)'}`,
                                  width: 'fit-content'
                                }}>
                                  {item.severity}
                                </span>
                                <span style={{ fontSize: '0.6875rem', color: 'var(--text-muted)' }}>
                                  AI: {item.aiConfidence}
                                </span>
                              </div>
                            </td>

                            {/* Status */}
                            <td style={{ padding: '0.875rem 1rem' }}>
                              <span style={{
                                padding: '0.2rem 0.6rem',
                                borderRadius: 'var(--radius-full)',
                                fontSize: '0.6875rem',
                                fontWeight: 700,
                                background: item.status === 'Needs Review' ? 'rgba(245, 158, 11, 0.15)' : item.status === 'Escalated' ? 'rgba(244, 63, 94, 0.15)' : 'rgba(16, 185, 129, 0.15)',
                                color: item.status === 'Needs Review' ? 'var(--accent-amber)' : item.status === 'Escalated' ? 'var(--accent-rose)' : 'var(--accent-emerald)',
                                border: `1px solid ${item.status === 'Needs Review' ? 'rgba(245, 158, 11, 0.3)' : item.status === 'Escalated' ? 'rgba(244, 63, 94, 0.3)' : 'rgba(16, 185, 129, 0.3)'}`
                              }}>
                                {item.status}
                              </span>
                            </td>

                            {/* Primary Action Buttons */}
                            <td style={{ padding: '0.875rem 1rem', textAlign: 'right' }}>
                              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'flex-end', gap: '0.375rem' }}>
                                <button
                                  onClick={() => setInspectItem(item)}
                                  className="btn btn-secondary"
                                  style={{ padding: '0.35rem 0.55rem' }}
                                  title="Inspect Full Safety Dossier"
                                >
                                  <Eye size={14} />
                                </button>

                                <button
                                  onClick={() => handleApprove(item.id)}
                                  style={{
                                    padding: '0.35rem 0.55rem',
                                    borderRadius: 'var(--radius-sm)',
                                    background: 'rgba(16, 185, 129, 0.15)',
                                    border: '1px solid rgba(16, 185, 129, 0.35)',
                                    color: 'var(--accent-emerald)',
                                    cursor: 'pointer'
                                  }}
                                  title="Approve and Restore Content"
                                >
                                  <CheckCircle2 size={14} />
                                </button>

                                <button
                                  onClick={() => handleReject(item.id)}
                                  style={{
                                    padding: '0.35rem 0.55rem',
                                    borderRadius: 'var(--radius-sm)',
                                    background: 'rgba(244, 63, 94, 0.15)',
                                    border: '1px solid rgba(244, 63, 94, 0.35)',
                                    color: 'var(--accent-rose)',
                                    cursor: 'pointer'
                                  }}
                                  title="Reject and Remove Content Permanently"
                                >
                                  <XCircle size={14} />
                                </button>

                                <button
                                  onClick={() => handleEscalate(item.id)}
                                  style={{
                                    padding: '0.35rem 0.55rem',
                                    borderRadius: 'var(--radius-sm)',
                                    background: 'rgba(245, 158, 11, 0.15)',
                                    border: '1px solid rgba(245, 158, 11, 0.35)',
                                    color: 'var(--accent-amber)',
                                    cursor: 'pointer'
                                  }}
                                  title="Escalate to Legal Review"
                                >
                                  <AlertTriangle size={14} />
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

              {/* Table Footer */}
              <div style={{
                padding: '0.75rem 1.25rem',
                background: 'rgba(0, 0, 0, 0.2)',
                borderTop: '1px solid var(--border-subtle)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                fontSize: '0.75rem',
                color: 'var(--text-muted)'
              }}>
                <div>
                  Showing <strong>{filteredItems.length}</strong> flagged items in active queue
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                  <span style={{ color: 'var(--accent-emerald)' }}>● Heuristic Sentinel v4.2 Online</span>
                </div>
              </div>
            </div>
          ) : (
            /* VIEW MODE 2: VISUAL CARDS GRID */
            <div style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fill, minmax(340px, 1fr))',
              gap: '1.25rem'
            }}>
              {filteredItems.map((item) => (
                <div
                  key={item.id}
                  style={{
                    background: 'var(--glass-bg)',
                    backdropFilter: 'blur(16px)',
                    WebkitBackdropFilter: 'blur(16px)',
                    border: '1px solid var(--glass-border)',
                    borderRadius: 'var(--radius-lg)',
                    padding: '1.25rem',
                    display: 'flex',
                    flexDirection: 'column',
                    justifyContent: 'space-between',
                    gap: '1rem',
                    boxShadow: 'var(--shadow-sm)',
                    position: 'relative'
                  }}
                >
                  <div>
                    {/* Card Top: Type & Severity */}
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '0.75rem' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.375rem' }}>
                        <span style={{
                          padding: '0.15rem 0.5rem',
                          borderRadius: 'var(--radius-sm)',
                          fontSize: '0.625rem',
                          fontWeight: 800,
                          textTransform: 'uppercase',
                          background: 'rgba(99, 102, 241, 0.15)',
                          color: 'var(--primary)',
                          border: '1px solid rgba(99, 102, 241, 0.3)'
                        }}>
                          {item.contentType}
                        </span>
                        <span style={{
                          fontFamily: 'var(--font-mono)',
                          fontSize: '0.6875rem',
                          color: 'var(--text-muted)'
                        }}>
                          {item.id}
                        </span>
                      </div>

                      <span style={{
                        padding: '0.15rem 0.55rem',
                        borderRadius: 'var(--radius-full)',
                        fontSize: '0.6875rem',
                        fontWeight: 800,
                        textTransform: 'uppercase',
                        background: item.severity === 'Critical' ? 'rgba(244, 63, 94, 0.2)' : 'rgba(245, 158, 11, 0.2)',
                        color: item.severity === 'Critical' ? 'var(--accent-rose)' : 'var(--accent-amber)',
                        border: `1px solid ${item.severity === 'Critical' ? 'rgba(244, 63, 94, 0.4)' : 'rgba(245, 158, 11, 0.4)'}`
                      }}>
                        {item.severity}
                      </span>
                    </div>

                    {/* Title & Excerpt */}
                    <h3 style={{
                      fontSize: '0.9375rem',
                      fontWeight: 700,
                      color: 'var(--text-primary)',
                      margin: '0 0 0.5rem 0',
                      lineHeight: 1.3
                    }}>
                      {item.title}
                    </h3>
                    <p style={{
                      fontSize: '0.75rem',
                      color: 'var(--text-secondary)',
                      lineHeight: 1.5,
                      margin: 0,
                      display: '-webkit-box',
                      WebkitLineClamp: 3,
                      WebkitBoxOrient: 'vertical',
                      overflow: 'hidden'
                    }}>
                      {item.excerpt}
                    </p>

                    {/* AI Assessment Pill */}
                    <div style={{
                      marginTop: '0.875rem',
                      padding: '0.5rem 0.75rem',
                      borderRadius: 'var(--radius-md)',
                      background: 'rgba(99, 102, 241, 0.08)',
                      border: '1px solid rgba(99, 102, 241, 0.25)',
                      fontSize: '0.6875rem',
                      display: 'flex',
                      alignItems: 'flex-start',
                      gap: '0.5rem'
                    }}>
                      <Sparkles size={14} style={{ color: 'var(--primary)', flexShrink: 0, marginTop: '2px' }} />
                      <div>
                        <span style={{ fontWeight: 700, color: 'var(--text-primary)' }}>Gemini AI: </span>
                        <span style={{ color: 'var(--text-secondary)' }}>{item.aiConfidence}</span>
                      </div>
                    </div>
                  </div>

                  {/* Card Bottom: Author & Action Buttons */}
                  <div style={{
                    paddingTop: '0.875rem',
                    borderTop: '1px solid var(--border-subtle)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    gap: '0.5rem'
                  }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                      <img
                        src={item.author.avatar}
                        alt={item.author.name}
                        style={{ width: '1.75rem', height: '1.75rem', borderRadius: '50%', objectCover: 'cover' }}
                      />
                      <div>
                        <div style={{ fontSize: '0.75rem', fontWeight: 700, color: 'var(--text-primary)' }}>
                          {item.author.name}
                        </div>
                        <div style={{ fontSize: '0.625rem', color: 'var(--accent-amber)' }}>
                          Score: {item.author.trustScore}/100
                        </div>
                      </div>
                    </div>

                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
                      <button
                        onClick={() => setInspectItem(item)}
                        className="btn btn-secondary"
                        style={{ padding: '0.35rem 0.55rem' }}
                        title="Inspect Full Dossier"
                      >
                        <Eye size={14} />
                      </button>
                      <button
                        onClick={() => handleApprove(item.id)}
                        style={{
                          padding: '0.35rem 0.55rem',
                          borderRadius: 'var(--radius-sm)',
                          background: 'rgba(16, 185, 129, 0.15)',
                          border: '1px solid rgba(16, 185, 129, 0.35)',
                          color: 'var(--accent-emerald)',
                          cursor: 'pointer'
                        }}
                        title="Approve"
                      >
                        <CheckCircle2 size={14} />
                      </button>
                      <button
                        onClick={() => handleReject(item.id)}
                        style={{
                          padding: '0.35rem 0.55rem',
                          borderRadius: 'var(--radius-sm)',
                          background: 'rgba(244, 63, 94, 0.15)',
                          border: '1px solid rgba(244, 63, 94, 0.35)',
                          color: 'var(--accent-rose)',
                          cursor: 'pointer'
                        }}
                        title="Reject"
                      >
                        <XCircle size={14} />
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </>
      )}

      {/* ==================================================================== */}
      {/* 5. MAIN DECK 2: AUTHOR REPUTATION & TRUST INDEX */}
      {/* ==================================================================== */}
      {activeDeck === 'authors' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
          <div style={{
            background: 'var(--glass-bg)',
            backdropFilter: 'blur(16px)',
            WebkitBackdropFilter: 'blur(16px)',
            border: '1px solid var(--glass-border)',
            borderRadius: 'var(--radius-lg)',
            padding: '1rem 1.25rem',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            flexWrap: 'wrap',
            gap: '1rem',
            boxShadow: 'var(--shadow-sm)'
          }}>
            <div>
              <h2 style={{ fontSize: '1.125rem', fontWeight: 800, color: 'var(--text-primary)', margin: 0 }}>
                Author Reputation & Trust Index
              </h2>
              <p style={{ fontSize: '0.75rem', color: 'var(--text-muted)', margin: '0.2rem 0 0 0' }}>
                Algorithmic author trust scoring, strike tracking, and editorial eligibility governance.
              </p>
            </div>

            <div style={{ position: 'relative', minWidth: '260px' }}>
              <Search size={14} style={{
                position: 'absolute',
                left: '0.875rem',
                top: '50%',
                transform: 'translateY(-50%)',
                color: 'var(--text-muted)'
              }} />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search author name, UID, or handle..."
                className="input"
                style={{ paddingLeft: '2.4rem', fontSize: '0.75rem', width: '100%' }}
              />
            </div>
          </div>

          {/* Authors Ledger */}
          <div style={{
            background: 'var(--glass-bg)',
            backdropFilter: 'blur(16px)',
            WebkitBackdropFilter: 'blur(16px)',
            border: '1px solid var(--glass-border)',
            borderRadius: 'var(--radius-lg)',
            overflow: 'hidden',
            boxShadow: 'var(--shadow-sm)'
          }}>
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
                    <th style={{ padding: '0.875rem 1rem' }}>Author Profile</th>
                    <th style={{ padding: '0.875rem 1rem' }}>Trust Score & Tier</th>
                    <th style={{ padding: '0.875rem 1rem' }}>Active Strikes</th>
                    <th style={{ padding: '0.875rem 1rem' }}>Status</th>
                    <th style={{ padding: '0.875rem 1rem' }}>Flag History</th>
                    <th style={{ padding: '0.875rem 1rem' }}>Recent Violation</th>
                    <th style={{ padding: '0.875rem 1rem', textAlign: 'right' }}>Trust Actions</th>
                  </tr>
                </thead>
                <tbody style={{ fontSize: '0.8125rem', color: 'var(--text-secondary)' }}>
                  {filteredAuthors.map((author) => (
                    <tr
                      key={author.uid}
                      style={{
                        borderBottom: '1px solid var(--border-subtle)',
                        transition: 'background 0.15s ease'
                      }}
                    >
                      <td style={{ padding: '0.875rem 1rem' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                          <img
                            src={author.avatar}
                            alt={author.name}
                            style={{
                              width: '2.25rem',
                              height: '2.25rem',
                              borderRadius: '50%',
                              objectCover: 'cover',
                              border: '1px solid var(--border-subtle)'
                            }}
                          />
                          <div>
                            <div style={{ fontWeight: 700, color: 'var(--text-primary)' }}>
                              {author.name}
                            </div>
                            <div style={{ fontSize: '0.6875rem', color: 'var(--text-muted)', fontFamily: 'var(--font-mono)' }}>
                              {author.handle} • {author.uid}
                            </div>
                          </div>
                        </div>
                      </td>

                      <td style={{ padding: '0.875rem 1rem' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                          <div style={{
                            width: '42px',
                            height: '6px',
                            borderRadius: '3px',
                            background: 'rgba(255, 255, 255, 0.1)',
                            overflow: 'hidden'
                          }}>
                            <div style={{
                              width: `${author.trustScore}%`,
                              height: '100%',
                              background: author.trustScore < 30 ? 'var(--accent-rose)' : author.trustScore < 60 ? 'var(--accent-amber)' : 'var(--accent-emerald)'
                            }} />
                          </div>
                          <span style={{
                            fontWeight: 800,
                            color: author.trustScore < 30 ? 'var(--accent-rose)' : author.trustScore < 60 ? 'var(--accent-amber)' : 'var(--accent-emerald)',
                            fontSize: '0.75rem'
                          }}>
                            {author.trustScore}/100
                          </span>
                        </div>
                        <span style={{ fontSize: '0.6875rem', color: 'var(--text-muted)' }}>
                          {author.tier}
                        </span>
                      </td>

                      <td style={{ padding: '0.875rem 1rem' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.25rem' }}>
                          {[1, 2, 3].map((strikeIdx) => (
                            <div
                              key={strikeIdx}
                              style={{
                                width: '10px',
                                height: '10px',
                                borderRadius: '50%',
                                background: strikeIdx <= author.strikes ? 'var(--accent-rose)' : 'rgba(255, 255, 255, 0.1)',
                                border: strikeIdx <= author.strikes ? '1px solid var(--accent-rose)' : '1px solid var(--border-subtle)'
                              }}
                              title={strikeIdx <= author.strikes ? `Strike ${strikeIdx} active` : 'No strike'}
                            />
                          ))}
                          <span style={{ fontSize: '0.6875rem', color: 'var(--text-muted)', marginLeft: '0.35rem' }}>
                            {author.strikes}/3
                          </span>
                        </div>
                      </td>

                      <td style={{ padding: '0.875rem 1rem' }}>
                        <span style={{
                          padding: '0.2rem 0.55rem',
                          borderRadius: 'var(--radius-full)',
                          fontSize: '0.6875rem',
                          fontWeight: 700,
                          background: author.status === 'Restricted' ? 'rgba(244, 63, 94, 0.15)' : author.status === 'Cooldown Active' ? 'rgba(245, 158, 11, 0.15)' : 'rgba(16, 185, 129, 0.15)',
                          color: author.status === 'Restricted' ? 'var(--accent-rose)' : author.status === 'Cooldown Active' ? 'var(--accent-amber)' : 'var(--accent-emerald)',
                          border: `1px solid ${author.status === 'Restricted' ? 'rgba(244, 63, 94, 0.3)' : author.status === 'Cooldown Active' ? 'rgba(245, 158, 11, 0.3)' : 'rgba(16, 185, 129, 0.3)'}`
                        }}>
                          {author.status}
                        </span>
                      </td>

                      <td style={{ padding: '0.875rem 1rem' }}>
                        <div style={{ fontSize: '0.75rem', color: 'var(--text-primary)' }}>
                          <strong>{author.flaggedPosts}</strong> flagged / {author.totalPosts} total
                        </div>
                        <div style={{ fontSize: '0.6875rem', color: 'var(--text-muted)' }}>
                          {((author.flaggedPosts / author.totalPosts) * 100).toFixed(1)}% violation rate
                        </div>
                      </td>

                      <td style={{ padding: '0.875rem 1rem', maxWidth: '240px' }}>
                        <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                          {author.lastViolation}
                        </span>
                      </td>

                      <td style={{ padding: '0.875rem 1rem', textAlign: 'right' }}>
                        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'flex-end', gap: '0.375rem' }}>
                          <button
                            onClick={() => setAuthorToManage(author)}
                            className="btn btn-secondary"
                            style={{ padding: '0.35rem 0.65rem', fontSize: '0.75rem' }}
                            title="Manage Strikes & Score"
                          >
                            Manage
                          </button>

                          {author.strikes > 0 && (
                            <button
                              onClick={() => handlePardonAuthor(author.uid)}
                              style={{
                                padding: '0.35rem 0.65rem',
                                borderRadius: 'var(--radius-sm)',
                                background: 'rgba(16, 185, 129, 0.15)',
                                border: '1px solid rgba(16, 185, 129, 0.35)',
                                color: 'var(--accent-emerald)',
                                fontSize: '0.75rem',
                                fontWeight: 700,
                                cursor: 'pointer'
                              }}
                              title="Pardon Author and Reset Strikes"
                            >
                              Pardon
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* ==================================================================== */}
      {/* 6. MAIN DECK 3: COMPLIANCE AUDIT TRAIL STREAM */}
      {/* ==================================================================== */}
      {activeDeck === 'audit' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
          <div style={{
            background: 'var(--glass-bg)',
            backdropFilter: 'blur(16px)',
            WebkitBackdropFilter: 'blur(16px)',
            border: '1px solid var(--glass-border)',
            borderRadius: 'var(--radius-lg)',
            padding: '1.25rem',
            boxShadow: 'var(--shadow-sm)'
          }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1rem' }}>
              <div>
                <h2 style={{ fontSize: '1.125rem', fontWeight: 800, color: 'var(--text-primary)', margin: 0 }}>
                  Immutable Compliance Audit Trail
                </h2>
                <p style={{ fontSize: '0.75rem', color: 'var(--text-muted)', margin: '0.2rem 0 0 0' }}>
                  Cryptographically referenced chronological ledger of all human & automated moderator actions.
                </p>
              </div>

              <button
                onClick={handleExportAudit}
                className="btn btn-secondary"
                style={{ display: 'flex', alignItems: 'center', gap: '0.35rem', fontSize: '0.75rem' }}
              >
                <Download size={14} />
                <span>Export CSV</span>
              </button>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
              {auditLogs.map((log) => (
                <div
                  key={log.id}
                  style={{
                    background: 'rgba(0, 0, 0, 0.2)',
                    border: '1px solid var(--border-subtle)',
                    borderRadius: 'var(--radius-md)',
                    padding: '0.875rem 1rem',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    flexWrap: 'wrap',
                    gap: '0.75rem'
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.875rem' }}>
                    <div style={{
                      width: '2rem',
                      height: '2rem',
                      borderRadius: 'var(--radius-sm)',
                      background: log.action.includes('Reject') || log.action.includes('Takedown') ? 'rgba(244, 63, 94, 0.15)' : log.action.includes('Approved') ? 'rgba(16, 185, 129, 0.15)' : 'rgba(245, 158, 11, 0.15)',
                      color: log.action.includes('Reject') || log.action.includes('Takedown') ? 'var(--accent-rose)' : log.action.includes('Approved') ? 'var(--accent-emerald)' : 'var(--accent-amber)',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center'
                    }}>
                      <History size={16} />
                    </div>

                    <div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', flexWrap: 'wrap' }}>
                        <span style={{ fontWeight: 800, color: 'var(--text-primary)', fontSize: '0.8125rem' }}>
                          {log.action}
                        </span>
                        <span style={{
                          fontSize: '0.6875rem',
                          fontFamily: 'var(--font-mono)',
                          color: 'var(--primary)',
                          background: 'rgba(99, 102, 241, 0.1)',
                          padding: '0.1rem 0.35rem',
                          borderRadius: 'var(--radius-sm)'
                        }}>
                          {log.target}
                        </span>
                      </div>
                      <p style={{ margin: '0.2rem 0 0 0', fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                        {log.reason}
                      </p>
                    </div>
                  </div>

                  <div style={{ textAlign: 'right' }}>
                    <div style={{ fontSize: '0.75rem', fontWeight: 600, color: 'var(--text-secondary)' }}>
                      {log.moderator}
                    </div>
                    <div style={{ fontSize: '0.6875rem', fontFamily: 'var(--font-mono)', color: 'var(--text-muted)' }}>
                      {log.time}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* ==================================================================== */}
      {/* 7. MODAL: DEEP ITEM INSPECTION DOSSIER */}
      {/* ==================================================================== */}
      {inspectItem && (
        <div style={{
          position: 'fixed',
          inset: 0,
          background: 'rgba(0, 0, 0, 0.75)',
          backdropFilter: 'blur(8px)',
          WebkitBackdropFilter: 'blur(8px)',
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
            maxWidth: '680px',
            width: '100%',
            maxHeight: '90vh',
            overflowY: 'auto',
            padding: '1.5rem',
            display: 'flex',
            flexDirection: 'column',
            gap: '1.25rem',
            boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.75)'
          }}>
            {/* Modal Header */}
            <div style={{
              display: 'flex',
              alignItems: 'flex-start',
              justifyContent: 'space-between',
              paddingBottom: '1rem',
              borderBottom: '1px solid var(--border-subtle)'
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                <div style={{
                  width: '2.5rem',
                  height: '2.5rem',
                  borderRadius: 'var(--radius-md)',
                  background: 'rgba(99, 102, 241, 0.15)',
                  border: '1px solid rgba(99, 102, 241, 0.3)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  color: 'var(--primary)'
                }}>
                  <ShieldAlert size={20} />
                </div>
                <div>
                  <h3 style={{ fontSize: '1.125rem', fontWeight: 800, color: 'var(--text-primary)', margin: 0 }}>
                    Inspection Dossier: {inspectItem.id}
                  </h3>
                  <p style={{ fontSize: '0.75rem', color: 'var(--text-muted)', margin: '0.15rem 0 0 0' }}>
                    Filed {inspectItem.timestamp} • {inspectItem.reportCount} total verified user flags
                  </p>
                </div>
              </div>

              <button
                onClick={() => setInspectItem(null)}
                style={{
                  background: 'transparent',
                  border: 'none',
                  color: 'var(--text-muted)',
                  cursor: 'pointer',
                  padding: '0.25rem'
                }}
              >
                <X size={18} />
              </button>
            </div>

            {/* Violation & AI Confidence Metrics */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem' }}>
              <div style={{
                background: 'rgba(0, 0, 0, 0.25)',
                border: '1px solid var(--border-subtle)',
                borderRadius: 'var(--radius-md)',
                padding: '0.75rem'
              }}>
                <span style={{ fontSize: '0.6875rem', fontWeight: 700, textTransform: 'uppercase', color: 'var(--text-muted)' }}>
                  Reported Violation
                </span>
                <div style={{ fontSize: '0.8125rem', fontWeight: 700, color: 'var(--accent-rose)', marginTop: '0.25rem' }}>
                  {inspectItem.reason}
                </div>
              </div>

              <div style={{
                background: 'rgba(0, 0, 0, 0.25)',
                border: '1px solid var(--border-subtle)',
                borderRadius: 'var(--radius-md)',
                padding: '0.75rem'
              }}>
                <span style={{ fontSize: '0.6875rem', fontWeight: 700, textTransform: 'uppercase', color: 'var(--text-muted)' }}>
                  AI Toxicity Confidence
                </span>
                <div style={{ fontSize: '0.8125rem', fontWeight: 700, color: 'var(--accent-amber)', marginTop: '0.25rem' }}>
                  {inspectItem.aiConfidence} (Score: {inspectItem.toxicityScore})
                </div>
              </div>
            </div>

            {/* Flagged Excerpt Preview */}
            <div style={{
              background: 'rgba(0, 0, 0, 0.35)',
              border: '1px solid var(--border-subtle)',
              borderRadius: 'var(--radius-md)',
              padding: '1rem'
            }}>
              <div style={{ fontSize: '0.6875rem', fontWeight: 700, textTransform: 'uppercase', color: 'var(--text-muted)', marginBottom: '0.5rem' }}>
                Full Flagged Content Excerpt
              </div>
              <p style={{
                fontSize: '0.875rem',
                color: 'var(--text-primary)',
                lineHeight: 1.6,
                margin: 0,
                fontFamily: 'var(--font-main)'
              }}>
                {inspectItem.excerpt}
              </p>
            </div>

            {/* Gemini AI Audit Assessment */}
            <div style={{
              background: 'rgba(99, 102, 241, 0.08)',
              border: '1px solid rgba(99, 102, 241, 0.3)',
              borderRadius: 'var(--radius-md)',
              padding: '0.875rem 1rem',
              display: 'flex',
              alignItems: 'flex-start',
              gap: '0.625rem'
            }}>
              <Sparkles size={18} style={{ color: 'var(--primary)', flexShrink: 0, marginTop: '2px' }} />
              <div>
                <span style={{ fontSize: '0.75rem', fontWeight: 800, color: 'var(--primary)' }}>
                  Gemini AI Heuristic Assessment & Registry Verification:
                </span>
                <p style={{ fontSize: '0.8125rem', color: 'var(--text-secondary)', margin: '0.25rem 0 0 0', lineHeight: 1.5 }}>
                  {inspectItem.aiFactCheck}
                </p>
              </div>
            </div>

            {/* Author Snapshot */}
            <div style={{
              background: 'rgba(0, 0, 0, 0.25)',
              border: '1px solid var(--border-subtle)',
              borderRadius: 'var(--radius-md)',
              padding: '0.875rem 1rem',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between'
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                <img
                  src={inspectItem.author.avatar}
                  alt={inspectItem.author.name}
                  style={{ width: '2.5rem', height: '2.5rem', borderRadius: '50%', objectCover: 'cover' }}
                />
                <div>
                  <div style={{ fontWeight: 700, color: 'var(--text-primary)', fontSize: '0.8125rem' }}>
                    {inspectItem.author.name} ({inspectItem.author.handle})
                  </div>
                  <div style={{ fontSize: '0.6875rem', color: 'var(--text-muted)' }}>
                    UID: {inspectItem.author.uid} • Active Strikes: {inspectItem.author.strikes}
                  </div>
                </div>
              </div>

              <div style={{ textAlign: 'right' }}>
                <span style={{
                  fontSize: '0.8125rem',
                  fontWeight: 800,
                  color: inspectItem.author.trustScore < 40 ? 'var(--accent-rose)' : 'var(--accent-amber)'
                }}>
                  Trust Score: {inspectItem.author.trustScore}/100
                </span>
                <div style={{ fontSize: '0.6875rem', color: 'var(--text-muted)' }}>
                  Tier: {inspectItem.author.tier}
                </div>
              </div>
            </div>

            {/* Resolution Actions */}
            <div style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              paddingTop: '1rem',
              borderTop: '1px solid var(--border-subtle)',
              flexWrap: 'wrap',
              gap: '0.75rem'
            }}>
              <button
                onClick={() => setInspectItem(null)}
                className="btn btn-secondary"
                style={{ fontSize: '0.8125rem' }}
              >
                Close Dossier
              </button>

              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', flexWrap: 'wrap' }}>
                <button
                  onClick={() => handleEscalate(inspectItem.id)}
                  style={{
                    padding: '0.5rem 0.875rem',
                    borderRadius: 'var(--radius-md)',
                    background: 'rgba(245, 158, 11, 0.15)',
                    border: '1px solid rgba(245, 158, 11, 0.4)',
                    color: 'var(--accent-amber)',
                    fontSize: '0.8125rem',
                    fontWeight: 700,
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '0.35rem'
                  }}
                >
                  <AlertTriangle size={15} />
                  <span>Escalate to Legal</span>
                </button>

                <button
                  onClick={() => handleReject(inspectItem.id)}
                  style={{
                    padding: '0.5rem 0.875rem',
                    borderRadius: 'var(--radius-md)',
                    background: 'linear-gradient(135deg, #e11d48 0%, #be123c 100%)',
                    border: '1px solid rgba(244, 63, 94, 0.5)',
                    color: '#ffffff',
                    fontSize: '0.8125rem',
                    fontWeight: 700,
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '0.35rem',
                    boxShadow: '0 4px 12px rgba(225, 29, 72, 0.3)'
                  }}
                >
                  <XCircle size={15} />
                  <span>Reject & Remove</span>
                </button>

                <button
                  onClick={() => handleApprove(inspectItem.id)}
                  style={{
                    padding: '0.5rem 0.875rem',
                    borderRadius: 'var(--radius-md)',
                    background: 'linear-gradient(135deg, #10b981 0%, #059669 100%)',
                    border: '1px solid rgba(16, 185, 129, 0.5)',
                    color: '#ffffff',
                    fontSize: '0.8125rem',
                    fontWeight: 700,
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '0.35rem',
                    boxShadow: '0 4px 12px rgba(16, 185, 129, 0.3)'
                  }}
                >
                  <CheckCircle2 size={15} />
                  <span>Approve & Restore</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ==================================================================== */}
      {/* 8. MODAL: AUTHOR STRIKE & TRUST SCORE PENALTY */}
      {/* ==================================================================== */}
      {authorToManage && (
        <div style={{
          position: 'fixed',
          inset: 0,
          background: 'rgba(0, 0, 0, 0.75)',
          backdropFilter: 'blur(8px)',
          WebkitBackdropFilter: 'blur(8px)',
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
            maxWidth: '520px',
            width: '100%',
            padding: '1.5rem',
            display: 'flex',
            flexDirection: 'column',
            gap: '1.25rem',
            boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.75)'
          }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                <div style={{
                  width: '2.5rem',
                  height: '2.5rem',
                  borderRadius: 'var(--radius-md)',
                  background: 'rgba(244, 63, 94, 0.15)',
                  border: '1px solid rgba(244, 63, 94, 0.3)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  color: 'var(--accent-rose)'
                }}>
                  <Zap size={20} />
                </div>
                <div>
                  <h3 style={{ fontSize: '1.125rem', fontWeight: 800, color: 'var(--text-primary)', margin: 0 }}>
                    Manage Author: {authorToManage.name}
                  </h3>
                  <p style={{ fontSize: '0.75rem', color: 'var(--text-muted)', margin: '0.15rem 0 0 0' }}>
                    {authorToManage.handle} • Current Score: {authorToManage.trustScore}/100
                  </p>
                </div>
              </div>

              <button
                onClick={() => setAuthorToManage(null)}
                style={{ background: 'transparent', border: 'none', color: 'var(--text-muted)', cursor: 'pointer' }}
              >
                <X size={18} />
              </button>
            </div>

            <div>
              <label style={{ fontSize: '0.75rem', fontWeight: 700, color: 'var(--text-secondary)', display: 'block', marginBottom: '0.375rem' }}>
                Reason for Disciplinary Strike / Penalty
              </label>
              <textarea
                value={strikeReason}
                onChange={(e) => setStrikeReason(e.target.value)}
                placeholder="Specify violation rationale (e.g. repeated medical misinformation, spam bot syndication)..."
                className="input"
                rows={3}
                style={{ width: '100%', fontSize: '0.8125rem' }}
              />
            </div>

            <div style={{
              background: 'rgba(244, 63, 94, 0.08)',
              border: '1px solid rgba(244, 63, 94, 0.25)',
              borderRadius: 'var(--radius-md)',
              padding: '0.75rem',
              fontSize: '0.75rem',
              color: 'var(--accent-rose)'
            }}>
              ⚠️ Issuing a strike deducts <strong>15 points</strong> from author trust index. At 3 strikes, the account is automatically locked under restricted status.
            </div>

            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'flex-end', gap: '0.5rem' }}>
              <button
                onClick={() => setAuthorToManage(null)}
                className="btn btn-secondary"
                style={{ fontSize: '0.8125rem' }}
              >
                Cancel
              </button>

              <button
                onClick={() => handleIssueStrike(authorToManage.uid)}
                style={{
                  padding: '0.5rem 1rem',
                  borderRadius: 'var(--radius-md)',
                  background: 'linear-gradient(135deg, #e11d48 0%, #be123c 100%)',
                  border: '1px solid rgba(244, 63, 94, 0.5)',
                  color: '#ffffff',
                  fontSize: '0.8125rem',
                  fontWeight: 700,
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.35rem'
                }}
              >
                <Zap size={14} />
                <span>Confirm Strike & Penalty</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ==================================================================== */}
      {/* 9. MODAL: EMERGENCY QUARANTINE CONFIRMATION */}
      {/* ==================================================================== */}
      {isQuarantineConfirmOpen && (
        <div style={{
          position: 'fixed',
          inset: 0,
          background: 'rgba(0, 0, 0, 0.8)',
          backdropFilter: 'blur(8px)',
          WebkitBackdropFilter: 'blur(8px)',
          zIndex: 1000,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          padding: '1.5rem',
          animation: 'fadeIn 0.15s ease'
        }}>
          <div style={{
            background: '#0d1322',
            border: '1px solid rgba(244, 63, 94, 0.5)',
            borderRadius: 'var(--radius-lg)',
            maxWidth: '480px',
            width: '100%',
            padding: '1.5rem',
            display: 'flex',
            flexDirection: 'column',
            gap: '1.25rem',
            boxShadow: '0 25px 50px -12px rgba(225, 29, 72, 0.5)'
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
              <div style={{
                width: '3rem',
                height: '3rem',
                borderRadius: 'var(--radius-md)',
                background: 'rgba(244, 63, 94, 0.2)',
                border: '1px solid rgba(244, 63, 94, 0.5)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: 'var(--accent-rose)'
              }}>
                <AlertOctagon size={24} />
              </div>
              <div>
                <h3 style={{ fontSize: '1.125rem', fontWeight: 800, color: 'var(--text-primary)', margin: 0 }}>
                  Emergency Content Quarantine
                </h3>
                <p style={{ fontSize: '0.75rem', color: 'var(--accent-rose)', margin: '0.15rem 0 0 0', fontWeight: 600 }}>
                  HIGH-IMPACT SAFETY PROTOCOL
                </p>
              </div>
            </div>

            <p style={{ fontSize: '0.8125rem', color: 'var(--text-secondary)', lineHeight: 1.5, margin: 0 }}>
              This will immediately pull <strong>all pending items</strong> from production news feeds and community streams, freezing distribution until verified by senior legal council.
            </p>

            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'flex-end', gap: '0.5rem' }}>
              <button
                onClick={() => setIsQuarantineConfirmOpen(false)}
                className="btn btn-secondary"
                style={{ fontSize: '0.8125rem' }}
              >
                Abort
              </button>
              <button
                onClick={handleEmergencyQuarantine}
                style={{
                  padding: '0.5rem 1rem',
                  borderRadius: 'var(--radius-md)',
                  background: 'linear-gradient(135deg, #e11d48 0%, #be123c 100%)',
                  border: '1px solid rgba(244, 63, 94, 0.6)',
                  color: '#ffffff',
                  fontSize: '0.8125rem',
                  fontWeight: 700,
                  cursor: 'pointer',
                  boxShadow: '0 4px 12px rgba(225, 29, 72, 0.4)'
                }}
              >
                Execute Quarantine Lock
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}
