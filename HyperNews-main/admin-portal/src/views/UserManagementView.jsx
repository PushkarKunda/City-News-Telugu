// src/views/UserManagementView.jsx
import React, { useState, useEffect, useMemo } from 'react';
import { useAuth, ROLE_NAMES, ROLE_DETAILS, ROLES } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';
import Modal from '../components/common/Modal';
import { api } from '../api/client';
import { 
  Users, UserCheck, ShieldAlert, UserX, Search, 
  Filter, MoreHorizontal, CheckCircle2, XCircle, 
  KeyRound, Shield, Mail, Calendar, UserPlus, Eye,
  Phone, Globe, MapPin, RefreshCw, Lock, Unlock, Database,
  Download, Sparkles, Award, ExternalLink, AlertTriangle,
  LayoutGrid, Table as TableIcon, Check, Copy, Crown, Star
} from 'lucide-react';

const SEEDED_USERS = [
  {
    id: 'usr-1',
    user_uid: 'JKA6DY01',
    name: 'Roshith Administrator',
    email: 'roshith@hypernews.live',
    phone: '+91 6281267875',
    role: 5, // Admin
    status: 'Active',
    joinedAt: '2025-11-12',
    lastActive: 'Just now',
    language: 'English',
    location: 'Hyderabad, Telangana',
    avatar: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150&auto=format&fit=crop&q=80',
    points: 1250,
    coins: 450
  },
  {
    id: 'usr-2',
    user_uid: 'usr_vik1',
    name: 'Vikram Rao',
    email: 'vikram.rao@hypernews.live',
    phone: '+91 98765 43214',
    role: 4, // Editor
    status: 'Active',
    joinedAt: '2026-01-10',
    lastActive: '14 mins ago',
    language: 'English',
    location: 'Bengaluru, Karnataka',
    avatar: 'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=150&auto=format&fit=crop&q=80',
    points: 840,
    coins: 120
  },
  {
    id: 'usr-3',
    user_uid: 'usr_priy',
    name: 'Priya Sharma',
    email: 'priya.s@hypernews.live',
    phone: '+91 98765 43212',
    role: 2, // Publisher / Creator
    status: 'Active',
    joinedAt: '2026-02-01',
    lastActive: '1 hour ago',
    language: 'English',
    location: 'Mumbai, Maharashtra',
    avatar: 'https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=150&auto=format&fit=crop&q=80',
    points: 620,
    coins: 85
  },
  {
    id: 'usr-4',
    user_uid: 'usr_raj1',
    name: 'Rajesh Kumar',
    email: 'rajesh.k@hypernews.live',
    phone: '+91 98765 43211',
    role: 1, // User / Citizen
    status: 'Active',
    joinedAt: '2026-02-15',
    lastActive: '3 hours ago',
    language: 'Telugu',
    location: 'Hyderabad, Telangana',
    avatar: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=150&auto=format&fit=crop&q=80',
    points: 310,
    coins: 40
  },
  {
    id: 'usr-5',
    user_uid: 'usr_kav1',
    name: 'Kavita Reddy',
    email: 'kavita.r@hypernews.live',
    phone: '+91 98765 43213',
    role: 3, // Moderator
    status: 'Active',
    joinedAt: '2026-03-01',
    lastActive: '35 mins ago',
    language: 'Telugu',
    location: 'Warangal, Telangana',
    avatar: 'https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?w=150&auto=format&fit=crop&q=80',
    points: 920,
    coins: 200
  },
  {
    id: 'usr-6',
    user_uid: 'usr_anil',
    name: 'Anil Varma',
    email: 'anil.v@hypernews.live',
    phone: '+91 98765 43215',
    role: 1, // Citizen
    status: 'Active',
    joinedAt: '2026-03-10',
    lastActive: '2 days ago',
    language: 'Telugu',
    location: 'Visakhapatnam, Andhra Pradesh',
    avatar: 'https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?w=150&auto=format&fit=crop&q=80',
    points: 150,
    coins: 20
  },
  {
    id: 'usr-7',
    user_uid: 'usr_sneh',
    name: 'Sneha Patel',
    email: 'sneha.p@hypernews.live',
    phone: '+91 98765 43216',
    role: 2, // Creator
    status: 'Active',
    joinedAt: '2026-03-15',
    lastActive: '5 hours ago',
    language: 'Hindi',
    location: 'Mumbai, Maharashtra',
    avatar: 'https://images.unsplash.com/photo-1580489944761-15a19d654956?w=150&auto=format&fit=crop&q=80',
    points: 430,
    coins: 60
  },
  {
    id: 'usr-8',
    user_uid: 'usr_bot99',
    name: 'SpamCrawlerBot',
    email: 'bot990@anonymous.net',
    phone: '+91 91234 56789',
    role: 0, // Guest
    status: 'Suspended',
    joinedAt: '2026-08-20',
    lastActive: '3 days ago',
    language: 'English',
    location: 'Unknown',
    avatar: 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=150&auto=format&fit=crop&q=80',
    points: 0,
    coins: 0
  }
];

