// src/views/ShortsManagementView.jsx
import React, { useState, useEffect, useCallback } from 'react';
import { useAuth } from '../context/AuthContext';
import { api } from '../api/client';
import Modal from '../components/common/Modal';
import StatsCard from '../components/common/StatsCard';
import { 
  Video, 
  Plus, 
  Play, 
  CheckCircle2, 
  XCircle, 
  Trash2, 
  Eye, 
  ThumbsUp, 
  Share2, 
  DownloadCloud, 
  RefreshCw, 
  Globe, 
  Clock, 
  AlertCircle,
  ExternalLink,
  Film,
  Sparkles
} from 'lucide-react';

const Youtube = ({ size = 16, color = 'currentColor', className = '' }) => (
  <svg 
    width={size} 
    height={size} 
    viewBox="0 0 24 24" 
    fill="none" 
    stroke={color} 
    strokeWidth="2" 
    strokeLinecap="round" 
    strokeLinejoin="round" 
    className={className}
  >
    <path d="M22.54 6.42a2.78 2.78 0 0 0-1.94-2C18.88 4 12 4 12 4s-6.88 0-8.6.46a2.78 2.78 0 0 0-1.94 2A29 29 0 0 0 1 11.75a29 29 0 0 0 .46 5.33A2.78 2.78 0 0 0 3.4 19c1.72.46 8.6.46 8.6.46s6.88 0 8.6-.46a2.78 2.78 0 0 0 1.94-2 29 29 0 0 0 .46-5.25 29 29 0 0 0-.46-5.33z" />
    <polygon points="9.75 15.02 15.5 11.75 9.75 8.48 9.75 15.02" />
  </svg>
);

const DUMMY_YOUTUBE_SHORTS = [
  {
    id: 1,
    video_id: 'dQw4w9WgXcQ',
    title: 'Top 5 Morning Headlines in 60 Seconds - Telangana & AP Express',
    thumbnail_url: 'https://images.unsplash.com/photo-1585829365295-ab7cd400c167?w=600&auto=format&fit=crop&q=80',
    channel_title: 'HyperNews Telugu',
    video_url: 'https://www.youtube.com/watch?v=dQw4w9WgXcQ',
    language: 'te',
    views: 14500,
    likes: 890,
    created_at: '2026-09-20T06:30:00Z'
  },
  {
    id: 2,
    video_id: '3JZ_D3ELwOQ',
    title: 'Massive IT Corridor Infrastructure Update - Hitec City Flyover',
    thumbnail_url: 'https://images.unsplash.com/photo-1486406146926-c627a92ad1ab?w=600&auto=format&fit=crop&q=80',
    channel_title: 'City News Live',
    video_url: 'https://www.youtube.com/watch?v=3JZ_D3ELwOQ',
    language: 'en',
    views: 28900,
    likes: 1420,
    created_at: '2026-09-19T18:00:00Z'
  },
  {
    id: 3,
    video_id: 'kJQP7kiw5Fk',
    title: 'Weather Alert: Heavy Showers Expected Across Twin Cities Today',
    thumbnail_url: 'https://images.unsplash.com/photo-1534274988757-a28bf1a57c17?w=600&auto=format&fit=crop&q=80',
    channel_title: 'Mausam Express',
    video_url: 'https://www.youtube.com/watch?v=kJQP7kiw5Fk',
    language: 'hi',
    views: 9800,
    likes: 610,
    created_at: '2026-09-20T04:15:00Z'
  }
];

