// src/views/InsightsManagementView.jsx
import React, { useState, useEffect, useCallback } from 'react';
import { useAuth } from '../context/AuthContext';
import { api } from '../api/client';
import Modal from '../components/common/Modal';
import StatsCard from '../components/common/StatsCard';
import { 
  BookOpen, 
  Plus, 
  Layers, 
  Share2, 
  Eye, 
  Trash2, 
  ChevronLeft, 
  ChevronRight, 
  RefreshCw, 
  AlertCircle, 
  CheckCircle2, 
  Tag, 
  Clock, 
  Compass,
  XCircle,
  ExternalLink
} from 'lucide-react';

const DUMMY_INSIGHTS = [
  {
    id: 1,
    insight_uid: 'INS-1001',
    title: 'Hyderabad Metro Phase 2: Everything You Need to Know',
    cover_image_url: 'https://images.unsplash.com/photo-1544620347-c4fd4a3d5957?w=600&auto=format&fit=crop&q=80',
    category_name: 'Infrastructure',
    views_count: 1420,
    shares_count: 185,
    created_at: '2026-09-18T10:00:00Z',
    pages: [
      {
        page_number: 1,
        title: 'Route Expansion',
        content: 'Phase 2 connects Lakdikapul to BHEL via Gachibowli spanning 26 kilometers with 24 elevated stations, reducing commute bottlenecks by 40%.',
        image_url: 'https://images.unsplash.com/photo-1544620347-c4fd4a3d5957?w=600&auto=format&fit=crop&q=80'
      },
      {
        page_number: 2,
        title: 'Airport Express Corridor',
        content: 'A dedicated high-speed link from Shamshabad Airport to Gachibowli will reduce travel time to under 20 minutes with trains running every 6 minutes.',
        image_url: 'https://images.unsplash.com/photo-1517649763962-0c623266ddc0?w=600&auto=format&fit=crop&q=80'
      },
      {
        page_number: 3,
        title: 'Estimated Budget',
        content: 'The project carries an estimated budget of Rs 12,500 crore with state and central joint financing, targeted for full commissioning by late 2028.',
        image_url: 'https://images.unsplash.com/photo-1554224155-8d04cb21cd6c?w=600&auto=format&fit=crop&q=80'
      }
    ]
  },
  {
    id: 2,
    insight_uid: 'INS-1002',
    title: 'Top 5 High-Tech AI Breakthroughs of 2026',
    cover_image_url: 'https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?w=600&auto=format&fit=crop&q=80',
    category_name: 'Technology',
    views_count: 2890,
    shares_count: 412,
    created_at: '2026-09-19T14:30:00Z',
    pages: [
      {
        page_number: 1,
        title: 'Autonomous Robotics',
        content: 'Humanoid manufacturing assistants have entered commercial assembly lines across automotive sectors, increasing round-the-clock throughput.',
        image_url: 'https://images.unsplash.com/photo-1485827404703-89b55fcc595e?w=600&auto=format&fit=crop&q=80'
      },
      {
        page_number: 2,
        title: 'Quantum Computing Leap',
        content: '1,000+ qubit systems are now solving complex drug synthesis simulations in record hours instead of previous multi-month supercomputer runs.',
        image_url: 'https://images.unsplash.com/photo-1635070041078-e363dbe005cb?w=600&auto=format&fit=crop&q=80'
      }
    ]
  },
  {
    id: 3,
    insight_uid: 'INS-1003',
    title: 'IPL 2026: Sunrisers Hyderabad Strategic Squad Analysis',
    cover_image_url: 'https://images.unsplash.com/photo-1540747913346-19e32dc3e97e?w=600&auto=format&fit=crop&q=80',
    category_name: 'Sports',
    views_count: 3540,
    shares_count: 620,
    created_at: '2026-09-20T08:15:00Z',
    pages: [
      {
        page_number: 1,
        title: 'Aggressive Top Order',
        content: 'SRH retains their fearsome opening firepower with record powerplay strike rates exceeding 210 in the recent warm-up tournament.',
        image_url: 'https://images.unsplash.com/photo-1540747913346-19e32dc3e97e?w=600&auto=format&fit=crop&q=80'
      },
      {
        page_number: 2,
        title: 'Spin Bowling Depth',
        content: 'Addition of mystery spinners provides critical control in middle overs at Rajiv Gandhi International Stadium.',
        image_url: 'https://images.unsplash.com/photo-1531415074968-036ba1b575da?w=600&auto=format&fit=crop&q=80'
      }
    ]
  },
  {
    id: 4,
    insight_uid: 'INS-1004',
    title: 'Monsoon Culinary Trails: Hyderabad Old City Street Food',
    cover_image_url: 'https://images.unsplash.com/photo-1589301760014-d929f3979dbc?w=600&auto=format&fit=crop&q=80',
    category_name: 'Lifestyle',
    views_count: 1980,
    shares_count: 340,
    created_at: '2026-09-17T11:45:00Z',
    pages: [
      {
        page_number: 1,
        title: 'Irani Chai & Osmania',
        content: 'From Nimrah Cafe overlooking Charminar to street corners in Nayapul, rain-drenched evenings spark timeless conversations.',
        image_url: 'https://images.unsplash.com/photo-1589301760014-d929f3979dbc?w=600&auto=format&fit=crop&q=80'
      }
    ]
  }
];