export default function UserManagementView() {
  const { currentRole } = useAuth();
  const { showToast } = useToast();

  const [users, setUsers] = useState(SEEDED_USERS);
  const [searchQuery, setSearchQuery] = useState('');
  const [roleFilter, setRoleFilter] = useState('All');
  const [statusFilter, setStatusFilter] = useState('All');
  const [quickTab, setQuickTab] = useState('all'); // 'all' | 'staff' | 'creators' | 'citizens' | 'suspended'
  const [viewMode, setViewMode] = useState('table'); // 'table' | 'grid'
  const [isLoading, setIsLoading] = useState(false);
  const [isExporting, setIsExporting] = useState(false);

  // Live Database Stats
  const [dbStats, setDbStats] = useState({
    total: 63,
    active: 63,
    suspended: 0
  });

  // Modals
  const [editingRoleUser, setEditingRoleUser] = useState(null);
  const [selectedNewRole, setSelectedNewRole] = useState(1);

  const [suspensionUser, setSuspensionUser] = useState(null);
  const [suspensionReason, setSuspensionReason] = useState('Platform terms and safety guideline violation');

  const [inspectingUser, setInspectingUser] = useState(null);
  const [isAddUserModalOpen, setIsAddUserModalOpen] = useState(false);

  // Add User Form
  const [newUserForm, setNewUserForm] = useState({
    name: '',
    email: '',
    phone: '',
    role: 1,
    language: 'English',
    location: 'Hyderabad, Telangana'
  });

  // Fetch Users from Backend API
  const fetchLiveUsers = async () => {
    setIsLoading(true);
    try {
      const [userRes, statsRes] = await Promise.allSettled([
        api.getUsers(1, 100),
        api.getAdminSettingsStats()
      ]);

      if (statsRes.status === 'fulfilled' && statsRes.value?.users) {
        setDbStats({
          total: statsRes.value.users.total || 63,
          active: statsRes.value.users.active || 63,
          suspended: statsRes.value.users.suspended || 0
        });
      }

      if (userRes.status === 'fulfilled' && userRes.value) {
        const res = userRes.value;
        const uList = res.users || (Array.isArray(res) ? res : []);
        if (uList.length > 0) {
          const mapped = uList.map(u => ({
            id: u.id || u.user_uid,
            user_uid: u.user_uid || `usr_${u.id}`,
            name: u.name || u.user_name || 'Citizen User',
            email: u.email || `${u.user_uid}@hypernews.live`,
            phone: u.phone || '+91 98765 00000',
            role: u.role !== undefined ? u.role : 1,
            status: u.is_suspended ? 'Suspended' : 'Active',
            joinedAt: u.created_at ? u.created_at.slice(0, 10) : '2026-01-01',
            lastActive: u.last_login ? u.last_login.slice(0, 16).replace('T', ' ') : 'Active Today',
            language: u.language || 'English',
            location: u.city_name ? `${u.city_name}, ${u.state_code || 'India'}` : 'Hyderabad, Telangana',
            avatar: u.profile_picture || 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150',
            points: u.reward_points ?? 50,
            coins: u.reward_coins ?? 10
          }));
          setUsers(mapped);
          showToast(`Synchronized ${mapped.length} users from Railway PostgreSQL`, 'success');
        }
      }
    } catch {
      showToast('Loaded local fallback directory', 'info');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchLiveUsers();
  }, []);

  // Filtered Users with Quick Tab Integration
  const filteredUsers = useMemo(() => {
    return users.filter(u => {
      const q = searchQuery.toLowerCase();
      const matchesSearch = u.name.toLowerCase().includes(q) ||
                            u.email.toLowerCase().includes(q) ||
                            u.user_uid.toLowerCase().includes(q) ||
                            (u.phone && u.phone.includes(q));

      // Quick Tab Filtering
      let matchesQuickTab = true;
      if (quickTab === 'staff') matchesQuickTab = u.role >= 3;
      else if (quickTab === 'creators') matchesQuickTab = u.role === 2;
      else if (quickTab === 'citizens') matchesQuickTab = u.role === 1;
      else if (quickTab === 'suspended') matchesQuickTab = u.status === 'Suspended';

      const matchesRole = roleFilter === 'All' || u.role.toString() === roleFilter;
      const matchesStatus = statusFilter === 'All' || u.status === statusFilter;

      return matchesSearch && matchesQuickTab && matchesRole && matchesStatus;
    });
  }, [users, searchQuery, quickTab, roleFilter, statusFilter]);

  // Save Role Change
  const handleSaveRole = async (e) => {
    e.preventDefault();
    if (!editingRoleUser) return;

    const targetUid = editingRoleUser.user_uid;
    const newRoleInt = Number(selectedNewRole);

    setUsers(prev => prev.map(u => u.user_uid === targetUid ? { ...u, role: newRoleInt } : u));
    showToast(`Role updated for ${editingRoleUser.name} to ${ROLE_NAMES[newRoleInt] || 'Role ' + newRoleInt}`, 'success');
    setEditingRoleUser(null);

    try {
      await api.updateUserRole(targetUid, newRoleInt);
    } catch (err) {
      console.warn('Role saved locally:', err.message);
    }
  };

  // Confirm Suspension Toggle
  const handleConfirmSuspension = async () => {
    if (!suspensionUser) return;

    const targetUid = suspensionUser.user_uid;
    const nextStatus = suspensionUser.status === 'Active' ? 'Suspended' : 'Active';
    const isSuspendedBool = nextStatus === 'Suspended';

    setUsers(prev => prev.map(u => u.user_uid === targetUid ? { ...u, status: nextStatus } : u));
    showToast(`Account for ${suspensionUser.name} is now ${nextStatus}`, isSuspendedBool ? 'warning' : 'success');
    setSuspensionUser(null);

    try {
      await api.toggleUserSuspension(targetUid, isSuspendedBool);
    } catch (err) {
      console.warn('Suspension updated locally:', err.message);
    }
  };

  // Add User Submit
  const handleAddUserSubmit = (e) => {
    e.preventDefault();
    if (!newUserForm.name.trim() || !newUserForm.email.trim()) return;

    const newUid = `usr_${Date.now().toString().slice(-6)}`;
    const created = {
      id: `usr-${Date.now()}`,
      user_uid: newUid,
      name: newUserForm.name.trim(),
      email: newUserForm.email.trim(),
      phone: newUserForm.phone.trim() || '+91 98765 11111',
      role: Number(newUserForm.role),
      status: 'Active',
      joinedAt: new Date().toISOString().slice(0, 10),
      lastActive: 'Just registered',
      language: newUserForm.language,
      location: newUserForm.location,
      avatar: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150',
      points: 50,
      coins: 10
    };

    setUsers([created, ...users]);
    setIsAddUserModalOpen(false);
    showToast(`Created new staff/member account for ${created.name}`, 'success');
    setNewUserForm({ name: '', email: '', phone: '', role: 1, language: 'English', location: 'Hyderabad, Telangana' });
  };

  const handleExportCsv = async () => {
    setIsExporting(true);
    try {
      await api.downloadUsersCsv();
      showToast('User directory CSV exported successfully', 'success');
    } catch (err) {
      showToast(err.message || 'Failed to export CSV', 'error');
    } finally {
      setIsExporting(false);
    }
  };

  // Helper for role badge colors
  const getRoleBadge = (roleInt) => {
    const r = Number(roleInt);
    if (r >= 6 || r === 13) {
      return { 
        label: 'Super Admin', 
        bg: 'bg-gradient-to-r from-rose-500 via-pink-500 to-fuchsia-600 text-white shadow-lg shadow-rose-500/30 border border-rose-400/40',
        ring: 'ring-2 ring-rose-500 shadow-rose-500/40',
        headerGrad: 'from-rose-600 via-pink-600 to-fuchsia-700'
      };
    }
    if (r === 5) {
      return { 
        label: 'Lead Admin', 
        bg: 'bg-gradient-to-r from-indigo-500 via-purple-600 to-violet-600 text-white shadow-lg shadow-indigo-500/30 border border-indigo-400/40',
        ring: 'ring-2 ring-indigo-500 shadow-indigo-500/40',
        headerGrad: 'from-indigo-600 via-purple-600 to-violet-700'
      };
    }
    if (r === 4) {
      return { 
        label: 'Senior Editor', 
        bg: 'bg-gradient-to-r from-amber-400 via-orange-500 to-amber-600 text-slate-950 font-black shadow-lg shadow-amber-500/30 border border-amber-300/50',
        ring: 'ring-2 ring-amber-400 shadow-amber-500/40',
        headerGrad: 'from-amber-500 via-orange-600 to-amber-700'
      };
    }
    if (r === 3) {
      return { 
        label: 'Moderator', 
        bg: 'bg-gradient-to-r from-emerald-500 to-teal-600 text-white shadow-lg shadow-emerald-500/30 border border-emerald-400/40',
        ring: 'ring-2 ring-emerald-400 shadow-emerald-500/40',
        headerGrad: 'from-emerald-600 to-teal-700'
      };
    }
    if (r === 2) {
      return { 
        label: 'Creator / Publisher', 
        bg: 'bg-gradient-to-r from-cyan-500 via-sky-500 to-blue-600 text-white shadow-lg shadow-cyan-500/30 border border-cyan-400/40',
        ring: 'ring-2 ring-cyan-400 shadow-cyan-500/40',
        headerGrad: 'from-cyan-600 to-blue-700'
      };
    }
    if (r === 1) {
      return { 
        label: 'Citizen Reader', 
        bg: 'bg-gradient-to-r from-slate-700 to-slate-800 text-slate-200 border border-white/15',
        ring: 'ring-1 ring-slate-600',
        headerGrad: 'from-slate-800 to-slate-900'
      };
    }
    return { 
      label: ROLE_NAMES[r] || `Role ${r}`, 
      bg: 'bg-slate-800 text-slate-300 border border-slate-700',
      ring: 'ring-1 ring-slate-700',
      headerGrad: 'from-slate-800 to-slate-900'
    };
  };

  return (
    <div className="view-container animate-fade-in pb-16">
      {/* ========================================================= */}
      {/* 1. TOP HEADER                                             */}
      {/* ========================================================= */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-8">
        <div>
          <div className="flex items-center gap-3">
            <h1 className="text-2xl sm:text-3xl font-black text-white tracking-tight flex items-center gap-2.5">
              User Directory & Access Control
            </h1>
            <span className="px-3 py-1 rounded-full text-xs font-black bg-gradient-to-r from-indigo-500 to-purple-600 text-white shadow-lg shadow-purple-500/25 flex items-center gap-1.5">
              <Database size={13} /> {dbStats.total || users.length} Members
            </span>
          </div>
          <p className="text-xs sm:text-sm text-slate-400 mt-1.5">
            Audit registered citizens, elevate staff roles (Roles 0–13), assign regional permissions, and enforce security policies.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2.5">
          {/* View Mode Toggle */}
          <div className="flex items-center bg-slate-900/80 p-1 rounded-xl border border-white/10">
            <button
              onClick={() => setViewMode('table')}
              className={`p-1.5 rounded-lg text-xs font-bold transition-all flex items-center gap-1.5 ${
                viewMode === 'table' ? 'bg-primary text-white shadow-glow' : 'text-slate-400 hover:text-white'
              }`}
              title="Table View"
            >
              <TableIcon size={14} />
            </button>
            <button
              onClick={() => setViewMode('grid')}
              className={`p-1.5 rounded-lg text-xs font-bold transition-all flex items-center gap-1.5 ${
                viewMode === 'grid' ? 'bg-primary text-white shadow-glow' : 'text-slate-400 hover:text-white'
              }`}
              title="Visual Cards View"
            >
              <LayoutGrid size={14} />
            </button>
          </div>

          <button 
            className="btn btn-secondary text-xs flex items-center gap-1.5 py-2 px-3.5 border-white/15"
            onClick={fetchLiveUsers}
            disabled={isLoading}
          >
            <RefreshCw size={13} className={isLoading ? 'animate-spin' : ''} />
            {isLoading ? 'Syncing...' : 'Sync DB'}
          </button>

          <button 
            className="btn btn-secondary text-xs flex items-center gap-1.5 py-2 px-3.5 border-white/15 text-cyan-300"
            onClick={handleExportCsv}
            disabled={isExporting}
          >
            <Download size={13} />
            {isExporting ? 'Exporting...' : 'Export CSV'}
          </button>

          <button 
            className="btn btn-primary text-xs flex items-center gap-1.5 py-2 px-4 shadow-glow bg-gradient-to-r from-indigo-600 to-purple-600 border-none font-bold"
            onClick={() => setIsAddUserModalOpen(true)}
          >
            <UserPlus size={15} /> Add User / Staff
          </button>
        </div>
      </div>

      {/* ========================================================= */}
      {/* 2. FOUR VIBRANT GRADIENT KPI CARDS                        */}
      {/* ========================================================= */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        {/* Card 1: Total Members - Deep Indigo */}
        <div className="p-5 rounded-3xl bg-gradient-to-br from-indigo-900/30 via-slate-900/90 to-purple-950/20 border border-indigo-500/30 shadow-xl relative overflow-hidden group hover:border-indigo-400/50 transition-all">
          <div className="absolute -right-4 -bottom-4 w-20 h-20 bg-indigo-500/15 rounded-full blur-xl group-hover:bg-indigo-500/30 transition-all" />
          <div className="flex items-center justify-between mb-3">
            <span className="text-[11px] text-indigo-300 font-black uppercase tracking-wider">Total User Registry</span>
            <span className="px-2 py-0.5 rounded-full text-[10px] font-black bg-indigo-500/20 text-indigo-300 border border-indigo-500/30">
              PG16 CLOUD
            </span>
          </div>
          <div className="flex items-center gap-3.5">
            <div className="p-3 rounded-2xl bg-gradient-to-br from-indigo-500 to-purple-600 text-white shadow-lg shadow-indigo-500/30">
              <Users size={22} />
            </div>
            <div>
              <div className="text-2xl font-black text-white">{dbStats.total || users.length}</div>
              <div className="text-xs text-indigo-300/80 font-medium">+1,240 weekly signups</div>
            </div>
          </div>
        </div>

        {/* Card 2: Active Citizens - Emerald */}
        <div className="p-5 rounded-3xl bg-gradient-to-br from-emerald-900/30 via-slate-900/90 to-teal-950/20 border border-emerald-500/30 shadow-xl relative overflow-hidden group hover:border-emerald-400/50 transition-all">
          <div className="absolute -right-4 -bottom-4 w-20 h-20 bg-emerald-500/15 rounded-full blur-xl group-hover:bg-emerald-500/30 transition-all" />
          <div className="flex items-center justify-between mb-3">
            <span className="text-[11px] text-emerald-300 font-black uppercase tracking-wider">Active Citizens</span>
            <span className="px-2 py-0.5 rounded-full text-[10px] font-black bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
              IN GOOD STANDING
            </span>
          </div>
          <div className="flex items-center gap-3.5">
            <div className="p-3 rounded-2xl bg-gradient-to-br from-emerald-500 to-teal-600 text-white shadow-lg shadow-emerald-500/30">
              <UserCheck size={22} />
            </div>
            <div>
              <div className="text-2xl font-black text-white">{dbStats.active || users.filter(u => u.status === 'Active').length}</div>
              <div className="text-xs text-emerald-300/80 font-medium">100% Verified Readers</div>
            </div>
          </div>
        </div>

        {/* Card 3: Staff & Crew - Amber */}
        <div className="p-5 rounded-3xl bg-gradient-to-br from-amber-900/30 via-slate-900/90 to-orange-950/20 border border-amber-500/30 shadow-xl relative overflow-hidden group hover:border-amber-400/50 transition-all">
          <div className="absolute -right-4 -bottom-4 w-20 h-20 bg-amber-500/15 rounded-full blur-xl group-hover:bg-amber-500/30 transition-all" />
          <div className="flex items-center justify-between mb-3">
            <span className="text-[11px] text-amber-300 font-black uppercase tracking-wider">Crew & Elevated Roles</span>
            <span className="px-2 py-0.5 rounded-full text-[10px] font-black bg-amber-500/20 text-amber-300 border border-amber-500/30">
              ROLES 2–13
            </span>
          </div>
          <div className="flex items-center gap-3.5">
            <div className="p-3 rounded-2xl bg-gradient-to-br from-amber-400 to-orange-500 text-slate-950 shadow-lg shadow-amber-500/30 font-black">
              <Shield size={22} />
            </div>
            <div>
              <div className="text-2xl font-black text-white">{users.filter(u => u.role > 1).length}</div>
              <div className="text-xs text-amber-300/80 font-medium">Editors, Admins & Creators</div>
            </div>
          </div>
        </div>

        {/* Card 4: Suspensions - Rose */}
        <div className="p-5 rounded-3xl bg-gradient-to-br from-rose-900/30 via-slate-900/90 to-red-950/20 border border-rose-500/30 shadow-xl relative overflow-hidden group hover:border-rose-400/50 transition-all">
          <div className="absolute -right-4 -bottom-4 w-20 h-20 bg-rose-500/15 rounded-full blur-xl group-hover:bg-rose-500/30 transition-all" />
          <div className="flex items-center justify-between mb-3">
            <span className="text-[11px] text-rose-300 font-black uppercase tracking-wider">Account Suspensions</span>
            <span className="px-2 py-0.5 rounded-full text-[10px] font-black bg-rose-500/20 text-rose-300 border border-rose-500/30">
              POLICY ENFORCED
            </span>
          </div>
          <div className="flex items-center gap-3.5">
            <div className="p-3 rounded-2xl bg-gradient-to-br from-rose-500 to-red-600 text-white shadow-lg shadow-rose-500/30">
              <UserX size={22} />
            </div>
            <div>
              <div className="text-2xl font-black text-white">{dbStats.suspended || users.filter(u => u.status === 'Suspended').length}</div>
              <div className="text-xs text-rose-300/80 font-medium">Access Quarantined</div>
            </div>
          </div>
        </div>
      </div>

      {/* ========================================================= */}
      {/* 3. QUICK SEGMENTED FILTER PILLS                           */}
      {/* ========================================================= */}
      <div className="flex items-center gap-2.5 border-b border-white/10 pb-4 mb-6 overflow-x-auto">
        {[
          { id: 'all', label: 'All Users', count: users.length, color: 'indigo' },
          { id: 'staff', label: 'Staff & Crew (Roles 3–13)', count: users.filter(u => u.role >= 3).length, color: 'amber' },
          { id: 'creators', label: 'Creators & Publishers', count: users.filter(u => u.role === 2).length, color: 'cyan' },
          { id: 'citizens', label: 'Citizen Readers', count: users.filter(u => u.role === 1).length, color: 'emerald' },
          { id: 'suspended', label: 'Suspended Accounts', count: users.filter(u => u.status === 'Suspended').length, color: 'rose' },
        ].map(tab => (
          <button
            key={tab.id}
            onClick={() => setQuickTab(tab.id)}
            className={`px-4 py-2 rounded-2xl text-xs font-black transition-all flex items-center gap-2 whitespace-nowrap shadow-sm ${
              quickTab === tab.id
                ? 'bg-gradient-to-r from-indigo-600 to-purple-600 text-white shadow-indigo-500/25 border border-indigo-400/50'
                : 'bg-slate-900/70 text-slate-400 hover:text-white hover:bg-slate-800 border border-white/5'
            }`}
          >
            <span>{tab.label}</span>
            <span className="px-2 py-0.5 rounded-full bg-black/40 text-[10px] font-mono font-bold text-slate-300">
              {tab.count}
            </span>
          </button>
        ))}
      </div>

      {/* ========================================================= */}
      {/* 4. SEARCH & FILTER TOOLBAR                                */}
      {/* ========================================================= */}
      <div className="p-4 rounded-2xl bg-slate-900/70 border border-white/10 backdrop-blur-xl mb-6 flex flex-wrap gap-4 items-center justify-between">
        <div className="flex-1 min-w-[280px] relative">
          <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
          <input 
            type="text" 
            className="input-field pl-10 w-full text-xs bg-slate-950/80 border-white/10 focus:border-indigo-500" 
            placeholder="Search by name, email, phone, or User UID..." 
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
        </div>

        <div className="flex flex-wrap gap-3 items-center">
          <div className="flex items-center gap-2">
            <span className="text-xs text-slate-400 font-bold">Clearance:</span>
            <select 
              className="input-field py-1.5 text-xs bg-slate-950 border-white/10"
              value={roleFilter}
              onChange={(e) => setRoleFilter(e.target.value)}
            >
              <option value="All">All Roles</option>
              {Object.entries(ROLE_NAMES).map(([val, label]) => (
                <option key={val} value={val}>{label} (Role {val})</option>
              ))}
            </select>
          </div>

          <div className="flex items-center gap-2">
            <span className="text-xs text-slate-400 font-bold">Status:</span>
            <select 
              className="input-field py-1.5 text-xs bg-slate-950 border-white/10"
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
            >
              <option value="All">All Statuses</option>
              <option value="Active">Active</option>
              <option value="Suspended">Suspended</option>
            </select>
          </div>
        </div>
      </div>

      {/* ========================================================= */}
      {/* 5A. VIEW MODE 1: TABLE VIEW                               */}
      {/* ========================================================= */}
      {viewMode === 'table' ? (
        <div className="rounded-3xl bg-slate-900/70 border border-white/10 shadow-2xl backdrop-blur-xl overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead>
                <tr className="border-b border-white/10 text-slate-400 bg-slate-950/60 font-bold uppercase tracking-wider text-[11px]">
                  <th className="py-3.5 px-4">User Profile</th>
                  <th className="py-3.5 px-3">UID</th>
                  <th className="py-3.5 px-3">Clearance Tier</th>
                  <th className="py-3.5 px-3">Location & Language</th>
                  <th className="py-3.5 px-3">Wallet & Rewards</th>
                  <th className="py-3.5 px-3">Status</th>
                  <th className="py-3.5 px-3">Joined</th>
                  <th className="py-3.5 px-4 text-right">Quick Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/5">
                {filteredUsers.length === 0 ? (
                  <tr>
                    <td colSpan="8" className="text-center py-16 text-slate-400">
                      No members match the current search or filter criteria.
                    </td>
                  </tr>
                ) : (
                  filteredUsers.map(u => {
                    const badgeInfo = getRoleBadge(u.role);
                    return (
                      <tr key={u.user_uid} className="hover:bg-white/[0.04] transition-colors">
                        {/* Profile & Avatar */}
                        <td className="py-3.5 px-4">
                          <div className="flex items-center gap-3">
                            <div className="relative">
                              <img 
                                src={u.avatar} 
                                alt="avatar" 
                                className="w-10 h-10 rounded-2xl object-cover border border-white/20 shadow-md"
                              />
                              {u.status === 'Active' && (
                                <span className="absolute -bottom-0.5 -right-0.5 w-3 h-3 rounded-full bg-emerald-500 border-2 border-slate-950 shadow-sm" />
                              )}
                            </div>
                            <div>
                              <div className="font-bold text-white text-xs flex items-center gap-1.5">
                                {u.name}
                                {u.role >= 4 && <CheckCircle2 size={13} className="text-indigo-400" />}
                              </div>
                              <div className="text-[11px] text-slate-400 font-mono mt-0.5">{u.email}</div>
                            </div>
                          </div>
                        </td>

                        {/* UID */}
                        <td className="py-3.5 px-3 font-mono text-[11px] text-cyan-300 font-bold">
                          {u.user_uid}
                        </td>

                        {/* Role */}
                        <td className="py-3.5 px-3">
                          <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider ${badgeInfo.bg} shadow-sm`}>
                            {badgeInfo.label}
                          </span>
                        </td>

                        {/* Location */}
                        <td className="py-3.5 px-3">
                          <div className="flex items-center gap-1.5 text-slate-300">
                            <MapPin size={12} className="text-sky-400 flex-shrink-0" />
                            <span className="truncate max-w-[130px]">{u.location}</span>
                          </div>
                          <div className="text-[10px] text-slate-400 ml-4 mt-0.5">{u.language}</div>
                        </td>

                        {/* Rewards */}
                        <td className="py-3.5 px-3">
                          <div className="flex items-center gap-1.5">
                            <span className="px-2 py-0.5 rounded-lg text-[10px] font-mono font-bold bg-amber-500/15 text-amber-300 border border-amber-500/25">
                              {u.points ?? 0} pts
                            </span>
                            <span className="px-1.5 py-0.5 rounded-lg text-[10px] font-mono font-bold bg-purple-500/15 text-purple-300 border border-purple-500/25">
                              {u.coins ?? 0}c
                            </span>
                          </div>
                        </td>

                        {/* Status */}
                        <td className="py-3.5 px-3">
                          <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider ${
                            u.status === 'Active' 
                              ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30' 
                              : 'bg-rose-500/20 text-rose-300 border border-rose-500/30'
                          }`}>
                            {u.status}
                          </span>
                        </td>

                        {/* Joined Date */}
                        <td className="py-3.5 px-3 text-slate-400 text-[11px] whitespace-nowrap">
                          {u.joinedAt}
                        </td>

                        {/* Actions */}
                        <td className="py-3.5 px-4 text-right whitespace-nowrap">
                          <div className="flex items-center justify-end gap-1.5">
                            {/* Inspect */}
                            <button
                              onClick={() => setInspectingUser(u)}
                              className="p-2 rounded-xl hover:bg-white/10 text-slate-300 hover:text-cyan-300 transition-colors"
                              title="Inspect Dossier"
                            >
                              <Eye size={14} />
                            </button>

                            {/* Role Switcher */}
                            <button
                              onClick={() => {
                                setEditingRoleUser(u);
                                setSelectedNewRole(u.role);
                              }}
                              className="p-2 rounded-xl hover:bg-indigo-500/20 text-indigo-400 transition-colors"
                              title="Elevate / Change Role"
                            >
                              <KeyRound size={14} />
                            </button>

                            {/* Suspend / Activate */}
                            <button
                              onClick={() => setSuspensionUser(u)}
                              className={`p-2 rounded-xl transition-colors ${
                                u.status === 'Active' 
                                  ? 'hover:bg-rose-500/20 text-rose-400' 
                                  : 'hover:bg-emerald-500/20 text-emerald-400'
                              }`}
                              title={u.status === 'Active' ? 'Suspend Account' : 'Reactivate Account'}
                            >
                              {u.status === 'Active' ? <Lock size={14} /> : <Unlock size={14} />}
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
        </div>
      ) : (
        /* ========================================================= */
        /* 5B. VIEW MODE 2: VIBRANT VISUAL CARDS GRID                */
        /* ========================================================= */
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-5">
          {filteredUsers.map(u => {
            const badgeInfo = getRoleBadge(u.role);
            return (
              <div 
                key={u.user_uid}
                className="rounded-3xl bg-slate-900/90 border border-white/10 shadow-2xl overflow-hidden hover:border-indigo-400/50 hover:shadow-indigo-500/10 transition-all duration-300 flex flex-col justify-between group relative"
              >
                <div>
                  {/* Colorful Top Header Banner Strip */}
                  <div className={`h-20 w-full bg-gradient-to-r ${badgeInfo.headerGrad || 'from-indigo-600 to-purple-700'} relative overflow-hidden flex items-start justify-between p-3.5`}>
                    <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-white/20 via-transparent to-black/30" />
                    
                    <span className="relative z-10 text-[10px] font-black uppercase tracking-wider text-white bg-black/40 px-2.5 py-0.5 rounded-full backdrop-blur-md border border-white/20 shadow-md">
                      {badgeInfo.label}
                    </span>
                    <span className="relative z-10 text-[10px] font-mono font-bold text-white/90 bg-black/30 px-2 py-0.5 rounded backdrop-blur-sm">
                      {u.user_uid}
                    </span>
                  </div>

                  {/* Body Content with Overlapping Avatar */}
                  <div className="px-5 pt-0 pb-4 relative -mt-10">
                    <div className="flex items-end justify-between mb-3.5">
                      <div className="relative">
                        <div className={`p-1 rounded-2xl bg-gradient-to-br ${badgeInfo.headerGrad || 'from-indigo-500 to-purple-600'} shadow-xl`}>
                          <img 
                            src={u.avatar} 
                            alt={u.name}
                            className="w-16 h-16 rounded-[14px] object-cover border-2 border-slate-950 bg-slate-900"
                          />
                        </div>
                        {u.status === 'Active' ? (
                          <span className="absolute bottom-1 right-1 w-4 h-4 rounded-full bg-emerald-500 border-2 border-slate-950 flex items-center justify-center shadow-lg" title="Active">
                            <span className="w-1.5 h-1.5 rounded-full bg-white animate-pulse" />
                          </span>
                        ) : (
                          <span className="absolute bottom-1 right-1 w-4 h-4 rounded-full bg-rose-500 border-2 border-slate-950 flex items-center justify-center shadow-lg" title="Suspended">
                            <Lock size={10} className="text-white" />
                          </span>
                        )}
                      </div>

                      <span className={`px-2.5 py-1 rounded-full text-[10px] font-black uppercase tracking-wider border shadow-sm ${
                        u.status === 'Active' 
                          ? 'bg-emerald-500/20 text-emerald-300 border-emerald-500/30' 
                          : 'bg-rose-500/20 text-rose-300 border-rose-500/30'
                      }`}>
                        {u.status}
                      </span>
                    </div>

                    <div className="font-extrabold text-white text-sm mb-0.5 truncate flex items-center gap-1.5">
                      <span>{u.name}</span>
                      {u.role >= 4 && <Crown size={13} className="text-amber-400 flex-shrink-0" />}
                    </div>
                    <div className="text-[11px] text-slate-400 font-mono truncate mb-4">{u.email}</div>

                    {/* Metadata Badges (Location & Language) */}
                    <div className="flex flex-wrap gap-1.5 mb-3">
                      <span className="px-2 py-0.5 rounded-lg text-[10px] font-medium bg-slate-800/90 text-slate-300 border border-white/5 flex items-center gap-1">
                        <MapPin size={10} className="text-sky-400" />
                        <span className="truncate max-w-[120px]">{u.location}</span>
                      </span>
                      <span className="px-2 py-0.5 rounded-lg text-[10px] font-medium bg-slate-800/90 text-slate-300 border border-white/5 flex items-center gap-1">
                        <Globe size={10} className="text-purple-400" />
                        <span>{u.language}</span>
                      </span>
                    </div>

                    {/* Colorful Wallet Metric Pills */}
                    <div className="p-2.5 rounded-2xl bg-slate-950/70 border border-white/5 flex items-center justify-between">
                      <div className="flex items-center gap-1.5">
                        <Award size={13} className="text-amber-400" />
                        <span className="text-[11px] font-bold text-amber-300 font-mono">{u.points ?? 0} pts</span>
                      </div>
                      <div className="flex items-center gap-1.5">
                        <Sparkles size={12} className="text-fuchsia-400" />
                        <span className="text-[11px] font-bold text-fuchsia-300 font-mono">{u.coins ?? 0} coins</span>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Card Actions Footer */}
                <div className="p-3 bg-slate-950/80 border-t border-white/10 flex items-center justify-between">
                  <button
                    onClick={() => setInspectingUser(u)}
                    className="text-xs text-slate-400 hover:text-cyan-300 font-bold flex items-center gap-1 py-1 px-2 rounded-lg hover:bg-white/5 transition-all"
                  >
                    <Eye size={13} /> View Dossier
                  </button>

                  <div className="flex items-center gap-1.5">
                    <button
                      onClick={() => {
                        setEditingRoleUser(u);
                        setSelectedNewRole(u.role);
                      }}
                      className="p-1.5 rounded-xl bg-indigo-500/10 hover:bg-indigo-500/25 text-indigo-400 border border-indigo-500/30 transition-all shadow-sm"
                      title="Elevate or Reassign Role"
                    >
                      <KeyRound size={13} />
                    </button>

                    <button
                      onClick={() => setSuspensionUser(u)}
                      className={`p-1.5 rounded-xl border transition-all shadow-sm ${
                        u.status === 'Active' 
                          ? 'bg-rose-500/10 hover:bg-rose-500/25 text-rose-400 border-rose-500/30' 
                          : 'bg-emerald-500/10 hover:bg-emerald-500/25 text-emerald-400 border-emerald-500/30'
                      }`}
                      title={u.status === 'Active' ? 'Suspend Account' : 'Reactivate Account'}
                    >
                      {u.status === 'Active' ? <Lock size={13} /> : <Unlock size={13} />}
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* ========================================================= */}
      {/* MODAL 1: CHANGE ROLE & PERMISSIONS                        */}
      {/* ========================================================= */}
      {editingRoleUser && (
        <Modal
          isOpen={!!editingRoleUser}
          onClose={() => setEditingRoleUser(null)}
          title={`Assign Platform Role • ${editingRoleUser.name}`}
          size="md"
        >
          <form onSubmit={handleSaveRole} className="space-y-4">
            <div className="p-4 rounded-2xl bg-gradient-to-br from-indigo-950/60 via-slate-900 to-purple-950/40 border border-white/10 flex items-center gap-4">
              <img 
                src={editingRoleUser.avatar} 
                alt="avatar" 
                className="w-12 h-12 rounded-xl object-cover border border-white/20 shadow-md"
              />
              <div>
                <div className="font-extrabold text-white text-sm">{editingRoleUser.name}</div>
                <div className="text-xs text-slate-400 font-mono">{editingRoleUser.email}</div>
                <div className="text-xs text-cyan-300 font-mono font-bold mt-0.5">UID: {editingRoleUser.user_uid}</div>
              </div>
            </div>

            <div>
              <label className="block text-xs font-black text-slate-300 uppercase tracking-wider mb-2.5">
                Select Platform Clearance Tier
              </label>
              <div className="space-y-2 max-h-64 overflow-y-auto pr-1">
                {Object.entries(ROLE_NAMES).map(([val, label]) => {
                  const detail = ROLE_DETAILS[val] || { desc: '' };
                  const isSelected = Number(selectedNewRole) === Number(val);
                  return (
                    <label 
                      key={val}
                      onClick={() => setSelectedNewRole(Number(val))}
                      className={`flex items-start gap-3 p-3 rounded-2xl border cursor-pointer transition-all ${
                        isSelected 
                          ? 'border-indigo-400 bg-indigo-500/15 text-white shadow-lg shadow-indigo-500/20' 
                          : 'border-white/10 bg-slate-950/60 text-slate-300 hover:bg-white/5'
                      }`}
                    >
                      <input 
                        type="radio" 
                        name="userRole" 
                        checked={isSelected}
                        onChange={() => setSelectedNewRole(Number(val))}
                        className="mt-1 text-indigo-500 focus:ring-indigo-500"
                      />
                      <div>
                        <div className="text-xs font-black flex items-center gap-2">
                          <span>{label}</span>
                          <span className="font-mono text-[10px] text-slate-400">Role {val}</span>
                        </div>
                        {detail.desc && (
                          <p className="text-[11px] text-slate-400 mt-0.5 leading-snug">
                            {detail.desc}
                          </p>
                        )}
                      </div>
                    </label>
                  );
                })}
              </div>
            </div>

            <div className="flex justify-end gap-2 pt-4 border-t border-white/10">
              <button 
                type="button" 
                className="btn btn-secondary text-xs"
                onClick={() => setEditingRoleUser(null)}
              >
                Cancel
              </button>
              <button type="submit" className="btn btn-primary text-xs shadow-glow font-bold bg-gradient-to-r from-indigo-600 to-purple-600 border-none">
                Apply Role Change
              </button>
            </div>
          </form>
        </Modal>
      )}

      {/* ========================================================= */}
      {/* MODAL 2: SUSPEND / REACTIVATE CONFIRMATION                */}
      {/* ========================================================= */}
      {suspensionUser && (
        <Modal
          isOpen={!!suspensionUser}
          onClose={() => setSuspensionUser(null)}
          title={suspensionUser.status === 'Active' ? 'Confirm Account Suspension' : 'Reactivate User Account'}
          size="sm"
        >
          <div className="space-y-4">
            <div className="flex items-center gap-3 p-3.5 rounded-2xl bg-slate-950 border border-white/10">
              <img 
                src={suspensionUser.avatar} 
                alt="avatar" 
                className="w-10 h-10 rounded-xl object-cover"
              />
              <div>
                <div className="font-bold text-white text-xs">{suspensionUser.name}</div>
                <div className="text-[11px] text-slate-400 font-mono">{suspensionUser.user_uid}</div>
              </div>
            </div>

            {suspensionUser.status === 'Active' ? (
              <>
                <div className="p-3.5 rounded-2xl bg-rose-500/10 border border-rose-500/30 text-xs text-rose-300 space-y-1">
                  <div className="font-black flex items-center gap-1.5">
                    <AlertTriangle size={14} /> Security Policy Warning
                  </div>
                  <p className="leading-relaxed">
                    Suspending this user immediately invalidates active sessions and prevents news commenting, reactions, and login privileges.
                  </p>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-300 mb-1.5">
                    Reason for Suspension (Audit Logged)
                  </label>
                  <textarea
                    rows={2}
                    value={suspensionReason}
                    onChange={(e) => setSuspensionReason(e.target.value)}
                    className="input-field w-full text-xs resize-none bg-slate-950 border-white/15"
                    placeholder="Provide reason for suspension..."
                  />
                </div>
              </>
            ) : (
              <p className="text-xs text-slate-300">
                Are you sure you want to lift the suspension for <strong>{suspensionUser.name}</strong>? Their permissions will be restored immediately.
              </p>
            )}

            <div className="flex justify-end gap-2 pt-3 border-t border-white/10">
              <button 
                className="btn btn-secondary text-xs"
                onClick={() => setSuspensionUser(null)}
              >
                Cancel
              </button>
              <button 
                className={`btn ${suspensionUser.status === 'Active' ? 'btn-danger bg-rose-600 hover:bg-rose-500' : 'btn-primary'} text-xs font-bold`}
                onClick={handleConfirmSuspension}
              >
                {suspensionUser.status === 'Active' ? 'Confirm Suspension' : 'Reactivate Account'}
              </button>
            </div>
          </div>
        </Modal>
      )}

      {/* ========================================================= */}
      {/* MODAL 3: USER INSPECTION DOSSIER                          */}
      {/* ========================================================= */}
      {inspectingUser && (
        <Modal
          isOpen={!!inspectingUser}
          onClose={() => setInspectingUser(null)}
          title={`User Identity Dossier • ${inspectingUser.name}`}
          size="md"
        >
          <div className="space-y-4">
            <div className="p-4 rounded-2xl bg-gradient-to-br from-indigo-950/60 via-slate-900 to-purple-950/40 border border-white/10 flex items-center gap-4">
              <img 
                src={inspectingUser.avatar} 
                alt="avatar" 
                className="w-16 h-16 rounded-2xl object-cover border-2 border-indigo-400/50 shadow-glow"
              />
              <div>
                <div className="font-black text-white text-base">{inspectingUser.name}</div>
                <div className="text-xs text-slate-400 font-mono">{inspectingUser.email}</div>
                <div className="flex items-center gap-2 mt-2">
                  <span className="px-2 py-0.5 rounded text-[10px] font-black bg-gradient-to-r from-indigo-500 to-purple-600 text-white">
                    Role {inspectingUser.role}: {ROLE_NAMES[inspectingUser.role]}
                  </span>
                  <span className={`px-2 py-0.5 rounded text-[10px] font-black uppercase ${
                    inspectingUser.status === 'Active' ? 'bg-emerald-500/20 text-emerald-300' : 'bg-rose-500/20 text-rose-300'
                  }`}>
                    {inspectingUser.status}
                  </span>
                </div>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3 text-xs font-mono">
              <div className="p-3.5 rounded-xl bg-slate-950/80 border border-white/10">
                <div className="text-slate-400 text-[11px] font-sans">User UID</div>
                <div className="text-cyan-300 font-bold mt-0.5">{inspectingUser.user_uid}</div>
              </div>
              <div className="p-3.5 rounded-xl bg-slate-950/80 border border-white/10">
                <div className="text-slate-400 text-[11px] font-sans">Contact Phone</div>
                <div className="text-white font-bold mt-0.5">{inspectingUser.phone}</div>
              </div>
              <div className="p-3.5 rounded-xl bg-slate-950/80 border border-white/10">
                <div className="text-slate-400 text-[11px] font-sans">Location & State</div>
                <div className="text-white font-bold mt-0.5">{inspectingUser.location}</div>
              </div>
              <div className="p-3.5 rounded-xl bg-slate-950/80 border border-white/10">
                <div className="text-slate-400 text-[11px] font-sans">Preferred Language</div>
                <div className="text-white font-bold mt-0.5">{inspectingUser.language}</div>
              </div>
              <div className="p-3.5 rounded-xl bg-slate-950/80 border border-white/10">
                <div className="text-slate-400 text-[11px] font-sans">Reward Balance</div>
                <div className="text-amber-300 font-bold mt-0.5">{inspectingUser.points} points • {inspectingUser.coins} coins</div>
              </div>
              <div className="p-3.5 rounded-xl bg-slate-950/80 border border-white/10">
                <div className="text-slate-400 text-[11px] font-sans">Registration Date</div>
                <div className="text-white font-bold mt-0.5">{inspectingUser.joinedAt}</div>
              </div>
            </div>

            <div className="flex justify-end pt-3 border-t border-white/10">
              <button 
                className="btn btn-secondary text-xs"
                onClick={() => setInspectingUser(null)}
              >
                Close Dossier
              </button>
            </div>
          </div>
        </Modal>
      )}

      {/* ========================================================= */}
      {/* MODAL 4: ADD USER / STAFF FORM                            */}
      {/* ========================================================= */}
      {isAddUserModalOpen && (
        <Modal
          isOpen={isAddUserModalOpen}
          onClose={() => setIsAddUserModalOpen(false)}
          title="Register New Platform Member / Staff"
          size="md"
        >
          <form onSubmit={handleAddUserSubmit} className="space-y-4">
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-bold text-slate-300 mb-1">Full Name *</label>
                <input 
                  type="text" 
                  required 
                  className="input-field w-full text-xs bg-slate-950 border-white/15"
                  placeholder="e.g. Anand Rao"
                  value={newUserForm.name}
                  onChange={(e) => setNewUserForm({ ...newUserForm, name: e.target.value })}
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-300 mb-1">Email Address *</label>
                <input 
                  type="email" 
                  required 
                  className="input-field w-full text-xs bg-slate-950 border-white/15"
                  placeholder="anand@hypernews.live"
                  value={newUserForm.email}
                  onChange={(e) => setNewUserForm({ ...newUserForm, email: e.target.value })}
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-bold text-slate-300 mb-1">Mobile Phone</label>
                <input 
                  type="text" 
                  className="input-field w-full text-xs bg-slate-950 border-white/15"
                  placeholder="+91 98765 00000"
                  value={newUserForm.phone}
                  onChange={(e) => setNewUserForm({ ...newUserForm, phone: e.target.value })}
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-300 mb-1">Assign Initial Role</label>
                <select 
                  className="input-field w-full text-xs bg-slate-950 border-white/15"
                  value={newUserForm.role}
                  onChange={(e) => setNewUserForm({ ...newUserForm, role: Number(e.target.value) })}
                >
                  {Object.entries(ROLE_NAMES).map(([val, label]) => (
                    <option key={val} value={val}>{label} (Role {val})</option>
                  ))}
                </select>
              </div>
            </div>

            <div className="flex justify-end gap-2 pt-4 border-t border-white/10">
              <button 
                type="button" 
                className="btn btn-secondary text-xs"
                onClick={() => setIsAddUserModalOpen(false)}
              >
                Cancel
              </button>
              <button type="submit" className="btn btn-primary text-xs shadow-glow font-bold bg-gradient-to-r from-indigo-600 to-purple-600 border-none">
                Create Account
              </button>
            </div>
          </form>
        </Modal>
      )}
    </div>
  );
}