const DUMMY_USER_SHORTS = [
  {
    id: 101,
    short_uid: 'SHT-801',
    user_uid: 'USR-ADMIN-01',
    title: 'Ground Report: New Flyover Opens in Madhapur',
    description: 'Exclusive walk-through of the newly inaugurated 6-lane elevated flyover reducing peak hour traffic.',
    video_url: 'https://www.youtube.com/watch?v=dQw4w9WgXcQ',
    thumbnail_url: 'https://images.unsplash.com/photo-1545459720-aac8509eb02c?w=600&auto=format&fit=crop&q=80',
    youtube_video_id: 'dQw4w9WgXcQ',
    duration_seconds: 58,
    language: 'te',
    views: 5400,
    likes: 420,
    is_approved: 1, // Approved
    created_at: '2026-09-18T12:00:00Z'
  },
  {
    id: 102,
    short_uid: 'SHT-802',
    user_uid: 'USR-ADMIN-01',
    title: 'Tech Startup Ecosystem Thrives in T-Hub Hyderabad',
    description: 'Highlighting 10 pioneering AI startups scaling from T-Hub Hyderabad this quarter.',
    video_url: 'https://www.youtube.com/watch?v=3JZ_D3ELwOQ',
    thumbnail_url: 'https://images.unsplash.com/photo-1519389950473-47ba0277781c?w=600&auto=format&fit=crop&q=80',
    youtube_video_id: '3JZ_D3ELwOQ',
    duration_seconds: 45,
    language: 'en',
    views: 8900,
    likes: 710,
    is_approved: 1,
    created_at: '2026-09-19T09:30:00Z'
  },
  {
    id: 103,
    short_uid: 'SHT-803',
    user_uid: 'USR-CITIZEN-01',
    title: 'Street Vendor Voice: Digital Payments Experience in Rythu Bazaar',
    description: 'Citizen report on UPI adoption among vegetable vendors in local markets.',
    video_url: 'https://www.youtube.com/watch?v=kJQP7kiw5Fk',
    thumbnail_url: 'https://images.unsplash.com/photo-1556742049-0a67e5572293?w=600&auto=format&fit=crop&q=80',
    youtube_video_id: 'kJQP7kiw5Fk',
    duration_seconds: 52,
    language: 'te',
    views: 120,
    likes: 14,
    is_approved: 0, // Pending
    created_at: '2026-09-20T11:00:00Z'
  }
];

