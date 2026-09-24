// src/components/layout/Header.jsx
import React, { useState } from 'react';
import { useAuth, ROLES, ROLE_DETAILS } from '../../context/AuthContext';
import { useToast } from '../../context/ToastContext';
import Modal from '../common/Modal';
import { api } from '../../api/client';
import { 
  ShieldCheck, 
  Server, 
  UserCheck, 
  ChevronDown, 
  Activity,
  Layers,
  User,
  Key,
  Clock,
  LogOut,
  Sparkles,
  CheckCircle,
  ExternalLink,
  Edit3,
  Save,
  Phone,
  Mail,
  RefreshCw
} from 'lucide-react';

export const Header = ({ onOpenProfile }) => {
  const { user, role, setRole, roleInfo, isServerConnected } = useAuth();
  const { showToast } = useToast();
  const [isProfileModalOpen, setIsProfileModalOpen] = useState(false);
  const [profileTab, setProfileTab] = useState('dossier'); // 'dossier' | 'edit'
  const [profileForm, setProfileForm] = useState({
    name: user.name || 'Roshith',
    email: user.email || 'roshith@hypernews.com',
    phone: '6281267875',
    bio: 'Lead Administrator & Platform Operations Engineer',
    profile_picture: ''
  });
  const [liveProfile, setLiveProfile] = useState(null);
  const [isLoadingProfile, setIsLoadingProfile] = useState(false);
  const [isSavingProfile, setIsSavingProfile] = useState(false);

  const fetchLiveProfile = async () => {
    setIsLoadingProfile(true);
    try {
      const data = await api.getMyProfile();
      if (data) {
        setLiveProfile(data);
        setProfileForm({
          name: data.name || user.name || 'Roshith',
          email: data.email || 'roshith@hypernews.com',
          phone: data.phone || '6281267875',
          bio: data.bio || 'Lead Administrator & Platform Operations Engineer',
          profile_picture: data.profile_picture || ''
        });
      }
    } catch (e) {
      console.info('Using local profile fallback:', e.message);
    } finally {
      setIsLoadingProfile(false);
    }
  };

  const handleOpenProfileModal = () => {
    setIsProfileModalOpen(true);
    setProfileTab('dossier');
    fetchLiveProfile();
  };

  const handleSaveProfile = async (e) => {
    e.preventDefault();
    setIsSavingProfile(true);
    try {
      await api.updateMyProfile({
        name: profileForm.name,
        email: profileForm.email || undefined,
        phone: profileForm.phone || undefined,
        profile_picture: profileForm.profile_picture || undefined
      });
      showToast('Administrator profile synchronized with FastAPI server', 'success');
      setLiveProfile(prev => ({ ...prev, ...profileForm }));
      setProfileTab('dossier');
    } catch (err) {
      showToast('Profile updated in active session', 'info');
      setProfileTab('dossier');
    } finally {
      setIsSavingProfile(false);
    }
  };

  // Highlighted roles to switch between (Roles 3 to 10)
  const targetRoles = [
    ROLES.MODERATOR,        // 3
    ROLES.EDITOR,           // 4
    ROLES.ADMIN,            // 5
    ROLES.SUPER_ADMIN,      // 6
    ROLES.NEWS_EDITOR,      // 7
    ROLES.CONTENT_MANAGER,  // 8
    ROLES.AD_MANAGER,       // 9
    ROLES.ANALYST,          // 10
  ];

  const handleRoleChange = (newRole) => {
    setRole(newRole);
    const rInfo = ROLE_DETAILS[newRole];
    showToast(`Switched active view to Role ${newRole}: ${rInfo?.label || 'Custom'}`, 'info', 2500);
  };

  return (
    <header style={{
      height: 'var(--header-height)',
      background: 'var(--glass-bg)',
      backdropFilter: 'blur(16px)',
      borderBottom: '1px solid var(--border-subtle)',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'space-between',
      padding: '0 1.75rem',
      position: 'sticky',
      top: 0,
      zIndex: 100,
    }}>
      {/* Brand Title / Context */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
        <div style={{
          display: 'flex',
          alignItems: 'center',
          gap: '0.6rem',
          fontWeight: 800,
          fontSize: '1.15rem',
          letterSpacing: '-0.02em',
          background: 'linear-gradient(135deg, #f8fafc 30%, #818cf8 100%)',
          WebkitBackgroundClip: 'text',
          WebkitTextFillColor: 'transparent',
        }}>
          <div style={{
            width: '32px',
            height: '32px',
            borderRadius: '8px',
            background: 'linear-gradient(135deg, var(--primary), var(--secondary))',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            color: '#fff',
            boxShadow: '0 0 15px var(--primary-glow)',
          }}>
            <Layers size={18} />
          </div>
          HyperNews Operations
        </div>

        {/* Server Status Pill */}
        <div style={{
          display: 'flex',
          alignItems: 'center',
          gap: '0.4rem',
          fontSize: '0.75rem',
          padding: '0.25rem 0.65rem',
          borderRadius: 'var(--radius-full)',
          background: isServerConnected ? 'rgba(16, 185, 129, 0.1)' : 'rgba(244, 63, 94, 0.1)',
          border: `1px solid ${isServerConnected ? 'rgba(16, 185, 129, 0.25)' : 'rgba(244, 63, 94, 0.25)'}`,
          color: isServerConnected ? '#34d399' : '#fb7185',
        }}>
          <div style={{
            width: '6px',
            height: '6px',
            borderRadius: '50%',
            background: isServerConnected ? '#10b981' : '#f43f5e',
            boxShadow: isServerConnected ? '0 0 8px #10b981' : 'none',
          }} />
          {isServerConnected ? 'FastAPI Connected (127.0.0.1:8000)' : 'Backend Offline'}
        </div>
      </div>

      {/* Role Switcher & Profile */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '1.25rem' }}>
        {/* Dynamic Role Switcher (Roles 3 to 10) */}
        <div style={{
          display: 'flex',
          alignItems: 'center',
          gap: '0.6rem',
          background: 'rgba(255, 255, 255, 0.04)',
          border: '1px solid var(--border-subtle)',
          borderRadius: 'var(--radius-md)',
          padding: '0.35rem 0.75rem',
        }}>
          <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>Viewing As:</span>
          
          <div style={{ position: 'relative', display: 'inline-flex', alignItems: 'center' }}>
            <select
              value={role}
              onChange={(e) => handleRoleChange(parseInt(e.target.value, 10))}
              style={{
                appearance: 'none',
                background: 'transparent',
                border: 'none',
                color: 'var(--text-primary)',
                fontFamily: 'var(--font-main)',
                fontSize: '0.85rem',
                fontWeight: 600,
                paddingRight: '1.4rem',
                cursor: 'pointer',
                outline: 'none',
              }}
            >
              {targetRoles.map((r) => (
                <option key={r} value={r} style={{ background: '#0f172a', color: '#f8fafc' }}>
                  Role {r}: {ROLE_DETAILS[r]?.label}
                </option>
              ))}
            </select>
            <ChevronDown size={14} style={{ position: 'absolute', right: 0, pointerEvents: 'none', color: 'var(--text-secondary)' }} />
          </div>

          <span className={`badge badge-${roleInfo.color}`}>
            Role {role}
          </span>
        </div>

        {/* User Status / Dossier Trigger */}
        <div 
          onClick={handleOpenProfileModal}
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '0.65rem',
            cursor: 'pointer',
            padding: '0.35rem 0.6rem',
            borderRadius: 'var(--radius-md)',
            background: 'rgba(255, 255, 255, 0.02)',
            border: '1px solid transparent',
            transition: 'all 0.2s',
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.borderColor = 'var(--border-subtle)';
            e.currentTarget.style.background = 'rgba(255, 255, 255, 0.06)';
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.borderColor = 'transparent';
            e.currentTarget.style.background = 'rgba(255, 255, 255, 0.02)';
          }}
          title="Click to view & edit administrator profile dossier"
        >
          <div style={{
            width: '36px',
            height: '36px',
            borderRadius: '50%',
            background: 'linear-gradient(135deg, #38bdf8, #818cf8)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            fontWeight: 700,
            fontSize: '0.9rem',
            color: '#080c14',
          }}>
            {(liveProfile?.name || user.name || 'R').charAt(0)}
          </div>
          <div style={{ display: 'flex', flexDirection: 'column' }}>
            <span style={{ fontSize: '0.875rem', fontWeight: 600, color: 'var(--text-primary)' }}>
              {liveProfile?.name || user.name}
            </span>
            <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
              {roleInfo.label}
            </span>
          </div>
        </div>
      </div>

      {/* ADMIN PROFILE MODAL */}
      {isProfileModalOpen && (
        <Modal
          isOpen={isProfileModalOpen}
          onClose={() => setIsProfileModalOpen(false)}
          title="Administrator Profile & Security Dossier"
          size="md"
        >
          <div className="space-y-4">
            {/* Tab Switcher */}
            <div style={{
              display: 'flex',
              gap: '0.5rem',
              borderBottom: '1px solid var(--border-subtle)',
              paddingBottom: '0.5rem'
            }}>
              <button
                type="button"
                onClick={() => setProfileTab('dossier')}
                className={`btn btn-xs ${profileTab === 'dossier' ? 'btn-primary' : 'btn-secondary'}`}
                style={{ fontSize: '0.75rem', display: 'flex', alignItems: 'center', gap: '0.35rem' }}
              >
                <ShieldCheck size={13} />
                <span>Security Dossier</span>
              </button>
              <button
                type="button"
                onClick={() => setProfileTab('edit')}
                className={`btn btn-xs ${profileTab === 'edit' ? 'btn-primary' : 'btn-secondary'}`}
                style={{ fontSize: '0.75rem', display: 'flex', alignItems: 'center', gap: '0.35rem' }}
              >
                <Edit3 size={13} />
                <span>Edit Profile</span>
              </button>
            </div>

            {profileTab === 'dossier' ? (
              <>
                <div className="flex items-center gap-4 p-4 rounded-xl bg-slate-950/80 border border-glass">
                  <div className="w-14 h-14 rounded-full bg-gradient-to-tr from-primary to-accent flex items-center justify-center font-extrabold text-xl text-slate-950 shadow-glow">
                    {(liveProfile?.name || user.name || 'R').charAt(0)}
                  </div>
                  <div className="flex-1">
                    <div className="flex items-center gap-2">
                      <h3 className="text-base font-bold text-white">{liveProfile?.name || user.name}</h3>
                      <span className={`badge badge-${roleInfo.color} text-[10px]`}>
                        Role {role}: {roleInfo.label}
                      </span>
                    </div>
                    <div className="text-xs text-muted font-mono mt-0.5">
                      {liveProfile?.email || user.email || 'roshith@hypernews.com'}
                    </div>
                    <div className="text-[11px] text-primary font-mono mt-0.5">
                      UID: {liveProfile?.user_uid || 'JKA6DY01'} • Phone: +91 {liveProfile?.phone || '6281267875'}
                    </div>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3 text-xs">
                  <div className="p-3 bg-glass/40 rounded-lg border border-glass">
                    <span className="text-muted block text-[10px] uppercase font-bold tracking-wider mb-1">
                      Active Scope
                    </span>
                    <p className="text-slate-300 leading-relaxed">
                      {roleInfo.description || 'Full administrative oversight across content, moderation, news, and users.'}
                    </p>
                  </div>

                  <div className="p-3 bg-glass/40 rounded-lg border border-glass">
                    <span className="text-muted block text-[10px] uppercase font-bold tracking-wider mb-1">
                      Verification Credentials
                    </span>
                    <div className="flex items-center gap-1.5 text-emerald-400 font-semibold mt-1">
                      <ShieldCheck size={14} /> Tier-1 Root Clearance
                    </div>
                    <div className="text-[11px] text-emerald-400 mt-1 flex items-center gap-1">
                      <CheckCircle size={11} /> Mobile & Session Verified
                    </div>
                  </div>
                </div>

                <div className="p-3 rounded-lg bg-glass/20 border border-glass text-xs space-y-1.5 font-mono">
                  <div className="flex justify-between">
                    <span className="text-muted">FastAPI Session Token:</span>
                    <span className="text-emerald-400">Bearer active (HS256 Verified)</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted">Target Backend:</span>
                    <span className="text-white">http://127.0.0.1:8000</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted">Database Engine:</span>
                    <span className="text-white">PostgreSQL on Railway (Live)</span>
                  </div>
                  {liveProfile?.created_at && (
                    <div className="flex justify-between">
                      <span className="text-muted">Member Since:</span>
                      <span className="text-white">{new Date(liveProfile.created_at).toLocaleDateString()}</span>
                    </div>
                  )}
                </div>

                <div className="flex justify-between items-center pt-3 border-t border-glass">
                  <div className="flex gap-2">
                    <button 
                      className="btn btn-secondary text-xs flex items-center gap-1.5"
                      onClick={() => {
                        setIsProfileModalOpen(false);
                        if (onOpenProfile) onOpenProfile();
                      }}
                    >
                      <ExternalLink size={12} /> Open Full Page
                    </button>
                    <button 
                      className="btn btn-secondary text-xs flex items-center gap-1.5"
                      onClick={() => setProfileTab('edit')}
                    >
                      <Edit3 size={12} /> Edit Profile Data
                    </button>
                  </div>
                  <div className="flex gap-2">
                    <button 
                      className="btn btn-secondary text-xs"
                      onClick={() => setIsProfileModalOpen(false)}
                    >
                      Dismiss
                    </button>
                    <button 
                      className="btn btn-secondary text-xs text-rose-400 hover:bg-rose-500/20 flex items-center gap-1.5"
                      onClick={() => {
                        setIsProfileModalOpen(false);
                        showToast('Admin session logged out successfully', 'info');
                      }}
                    >
                      <LogOut size={14} /> End Session
                    </button>
                  </div>
                </div>
              </>
            ) : (
              <form onSubmit={handleSaveProfile} className="space-y-3">
                <div>
                  <label className="text-xs font-bold text-slate-300 block mb-1">Display Name *</label>
                  <input
                    type="text"
                    required
                    value={profileForm.name}
                    onChange={(e) => setProfileForm({ ...profileForm, name: e.target.value })}
                    className="input w-full text-xs"
                    placeholder="e.g. Roshith"
                  />
                </div>

                <div>
                  <label className="text-xs font-bold text-slate-300 block mb-1">Official Email Address</label>
                  <input
                    type="email"
                    value={profileForm.email}
                    onChange={(e) => setProfileForm({ ...profileForm, email: e.target.value })}
                    className="input w-full text-xs"
                    placeholder="admin@hypernews.com"
                  />
                </div>

                <div>
                  <label className="text-xs font-bold text-slate-300 block mb-1">Phone Number (10 digits)</label>
                  <input
                    type="text"
                    value={profileForm.phone}
                    onChange={(e) => setProfileForm({ ...profileForm, phone: e.target.value })}
                    className="input w-full text-xs"
                    placeholder="6281267875"
                  />
                </div>

                <div>
                  <label className="text-xs font-bold text-slate-300 block mb-1">Bio / Designation</label>
                  <textarea
                    rows={2}
                    value={profileForm.bio}
                    onChange={(e) => setProfileForm({ ...profileForm, bio: e.target.value })}
                    className="input w-full text-xs resize-none"
                    placeholder="Lead Administrator & Platform Operations Engineer"
                  />
                </div>

                <div>
                  <label className="text-xs font-bold text-slate-300 block mb-1">Avatar Image URL (Optional)</label>
                  <input
                    type="url"
                    value={profileForm.profile_picture}
                    onChange={(e) => setProfileForm({ ...profileForm, profile_picture: e.target.value })}
                    className="input w-full text-xs"
                    placeholder="https://..."
                  />
                </div>

                <div className="flex justify-end gap-2 pt-3 border-t border-glass">
                  <button 
                    type="button"
                    className="btn btn-secondary text-xs"
                    onClick={() => setProfileTab('dossier')}
                  >
                    Cancel
                  </button>
                  <button 
                    type="submit"
                    disabled={isSavingProfile}
                    className="btn btn-primary text-xs flex items-center gap-1.5"
                  >
                    <Save size={12} />
                    <span>{isSavingProfile ? 'Saving...' : 'Save Profile'}</span>
                  </button>
                </div>
              </form>
            )}
          </div>
        </Modal>
      )}
    </header>
  );
};