export default function InsightsManagementView() {
  const { user } = useAuth();

  const [insights, setInsights] = useState(DUMMY_INSIGHTS);
  const [categories, setCategories] = useState(['All', 'Infrastructure', 'Technology', 'Sports', 'Lifestyle']);
  const [selectedCategory, setSelectedCategory] = useState('All');
  const [isSyncing, setIsSyncing] = useState(false);
  const [dbConnected, setDbConnected] = useState(false);
  const [notification, setNotification] = useState(null);

  // Story Reader Preview Modal State
  const [isPreviewModalOpen, setIsPreviewModalOpen] = useState(false);
  const [selectedInsight, setSelectedInsight] = useState(null);
  const [currentPageIndex, setCurrentPageIndex] = useState(0);

  // Create Story Modal State
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [newTitle, setNewTitle] = useState('');
  const [newCategory, setNewCategory] = useState('Technology');
  const [newCoverImage, setNewCoverImage] = useState('');
  const [newPages, setNewPages] = useState([
    { title: '', content: '', image_url: '' }
  ]);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const showToast = (message, type = 'success') => {
    setNotification({ message, type });
    setTimeout(() => setNotification(null), 4000);
  };

  const fetchInsights = useCallback(async () => {
    setIsSyncing(true);
    try {
      const res = await api.getInsights(50, 0, selectedCategory === 'All' ? null : selectedCategory);
      if (res && res.items && res.items.length > 0) {
        setInsights(res.items);
      }

      const catRes = await api.getInsightCategories();
      if (catRes && catRes.length > 0) {
        setCategories(['All', ...catRes]);
      }
      setDbConnected(true);
    } catch {
      setDbConnected(false);
    } finally {
      setIsSyncing(false);
    }
  }, [selectedCategory]);

  useEffect(() => {
    fetchInsights();
  }, [fetchInsights]);

  // Open Preview
  const handleOpenPreview = async (insight) => {
    try {
      // Fetch complete story with pages from backend if available
      const full = await api.getInsightByUid(insight.insight_uid);
      if (full && full.pages && full.pages.length > 0) {
        setSelectedInsight(full);
      } else {
        setSelectedInsight(insight);
      }
    } catch {
      setSelectedInsight(insight);
    }
    setCurrentPageIndex(0);
    setIsPreviewModalOpen(true);
  };

  // Dynamic Page Builder Handlers
  const handleAddPage = () => {
    if (newPages.length < 10) {
      setNewPages([...newPages, { title: '', content: '', image_url: '' }]);
    } else {
      showToast('Maximum 10 pages allowed per insight story.', 'warning');
    }
  };

  const handleRemovePage = (idx) => {
    if (newPages.length > 1) {
      setNewPages(newPages.filter((_, i) => i !== idx));
    }
  };

  const handlePageChange = (idx, field, val) => {
    const updated = [...newPages];
    updated[idx][field] = val;
    setNewPages(updated);
  };

  // Submit New Story
  const handleCreateSubmit = async (e) => {
    e.preventDefault();
    if (!newTitle.trim() || !newCategory.trim()) {
      showToast('Title and Category are required.', 'warning');
      return;
    }

    const cleanPages = newPages.map((p, idx) => ({
      page_number: idx + 1,
      title: p.title.trim() || `Card ${idx + 1}`,
      content: p.content.trim() || 'No description provided.',
      image_url: p.image_url.trim() || newCoverImage.trim() || 'https://images.unsplash.com/photo-1504711434969-e33886168f5c?w=600&auto=format&fit=crop&q=80'
    }));

    const payload = {
      title: newTitle.trim(),
      category_name: newCategory.trim(),
      cover_image_url: newCoverImage.trim() || cleanPages[0].image_url,
      pages: cleanPages
    };

    try {
      setIsSubmitting(true);
      await api.createInsight(payload);
      showToast('Visual story created successfully!');
      setIsCreateModalOpen(false);
      resetCreateForm();
      fetchInsights();
    } catch {
      // Local fallback
      const localStory = {
        id: Date.now(),
        insight_uid: `INS-${Math.floor(1000 + Math.random() * 9000)}`,
        title: payload.title,
        cover_image_url: payload.cover_image_url,
        category_name: payload.category_name,
        views_count: 0,
        shares_count: 0,
        created_at: new Date().toISOString(),
        pages: cleanPages
      };
      setInsights([localStory, ...insights]);
      showToast('Story created in local session!');
      setIsCreateModalOpen(false);
      resetCreateForm();
    } finally {
      setIsSubmitting(false);
    }
  };

  const resetCreateForm = () => {
    setNewTitle('');
    setNewCategory('Technology');
    setNewCoverImage('');
    setNewPages([{ title: '', content: '', image_url: '' }]);
  };

  // Delete Insight
  const handleDeleteInsight = async (uid) => {
    if (!window.confirm('Are you sure you want to delete this story?')) return;
    try {
      await api.deleteInsight(uid);
      showToast('Story deleted successfully.');
      setInsights(prev => prev.filter(i => i.insight_uid !== uid));
    } catch {
      setInsights(prev => prev.filter(i => i.insight_uid !== uid));
      showToast('Story removed from active view.');
    }
  };

  const totalViews = insights.reduce((acc, i) => acc + (i.views_count || 0), 0);
  const totalShares = insights.reduce((acc, i) => acc + (i.shares_count || 0), 0);

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
              <Layers className="text-primary" size={28} />
              Inshorts & Visual Insights Stories
            </h1>
            <span className={`badge ${dbConnected ? 'badge-success' : 'badge-warning'}`} style={{ display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
              <span style={{ width: '8px', height: '8px', borderRadius: '50%', background: dbConnected ? '#34d399' : '#fbbf24', display: 'inline-block' }} />
              {dbConnected ? 'Live DB Sync' : 'Offline / Standalone'}
            </span>
          </div>
          <p style={{ marginTop: '0.3rem' }}>
            Multi-page swipeable visual story cards (up to 50 cards per story), bite-sized 60-word summaries, and viral sharing.
          </p>
        </div>

        <div style={{ display: 'flex', gap: '0.75rem', alignItems: 'center' }}>
          <button 
            className="btn btn-secondary" 
            onClick={fetchInsights} 
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
            <Plus size={18} /> New Visual Story
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
          title="Published Stories" 
          value={insights.length.toString()} 
          change="Multi-card format" 
          isPositive={true} 
          icon={BookOpen} 
          sparklineData={[2, 3, 3, 4, insights.length]} 
        />
        <StatsCard 
          title="Total Story Card Views" 
          value={totalViews.toLocaleString()} 
          change="+28.4% read volume" 
          isPositive={true} 
          icon={Eye} 
          sparklineData={[4200, 5800, 7200, 8900, totalViews]} 
        />
        <StatsCard 
          title="Viral WhatsApp Shares" 
          value={totalShares.toLocaleString()} 
          change="Strong social reach" 
          isPositive={true} 
          icon={Share2} 
          sparklineData={[600, 850, 1100, 1350, totalShares]} 
        />
        <StatsCard 
          title="Active Story Channels" 
          value={(categories.length - 1).toString()} 
          change="Categorized feeds" 
          isPositive={true} 
          icon={Compass} 
          sparklineData={[3, 4, 4, 5, categories.length - 1]} 
        />
      </div>

      {/* Category Pills */}
      <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap', alignItems: 'center' }}>
        <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)', marginRight: '0.25rem' }}>Channel:</span>
        {categories.map(cat => (
          <button
            key={cat}
            onClick={() => setSelectedCategory(cat)}
            style={{
              padding: '0.35rem 0.85rem',
              borderRadius: 'var(--radius-full)',
              border: `1px solid ${selectedCategory === cat ? 'var(--border-active)' : 'var(--border-subtle)'}`,
              background: selectedCategory === cat ? 'linear-gradient(135deg, rgba(99, 102, 241, 0.2), rgba(99, 102, 241, 0.05))' : 'rgba(255,255,255,0.02)',
              color: selectedCategory === cat ? '#ffffff' : 'var(--text-secondary)',
              fontSize: '0.8rem',
              fontWeight: selectedCategory === cat ? 600 : 500,
              cursor: 'pointer',
              transition: 'all var(--transition-fast)'
            }}
          >
            {cat}
          </button>
        ))}
      </div>

      {/* Stories Grid */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fill, minmax(340px, 1fr))',
        gap: '1.25rem'
      }}>
        {insights.map(story => (
          <div key={story.insight_uid || story.id} className="card" style={{ display: 'flex', flexDirection: 'column', justifyContent: 'space-between', padding: '0', overflow: 'hidden' }}>
            {/* Top Cover Image */}
            <div style={{ position: 'relative', height: '180px', width: '100%', overflow: 'hidden' }}>
              <img 
                src={story.cover_image_url || 'https://images.unsplash.com/photo-1504711434969-e33886168f5c?w=600&auto=format&fit=crop&q=80'} 
                alt="cover" 
                style={{ width: '100%', height: '100%', objectFit: 'cover' }}
              />
              <span className="badge badge-primary" style={{ position: 'absolute', top: '10px', left: '10px' }}>
                {story.category_name}
              </span>
              <span style={{
                position: 'absolute',
                top: '10px',
                right: '10px',
                background: 'rgba(0,0,0,0.65)',
                backdropFilter: 'blur(4px)',
                padding: '0.2rem 0.55rem',
                borderRadius: 'var(--radius-sm)',
                fontSize: '0.7rem',
                color: '#ffffff',
                fontWeight: 600,
                display: 'flex',
                alignItems: 'center',
                gap: '0.3rem'
              }}>
                <Layers size={11} /> {(story.pages && story.pages.length) || 3} Cards
              </span>
            </div>

            {/* Content Body */}
            <div style={{ padding: '1.25rem' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.4rem', fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                <span className="font-mono text-xs">{story.insight_uid}</span>
                <span>•</span>
                <span>{story.created_at ? new Date(story.created_at).toLocaleDateString() : 'Recent'}</span>
              </div>

              <h3 style={{ color: '#ffffff', fontSize: '1rem', lineHeight: '1.4', marginBottom: '1rem' }}>
                {story.title}
              </h3>

              {/* Stats & Actions */}
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', paddingTop: '0.85rem', borderTop: '1px solid var(--border-subtle)' }}>
                <div style={{ display: 'flex', gap: '0.75rem', fontSize: '0.8rem' }}>
                  <span style={{ color: 'var(--text-muted)', display: 'flex', alignItems: 'center', gap: '0.25rem' }}>
                    <Eye size={13} /> {story.views_count?.toLocaleString() || 0}
                  </span>
                  <span style={{ color: 'var(--primary)', display: 'flex', alignItems: 'center', gap: '0.25rem' }}>
                    <Share2 size={13} /> {story.shares_count?.toLocaleString() || 0}
                  </span>
                </div>

                <div style={{ display: 'flex', gap: '0.5rem' }}>
                  <button 
                    className="btn btn-secondary" 
                    style={{ fontSize: '0.75rem', padding: '0.3rem 0.65rem' }}
                    onClick={() => handleOpenPreview(story)}
                  >
                    <BookOpen size={13} /> Preview Story
                  </button>

                  <button 
                    className="btn btn-danger" 
                    style={{ padding: '0.3rem 0.5rem' }}
                    title="Delete Story"
                    onClick={() => handleDeleteInsight(story.insight_uid)}
                  >
                    <Trash2 size={13} />
                  </button>
                </div>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* STORY READER / CAROUSEL PREVIEW MODAL */}
      <Modal
        isOpen={isPreviewModalOpen}
        onClose={() => setIsPreviewModalOpen(false)}
        title={selectedInsight ? selectedInsight.title : 'Story Preview'}
        size="md"
      >
        {selectedInsight && selectedInsight.pages && selectedInsight.pages.length > 0 && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
            {/* Story Card Mobile Frame */}
            <div style={{
              background: '#020617',
              borderRadius: 'var(--radius-lg)',
              overflow: 'hidden',
              border: '1px solid var(--border-subtle)',
              position: 'relative',
              boxShadow: '0 12px 30px rgba(0,0,0,0.6)'
            }}>
              {/* Progress bars at top (Instagram stories style) */}
              <div style={{
                position: 'absolute',
                top: '10px',
                left: '12px',
                right: '12px',
                zIndex: 10,
                display: 'flex',
                gap: '4px'
              }}>
                {selectedInsight.pages.map((_, idx) => (
                  <div key={idx} style={{
                    flex: 1,
                    height: '3px',
                    borderRadius: '2px',
                    background: idx === currentPageIndex ? '#ffffff' : idx < currentPageIndex ? 'rgba(255,255,255,0.7)' : 'rgba(255,255,255,0.25)',
                    transition: 'background 0.2s ease'
                  }} />
                ))}
              </div>

              {/* Slide Image */}
              <div style={{ height: '220px', width: '100%', position: 'relative' }}>
                <img 
                  src={selectedInsight.pages[currentPageIndex]?.image_url || selectedInsight.cover_image_url} 
                  alt="slide" 
                  style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                />
                <div style={{
                  position: 'absolute',
                  inset: 0,
                  background: 'linear-gradient(to bottom, rgba(0,0,0,0.3) 0%, rgba(2,6,23,0.95) 100%)'
                }} />
              </div>

              {/* Slide Text Content */}
              <div style={{ padding: '1.25rem', minHeight: '140px' }}>
                <span className="badge badge-primary" style={{ marginBottom: '0.5rem', fontSize: '0.65rem' }}>
                  Card {currentPageIndex + 1} of {selectedInsight.pages.length}
                </span>

                <h3 style={{ color: '#ffffff', fontSize: '1.1rem', marginBottom: '0.6rem' }}>
                  {selectedInsight.pages[currentPageIndex]?.title}
                </h3>

                <p style={{ color: 'var(--text-secondary)', fontSize: '0.9rem', lineHeight: '1.5' }}>
                  {selectedInsight.pages[currentPageIndex]?.content}
                </p>
              </div>

              {/* Navigation Controls */}
              <div style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                padding: '0.75rem 1.25rem',
                borderTop: '1px solid rgba(255,255,255,0.06)',
                background: 'rgba(255,255,255,0.02)'
              }}>
                <button 
                  className="btn btn-secondary"
                  style={{ padding: '0.35rem 0.65rem', fontSize: '0.75rem' }}
                  disabled={currentPageIndex === 0}
                  onClick={() => setCurrentPageIndex(prev => Math.max(0, prev - 1))}
                >
                  <ChevronLeft size={14} /> Previous Card
                </button>

                <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                  Tap arrows to flip
                </span>

                <button 
                  className="btn btn-primary"
                  style={{ padding: '0.35rem 0.65rem', fontSize: '0.75rem' }}
                  disabled={currentPageIndex === selectedInsight.pages.length - 1}
                  onClick={() => setCurrentPageIndex(prev => Math.min(selectedInsight.pages.length - 1, prev + 1))}
                >
                  Next Card <ChevronRight size={14} />
                </button>
              </div>
            </div>
          </div>
        )}
      </Modal>

      {/* CREATE STORY MODAL */}
      <Modal
        isOpen={isCreateModalOpen}
        onClose={() => setIsCreateModalOpen(false)}
        title="Create Multi-Page Visual Story"
        size="lg"
      >
        <form onSubmit={handleCreateSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
          <div>
            <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 600, color: 'var(--text-secondary)', marginBottom: '0.4rem' }}>
              Story Title / Cover Headline *
            </label>
            <input 
              type="text" 
              required
              className="input"
              placeholder="e.g. Telangana EV Revolution: 10 Key Facts"
              value={newTitle}
              onChange={(e) => setNewTitle(e.target.value)}
            />
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
            <div>
              <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 600, color: 'var(--text-secondary)', marginBottom: '0.4rem' }}>
                Channel / Category *
              </label>
              <select 
                className="input"
                value={newCategory}
                onChange={(e) => setNewCategory(e.target.value)}
              >
                <option value="Infrastructure">Infrastructure</option>
                <option value="Technology">Technology</option>
                <option value="Sports">Sports</option>
                <option value="Lifestyle">Lifestyle</option>
                <option value="Cinema">Cinema</option>
                <option value="Politics">Politics</option>
                <option value="Business">Business</option>
              </select>
            </div>

            <div>
              <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 600, color: 'var(--text-secondary)', marginBottom: '0.4rem' }}>
                Cover Image URL
              </label>
              <input 
                type="url" 
                className="input"
                placeholder="https://images.unsplash.com/..."
                value={newCoverImage}
                onChange={(e) => setNewCoverImage(e.target.value)}
              />
            </div>
          </div>

          {/* Dynamic Page / Card Builder */}
          <div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.75rem' }}>
              <label style={{ fontSize: '0.85rem', fontWeight: 700, color: '#ffffff' }}>
                Story Cards ({newPages.length} Pages)
              </label>
              <button 
                type="button" 
                className="btn btn-secondary" 
                style={{ fontSize: '0.75rem', padding: '0.25rem 0.65rem' }}
                onClick={handleAddPage}
              >
                + Add Another Card
              </button>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem', maxHeight: '320px', overflowY: 'auto', paddingRight: '0.5rem' }}>
              {newPages.map((page, idx) => (
                <div key={idx} style={{
                  padding: '1rem',
                  borderRadius: 'var(--radius-md)',
                  background: 'rgba(255,255,255,0.02)',
                  border: '1px solid var(--border-subtle)',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '0.6rem'
                }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <span className="badge badge-primary text-xs">Card #{idx + 1}</span>
                    {newPages.length > 1 && (
                      <button 
                        type="button" 
                        onClick={() => handleRemovePage(idx)}
                        style={{ background: 'transparent', border: 'none', color: '#fb7185', cursor: 'pointer' }}
                      >
                        <XCircle size={15} />
                      </button>
                    )}
                  </div>

                  <input 
                    type="text" 
                    required
                    className="input"
                    placeholder={`Card ${idx + 1} Headline`}
                    value={page.title}
                    onChange={(e) => handlePageChange(idx, 'title', e.target.value)}
                  />

                  <textarea 
                    rows={2}
                    required
                    className="input"
                    placeholder="Short 60-word bite-sized summary..."
                    value={page.content}
                    onChange={(e) => handlePageChange(idx, 'content', e.target.value)}
                  />

                  <input 
                    type="url" 
                    className="input"
                    placeholder="Card image URL (optional)"
                    value={page.image_url}
                    onChange={(e) => handlePageChange(idx, 'image_url', e.target.value)}
                  />
                </div>
              ))}
            </div>
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
              {isSubmitting ? 'Publishing Story...' : 'Publish Visual Story'}
            </button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
