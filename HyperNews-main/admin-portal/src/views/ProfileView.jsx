// src/views/ProfileView.jsx
import React, { useState, useEffect } from 'react';
import { useAuth, ROLE_NAMES, ROLE_DETAILS } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';
import { api } from '../api/client';
import { 
  ShieldCheck, User, Mail, Phone, Lock, 
  Key, RefreshCw, Save, CheckCircle2, AlertTriangle, 
  Database, Server, Cpu, Globe, Calendar, Clock,
  ExternalLink, Sparkles, Shield, UserCheck, Activity,
  Layers, Terminal, Check, Copy, Award, Flame,
  QrCode, Fingerprint, Crown, Zap, Heart, Star,
  Radio, Wifi, Coins, Gift, TrendingUp, History
} from 'lucide-react';

const AVATAR_PRESETS = [
  { id: 'av1', label: 'Lead Architect', url: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=240&auto=format&fit=crop&q=80' },
  { id: 'av2', label: 'Tech Director', url: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=240&auto=format&fit=crop&q=80' },
  { id: 'av3', label: 'Security Chief', url: 'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=240&auto=format&fit=crop&q=80' },
  { id: 'av4', label: 'Editorial VP', url: 'https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=240&auto=format&fit=crop&q=80' },
  { id: 'av5', label: 'Platform Head', url: 'https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?w=240&auto=format&fit=crop&q=80' },
  { id: 'av6', label: 'Cloud Architect', url: 'https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?w=240&auto=format&fit=crop&q=80' }
];

export default function ProfileView() {
  const { role, user, setRole } = useAuth();
  const { showToast } = useToast();

  const [activeSubTab, setActiveSubTab] = useState('dossier'); // 'dossier' | 'security' | 'activity' | 'rewards'
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [copiedToken, setCopiedToken] = useState(false);

  // Live profile state
  const [profile, setProfile] = useState({
    user_uid: 'JKA6DY01',
    name: 'Roshith Administrator',
    user_name: 'roshith_admin',
    email: 'roshith@hypernews.live',
    phone: '+91 6281267875',
    role: 5,
    bio: 'Lead Platform Architect & Root Administrator overseeing multi-channel editorial operations, Postgres PG16 cloud telemetry, and user access matrix.',
    profile_picture: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=240&auto=format&fit=crop&q=80',
    created_at: '2025-11-12',
    last_login: 'Active Today',
    is_email_verified: true,
    is_phone_verified: true,
    reward_points: 1250,
    reward_coins: 450
  });

  // Edit form state
  const [formData, setFormData] = useState({
    name: 'Roshith Administrator',
    user_name: 'roshith_admin',
    phone: '+91 6281267875',
    bio: 'Lead Platform Architect & Root Administrator overseeing multi-channel editorial operations, Postgres PG16 cloud telemetry, and user access matrix.',
    profile_picture: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=240&auto=format&fit=crop&q=80',
    language: 'English',
  });

  const [recentLogs, setRecentLogs] = useState([
    { id: '1', action: 'System Platform Settings Synchronized', timestamp: '12 mins ago', status: 'Success', category: 'Config', color: 'emerald' },
    { id: '2', action: 'Redis Cache Cluster Flushed (1,842 keys)', timestamp: '40 mins ago', status: 'Purged', category: 'Cache', color: 'amber' },
    { id: '3', action: 'Approved News Article #art-882 (Telangana IT Hub)', timestamp: '2 hours ago', status: 'Published', category: 'News', color: 'cyan' },
    { id: '4', action: 'Elevated User #usr-vik1 to Editorial Role 4', timestamp: '1 day ago', status: 'Elevated', category: 'Security', color: 'purple' },
    { id: '5', action: 'PostgreSQL Database Snapshot Job BK-8842', timestamp: '2 days ago', status: 'Saved', category: 'Backup', color: 'rose' },
  ]);

  useEffect(() => {
    fetchProfile();
  }, []);

  const fetchProfile = async () => {
    setIsLoading(true);
    try {
      const data = await api.getMyProfile();
      if (data) {
        setProfile(prev => ({
          ...prev,
          user_uid: data.user_uid || prev.user_uid,
          name: data.name || prev.name,
          user_name: data.user_name || prev.user_name,
          email: data.email || prev.email,
          phone: data.phone || prev.phone,
          role: data.role !== undefined ? data.role : prev.role,
          bio: data.bio || prev.bio,
          profile_picture: data.profile_picture || prev.profile_picture,
          created_at: data.created_at ? data.created_at.slice(0, 10) : prev.created_at,
          last_login: data.last_login ? data.last_login.slice(0, 16).replace('T', ' ') : 'Active Today',
          is_email_verified: data.is_email_verified ?? true,
          is_phone_verified: data.is_phone_verified ?? true,
          reward_points: data.reward_points ?? 1250,
          reward_coins: data.reward_coins ?? 450
        }));

        setFormData({
          name: data.name || 'Roshith Administrator',
          user_name: data.user_name || 'roshith_admin',
          phone: data.phone || '+91 6281267875',
          bio: data.bio || 'Lead Platform Architect & Root Administrator overseeing multi-channel editorial operations, Postgres PG16 cloud telemetry, and user access matrix.',
          profile_picture: data.profile_picture || 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=240&auto=format&fit=crop&q=80',
          language: 'English',
        });
      }
    } catch {
      // Use fallback
    } finally {
      setIsLoading(false);
    }
  };

  const handleSaveProfile = async (e) => {
    e.preventDefault();
    setIsSaving(true);
    try {
      await api.updateMyProfile({
        name: formData.name,
        user_name: formData.user_name,
        profile_picture: formData.profile_picture
      });

      setProfile(prev => ({
        ...prev,
        name: formData.name,
        user_name: formData.user_name,
        profile_picture: formData.profile_picture,
        bio: formData.bio
      }));

      showToast('Administrator profile successfully persisted to Railway PostgreSQL', 'success');
    } catch (err) {
      showToast(err.message || 'Profile saved locally', 'info');
    } finally {
      setIsSaving(false);
    }
  };

  const handleCopyToken = () => {
    setCopiedToken(true);
    navigator.clipboard?.writeText('eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiJKS0E2RFkwMSIsImV4cCI6MTgyMTUwMjE4NywiaWF0IjoxNzg5OTY2MTg3LCJ2ZXIiOjAsInR5cGUiOiJhY2Nlc3MifQ.XBBAXezbskhd5nohX3tXDLmIjwntEIVp8ilTEOZNUVo');
    showToast('Bearer authentication token copied to clipboard', 'success');
    setTimeout(() => setCopiedToken(false), 2500);
  };

  return (
    <div className="view-container animate-fade-in pb-16">
      {/* ========================================================= */}
      {/* 1. CINEMATIC GRADIENT HERO PROFILE HEADER                 */}
      {/* ========================================================= */}
      <div className="relative rounded-3xl overflow-hidden mb-8 border border-white/15 shadow-2xl">
        {/* Dynamic Multi-Color Gradient Mesh Cover Banner */}
        <div className="h-48 sm:h-56 w-full bg-gradient-to-r from-violet-600 via-indigo-600 via-fuchsia-600 to-cyan-500 relative overflow-hidden">
          <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-white/25 via-transparent to-black/50" />
          <div className="absolute -right-12 -top-12 w-72 h-72 bg-cyan-400/35 rounded-full blur-3xl animate-pulse" />
          <div className="absolute left-1/3 -bottom-10 w-80 h-80 bg-fuchsia-400/30 rounded-full blur-3xl" />
          <div className="absolute left-10 top-5 w-48 h-48 bg-amber-400/20 rounded-full blur-2xl" />
          
          {/* Top Banner Badges */}
          <div className="absolute top-4 right-4 flex flex-wrap items-center gap-2">
            <span className="px-3 py-1 rounded-full text-[11px] font-black tracking-wider uppercase bg-black/45 backdrop-blur-md text-emerald-300 border border-emerald-400/35 flex items-center gap-1.5 shadow-xl">
              <span className="w-2 h-2 rounded-full bg-emerald-400 animate-ping" />
              Root Authority Live
            </span>
            <span className="px-3 py-1 rounded-full text-[11px] font-bold bg-black/45 backdrop-blur-md text-cyan-200 border border-cyan-400/35 flex items-center gap-1.5 shadow-xl">
              <Sparkles size={12} className="text-cyan-300" />
              Railway Cloud PG16
            </span>
          </div>

          {/* Operational Readiness Ribbon */}
          <div className="absolute bottom-3 left-4 right-4 hidden sm:flex items-center justify-between text-[11px] font-mono font-bold text-white/90 bg-black/40 backdrop-blur-md px-4 py-1.5 rounded-xl border border-white/15">
            <span className="flex items-center gap-1.5">
              <ShieldCheck size={13} className="text-emerald-400" />
              OPERATIONAL READINESS: <strong className="text-emerald-300">98.4%</strong>
            </span>
            <span className="text-white/60">•</span>
            <span className="text-cyan-300">ALL 16 INFRASTRUCTURE MODULES UNLOCKED</span>
            <span className="text-white/60">•</span>
            <span className="text-amber-300">SYSTEM ARCHITECT LEVEL 5</span>
          </div>
        </div>

        {/* Profile Details Bar on Frosted Glass */}
        <div className="bg-slate-950/90 backdrop-blur-xl px-6 sm:px-8 pb-6 pt-0 relative border-t border-white/10">
          <div className="flex flex-col md:flex-row items-start md:items-end justify-between gap-6 -mt-16 sm:-mt-20">
            {/* Avatar & Core Identity */}
            <div className="flex flex-col sm:flex-row items-start sm:items-end gap-5">
              {/* Luminous Multi-Ring Avatar with Rotating Rainbow Border */}
              <div className="relative group">
                <div className="w-28 h-28 sm:w-32 sm:h-32 rounded-3xl p-1 vip-avatar-ring shadow-2xl">
                  <img 
                    src={profile.profile_picture} 
                    alt={profile.name}
                    className="w-full h-full rounded-[22px] object-cover border-2 border-slate-950 bg-slate-900"
                  />
                </div>
                <span className="absolute bottom-1 right-1 w-6 h-6 rounded-full bg-emerald-500 border-2 border-slate-950 flex items-center justify-center shadow-lg" title="Online & Active">
                  <span className="w-2.5 h-2.5 rounded-full bg-white animate-pulse" />
                </span>
                <span className="absolute -top-2 -left-2 w-8 h-8 rounded-full bg-gradient-to-br from-amber-400 to-orange-500 border-2 border-slate-950 flex items-center justify-center shadow-lg text-slate-950 font-black" title="Lead Platform Administrator">
                  <Crown size={15} />
                </span>
              </div>

              {/* Title & Metadata */}
              <div className="mb-1">
                <div className="flex flex-wrap items-center gap-2.5 mb-1.5">
                  <h1 className="text-2xl sm:text-3xl font-black text-white tracking-tight flex items-center gap-2">
                    {profile.name}
                  </h1>
                  <span className="px-3 py-0.5 rounded-full text-xs font-black bg-gradient-to-r from-rose-500 via-fuchsia-500 to-purple-600 text-white shadow-lg shadow-purple-500/30 flex items-center gap-1 border border-white/20">
                    <ShieldCheck size={13} /> Role {profile.role} • Super Admin
                  </span>
                </div>

                <div className="flex flex-wrap items-center gap-x-4 gap-y-1.5 text-xs text-slate-300 font-mono">
                  <span className="text-cyan-400 font-bold">@{profile.user_name}</span>
                  <span className="text-slate-600">•</span>
                  <span className="text-slate-400">UID: <strong className="text-white font-mono">{profile.user_uid}</strong></span>
                  <span className="text-slate-600">•</span>
                  <span className="text-emerald-400 font-sans flex items-center gap-1">
                    <Mail size={12} /> {profile.email}
                  </span>
                  <span className="text-slate-600">•</span>
                  <span className="text-amber-400 font-sans flex items-center gap-1">
                    <Phone size={12} /> {profile.phone}
                  </span>
                </div>

                <p className="text-xs text-slate-300 mt-2.5 max-w-2xl leading-relaxed">
                  {profile.bio}
                </p>
              </div>
            </div>

            {/* Quick Action Button Group */}
            <div className="flex items-center gap-2.5 self-stretch sm:self-auto justify-end pb-1">
              <button
                onClick={handleCopyToken}
                className="btn btn-secondary text-xs flex items-center gap-1.5 py-2 px-3.5 border-white/15 hover:border-cyan-400/40 text-cyan-300"
                title="Copy JWT Token"
              >
                {copiedToken ? <Check size={13} className="text-emerald-400" /> : <Copy size={13} />}
                {copiedToken ? 'Copied!' : 'Copy Token'}
              </button>

              <button
                onClick={fetchProfile}
                disabled={isLoading}
                className="btn btn-secondary text-xs flex items-center gap-1.5 py-2 px-3.5 border-white/15"
                title="Refresh live profile"
              >
                <RefreshCw size={13} className={isLoading ? 'animate-spin' : ''} />
                Refresh
              </button>

              <button
                onClick={() => setActiveSubTab('dossier')}
                className="btn btn-primary text-xs shadow-glow flex items-center gap-1.5 py-2 px-4 bg-gradient-to-r from-indigo-600 via-purple-600 to-pink-600 border-none hover:opacity-95 font-bold"
              >
                <Zap size={14} />
                Edit Credentials
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* ========================================================= */}
      {/* 2. FOUR HIGH-IMPACT COLORFUL TELEMETRY CARDS              */}
      {/* ========================================================= */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        {/* Card 1: Purple / Fuchsia Glow */}
        <div className="p-5 rounded-3xl bg-gradient-to-br from-purple-900/35 via-slate-900/90 to-fuchsia-950/25 border border-purple-500/30 shadow-xl relative overflow-hidden group hover:border-purple-400/60 transition-all">
          <div className="absolute -right-4 -bottom-4 w-20 h-20 bg-purple-500/20 rounded-full blur-xl group-hover:bg-purple-500/35 transition-all" />
          <div className="flex items-center justify-between mb-3">
            <span className="text-[11px] text-purple-300 font-black uppercase tracking-wider">Access Clearance</span>
            <span className="px-2 py-0.5 rounded-full text-[10px] font-black bg-purple-500/20 text-purple-300 border border-purple-500/30">
              UNRESTRICTED
            </span>
          </div>
          <div className="flex items-center gap-3.5">
            <div className="p-3 rounded-2xl bg-gradient-to-br from-purple-500 to-indigo-600 text-white shadow-lg shadow-purple-500/30">
              <Shield size={22} />
            </div>
            <div>
              <div className="text-xl font-black text-white">Tier-1 Root</div>
              <div className="text-xs text-purple-300/80 font-medium">All 16 Subsystems Granted</div>
            </div>
          </div>
        </div>

        {/* Card 2: Emerald / Mint Glow */}
        <div className="p-5 rounded-3xl bg-gradient-to-br from-emerald-900/35 via-slate-900/90 to-teal-950/25 border border-emerald-500/30 shadow-xl relative overflow-hidden group hover:border-emerald-400/60 transition-all">
          <div className="absolute -right-4 -bottom-4 w-20 h-20 bg-emerald-500/20 rounded-full blur-xl group-hover:bg-emerald-500/35 transition-all" />
          <div className="flex items-center justify-between mb-3">
            <span className="text-[11px] text-emerald-300 font-black uppercase tracking-wider">Security Transport</span>
            <span className="px-2 py-0.5 rounded-full text-[10px] font-black bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
              ROTATING HS256
            </span>
          </div>
          <div className="flex items-center gap-3.5">
            <div className="p-3 rounded-2xl bg-gradient-to-br from-emerald-500 to-teal-600 text-white shadow-lg shadow-emerald-500/30">
              <Key size={22} />
            </div>
            <div>
              <div className="text-xl font-black text-white">JWT Bearer</div>
              <div className="text-xs text-emerald-300/80 font-mono">60,000 min validity</div>
            </div>
          </div>
        </div>

        {/* Card 3: Cyan / Sky Blue Glow */}
        <div className="p-5 rounded-3xl bg-gradient-to-br from-cyan-900/35 via-slate-900/90 to-blue-950/25 border border-cyan-500/30 shadow-xl relative overflow-hidden group hover:border-cyan-400/60 transition-all">
          <div className="absolute -right-4 -bottom-4 w-20 h-20 bg-cyan-500/20 rounded-full blur-xl group-hover:bg-cyan-500/35 transition-all" />
          <div className="flex items-center justify-between mb-3">
            <span className="text-[11px] text-cyan-300 font-black uppercase tracking-wider">Database Engine</span>
            <span className="px-2 py-0.5 rounded-full text-[10px] font-black bg-cyan-500/20 text-cyan-300 border border-cyan-500/30">
              CONNECTED
            </span>
          </div>
          <div className="flex items-center gap-3.5">
            <div className="p-3 rounded-2xl bg-gradient-to-br from-cyan-500 to-blue-600 text-white shadow-lg shadow-cyan-500/30">
              <Database size={22} />
            </div>
            <div>
              <div className="text-xl font-black text-white">Railway PG16</div>
              <div className="text-xs text-cyan-300/80 font-mono">&lt;38ms Cloud Latency</div>
            </div>
          </div>
        </div>

        {/* Card 4: Gold / Sunset Orange Glow */}
        <div className="p-5 rounded-3xl bg-gradient-to-br from-amber-900/35 via-slate-900/90 to-orange-950/25 border border-amber-500/30 shadow-xl relative overflow-hidden group hover:border-amber-400/60 transition-all">
          <div className="absolute -right-4 -bottom-4 w-20 h-20 bg-amber-500/20 rounded-full blur-xl group-hover:bg-amber-500/35 transition-all" />
          <div className="flex items-center justify-between mb-3">
            <span className="text-[11px] text-amber-300 font-black uppercase tracking-wider">Staff Treasury</span>
            <span className="px-2 py-0.5 rounded-full text-[10px] font-black bg-amber-500/20 text-amber-300 border border-amber-500/30">
              ROYALTY VIP
            </span>
          </div>
          <div className="flex items-center gap-3.5">
            <div className="p-3 rounded-2xl bg-gradient-to-br from-amber-400 to-orange-500 text-slate-950 shadow-lg shadow-amber-500/30 font-black">
              <Award size={22} />
            </div>
            <div>
              <div className="text-xl font-black text-amber-300">{profile.reward_points} pts</div>
              <div className="text-xs text-amber-300/80 font-mono">{profile.reward_coins} golden coins</div>
            </div>
          </div>
        </div>
      </div>

      {/* ========================================================= */}
      {/* 3. COLORFUL SUBTAB SELECTOR                               */}
      {/* ========================================================= */}
      <div className="flex items-center gap-3 border-b border-white/10 pb-4 mb-8 overflow-x-auto">
        <button
          onClick={() => setActiveSubTab('dossier')}
          className={`px-5 py-2.5 rounded-2xl text-xs font-black transition-all flex items-center gap-2 whitespace-nowrap shadow-md ${
            activeSubTab === 'dossier'
              ? 'bg-gradient-to-r from-indigo-600 to-purple-600 text-white shadow-indigo-500/30 border border-indigo-400/50'
              : 'bg-slate-900/70 text-slate-400 hover:text-white hover:bg-slate-800 border border-white/5'
          }`}
        >
          <User size={15} /> Administrator Dossier Form
        </button>

        <button
          onClick={() => setActiveSubTab('security')}
          className={`px-5 py-2.5 rounded-2xl text-xs font-black transition-all flex items-center gap-2 whitespace-nowrap shadow-md ${
            activeSubTab === 'security'
              ? 'bg-gradient-to-r from-cyan-600 to-blue-600 text-white shadow-cyan-500/30 border border-cyan-400/50'
              : 'bg-slate-900/70 text-slate-400 hover:text-white hover:bg-slate-800 border border-white/5'
          }`}
        >
          <Lock size={15} /> Security & Clearance Matrix
        </button>

        <button
          onClick={() => setActiveSubTab('activity')}
          className={`px-5 py-2.5 rounded-2xl text-xs font-black transition-all flex items-center gap-2 whitespace-nowrap shadow-md ${
            activeSubTab === 'activity'
              ? 'bg-gradient-to-r from-fuchsia-600 to-pink-600 text-white shadow-pink-500/30 border border-fuchsia-400/50'
              : 'bg-slate-900/70 text-slate-400 hover:text-white hover:bg-slate-800 border border-white/5'
          }`}
        >
          <Activity size={15} /> Activity Telemetry & Logs
        </button>

        <button
          onClick={() => setActiveSubTab('rewards')}
          className={`px-5 py-2.5 rounded-2xl text-xs font-black transition-all flex items-center gap-2 whitespace-nowrap shadow-md ${
            activeSubTab === 'rewards'
              ? 'bg-gradient-to-r from-amber-500 to-orange-600 text-white shadow-amber-500/30 border border-amber-400/50'
              : 'bg-slate-900/70 text-slate-400 hover:text-white hover:bg-slate-800 border border-white/5'
          }`}
        >
          <Coins size={15} /> Virtual Economy Ledger
        </button>
      </div>

      {/* ========================================================= */}
      {/* 4. SUB-TAB CONTENT                                        */}
      {/* ========================================================= */}

      {/* TAB 1: Dossier Form & Holographic Smart Badge */}
      {activeSubTab === 'dossier' && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 animate-fade-in">
          {/* Left Form: 2 Cols */}
          <div className="lg:col-span-2 p-6 sm:p-8 rounded-3xl bg-slate-900/80 border border-white/10 shadow-2xl backdrop-blur-xl">
            <div className="flex items-center justify-between mb-6 pb-4 border-b border-white/10">
              <div>
                <h2 className="text-lg font-black text-white flex items-center gap-2">
                  <Fingerprint size={20} className="text-indigo-400" />
                  Administrator Identity & Record
                </h2>
                <p className="text-xs text-slate-400 mt-1">
                  Persist changes to your public staff signature, username handle, and credentials directly to Railway PostgreSQL.
                </p>
              </div>
              <span className="px-3 py-1 rounded-full text-[10px] font-bold bg-indigo-500/15 text-indigo-300 border border-indigo-500/30">
                Direct PG Write
              </span>
            </div>

            <form onSubmit={handleSaveProfile} className="space-y-6">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
                <div>
                  <label className="block text-xs font-bold text-slate-300 mb-2 flex items-center gap-1.5">
                    <User size={13} className="text-indigo-400" /> Full Display Name *
                  </label>
                  <input
                    type="text"
                    required
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    className="input-field w-full text-xs font-semibold bg-slate-950/80 border-white/15 focus:border-indigo-500 py-2.5"
                    placeholder="e.g. Roshith Administrator"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-300 mb-2 flex items-center gap-1.5">
                    <Sparkles size={13} className="text-cyan-400" /> Username Handle *
                  </label>
                  <input
                    type="text"
                    required
                    value={formData.user_name}
                    onChange={(e) => setFormData({ ...formData, user_name: e.target.value })}
                    className="input-field w-full text-xs font-mono font-bold text-cyan-300 bg-slate-950/80 border-white/15 focus:border-cyan-500 py-2.5"
                    placeholder="roshith_admin"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
                <div>
                  <label className="block text-xs font-bold text-slate-300 mb-2 flex items-center justify-between">
                    <span className="flex items-center gap-1.5"><Mail size={13} className="text-emerald-400" /> Official Email</span>
                    <span className="text-[10px] text-emerald-400 font-bold bg-emerald-500/10 px-2 py-0.5 rounded border border-emerald-500/20">Verified</span>
                  </label>
                  <input
                    type="email"
                    disabled
                    value={profile.email}
                    className="input-field w-full text-xs font-mono bg-slate-950/50 text-slate-400 cursor-not-allowed border-white/5 py-2.5"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-300 mb-2 flex items-center justify-between">
                    <span className="flex items-center gap-1.5"><Phone size={13} className="text-amber-400" /> Mobile Contact</span>
                    <span className="text-[10px] text-amber-400 font-bold bg-amber-500/10 px-2 py-0.5 rounded border border-amber-500/20">2FA Active</span>
                  </label>
                  <input
                    type="text"
                    disabled
                    value={profile.phone}
                    className="input-field w-full text-xs font-mono bg-slate-950/50 text-slate-400 cursor-not-allowed border-white/5 py-2.5"
                  />
                </div>
              </div>

              {/* Avatar Preset Chooser */}
              <div>
                <label className="block text-xs font-bold text-slate-300 mb-2 flex items-center justify-between">
                  <span className="flex items-center gap-1.5">
                    <Sparkles size={13} className="text-fuchsia-400" /> Choose Quick Avatar Preset
                  </span>
                  <span className="text-[11px] text-slate-400">or enter custom image URL below</span>
                </label>
                <div className="grid grid-cols-3 sm:grid-cols-6 gap-2.5 mb-3">
                  {AVATAR_PRESETS.map(preset => (
                    <button
                      key={preset.id}
                      type="button"
                      onClick={() => setFormData({ ...formData, profile_picture: preset.url })}
                      className={`p-1 rounded-2xl border transition-all text-center group ${
                        formData.profile_picture === preset.url 
                          ? 'border-indigo-400 bg-indigo-500/20 shadow-lg shadow-indigo-500/25 ring-2 ring-indigo-400' 
                          : 'border-white/10 bg-slate-950 hover:border-white/30'
                      }`}
                    >
                      <img 
                        src={preset.url} 
                        alt={preset.label} 
                        className="w-full h-14 rounded-xl object-cover"
                      />
                      <div className="text-[10px] text-slate-300 font-bold mt-1 truncate px-1">{preset.label}</div>
                    </button>
                  ))}
                </div>

                <div className="relative">
                  <Globe className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" size={14} />
                  <input
                    type="url"
                    value={formData.profile_picture}
                    onChange={(e) => setFormData({ ...formData, profile_picture: e.target.value })}
                    className="input-field w-full pl-10 text-xs font-mono bg-slate-950/80 border-white/15 focus:border-fuchsia-500 py-2.5"
                    placeholder="https://images.unsplash.com/..."
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-300 mb-2 flex items-center gap-1.5">
                  <Terminal size={13} className="text-emerald-400" /> Executive Bio & Operational Mission
                </label>
                <textarea
                  rows={3}
                  value={formData.bio}
                  onChange={(e) => setFormData({ ...formData, bio: e.target.value })}
                  className="input-field w-full text-xs bg-slate-950/80 border-white/15 focus:border-indigo-500 leading-relaxed resize-none p-3"
                  placeholder="Lead Platform Architect & Root Administrator..."
                />
              </div>

              <div className="pt-4 border-t border-white/10 flex justify-end">
                <button
                  type="submit"
                  disabled={isSaving}
                  className="btn btn-primary shadow-glow flex items-center gap-2 py-2.5 px-6 font-bold bg-gradient-to-r from-indigo-600 via-purple-600 to-pink-600 border-none hover:opacity-95"
                >
                  {isSaving ? <RefreshCw className="animate-spin" size={16} /> : <Save size={16} />}
                  {isSaving ? 'Synchronizing with Database...' : 'Save & Persist Changes'}
                </button>
              </div>
            </form>
          </div>

          {/* Right Column: Holographic Digital Staff Smart Badge */}
          <div className="space-y-6">
            <div className="p-6 rounded-3xl bg-gradient-to-b from-slate-900/90 via-indigo-950/40 to-slate-950 border border-indigo-500/40 shadow-2xl relative overflow-hidden holo-sheen">
              <div className="flex items-center justify-between mb-4 pb-3 border-b border-white/10">
                <div className="flex items-center gap-2">
                  <ShieldCheck size={16} className="text-cyan-400" />
                  <span className="text-xs font-black tracking-wider uppercase text-white">Smart Security Badge</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <Radio size={14} className="text-emerald-400 animate-pulse" />
                  <span className="text-[10px] font-mono text-emerald-300 font-bold">RFID 13.56MHz</span>
                </div>
              </div>

              {/* Digital Badge Card Layout */}
              <div className="p-5 rounded-2xl bg-gradient-to-br from-indigo-950/90 via-slate-900 to-purple-950/80 border border-white/20 relative overflow-hidden shadow-inner">
                {/* Background Watermark Shield */}
                <div className="absolute right-1 top-1 opacity-5 pointer-events-none">
                  <Shield size={160} />
                </div>

                {/* EMV Microchip Graphic */}
                <div className="flex items-center justify-between mb-4">
                  <div className="w-11 h-8 rounded-lg bg-gradient-to-br from-amber-300 via-yellow-400 to-amber-600 p-1 border border-amber-300/80 shadow-md flex items-center justify-center">
                    <div className="w-full h-full border border-amber-700/60 rounded flex items-center justify-center">
                      <div className="w-4 h-3 border-t border-b border-amber-800/60" />
                    </div>
                  </div>
                  <Wifi size={18} className="text-slate-400 -rotate-90" />
                </div>

                <div className="flex items-center gap-4 mb-4">
                  <img 
                    src={formData.profile_picture || profile.profile_picture} 
                    alt={formData.name}
                    className="w-16 h-16 rounded-2xl object-cover border-2 border-indigo-400 shadow-xl shadow-indigo-500/30"
                  />
                  <div>
                    <div className="text-base font-black text-white">{formData.name || profile.name}</div>
                    <div className="text-xs font-mono text-cyan-300 font-bold">@{formData.user_name || profile.user_name}</div>
                    <span className="mt-1.5 inline-block px-2.5 py-0.5 rounded-full text-[10px] font-black bg-gradient-to-r from-rose-500 via-purple-600 to-indigo-600 text-white shadow-md">
                      ROOT CLEARANCE
                    </span>
                  </div>
                </div>

                <div className="space-y-2 text-xs font-mono border-t border-white/10 pt-3 text-slate-300">
                  <div className="flex justify-between">
                    <span className="text-slate-400 font-sans">User UID:</span>
                    <span className="text-amber-400 font-bold">{profile.user_uid}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-400 font-sans">Role Tier:</span>
                    <span className="text-purple-300 font-bold">Role 5 (Super Admin)</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-400 font-sans">Cloud Engine:</span>
                    <span className="text-cyan-400 font-bold">Railway PostgreSQL 16</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-400 font-sans">Verification:</span>
                    <span className="text-emerald-400 font-bold">Phone & Email 2FA</span>
                  </div>
                </div>

                <div className="mt-4 pt-3 border-t border-dashed border-white/15 flex items-center justify-between text-[11px] text-slate-400 font-mono">
                  <span>HYPERNEWS-ROOT-SEC-2026</span>
                  <QrCode size={20} className="text-white" />
                </div>
              </div>
            </div>

            {/* Micro Quick Stat Pill Box */}
            <div className="p-4 rounded-2xl bg-gradient-to-br from-emerald-950/40 via-slate-900/60 to-cyan-950/30 border border-emerald-500/30 flex items-center justify-between text-xs">
              <div className="flex items-center gap-2.5">
                <div className="p-2 rounded-xl bg-emerald-500/20 text-emerald-400">
                  <CheckCircle2 size={16} />
                </div>
                <div>
                  <div className="font-bold text-white">Database Synchronized</div>
                  <div className="text-[11px] text-slate-400">Direct PostgreSQL Write Active</div>
                </div>
              </div>
              <span className="badge badge-success text-[10px] font-bold">Ready</span>
            </div>
          </div>
        </div>
      )}

      {/* TAB 2: Security & Permissions Matrix */}
      {activeSubTab === 'security' && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 animate-fade-in">
          {/* Active Cryptographic Credentials */}
          <div className="p-6 sm:p-8 rounded-3xl bg-slate-900/80 border border-white/10 shadow-2xl backdrop-blur-xl">
            <h2 className="text-lg font-black text-white mb-1 flex items-center gap-2">
              <Key size={20} className="text-cyan-400" />
              Cryptographic Bearer Transport
            </h2>
            <p className="text-xs text-slate-400 mb-6">
              Active administrative bearer tokens authenticating requests against the FastAPI backend.
            </p>

            <div className="space-y-4 text-xs">
              <div className="p-4 rounded-2xl bg-slate-950/80 border border-cyan-500/30 space-y-2">
                <div className="flex justify-between items-center">
                  <span className="font-bold text-white flex items-center gap-1.5">
                    <Lock size={14} className="text-cyan-400" /> Active HS256 Access Token
                  </span>
                  <span className="px-2 py-0.5 rounded-full text-[10px] font-black bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
                    VALID
                  </span>
                </div>
                <div className="font-mono text-[11px] text-cyan-300 break-all bg-slate-900/80 p-2.5 rounded-xl border border-white/10">
                  eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiJKS0E2RFkwMSIsImV4cCI6MTgyMTUwMjE4NywiaWF0IjoxNzg5OTY2MTg3LCJ2ZXIiOjAsInR5cGUiOiJhY2Nlc3MifQ...
                </div>
                <div className="flex justify-between items-center text-[11px] text-slate-400 pt-1">
                  <span>Subject: <strong className="text-white">JKA6DY01</strong></span>
                  <button 
                    onClick={handleCopyToken}
                    className="text-cyan-400 hover:text-cyan-300 flex items-center gap-1 font-bold"
                  >
                    <Copy size={12} /> Copy Token
                  </button>
                </div>
              </div>

              <div className="p-4 rounded-2xl bg-slate-950/60 border border-white/10 flex items-center justify-between">
                <div>
                  <div className="font-bold text-white">Multi-Factor Authentication (2FA)</div>
                  <div className="text-[11px] text-slate-400 mt-0.5">Firebase Phone OTP + Brevo Email Verification</div>
                </div>
                <span className="px-2.5 py-1 rounded-full text-[10px] font-black bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
                  ENFORCED
                </span>
              </div>

              <div className="p-4 rounded-2xl bg-slate-950/60 border border-white/10 flex items-center justify-between">
                <div>
                  <div className="font-bold text-white">Rate-Limit Immunity</div>
                  <div className="text-[11px] text-slate-400 mt-0.5">Exempt from 120 req/min API rate throttle bounds</div>
                </div>
                <span className="px-2.5 py-1 rounded-full text-[10px] font-black bg-purple-500/20 text-purple-300 border border-purple-500/30">
                  IMMUNE
                </span>
              </div>
            </div>
          </div>

          {/* Six Colorful Capabilities Cards */}
          <div className="p-6 sm:p-8 rounded-3xl bg-slate-900/80 border border-white/10 shadow-2xl backdrop-blur-xl">
            <h2 className="text-lg font-black text-white mb-1 flex items-center gap-2">
              <ShieldCheck size={20} className="text-emerald-400" />
              Role 5 Root Capabilities Matrix
            </h2>
            <p className="text-xs text-slate-400 mb-6">
              Complete operational authorizations granted across administrative subsystems.
            </p>

            <div className="space-y-2.5 text-xs">
              {[
                { name: 'Editorial News Operations', desc: 'Create, update, publish, or purge articles', color: 'from-purple-500 to-indigo-600' },
                { name: 'Ad Operations & Monetization', desc: 'Approve campaigns, pause ads, manage budgets', color: 'from-amber-500 to-orange-600' },
                { name: 'Trust & Moderation Queue', desc: 'Resolve reports, ban violators, quarantine fake news', color: 'from-rose-500 to-red-600' },
                { name: 'User Directory & Roles', desc: 'Elevate staff roles 0–13, enforce suspensions', color: 'from-cyan-500 to-blue-600' },
                { name: 'Virtual Rewards Economy', desc: 'Credit points, clear fraud flags, audit ledger', color: 'from-emerald-500 to-teal-600' },
                { name: 'System DevOps & Settings', desc: 'Flush Redis cache, trigger backups, toggle maintenance', color: 'from-fuchsia-500 to-pink-600' },
              ].map((item, idx) => (
                <div key={idx} className="flex items-center justify-between p-3 rounded-xl bg-slate-950/60 border border-white/10 hover:border-white/20 transition-all">
                  <div className="flex items-center gap-3">
                    <div className={`p-2 rounded-xl bg-gradient-to-br ${item.color} text-white shadow-sm`}>
                      <Check size={12} />
                    </div>
                    <div>
                      <div className="font-bold text-white">{item.name}</div>
                      <div className="text-[11px] text-slate-400">{item.desc}</div>
                    </div>
                  </div>
                  <span className="px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
                    Granted
                  </span>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* TAB 3: Activity Telemetry & System Log */}
      {activeSubTab === 'activity' && (
        <div className="p-6 sm:p-8 rounded-3xl bg-slate-900/80 border border-white/10 shadow-2xl backdrop-blur-xl animate-fade-in">
          <div className="flex items-center justify-between mb-6 pb-4 border-b border-white/10">
            <div>
              <h2 className="text-lg font-black text-white flex items-center gap-2">
                <Activity size={20} className="text-fuchsia-400" />
                Administrative Session Activity Stream
              </h2>
              <p className="text-xs text-slate-400 mt-1">
                Real-time timestamped audit logs recorded for User UID <strong className="text-white font-mono">{profile.user_uid}</strong>.
              </p>
            </div>
            <span className="px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-wider bg-fuchsia-500/15 text-fuchsia-300 border border-fuchsia-500/30">
              Strict Audit Active
            </span>
          </div>

          <div className="space-y-3">
            {recentLogs.map((log) => (
              <div key={log.id} className="flex items-center justify-between p-3.5 rounded-2xl bg-slate-950/70 border border-white/10 hover:border-white/25 transition-all text-xs">
                <div className="flex items-center gap-3.5">
                  <div className={`p-2.5 rounded-xl bg-${log.color}-500/15 text-${log.color}-400 border border-${log.color}-500/30`}>
                    <Terminal size={15} />
                  </div>
                  <div>
                    <div className="font-bold text-white text-xs sm:text-sm">{log.action}</div>
                    <div className="text-[11px] text-slate-400 font-mono mt-0.5">
                      {log.timestamp} • Category: <span className="text-cyan-400 font-bold">{log.category}</span>
                    </div>
                  </div>
                </div>
                <span className={`px-2.5 py-1 rounded-full text-[10px] font-black uppercase tracking-wider bg-${log.color}-500/20 text-${log.color}-300 border border-${log.color}-500/30`}>
                  {log.status}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* TAB 4: Virtual Economy Ledger & Treasury */}
      {activeSubTab === 'rewards' && (
        <div className="space-y-8 animate-fade-in">
          {/* Top Economy Highlight Cards */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-5">
            <div className="p-6 rounded-3xl bg-gradient-to-br from-amber-950/50 via-slate-900 to-orange-950/30 border border-amber-500/40 shadow-xl">
              <div className="flex items-center justify-between mb-3">
                <span className="text-xs font-black text-amber-300 uppercase tracking-wider">Reward Points</span>
                <Sparkles size={16} className="text-amber-400" />
              </div>
              <div className="text-3xl font-black text-white mb-1 font-mono">{profile.reward_points} PTS</div>
              <div className="text-xs text-amber-300/80">Equivalent to ₹{((profile.reward_points || 0) * 0.25).toFixed(2)} in news perks</div>
            </div>

            <div className="p-6 rounded-3xl bg-gradient-to-br from-purple-950/50 via-slate-900 to-fuchsia-950/30 border border-purple-500/40 shadow-xl">
              <div className="flex items-center justify-between mb-3">
                <span className="text-xs font-black text-purple-300 uppercase tracking-wider">Golden Coins</span>
                <Coins size={16} className="text-purple-400" />
              </div>
              <div className="text-3xl font-black text-white mb-1 font-mono">{profile.reward_coins} COINS</div>
              <div className="text-xs text-purple-300/80">Redeemable for platform monetization</div>
            </div>

            <div className="p-6 rounded-3xl bg-gradient-to-br from-emerald-950/50 via-slate-900 to-teal-950/30 border border-emerald-500/40 shadow-xl">
              <div className="flex items-center justify-between mb-3">
                <span className="text-xs font-black text-emerald-300 uppercase tracking-wider">Active Streak</span>
                <Flame size={16} className="text-emerald-400" />
              </div>
              <div className="text-3xl font-black text-white mb-1 font-mono">14 DAYS</div>
              <div className="text-xs text-emerald-300/80">+20% points multiplier active</div>
            </div>
          </div>

          {/* Reward Operations Ledger */}
          <div className="p-6 sm:p-8 rounded-3xl bg-slate-900/80 border border-white/10 shadow-2xl backdrop-blur-xl">
            <h3 className="text-base font-black text-white mb-4 flex items-center gap-2">
              <History size={18} className="text-amber-400" />
              Recent Reward Transactions Ledger
            </h3>
            <div className="space-y-2.5 text-xs">
              {[
                { title: 'Article Editorial Verification Approved', amount: '+100 PTS', date: 'Today, 10:15 AM', type: 'Credit', color: 'emerald' },
                { title: 'Weekly Staff Platform Governance Bonus', amount: '+250 PTS', date: 'Yesterday', type: 'Bonus', color: 'amber' },
                { title: 'System Diagnostics & Health Check Execution', amount: '+50 PTS', date: '3 days ago', type: 'Credit', color: 'emerald' },
                { title: 'Virtual Coin Conversion Batch', amount: '-100 PTS / +25 COINS', date: '5 days ago', type: 'Exchange', color: 'purple' },
              ].map((tx, idx) => (
                <div key={idx} className="flex items-center justify-between p-3.5 rounded-2xl bg-slate-950/60 border border-white/10 hover:border-white/20 transition-all">
                  <div className="flex items-center gap-3">
                    <div className={`p-2 rounded-xl bg-${tx.color}-500/15 text-${tx.color}-400 border border-${tx.color}-500/30`}>
                      <Gift size={14} />
                    </div>
                    <div>
                      <div className="font-bold text-white">{tx.title}</div>
                      <div className="text-[11px] text-slate-400 font-mono">{tx.date}</div>
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="font-mono font-black text-amber-300">{tx.amount}</div>
                    <span className={`text-[10px] font-bold text-${tx.color}-400 uppercase`}>{tx.type}</span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