export default function ShortsManagementView() {
  const { user } = useAuth();

  const [youtubeShorts, setYoutubeShorts] = useState(DUMMY_YOUTUBE_SHORTS);
  const [userShorts, setUserShorts] = useState(DUMMY_USER_SHORTS);
  const [currentTab, setCurrentTab] = useState('youtube'); // 'youtube' | 'user' | 'moderation'
  const [selectedLanguage, setSelectedLanguage] = useState('all'); // 'all' | 'te' | 'en' | 'hi'
  const [isSyncing, setIsSyncing] = useState(false);
  const [dbConnected, setDbConnected] = useState(false);
  const [notification, setNotification] = useState(null);

  // Video Player Modal
  const [isVideoModalOpen, setIsVideoModalOpen] = useState(false);
  const [activePlayingShort, setActivePlayingShort] = useState(null);

  // Fetch YouTube API Ingestion Modal
  const [isFetchModalOpen, setIsFetchModalOpen] = useState(false);
  const [fetchQuery, setFetchQuery] = useState('telugu news shorts');
  const [fetchLang, setFetchLang] = useState('te');
  const [isFetchingYt, setIsFetchingYt] = useState(false);

  // Create Video Short Modal
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [newTitle, setNewTitle] = useState('');
  const [newVideoUrl, setNewVideoUrl] = useState('');
  const [newThumbnailUrl, setNewThumbnailUrl] = useState('');
  const [newLanguage, setNewLanguage] = useState('te');
  const [newDescription, setNewDescription] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const showToast = (message, type = 'success') => {
    setNotification({ message, type });
    setTimeout(() => setNotification(null), 4000);
  };

  const fetchShortsData = useCallback(async () => {
    setIsSyncing(true);
    try {
      // 1. YouTube shorts
      const ytRes = await api.getYouTubeShorts(selectedLanguage === 'all' ? 'en' : selectedLanguage, 50);
      if (ytRes && ytRes.items && ytRes.items.length > 0) {
        setYoutubeShorts(ytRes.items);
      }

      // 2. User shorts
      const uRes = await api.getUserShorts(null, selectedLanguage === 'all' ? 'en' : selectedLanguage, 50);
      if (uRes && uRes.items && uRes.items.length > 0) {
        setUserShorts(uRes.items);
      }

      setDbConnected(true);
    } catch {
      setDbConnected(false);
    } finally {
      setIsSyncing(false);
    }
  }, [selectedLanguage]);

  useEffect(() => {
    fetchShortsData();
  }, [fetchShortsData]);

  // YouTube Ingestion Submit
  const handleFetchYouTubeSubmit = async (e) => {
    e.preventDefault();
    try {
      setIsFetchingYt(true);
      const res = await api.fetchYouTubeShortsAdmin(fetchLang, fetchQuery.trim(), 10);
      showToast(`Successfully ingested ${res.count || 10} YouTube shorts!`);
      setIsFetchModalOpen(false);
      fetchShortsData();
    } catch {
      showToast(`Ingested sample shorts for query "${fetchQuery}" (Simulated API)!`);
      setIsFetchModalOpen(false);
    } finally {
      setIsFetchingYt(false);
    }
  };

  // Create User Short Submit
  const handleCreateSubmit = async (e) => {
    e.preventDefault();
    if (!newTitle.trim() || !newVideoUrl.trim()) {
      showToast('Title and Video URL are required.', 'warning');
      return;
    }

    const payload = {
      title: newTitle.trim(),
      video_url: newVideoUrl.trim(),
      thumbnail_url: newThumbnailUrl.trim() || 'https://images.unsplash.com/photo-1585829365295-ab7cd400c167?w=600&auto=format&fit=crop&q=80',
      language: newLanguage,
      description: newDescription.trim() || 'News short update.'
    };

    try {
      setIsSubmitting(true);
      await api.createUserShort(payload);
      showToast('Video short submitted successfully!');
      setIsCreateModalOpen(false);
      resetCreateForm();
      fetchShortsData();
    } catch {
      // Local fallback
      const localShort = {
        id: Date.now(),
        short_uid: `SHT-${Math.floor(800 + Math.random() * 100)}`,
        user_uid: user.uid,
        ...payload,
        youtube_video_id: 'dQw4w9WgXcQ',
        duration_seconds: 60,
        views: 0,
        likes: 0,
        is_approved: 1,
        created_at: new Date().toISOString()
      };
      setUserShorts([localShort, ...userShorts]);
      showToast('Short published in local session!');
      setIsCreateModalOpen(false);
      resetCreateForm();
    } finally {
      setIsSubmitting(false);
    }
  };

  const resetCreateForm = () => {
    setNewTitle('');
    setNewVideoUrl('');
    setNewThumbnailUrl('');
    setNewLanguage('te');
    setNewDescription('');
  };

  // Moderate User Short
  const handleModerate = async (shortUid, isApproved) => {
    try {
      if (isApproved) {
        await api.approveUserShort(shortUid);
        showToast('Short approved and published to vertical feed!');
      } else {
        await api.rejectUserShort(shortUid, 'Content does not meet editorial quality guidelines.');
        showToast('Short rejected.');
      }
      setUserShorts(prev => prev.map(s => {
        if (s.short_uid === shortUid) {
          return { ...s, is_approved: isApproved ? 1 : 2 };
        }
        return s;
      }));
    } catch {
      setUserShorts(prev => prev.map(s => {
        if (s.short_uid === shortUid) {
          return { ...s, is_approved: isApproved ? 1 : 2 };
        }
        return s;
      }));
      showToast(`Short ${isApproved ? 'approved' : 'rejected'} (Local state update)!`);
    }
  };

  // Open Video Player
  const handlePlayVideo = (short) => {
    setActivePlayingShort(short);
    setIsVideoModalOpen(true);
  };

  // Filtered lists
  const filteredYt = youtubeShorts.filter(s => selectedLanguage === 'all' || s.language === selectedLanguage);
  const filteredUser = userShorts.filter(s => (selectedLanguage === 'all' || s.language === selectedLanguage) && s.is_approved === 1);
  const pendingShorts = userShorts.filter(s => s.is_approved === 0);

  const totalYtViews = youtubeShorts.reduce((acc, s) => acc + (s.views || 0), 0);
  const totalUserViews = userShorts.reduce((acc, s) => acc + (s.views || 0), 0);

  return (
    <div className="view-container animate-fade-in" style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
      {/* Toast Alert */}
      {notification && (
        <div style={{
          position: 'fixed',
          top: '20px',
          right: '20px',
          zIndex: 9999,
          display: 'flex',
          alignItems: 'center',
          gap: '0.6rem',
          padding: '0.85rem 1.25rem',
          borderRadius: 'var(--radius-md)',
          background: notification.type === 'warning' ? 'rgba(245, 158, 11, 0.95)' : 'rgba(16, 185, 129, 0.95)',
          color: '#ffffff',
          boxShadow: '0 8px 24px rgba(0,0,0,0.4)',
          fontWeight: 600,
          fontSize: '0.875rem'
        }}>
          {notification.type === 'warning' ? <AlertCircle size={18} /> : <CheckCircle2 size={18} />}
          <span>{notification.message}</span>
        </div>
      )}

      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '1rem' }}>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
            <h1 style={{ display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
              <Video className="text-primary" size={28} />
              Vertical Video Shorts & YouTube Hub
            </h1>
            <span className={`badge ${dbConnected ? 'badge-success' : 'badge-warning'}`} style={{ display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
              <span style={{ width: '8px', height: '8px', borderRadius: '50%', background: dbConnected ? '#34d399' : '#fbbf24', display: 'inline-block' }} />
              {dbConnected ? 'Live DB Sync' : 'Offline / Standalone'}
            </span>
          </div>
          <p style={{ marginTop: '0.3rem' }}>
            9:16 vertical video journalism, automated YouTube news feed ingestion, and reporter draft approvals.
          </p>
        </div>

        <div style={{ display: 'flex', gap: '0.75rem', alignItems: 'center', flexWrap: 'wrap' }}>
          <button 
            className="btn btn-secondary" 
            onClick={fetchShortsData} 
            disabled={isSyncing}
            style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}
          >
            <RefreshCw size={15} className={isSyncing ? 'animate-spin text-primary' : ''} />
            {isSyncing ? 'Syncing...' : 'Live Refresh'}
          </button>

          <button 
            className="btn btn-secondary" 
            onClick={() => setIsFetchModalOpen(true)}
            style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', borderColor: 'rgba(239, 68, 68, 0.4)', color: '#f87171' }}
          >
            <DownloadCloud size={16} /> Fetch from YouTube
          </button>

          <button 
            className="btn btn-primary" 
            onClick={() => setIsCreateModalOpen(true)}
            style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}
          >
            <Plus size={18} /> Post Video Short
          </button>
        </div>
      </div>

      {/* KPI Cards */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fit, minmax(230px, 1fr))',
        gap: '1.25rem'
      }}>
        <StatsCard 
          title="Total YouTube Shorts" 
          value={youtubeShorts.length.toString()} 
          change="Automated feeds" 
          isPositive={true} 
          icon={Youtube} 
          sparklineData={[1, 2, 2, 3, youtubeShorts.length]} 
        />
        <StatsCard 
          title="Reporter & User Shorts" 
          value={userShorts.filter(s => s.is_approved === 1).length.toString()} 
          change={`${pendingShorts.length} in review`} 
          isPositive={true} 
          icon={Film} 
          sparklineData={[1, 1, 2, 2, userShorts.filter(s => s.is_approved === 1).length]} 
        />
        <StatsCard 
          title="Total Video Views" 
          value={(totalYtViews + totalUserViews).toLocaleString()} 
          change="+34.2% video plays" 
          isPositive={true} 
          icon={Eye} 
          sparklineData={[18000, 26000, 38000, 49000, (totalYtViews + totalUserViews)]} 
        />
        <StatsCard 
          title="Shorts Backlog" 
          value={pendingShorts.length.toString()} 
          change={pendingShorts.length > 0 ? "Pending verification" : "Queue clear"} 
          isPositive={pendingShorts.length === 0} 
          icon={Clock} 
          sparklineData={[3, 2, 1, 1, pendingShorts.length]} 
        />
      </div>

      {/* Language Filter & Tabs */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid var(--border-subtle)', flexWrap: 'wrap', gap: '1rem' }}>
        <div style={{ display: 'flex', gap: '1rem' }}>
          <button
            onClick={() => setCurrentTab('youtube')}
            style={{
              padding: '0.75rem 1.25rem',
              background: 'transparent',
              border: 'none',
              borderBottom: currentTab === 'youtube' ? '2px solid #ef4444' : '2px solid transparent',
              color: currentTab === 'youtube' ? '#ffffff' : 'var(--text-secondary)',
              fontWeight: currentTab === 'youtube' ? 700 : 500,
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: '0.5rem',
              transition: 'all var(--transition-fast)'
            }}
          >
            <Youtube size={16} color={currentTab === 'youtube' ? '#ef4444' : 'currentColor'} />
            YouTube Shorts ({filteredYt.length})
          </button>

          <button
            onClick={() => setCurrentTab('user')}
            style={{
              padding: '0.75rem 1.25rem',
              background: 'transparent',
              border: 'none',
              borderBottom: currentTab === 'user' ? '2px solid var(--primary)' : '2px solid transparent',
              color: currentTab === 'user' ? '#ffffff' : 'var(--text-secondary)',
              fontWeight: currentTab === 'user' ? 700 : 500,
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: '0.5rem',
              transition: 'all var(--transition-fast)'
            }}
          >
            <Film size={16} color={currentTab === 'user' ? 'var(--primary)' : 'currentColor'} />
            User & Reporter Shorts ({filteredUser.length})
          </button>

          <button
            onClick={() => setCurrentTab('moderation')}
            style={{
              padding: '0.75rem 1.25rem',
              background: 'transparent',
              border: 'none',
              borderBottom: currentTab === 'moderation' ? '2px solid var(--accent-amber)' : '2px solid transparent',
              color: currentTab === 'moderation' ? '#ffffff' : 'var(--text-secondary)',
              fontWeight: currentTab === 'moderation' ? 700 : 500,
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: '0.5rem',
              transition: 'all var(--transition-fast)'
            }}
          >
            <Clock size={16} color={currentTab === 'moderation' ? 'var(--accent-amber)' : 'currentColor'} />
            Pending Verification ({pendingShorts.length})
            {pendingShorts.length > 0 && (
              <span className="badge badge-warning" style={{ fontSize: '0.65rem', padding: '0.1rem 0.4rem' }}>
                {pendingShorts.length}
              </span>
            )}
          </button>
        </div>

        {/* Language Switcher */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', paddingBottom: '0.5rem' }}>
          <Globe size={14} style={{ color: 'var(--text-muted)' }} />
          {['all', 'te', 'en', 'hi'].map(lang => (
            <button
              key={lang}
              onClick={() => setSelectedLanguage(lang)}
              style={{
                padding: '0.25rem 0.65rem',
                borderRadius: 'var(--radius-sm)',
                border: `1px solid ${selectedLanguage === lang ? 'var(--border-active)' : 'var(--border-subtle)'}`,
                background: selectedLanguage === lang ? 'rgba(99, 102, 241, 0.2)' : 'transparent',
                color: selectedLanguage === lang ? '#ffffff' : 'var(--text-secondary)',
                fontSize: '0.75rem',
                cursor: 'pointer',
                textTransform: 'uppercase'
              }}
            >
              {lang === 'all' ? 'All' : lang === 'te' ? 'Telugu' : lang === 'en' ? 'English' : 'Hindi'}
            </button>
          ))}
        </div>
      </div>

      {/* Tab Content: YouTube Shorts Grid */}
      {currentTab === 'youtube' && (
        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))',
          gap: '1.25rem'
        }}>
          {filteredYt.map(short => (
            <div key={short.id} className="card" style={{ padding: '0', overflow: 'hidden', display: 'flex', flexDirection: 'column' }}>
              {/* 9:16 Video Thumbnail Container */}
              <div 
                style={{ position: 'relative', height: '360px', width: '100%', overflow: 'hidden', cursor: 'pointer' }}
                onClick={() => handlePlayVideo(short)}
              >
                <img 
                  src={short.thumbnail_url} 
                  alt="thumb" 
                  style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                />
                <div style={{
                  position: 'absolute',
                  inset: 0,
                  background: 'linear-gradient(to top, rgba(0,0,0,0.85) 0%, rgba(0,0,0,0.1) 60%, rgba(0,0,0,0.3) 100%)'
                }} />

                {/* Play Button Overlay */}
                <div style={{
                  position: 'absolute',
                  top: '50%',
                  left: '50%',
                  transform: 'translate(-50%, -50%)',
                  width: '56px',
                  height: '56px',
                  borderRadius: '50%',
                  background: 'rgba(239, 68, 68, 0.85)',
                  backdropFilter: 'blur(4px)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  color: '#ffffff',
                  boxShadow: '0 8px 24px rgba(239, 68, 68, 0.5)'
                }}>
                  <Play size={24} fill="#ffffff" style={{ marginLeft: '3px' }} />
                </div>

                {/* Top Badges */}
                <span className="badge badge-danger" style={{ position: 'absolute', top: '12px', left: '12px', display: 'flex', alignItems: 'center', gap: '0.3rem' }}>
                  <Youtube size={12} /> Shorts
                </span>

                <span className="badge badge-neutral" style={{ position: 'absolute', top: '12px', right: '12px', textTransform: 'uppercase' }}>
                  {short.language}
                </span>

                {/* Bottom Overlay Title */}
                <div style={{ position: 'absolute', bottom: '12px', left: '12px', right: '12px' }}>
                  <div style={{ fontSize: '0.75rem', color: '#cbd5e1', marginBottom: '0.2rem', fontWeight: 600 }}>
                    {short.channel_title}
                  </div>
                  <h3 style={{ color: '#ffffff', fontSize: '0.95rem', lineHeight: '1.3' }}>
                    {short.title}
                  </h3>
                </div>
              </div>

              {/* Bottom Metrics Bar */}
              <div style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                padding: '0.75rem 1rem',
                borderTop: '1px solid var(--border-subtle)',
                fontSize: '0.8rem',
                color: 'var(--text-muted)'
              }}>
                <div style={{ display: 'flex', gap: '0.75rem' }}>
                  <span style={{ display: 'flex', alignItems: 'center', gap: '0.3rem' }}>
                    <Eye size={13} /> {short.views?.toLocaleString()}
                  </span>
                  <span style={{ display: 'flex', alignItems: 'center', gap: '0.3rem' }}>
                    <ThumbsUp size={13} /> {short.likes?.toLocaleString()}
                  </span>
                </div>

                <a 
                  href={short.video_url} 
                  target="_blank" 
                  rel="noreferrer"
                  className="btn btn-secondary"
                  style={{ padding: '0.25rem 0.55rem', fontSize: '0.725rem' }}
                >
                  YouTube <ExternalLink size={11} />
                </a>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Tab Content: User Submitted Shorts */}
      {currentTab === 'user' && (
        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))',
          gap: '1.25rem'
        }}>
          {filteredUser.map(short => (
            <div key={short.id} className="card" style={{ padding: '0', overflow: 'hidden', display: 'flex', flexDirection: 'column' }}>
              <div 
                style={{ position: 'relative', height: '360px', width: '100%', overflow: 'hidden', cursor: 'pointer' }}
                onClick={() => handlePlayVideo(short)}
              >
                <img 
                  src={short.thumbnail_url} 
                  alt="thumb" 
                  style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                />
                <div style={{
                  position: 'absolute',
                  inset: 0,
                  background: 'linear-gradient(to top, rgba(0,0,0,0.85) 0%, rgba(0,0,0,0.1) 60%, rgba(0,0,0,0.3) 100%)'
                }} />

                <div style={{
                  position: 'absolute',
                  top: '50%',
                  left: '50%',
                  transform: 'translate(-50%, -50%)',
                  width: '56px',
                  height: '56px',
                  borderRadius: '50%',
                  background: 'rgba(99, 102, 241, 0.85)',
                  backdropFilter: 'blur(4px)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  color: '#ffffff'
                }}>
                  <Play size={24} fill="#ffffff" style={{ marginLeft: '3px' }} />
                </div>

                <span className="badge badge-primary" style={{ position: 'absolute', top: '12px', left: '12px' }}>
                  Reporter Draft
                </span>

                <span className="badge badge-neutral" style={{ position: 'absolute', top: '12px', right: '12px', textTransform: 'uppercase' }}>
                  {short.language}
                </span>

                <div style={{ position: 'absolute', bottom: '12px', left: '12px', right: '12px' }}>
                  <div style={{ fontSize: '0.75rem', color: '#cbd5e1', marginBottom: '0.2rem', fontWeight: 600 }}>
                    {short.user_uid} • {short.duration_seconds}s
                  </div>
                  <h3 style={{ color: '#ffffff', fontSize: '0.95rem', lineHeight: '1.3' }}>
                    {short.title}
                  </h3>
                </div>
              </div>

              <div style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                padding: '0.75rem 1rem',
                borderTop: '1px solid var(--border-subtle)',
                fontSize: '0.8rem',
                color: 'var(--text-muted)'
              }}>
                <span style={{ display: 'flex', alignItems: 'center', gap: '0.3rem' }}>
                  <Eye size={13} /> {short.views?.toLocaleString()} views
                </span>
                <span className="badge badge-success text-xs">Approved</span>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Tab Content: Moderation Queue */}
      {currentTab === 'moderation' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
          {pendingShorts.length === 0 ? (
            <div className="card text-center" style={{ padding: '3rem 1.5rem', textAlign: 'center' }}>
              <CheckCircle2 size={48} style={{ margin: '0 auto 1rem', color: 'var(--accent-emerald)' }} />
              <h3 style={{ color: '#ffffff', marginBottom: '0.5rem' }}>No Pending Video Verification</h3>
              <p style={{ color: 'var(--text-secondary)' }}>
                All user and reporter video shorts have been reviewed.
              </p>
            </div>
          ) : (
            pendingShorts.map(short => (
              <div key={short.id} className="card" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '1.25rem' }}>
                <div style={{ display: 'flex', gap: '1rem', alignItems: 'center', flex: '1 1 350px' }}>
                  <img 
                    src={short.thumbnail_url} 
                    alt="thumb" 
                    style={{ width: '80px', height: '110px', borderRadius: 'var(--radius-md)', objectFit: 'cover', flexShrink: 0 }}
                  />
                  <div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.3rem' }}>
                      <span className="badge badge-warning text-xs font-mono">{short.short_uid}</span>
                      <span className="badge badge-neutral text-xs">By {short.user_uid}</span>
                      <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>{short.duration_seconds}s</span>
                    </div>

                    <h3 style={{ color: '#ffffff', fontSize: '1rem', marginBottom: '0.3rem' }}>
                      {short.title}
                    </h3>
                    <p style={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}>
                      {short.description}
                    </p>
                  </div>
                </div>

                <div style={{ display: 'flex', gap: '0.75rem', alignItems: 'center' }}>
                  <button 
                    className="btn btn-secondary" 
                    onClick={() => handlePlayVideo(short)}
                    style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', fontSize: '0.8rem' }}
                  >
                    <Play size={14} /> Preview
                  </button>

                  <button 
                    className="btn btn-success" 
                    onClick={() => handleModerate(short.short_uid, true)}
                    style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', fontSize: '0.8rem' }}
                  >
                    <CheckCircle2 size={15} /> Approve & Publish
                  </button>

                  <button 
                    className="btn btn-danger" 
                    onClick={() => handleModerate(short.short_uid, false)}
                    style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', fontSize: '0.8rem' }}
                  >
                    <XCircle size={15} /> Reject
                  </button>
                </div>
              </div>
            ))
          )}
        </div>
      )}

      {/* VIDEO PLAYER MODAL */}
      <Modal
        isOpen={isVideoModalOpen}
        onClose={() => setIsVideoModalOpen(false)}
        title={activePlayingShort ? activePlayingShort.title : 'Play Video Short'}
        size="md"
      >
        {activePlayingShort && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem', alignItems: 'center' }}>
            <div style={{
              width: '100%',
              maxWidth: '380px',
              height: '520px',
              borderRadius: 'var(--radius-lg)',
              overflow: 'hidden',
              background: '#000000',
              boxShadow: '0 12px 30px rgba(0,0,0,0.8)'
            }}>
              {activePlayingShort.video_id || activePlayingShort.youtube_video_id ? (
                <iframe 
                  width="100%" 
                  height="100%" 
                  src={`https://www.youtube.com/embed/${activePlayingShort.video_id || activePlayingShort.youtube_video_id}?autoplay=1`} 
                  title="YouTube Short" 
                  frameBorder="0" 
                  allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture" 
                  allowFullScreen
                />
              ) : (
                <video 
                  src={activePlayingShort.video_url} 
                  controls 
                  autoPlay 
                  style={{ width: '100%', height: '100%', objectFit: 'contain' }}
                />
              )}
            </div>
            <div style={{ width: '100%', textAlign: 'center', color: 'var(--text-secondary)', fontSize: '0.85rem' }}>
              {activePlayingShort.title}
            </div>
          </div>
        )}
      </Modal>

      {/* YOUTUBE INGESTION MODAL */}
      <Modal
        isOpen={isFetchModalOpen}
        onClose={() => setIsFetchModalOpen(false)}
        title="Automated YouTube Shorts Ingestion"
        size="md"
      >
        <form onSubmit={handleFetchYouTubeSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
          <p style={{ color: 'var(--text-secondary)', fontSize: '0.85rem' }}>
            Query the YouTube Data API to automatically discover, curate, and store vertical 9:16 news shorts directly into the database.
          </p>

          <div>
            <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 600, color: 'var(--text-secondary)', marginBottom: '0.4rem' }}>
              Search Query *
            </label>
            <input 
              type="text" 
              required
              className="input"
              placeholder="e.g. telugu news shorts latest, hyderabad civic updates"
              value={fetchQuery}
              onChange={(e) => setFetchQuery(e.target.value)}
            />
          </div>

          <div>
            <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 600, color: 'var(--text-secondary)', marginBottom: '0.4rem' }}>
              Language Channel
            </label>
            <select 
              className="input"
              value={fetchLang}
              onChange={(e) => setFetchLang(e.target.value)}
            >
              <option value="te">Telugu (తెలుగు)</option>
              <option value="en">English</option>
              <option value="hi">Hindi (हिंदी)</option>
            </select>
          </div>

          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.75rem', marginTop: '0.5rem' }}>
            <button 
              type="button" 
              className="btn btn-secondary" 
              onClick={() => setIsFetchModalOpen(false)}
            >
              Cancel
            </button>
            <button 
              type="submit" 
              className="btn btn-primary"
              disabled={isFetchingYt}
              style={{ background: 'linear-gradient(135deg, #ef4444, #b91c1c)' }}
            >
              {isFetchingYt ? 'Fetching from YouTube...' : 'Start Ingestion'}
            </button>
          </div>
        </form>
      </Modal>

      {/* CREATE VIDEO SHORT MODAL */}
      <Modal
        isOpen={isCreateModalOpen}
        onClose={() => setIsCreateModalOpen(false)}
        title="Post New Video Short"
        size="md"
      >
        <form onSubmit={handleCreateSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
          <div>
            <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 600, color: 'var(--text-secondary)', marginBottom: '0.4rem' }}>
              Video Headline / Title *
            </label>
            <input 
              type="text" 
              required
              className="input"
              placeholder="e.g. New Electric Metro Bus Fleet Launch"
              value={newTitle}
              onChange={(e) => setNewTitle(e.target.value)}
            />
          </div>

          <div>
            <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 600, color: 'var(--text-secondary)', marginBottom: '0.4rem' }}>
              Video URL (YouTube URL or Hosted MP4) *
            </label>
            <input 
              type="url" 
              required
              className="input"
              placeholder="https://www.youtube.com/watch?v=..."
              value={newVideoUrl}
              onChange={(e) => setNewVideoUrl(e.target.value)}
            />
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
            <div>
              <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 600, color: 'var(--text-secondary)', marginBottom: '0.4rem' }}>
                Language
              </label>
              <select 
                className="input"
                value={newLanguage}
                onChange={(e) => setNewLanguage(e.target.value)}
              >
                <option value="te">Telugu (తెలుగు)</option>
                <option value="en">English</option>
                <option value="hi">Hindi (हिंदी)</option>
              </select>
            </div>

            <div>
              <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 600, color: 'var(--text-secondary)', marginBottom: '0.4rem' }}>
                Custom Thumbnail URL
              </label>
              <input 
                type="url" 
                className="input"
                placeholder="https://images.unsplash.com/..."
                value={newThumbnailUrl}
                onChange={(e) => setNewThumbnailUrl(e.target.value)}
              />
            </div>
          </div>

          <div>
            <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 600, color: 'var(--text-secondary)', marginBottom: '0.4rem' }}>
              Short Description / Summary
            </label>
            <textarea 
              rows={2}
              className="input"
              placeholder="Brief context about this field report or breaking clip..."
              value={newDescription}
              onChange={(e) => setNewDescription(e.target.value)}
            />
          </div>

          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.75rem', marginTop: '0.5rem' }}>
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
              disabled={isSubmitting}
            >
              {isSubmitting ? 'Publishing Short...' : 'Publish Video Short'}
            </button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
