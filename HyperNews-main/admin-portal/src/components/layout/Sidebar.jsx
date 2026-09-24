// src/components/layout/Sidebar.jsx
import React from 'react';
import { useAuth } from '../../context/AuthContext';
import { 
  LayoutDashboard, 
  Newspaper, 
  ShieldAlert, 
  Megaphone, 
  Users, 
  LineChart, 
  Settings,
  HelpCircle,
  Vote,
  Award,
  Sparkles,
  Layers,
  Video,
  MessageSquare,
  MapPin,
  CalendarDays,
  UserCheck,
  Shield
} from 'lucide-react';

export const Sidebar = ({ activeTab, setActiveTab }) => {
  const { canAccess, role, roleInfo } = useAuth();

  const navItems = [
    { id: 'dashboard', label: 'Dashboard Overview', icon: LayoutDashboard },
    { id: 'news', label: 'Editorial News Operations', icon: Newspaper },
    { id: 'posts', label: 'Community Posts & Hub', icon: MessageSquare },
    { 
      id: 'ads', 
      label: 'Ad Operations & Monetization', 
      icon: Megaphone, 
      badge: '3 Active',
      badgeClass: 'bg-emerald-500/15 border border-emerald-500/30 text-emerald-400 font-bold'
    },
    { 
      id: 'moderation', 
      label: 'Trust & Moderation Queue', 
      icon: ShieldAlert, 
      badge: '6 Pages Review',
      badgeClass: 'bg-amber-500/15 border border-amber-500/30 text-amber-400 font-bold animate-pulse'
    },
    { id: 'insights', label: 'Inshorts Stories', icon: Layers, badge: 'Visual' },
    { id: 'shorts', label: 'Video Shorts', icon: Video, badge: '9:16' },
    { id: 'polls', label: 'Polls & Surveys', icon: Vote, badge: 'Active' },
    { id: 'rewards', label: 'Rewards & Economy', icon: Award, badge: 'Coins' },
    { id: 'sponsored', label: 'Sponsored Posts', icon: Sparkles, badge: 'Native' },
    { id: 'users', label: 'User Directory & Access', icon: Users },
    { id: 'analytics', label: 'Analytics & Insights', icon: LineChart },
    { id: 'location', label: 'Language, Geo & Categories', icon: MapPin, badge: 'Geo' },
    { id: 'events', label: 'Hyperlocal Events', icon: CalendarDays, badge: 'Regional' },
    { id: 'settings', label: 'System Settings', icon: Settings },
    { id: 'profile', label: 'Administrator Profile', icon: UserCheck, badge: 'Root' },
  ];

  const visibleItems = navItems.filter((item) => canAccess(item.id));

  return (
    <aside style={{
      width: 'var(--sidebar-width)',
      minWidth: 'var(--sidebar-width)',
      height: '100%',
      maxHeight: '100%',
      background: 'var(--bg-surface)',
      borderRight: '1px solid var(--border-subtle)',
      display: 'flex',
      flexDirection: 'column',
      userSelect: 'none',
      overflow: 'hidden',
      position: 'relative',
      zIndex: 20
    }}>
      {/* Role Brief Banner (Fixed at top of sidebar) */}
      <div style={{
        padding: '1rem 0.85rem 0.65rem 0.85rem',
        flexShrink: 0,
      }}>
        <div style={{
          padding: '0.85rem',
          borderRadius: 'var(--radius-md)',
          background: 'linear-gradient(135deg, rgba(255, 255, 255, 0.03) 0%, rgba(99, 102, 241, 0.06) 100%)',
          border: '1px solid rgba(255, 255, 255, 0.08)',
          boxShadow: '0 4px 12px rgba(0, 0, 0, 0.2)',
        }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '0.35rem' }}>
            <span style={{ fontSize: '0.7rem', fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
              Operational Scope
            </span>
            <span className={`badge badge-${roleInfo.color || 'primary'} text-[10px]`}>
              Role {role}
            </span>
          </div>
          <div style={{ fontSize: '0.875rem', fontWeight: 700, color: '#ffffff', display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
            <Shield size={14} className="text-primary" />
            {roleInfo.label}
          </div>
          <p style={{ fontSize: '0.725rem', color: 'var(--text-secondary)', marginTop: '0.2rem', lineHeight: 1.3 }}>
            {roleInfo.desc}
          </p>
        </div>
      </div>

      {/* Scrollable Navigation Deck */}
      <div style={{
        flex: 1,
        overflowY: 'auto',
        overflowX: 'hidden',
        padding: '0.25rem 0.85rem 1.25rem 0.85rem',
        scrollbarWidth: 'thin',
        scrollbarColor: 'rgba(255, 255, 255, 0.15) transparent',
      }}>
        <nav style={{ display: 'flex', flexDirection: 'column', gap: '0.35rem' }}>
          {visibleItems.map((item) => {
            const Icon = item.icon;
            const isActive = activeTab === item.id;

            return (
              <button
                key={item.id}
                onClick={() => setActiveTab(item.id)}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  padding: '0.65rem 0.85rem',
                  borderRadius: 'var(--radius-md)',
                  background: isActive 
                    ? 'linear-gradient(90deg, rgba(99, 102, 241, 0.2) 0%, rgba(99, 102, 241, 0.05) 100%)' 
                    : 'transparent',
                  border: `1px solid ${isActive ? 'rgba(99, 102, 241, 0.4)' : 'transparent'}`,
                  color: isActive ? '#ffffff' : 'var(--text-secondary)',
                  cursor: 'pointer',
                  fontFamily: 'var(--font-main)',
                  fontSize: '0.825rem',
                  fontWeight: isActive ? 600 : 500,
                  transition: 'all 0.18s ease',
                  textAlign: 'left',
                  boxShadow: isActive ? '0 2px 8px rgba(99, 102, 241, 0.15)' : 'none',
                }}
                className="hover:bg-white/[0.04] hover:text-white"
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', overflow: 'hidden' }}>
                  <Icon 
                    size={17} 
                    color={isActive ? 'var(--primary)' : 'currentColor'} 
                    style={{ flexShrink: 0 }}
                  />
                  <span style={{ 
                    whiteSpace: 'nowrap', 
                    overflow: 'hidden', 
                    textOverflow: 'ellipsis',
                    fontWeight: isActive ? 700 : 500
                  }}>
                    {item.label}
                  </span>
                </div>

                {item.badge && (
                  <span 
                    className={item.badgeClass || ''}
                    style={!item.badgeClass ? {
                      fontSize: '0.65rem',
                      fontWeight: 700,
                      padding: '0.12rem 0.45rem',
                      borderRadius: 'var(--radius-full)',
                      background: item.badge === 'Root' 
                        ? 'rgba(16, 185, 129, 0.18)' 
                        : item.badge.includes('Flagged') || item.badge.includes('Review') 
                          ? 'rgba(244, 63, 94, 0.2)' 
                          : 'rgba(99, 102, 241, 0.15)',
                      color: item.badge === 'Root'
                        ? '#34d399'
                        : item.badge.includes('Flagged') || item.badge.includes('Review') 
                          ? '#fb7185' 
                          : '#818cf8',
                      border: item.badge === 'Root' ? '1px solid rgba(16, 185, 129, 0.3)' : 'none',
                      flexShrink: 0
                    } : {
                      fontSize: '0.65rem',
                      padding: '0.12rem 0.45rem',
                      borderRadius: '9999px',
                      whiteSpace: 'nowrap',
                      flexShrink: 0
                    }}
                  >
                    {item.badge}
                  </span>
                )}
              </button>
            );
          })}
        </nav>
      </div>

      {/* Sticky Bottom Footer */}
      <div style={{
        padding: '0.75rem 1rem',
        borderTop: '1px solid var(--border-subtle)',
        background: 'rgba(10, 15, 29, 0.95)',
        backdropFilter: 'blur(10px)',
        flexShrink: 0,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        fontSize: '0.725rem',
        color: 'var(--text-muted)',
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
          <span style={{ width: '6px', height: '6px', borderRadius: '50%', background: '#10b981', display: 'inline-block' }} />
          <span style={{ fontWeight: 600, color: 'var(--text-secondary)' }}>HyperNews v2.5</span>
        </div>
        <span style={{ display: 'inline-flex', alignItems: 'center', gap: '0.3rem', color: '#818cf8', fontWeight: 600 }}>
          <HelpCircle size={12} /> RBAC Live
        </span>
      </div>
    </aside>
  );
};
