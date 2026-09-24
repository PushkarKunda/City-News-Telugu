// src/views/SponsoredPostsView.jsx
import React, { useState, useEffect, useCallback } from 'react';
import { useAuth } from '../context/AuthContext';
import { api } from '../api/client';
import Modal from '../components/common/Modal';
import StatsCard from '../components/common/StatsCard';
import { 
  Sparkles, 
  Plus, 
  CheckCircle2, 
  XCircle, 
  Trash2, 
  ExternalLink, 
  Calendar, 
  MapPin, 
  Globe, 
  Users, 
  Eye, 
  MousePointer, 
  RefreshCw, 
  AlertCircle, 
  Clock, 
  Target,
  Megaphone
} from 'lucide-react';

const INITIAL_SPONSORED_POSTS = [
  {
    id: 1,
    title: 'Hyderabad IT Corridor Premium Commercial Spaces at Wave One',
    content: 'State-of-the-art office spaces, grade-A tech facilities, and green building certified towers in Hitec City. Avail exclusive inaugural lease privileges.',
    image_url: 'https://images.unsplash.com/photo-1486406146926-c627a92ad1ab?w=600&auto=format&fit=crop&q=80',
    cta_text: 'Explore Floor Plans',
    cta_url: 'https://waveone.example.com',
    sponsor_name: 'Wave Infra Tech',
    start_date: '2026-09-01T00:00:00Z',
    end_date: '2026-10-15T23:59:59Z',
    is_approved: true,
    impressions: 48200,
    clicks: 1840,
    ctr: '3.8%',
    location: 'Hyderabad, Telangana',
    language: 'English',
    target_gender: 'all',
    target_age_min: 25,
    target_age_max: 55
  },
  {
    id: 2,
    title: 'South India EV Motors: Zero Down Payment Festival Offer',
    content: 'Book the all-new EcoRide Max with 180km range per charge. Exclusive festive discount and exchange bonus for two-wheeler owners.',
    image_url: 'https://images.unsplash.com/photo-1558981806-ec527fa84c39?w=600&auto=format&fit=crop&q=80',
    cta_text: 'Book Free Test Ride',
    cta_url: 'https://ecoride.example.com/festive',
    sponsor_name: 'EcoRide Mobility',
    start_date: '2026-09-10T00:00:00Z',
    end_date: '2026-10-05T23:59:59Z',
    is_approved: true,
    impressions: 74200,
    clicks: 3410,
    ctr: '4.6%',
    location: 'Telangana & Andhra Pradesh',
    language: 'Telugu / English',
    target_gender: 'all',
    target_age_min: 20,
    target_age_max: 45
  }
];

const INITIAL_PENDING_POSTS = [
  {
    id: 101,
    title: 'Global University Admissions Fair 2026 - Novotel Hyderabad',
    content: 'Meet delegates from 80+ top universities from US, UK, Australia and Canada. Spot assessments and scholarship evaluations available.',
    image_url: 'https://images.unsplash.com/photo-1523240795612-9a054b0db644?w=600&auto=format&fit=crop&q=80',
    cta_text: 'Register for Free Pass',
    cta_url: 'https://globaledufair.example.com',
    sponsor_name: 'Apex Education Consulting',
    start_date: '2026-09-25T00:00:00Z',
    end_date: '2026-10-10T23:59:59Z',
    is_approved: false,
    created_at: '2026-09-20T08:30:00Z',
    location: 'Hyderabad',
    language: 'English'
  }
];

export default function SponsoredPostsView() {
  const { user } = useAuth();

  const [activePosts, setActivePosts] = useState(INITIAL_SPONSORED_POSTS);
  const [pendingPosts, setPendingPosts] = useState(INITIAL_PENDING_POSTS);
  const [currentTab, setCurrentTab] = useState('active'); // 'active' | 'pending'
  const [isSyncing, setIsSyncing] = useState(false);
  const [dbConnected, setDbConnected] = useState(false);
  const [notification, setNotification] = useState(null);

  // Targeting options from backend
  const [targetingOptions, setTargetingOptions] = useState({
    languages: [{ id: 1, name: 'English', code: 'en' }, { id: 2, name: 'Telugu', code: 'te' }],
    states: [
      { id: 1, name: 'Telangana', districts: [{ id: 1, name: 'Hyderabad' }, { id: 2, name: 'Ranga Reddy' }] },
      { id: 2, name: 'Andhra Pradesh', districts: [{ id: 3, name: 'Visakhapatnam' }, { id: 4, name: 'Vijayawada' }] }
    ],
    genders: ['all', 'male', 'female'],
    age_ranges: ['18-24', '25-34', '35-44', '45-54', '55+']
  });

  // Modal States
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [isRejectModalOpen, setIsRejectModalOpen] = useState(false);
  const [selectedPostForReject, setSelectedPostForReject] = useState(null);
  const [rejectionReason, setRejectionReason] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Form State
  const [formTitle, setFormTitle] = useState('');
  const [formContent, setFormContent] = useState('');
  const [formImageUrl, setFormImageUrl] = useState('');
  const [formCtaText, setFormCtaText] = useState('Learn More');
  const [formCtaUrl, setFormCtaUrl] = useState('');
  const [formStartDate, setFormStartDate] = useState('');
  const [formEndDate, setFormEndDate] = useState('');
  const [formStateId, setFormStateId] = useState('');
  const [formDistrictId, setFormDistrictId] = useState('');
  const [formLanguageId, setFormLanguageId] = useState('1');
  const [formTargetGender, setFormTargetGender] = useState('all');

  const showToast = (message, type = 'success') => {
    setNotification({ message, type });
    setTimeout(() => setNotification(null), 4000);
  };

  const fetchSponsoredData = useCallback(async () => {
    setIsSyncing(true);
    try {
      // Fetch approved posts
      const res = await api.getSponsoredPosts(1, 50, true);
      if (res && res.items && res.items.length > 0) {
        setActivePosts(res.items);
      }

      // Fetch pending posts
      try {
        const pendingRes = await api.getSponsoredPosts(1, 50, false);
        if (pendingRes && pendingRes.items) {
          setPendingPosts(pendingRes.items);
        }
      } catch {
        // Pending may be empty
      }

      // Fetch targeting options
      try {
        const targetRes = await api.getTargetingOptions();
        if (targetRes && targetRes.states) {
          setTargetingOptions(targetRes);
        }
      } catch {
        // Use fallback
      }

      setDbConnected(true);
    } catch {
      setDbConnected(false);
    } finally {
      setIsSyncing(false);
    }
  }, []);

  useEffect(() => {
    fetchSponsoredData();
  }, [fetchSponsoredData]);

  // Handle Create Sponsored Post
  const handleCreateSubmit = async (e) => {
    e.preventDefault();
    if (!formTitle.trim() || !formContent.trim() || !formCtaUrl.trim()) {
      showToast('Title, content, and CTA destination URL are required.', 'warning');
      return;
    }

    const payload = {
      title: formTitle.trim(),
      content: formContent.trim(),
      image_url: formImageUrl.trim() || 'https://images.unsplash.com/photo-1460925895917-afdab827c52f?w=600&auto=format&fit=crop&q=80',
      cta_text: formCtaText.trim() || 'Learn More',
      cta_url: formCtaUrl.trim(),
      start_date: formStartDate ? new Date(formStartDate).toISOString() : new Date().toISOString(),
      end_date: formEndDate ? new Date(formEndDate).toISOString() : new Date(Date.now() + 30 * 86400000).toISOString(),
      state_id: formStateId ? Number(formStateId) : null,
      district_id: formDistrictId ? Number(formDistrictId) : null,
      language_id: formLanguageId ? Number(formLanguageId) : 1,
      target_gender: formTargetGender,
    };

    try {
      setIsSubmitting(true);
      await api.createSponsoredPost(payload);
      showToast('Sponsored post created and published!');
      setIsCreateModalOpen(false);
      resetForm();
      fetchSponsoredData();
    } catch {
      // Local fallback
      const localPost = {
        id: Date.now(),
        ...payload,
        is_approved: true,
        impressions: 0,
        clicks: 0,
        ctr: '0.0%',
        location: formStateId ? 'Targeted State' : 'National',
        language: formLanguageId === '2' ? 'Telugu' : 'English'
      };
      setActivePosts([localPost, ...activePosts]);
      showToast('Sponsored post created (Local session)!');
      setIsCreateModalOpen(false);
      resetForm();
    } finally {
      setIsSubmitting(false);
    }
  };

  const resetForm = () => {
    setFormTitle('');
    setFormContent('');
    setFormImageUrl('');
    setFormCtaText('Learn More');
    setFormCtaUrl('');
    setFormStartDate('');
    setFormEndDate('');
    setFormStateId('');
    setFormDistrictId('');
  };

  // Moderate Post (Approve / Reject)
  const handleModerate = async (postId, action, reason = '') => {
    try {
      await api.moderateSponsoredPost(postId, action, reason);
      showToast(`Sponsored post ${action === 'approve' ? 'approved and activated' : 'rejected'}!`);
      setPendingPosts(prev => prev.filter(p => p.id !== postId));
      fetchSponsoredData();
    } catch {
      const target = pendingPosts.find(p => p.id === postId);
      if (target && action === 'approve') {
        setActivePosts([{ ...target, is_approved: true, impressions: 0, clicks: 0, ctr: '0.0%' }, ...activePosts]);
      }
      setPendingPosts(prev => prev.filter(p => p.id !== postId));
      showToast(`Sponsored post ${action === 'approve' ? 'approved' : 'rejected'} (Local state update)!`);
    } finally {
      setIsRejectModalOpen(false);
      setSelectedPostForReject(null);
      setRejectionReason('');
    }
  };

  // Delete Post
  const handleDeletePost = async (postId) => {
    if (!window.confirm('Delete this sponsored post permanently?')) return;
    try {
      await api.deleteSponsoredPost(postId);
      showToast('Sponsored post deleted.');
      setActivePosts(prev => prev.filter(p => p.id !== postId));
    } catch {
      setActivePosts(prev => prev.filter(p => p.id !== postId));
      showToast('Sponsored post deleted from active view.');
    }
  };

  const totalImpressions = activePosts.reduce((acc, p) => acc + (p.impressions || 0), 0);
  const totalClicks = activePosts.reduce((acc, p) => acc + (p.clicks || 0), 0);

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
              <Sparkles className="text-primary" size={28} />
              Sponsored Posts & Hyperlocal Native Content
            </h1>
            <span className={`badge ${dbConnected ? 'badge-success' : 'badge-warning'}`} style={{ display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
              <span style={{ width: '8px', height: '8px', borderRadius: '50%', background: dbConnected ? '#34d399' : '#fbbf24', display: 'inline-block' }} />
              {dbConnected ? 'Live DB Sync' : 'Offline / Standalone'}
            </span>
          </div>
          <p style={{ marginTop: '0.3rem' }}>
            Seamless in-feed sponsored articles, location-targeted sponsor placements, and audience reach analytics.
          </p>
        </div>

        <div style={{ display: 'flex', gap: '0.75rem', alignItems: 'center' }}>
          <button 
            className="btn btn-secondary" 
            onClick={fetchSponsoredData} 
            disabled={isSyncing}
            style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}
          >
            <RefreshCw size={15} className={isSyncing ? 'animate-spin text-primary' : ''} />
            {isSyncing ? 'Syncing...' : 'Live Refresh'}
          </button>

          <button 
            className="btn btn-primary" 
            onClick={() => setIsCreateModalOpen(true)}
            style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}
          >
            <Plus size={18} /> New Sponsored Post
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
          title="Active In-Feed Posts" 
          value={activePosts.length.toString()} 
          change={`${pendingPosts.length} in moderation`} 
          isPositive={true} 
          icon={Megaphone} 
          sparklineData={[1, 2, 2, 3, activePosts.length]} 
        />
        <StatsCard 
          title="Sponsored Impressions" 
          value={totalImpressions.toLocaleString()} 
          change="+16.4% this month" 
          isPositive={true} 
          icon={Eye} 
          sparklineData={[30000, 45000, 60000, 90000, totalImpressions]} 
        />
        <StatsCard 
          title="Direct CTA Clicks" 
          value={totalClicks.toLocaleString()} 
          change="4.2% avg CTR" 
          isPositive={true} 
          icon={MousePointer} 
          sparklineData={[1200, 1800, 2400, 3800, totalClicks]} 
        />
        <StatsCard 
          title="Pending Approvals" 
          value={pendingPosts.length.toString()} 
          change={pendingPosts.length > 0 ? "Awaiting review" : "All cleared"} 
          isPositive={pendingPosts.length === 0} 
          icon={Clock} 
          sparklineData={[3, 2, 2, 1, pendingPosts.length]} 
        />
      </div>

      {/* Tabs */}
      <div style={{
        display: 'flex',
        borderBottom: '1px solid var(--border-subtle)',
        gap: '1rem',
      }}>
        <button
          onClick={() => setCurrentTab('active')}
          style={{
            padding: '0.75rem 1.25rem',
            background: 'transparent',
            border: 'none',
            borderBottom: currentTab === 'active' ? '2px solid var(--primary)' : '2px solid transparent',
            color: currentTab === 'active' ? '#ffffff' : 'var(--text-secondary)',
            fontWeight: currentTab === 'active' ? 700 : 500,
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            gap: '0.5rem',
            transition: 'all var(--transition-fast)'
          }}
        >
          <Sparkles size={16} color={currentTab === 'active' ? 'var(--primary)' : 'currentColor'} />
          Active Campaigns ({activePosts.length})
        </button>

        <button
          onClick={() => setCurrentTab('pending')}
          style={{
            padding: '0.75rem 1.25rem',
            background: 'transparent',
            border: 'none',
            borderBottom: currentTab === 'pending' ? '2px solid var(--accent-amber)' : '2px solid transparent',
            color: currentTab === 'pending' ? '#ffffff' : 'var(--text-secondary)',
            fontWeight: currentTab === 'pending' ? 700 : 500,
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            gap: '0.5rem',
            transition: 'all var(--transition-fast)'
          }}
        >
          <Clock size={16} color={currentTab === 'pending' ? 'var(--accent-amber)' : 'currentColor'} />
          Pending Review Queue ({pendingPosts.length})
          {pendingPosts.length > 0 && (
            <span className="badge badge-warning" style={{ fontSize: '0.65rem', padding: '0.1rem 0.4rem' }}>
              Action Needed
            </span>
          )}
        </button>
      </div>

      {/* Tab Content: Active Sponsored Posts */}
      {currentTab === 'active' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
          {activePosts.length === 0 ? (
            <div className="card text-center" style={{ padding: '3rem 1.5rem', textAlign: 'center' }}>
              <Sparkles size={48} style={{ margin: '0 auto 1rem', color: 'var(--text-muted)' }} />
              <h3 style={{ color: '#ffffff', marginBottom: '0.5rem' }}>No Active Sponsored Posts</h3>
              <p style={{ maxWidth: '400px', margin: '0 auto 1.5rem' }}>
                Launch your first native sponsored campaign to display brand promotions within the news feed.
              </p>
              <button className="btn btn-primary" onClick={() => setIsCreateModalOpen(true)}>
                <Plus size={16} /> Create Sponsored Post
              </button>
            </div>
          ) : (
            <div style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fill, minmax(420px, 1fr))',
              gap: '1.25rem'
            }}>
              {activePosts.map(post => (
                <div key={post.id} className="card" style={{ display: 'flex', flexDirection: 'column', justifyContent: 'space-between' }}>
                  <div>
                    {/* Creative Banner */}
                    <div style={{ position: 'relative', height: '180px', borderRadius: 'var(--radius-md)', overflow: 'hidden', marginBottom: '1rem' }}>
                      <img 
                        src={post.image_url} 
                        alt="creative" 
                        style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                      />
                      <span className="badge badge-primary" style={{ position: 'absolute', top: '10px', left: '10px' }}>
                        Sponsored
                      </span>
                      {post.sponsor_name && (
                        <span style={{
                          position: 'absolute',
                          bottom: '10px',
                          left: '10px',
                          background: 'rgba(0,0,0,0.7)',
                          backdropFilter: 'blur(4px)',
                          padding: '0.2rem 0.6rem',
                          borderRadius: 'var(--radius-sm)',
                          fontSize: '0.75rem',
                          color: '#ffffff',
                          fontWeight: 600
                        }}>
                          {post.sponsor_name}
                        </span>
                      )}
                    </div>

                    {/* Title & Body */}
                    <h3 style={{ color: '#ffffff', fontSize: '1.05rem', lineHeight: '1.4', marginBottom: '0.5rem' }}>
                      {post.title}
                    </h3>
                    <p style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', marginBottom: '1rem', lineHeight: '1.5' }}>
                      {post.content}
                    </p>

                    {/* Targeting Badges */}
                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.4rem', marginBottom: '1rem' }}>
                      <span className="badge badge-neutral text-xs" style={{ display: 'flex', alignItems: 'center', gap: '0.3rem' }}>
                        <MapPin size={11} /> {post.location || 'National'}
                      </span>
                      <span className="badge badge-neutral text-xs" style={{ display: 'flex', alignItems: 'center', gap: '0.3rem' }}>
                        <Globe size={11} /> {post.language || 'English'}
                      </span>
                      <span className="badge badge-neutral text-xs" style={{ display: 'flex', alignItems: 'center', gap: '0.3rem' }}>
                        <Calendar size={11} /> {post.start_date ? new Date(post.start_date).toLocaleDateString() : 'Active'}
                      </span>
                    </div>
                  </div>

                  {/* Footer Stats & Action */}
                  <div style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    paddingTop: '0.9rem',
                    borderTop: '1px solid var(--border-subtle)',
                    flexWrap: 'wrap',
                    gap: '0.5rem'
                  }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.8rem', fontSize: '0.8rem' }}>
                      <span style={{ color: 'var(--text-muted)' }}>
                        <Eye size={13} style={{ display: 'inline', marginRight: '4px' }} />
                        <strong>{post.impressions?.toLocaleString() || 0}</strong> views
                      </span>
                      <span style={{ color: 'var(--primary)' }}>
                        <MousePointer size={13} style={{ display: 'inline', marginRight: '4px' }} />
                        <strong>{post.clicks?.toLocaleString() || 0}</strong> clicks
                      </span>
                    </div>

                    <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
                      <a 
                        href={post.cta_url} 
                        target="_blank" 
                        rel="noreferrer"
                        className="btn btn-secondary"
                        style={{ fontSize: '0.75rem', padding: '0.35rem 0.65rem' }}
                      >
                        {post.cta_text || 'Visit'} <ExternalLink size={12} />
                      </a>

                      <button 
                        className="btn btn-danger"
                        style={{ padding: '0.35rem 0.55rem' }}
                        title="Delete Sponsored Post"
                        onClick={() => handleDeletePost(post.id)}
                      >
                        <Trash2 size={14} />
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Tab Content: Pending Review Queue */}
      {currentTab === 'pending' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
          {pendingPosts.length === 0 ? (
            <div className="card text-center" style={{ padding: '3rem 1.5rem', textAlign: 'center' }}>
              <CheckCircle2 size={48} style={{ margin: '0 auto 1rem', color: 'var(--accent-emerald)' }} />
              <h3 style={{ color: '#ffffff', marginBottom: '0.5rem' }}>No Pending Reviews</h3>
              <p style={{ color: 'var(--text-secondary)' }}>
                All commercial and sponsor submissions have been reviewed.
              </p>
            </div>
          ) : (
            pendingPosts.map(post => (
              <div key={post.id} className="card" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '1.25rem' }}>
                <div style={{ display: 'flex', gap: '1rem', alignItems: 'center', flex: '1 1 400px' }}>
                  {post.image_url && (
                    <img 
                      src={post.image_url} 
                      alt="thumb" 
                      style={{ width: '80px', height: '80px', borderRadius: 'var(--radius-md)', objectFit: 'cover', flexShrink: 0 }}
                    />
                  )}
                  <div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.3rem' }}>
                      <span className="badge badge-warning text-xs">Awaiting Approval</span>
                      <span className="badge badge-neutral text-xs">{post.sponsor_name || 'Direct Advertiser'}</span>
                    </div>
                    <h3 style={{ color: '#ffffff', fontSize: '1.05rem', marginBottom: '0.3rem' }}>
                      {post.title}
                    </h3>
                    <p style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', marginBottom: '0.4rem' }}>
                      {post.content}
                    </p>
                    <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                      CTA: <strong>{post.cta_text}</strong> &rarr; {post.cta_url}
                    </div>
                  </div>
                </div>

                <div style={{ display: 'flex', gap: '0.75rem', alignItems: 'center' }}>
                  <button 
                    className="btn btn-success"
                    onClick={() => handleModerate(post.id, 'approve')}
                    style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}
                  >
                    <CheckCircle2 size={16} /> Approve & Publish
                  </button>

                  <button 
                    className="btn btn-danger"
                    onClick={() => {
                      setSelectedPostForReject(post);
                      setIsRejectModalOpen(true);
                    }}
                    style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}
                  >
                    <XCircle size={16} /> Reject
                  </button>
                </div>
              </div>
            ))
          )}
        </div>
      )}

      {/* CREATE SPONSORED POST MODAL */}
      <Modal
        isOpen={isCreateModalOpen}
        onClose={() => setIsCreateModalOpen(false)}
        title="Launch New Sponsored Post Campaign"
        size="lg"
      >
        <form onSubmit={handleCreateSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
          <div>
            <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 600, color: 'var(--text-secondary)', marginBottom: '0.4rem' }}>
              Sponsored Headline / Title *
            </label>
            <input 
              type="text" 
              required
              className="input"
              placeholder="e.g. Hyderabad Mega Tech Expo 2026 Passes Now Live"
              value={formTitle}
              onChange={(e) => setFormTitle(e.target.value)}
            />
          </div>

          <div>
            <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 600, color: 'var(--text-secondary)', marginBottom: '0.4rem' }}>
              Article Body / Promotional Content *
            </label>
            <textarea 
              required
              rows={3}
              className="input"
              placeholder="Write engaging native promo content that blends naturally with editorial news..."
              value={formContent}
              onChange={(e) => setFormContent(e.target.value)}
            />
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
            <div>
              <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 600, color: 'var(--text-secondary)', marginBottom: '0.4rem' }}>
                Creative Image URL
              </label>
              <input 
                type="url" 
                className="input"
                placeholder="https://images.unsplash.com/..."
                value={formImageUrl}
                onChange={(e) => setFormImageUrl(e.target.value)}
              />
            </div>

            <div>
              <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 600, color: 'var(--text-secondary)', marginBottom: '0.4rem' }}>
                Call-To-Action (CTA) Text *
              </label>
              <input 
                type="text" 
                required
                className="input"
                placeholder="e.g. Learn More, Book Now, Shop"
                value={formCtaText}
                onChange={(e) => setFormCtaText(e.target.value)}
              />
            </div>
          </div>

          <div>
            <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 600, color: 'var(--text-secondary)', marginBottom: '0.4rem' }}>
              Destination Click URL *
            </label>
            <input 
              type="url" 
              required
              className="input"
              placeholder="https://sponsorbrand.com/landing-page"
              value={formCtaUrl}
              onChange={(e) => setFormCtaUrl(e.target.value)}
            />
          </div>

          {/* Hyperlocal Targeting */}
          <div style={{ padding: '1rem', borderRadius: 'var(--radius-md)', background: 'rgba(255,255,255,0.02)', border: '1px solid var(--border-subtle)' }}>
            <h4 style={{ color: '#ffffff', fontSize: '0.9rem', marginBottom: '0.75rem', display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
              <Target size={15} className="text-primary" />
              Hyperlocal Location & Demographic Targeting
            </h4>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '0.75rem' }}>
              <div>
                <label style={{ display: 'block', fontSize: '0.75rem', color: 'var(--text-muted)', marginBottom: '0.3rem' }}>
                  Target State
                </label>
                <select 
                  className="input"
                  value={formStateId}
                  onChange={(e) => setFormStateId(e.target.value)}
                >
                  <option value="">All India (National)</option>
                  {targetingOptions.states.map(s => (
                    <option key={s.id} value={s.id}>{s.name}</option>
                  ))}
                </select>
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '0.75rem', color: 'var(--text-muted)', marginBottom: '0.3rem' }}>
                  Target Language
                </label>
                <select 
                  className="input"
                  value={formLanguageId}
                  onChange={(e) => setFormLanguageId(e.target.value)}
                >
                  {targetingOptions.languages.map(l => (
                    <option key={l.id} value={l.id}>{l.name}</option>
                  ))}
                </select>
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '0.75rem', color: 'var(--text-muted)', marginBottom: '0.3rem' }}>
                  Target Gender
                </label>
                <select 
                  className="input"
                  value={formTargetGender}
                  onChange={(e) => setFormTargetGender(e.target.value)}
                >
                  <option value="all">All Genders</option>
                  <option value="male">Male</option>
                  <option value="female">Female</option>
                </select>
              </div>
            </div>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
            <div>
              <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 600, color: 'var(--text-secondary)', marginBottom: '0.4rem' }}>
                Start Date
              </label>
              <input 
                type="date" 
                className="input"
                value={formStartDate}
                onChange={(e) => setFormStartDate(e.target.value)}
              />
            </div>

            <div>
              <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 600, color: 'var(--text-secondary)', marginBottom: '0.4rem' }}>
                End Date
              </label>
              <input 
                type="date" 
                className="input"
                value={formEndDate}
                onChange={(e) => setFormEndDate(e.target.value)}
              />
            </div>
          </div>

          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.75rem', marginTop: '0.75rem' }}>
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
              {isSubmitting ? 'Launching Campaign...' : 'Publish Sponsored Post'}
            </button>
          </div>
        </form>
      </Modal>

      {/* REJECT WITH REASON MODAL */}
      <Modal
        isOpen={isRejectModalOpen}
        onClose={() => setIsRejectModalOpen(false)}
        title="Reject Sponsored Post Submission"
        size="sm"
      >
        {selectedPostForReject && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
            <p style={{ color: '#f8fafc', fontSize: '0.9rem' }}>
              Please specify the editorial reason for rejecting <strong>"{selectedPostForReject.title}"</strong>:
            </p>

            <textarea 
              rows={3}
              required
              className="input"
              placeholder="e.g. Misleading headline, unverified claims, or low-resolution creative asset."
              value={rejectionReason}
              onChange={(e) => setRejectionReason(e.target.value)}
            />

            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.75rem' }}>
              <button className="btn btn-secondary" onClick={() => setIsRejectModalOpen(false)}>
                Cancel
              </button>
              <button 
                className="btn btn-danger"
                onClick={() => handleModerate(selectedPostForReject.id, 'reject', rejectionReason)}
              >
                Confirm Rejection
              </button>
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
}
