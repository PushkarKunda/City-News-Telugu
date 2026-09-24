// src/views/PollsManagementView.jsx
import React, { useState, useEffect, useCallback } from 'react';
import { useAuth } from '../context/AuthContext';
import { api } from '../api/client';
import Modal from '../components/common/Modal';
import StatsCard from '../components/common/StatsCard';
import { 
  Vote, 
  Plus, 
  CheckCircle2, 
  XCircle, 
  Trash2, 
  Clock, 
  AlertCircle, 
  RefreshCw, 
  Users, 
  BarChart3, 
  Radio, 
  Globe, 
  HelpCircle,
  TrendingUp,
  Flame
} from 'lucide-react';

const INITIAL_ACTIVE_POLLS = [
  {
    id: 1,
    poll_uid: 'POL-781',
    question: 'Should the Hyderabad Metro Rail expansion to the Airport be accelerated in the upcoming fiscal budget?',
    options: ['Strongly Agree', 'Agree with Conditions', 'Focus on City First', 'No Opinion'],
    votes: [482, 195, 64, 21],
    total_votes: 762,
    language: 'Telugu / English',
    is_approved: true,
    expires_at: '2026-10-15T18:30:00Z',
    created_at: '2026-09-18T10:00:00Z'
  },
  {
    id: 2,
    poll_uid: 'POL-782',
    question: 'Do you support 24/7 public parks and recreational lakefronts in the IT corridor?',
    options: ['Yes, fully support', 'Yes, but with strict security', 'No, concerns over noise'],
    votes: [1240, 540, 89],
    total_votes: 1869,
    language: 'English',
    is_approved: true,
    expires_at: '2026-10-01T23:59:59Z',
    created_at: '2026-09-19T08:15:00Z'
  },
  {
    id: 3,
    poll_uid: 'POL-783',
    question: 'How do you rate the municipal response to the recent monsoon drainage maintenance?',
    options: ['Excellent (4-5★)', 'Moderate (3★)', 'Needs Improvement (1-2★)'],
    votes: [120, 310, 680],
    total_votes: 1110,
    language: 'Telugu',
    is_approved: true,
    expires_at: '2026-09-28T12:00:00Z',
    created_at: '2026-09-17T14:30:00Z'
  }
];

const INITIAL_PENDING_POLLS = [
  {
    id: 101,
    poll_uid: 'POL-901',
    question: 'Should local ward committee meetings be streamed live on social media platforms?',
    options: ['Yes, mandatory live stream', 'Recorded version is fine', 'Not necessary'],
    created_by: 'USR-CITIZEN-42',
    created_at: '2026-09-20T11:20:00Z',
    expires_at: '2026-10-30T00:00:00Z'
  }
];

export default function PollsManagementView() {
  const { user, role } = useAuth();

  const [activePolls, setActivePolls] = useState(INITIAL_ACTIVE_POLLS);
  const [pendingPolls, setPendingPolls] = useState(INITIAL_PENDING_POLLS);
  const [currentTab, setCurrentTab] = useState('active'); // 'active' | 'pending'
  const [isLoading, setIsLoading] = useState(false);
  const [isSyncing, setIsSyncing] = useState(false);
  const [dbConnected, setDbConnected] = useState(false);
  const [notification, setNotification] = useState(null);

  // Modal State
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [isVoteModalOpen, setIsVoteModalOpen] = useState(false);
  const [selectedPollForVote, setSelectedPollForVote] = useState(null);
  const [selectedVoteOption, setSelectedVoteOption] = useState(null);

  // Form State
  const [newPollQuestion, setNewPollQuestion] = useState('');
  const [newPollOptions, setNewPollOptions] = useState(['', '']);
  const [newPollExpiry, setNewPollExpiry] = useState('');
  const [newPollLang, setNewPollLang] = useState('en');

  const showToast = (message, type = 'success') => {
    setNotification({ message, type });
    setTimeout(() => setNotification(null), 4000);
  };

  // Fetch polls from backend
  const fetchPolls = useCallback(async () => {
    setIsSyncing(true);
    try {
      // Try active polls
      const activeRes = await api.getActivePolls(50, 0);
      if (activeRes && activeRes.items && activeRes.items.length > 0) {
        const formatted = activeRes.items.map(p => {
          const votesArray = Array.isArray(p.votes) ? p.votes : [];
          const totalVotes = votesArray.reduce((acc, v) => acc + (Number(v) || 0), 0);
          return {
            ...p,
            total_votes: totalVotes,
            options: Array.isArray(p.options) ? p.options : [],
            votes: votesArray,
          };
        });
        setActivePolls(formatted);
      }
      setDbConnected(true);

      // Try pending polls
      try {
        const pendingRes = await api.getPendingPolls(50, 0);
        if (pendingRes && pendingRes.items) {
          setPendingPolls(pendingRes.items);
        }
      } catch {
        // May require moderator/admin auth or be empty
      }
    } catch {
      // Backend not running or table empty: gracefully retain current state
      setDbConnected(false);
    } finally {
      setIsSyncing(false);
    }
  }, []);

  useEffect(() => {
    fetchPolls();
  }, [fetchPolls]);

  // Handle Poll Creation
  const handleAddOption = () => {
    if (newPollOptions.length < 8) {
      setNewPollOptions([...newPollOptions, '']);
    } else {
      showToast('Maximum 8 options allowed per poll.', 'warning');
    }
  };

  const handleRemoveOption = (index) => {
    if (newPollOptions.length > 2) {
      setNewPollOptions(newPollOptions.filter((_, idx) => idx !== index));
    } else {
      showToast('At least 2 options are required.', 'warning');
    }
  };

  const handleOptionChange = (index, value) => {
    const updated = [...newPollOptions];
    updated[index] = value;
    setNewPollOptions(updated);
  };

  const handleCreatePollSubmit = async (e) => {
    e.preventDefault();
    const cleanOptions = newPollOptions.map(o => o.trim()).filter(Boolean);
    if (cleanOptions.length < 2) {
      showToast('Please provide at least 2 valid options.', 'warning');
      return;
    }

    const payload = {
      question: newPollQuestion.trim(),
      options: cleanOptions,
      expires_at: newPollExpiry ? new Date(newPollExpiry).toISOString() : null,
      language_id: newPollLang === 'te' ? 2 : 1,
    };

    try {
      setIsLoading(true);
      await api.createPoll(payload);
      showToast('Poll created and submitted for review successfully!');
      setIsCreateModalOpen(false);
      setNewPollQuestion('');
      setNewPollOptions(['', '']);
      setNewPollExpiry('');
      fetchPolls();
    } catch {
      // Fallback local addition if backend offline
      const localPoll = {
        id: Date.now(),
        poll_uid: `POL-${Math.floor(100 + Math.random() * 900)}`,
        question: payload.question,
        options: payload.options,
        votes: new Array(cleanOptions.length).fill(0),
        total_votes: 0,
        language: newPollLang === 'te' ? 'Telugu' : 'English',
        is_approved: true,
        expires_at: payload.expires_at || '2026-10-31T23:59:59Z',
        created_at: new Date().toISOString()
      };
      setActivePolls([localPoll, ...activePolls]);
      showToast('Poll created in local session (Backend offline)!');
      setIsCreateModalOpen(false);
      setNewPollQuestion('');
      setNewPollOptions(['', '']);
      setNewPollExpiry('');
    } finally {
      setIsLoading(false);
    }
  };

  // Handle Approve/Reject Poll
  const handleModeratePoll = async (pollId, isApproved) => {
    try {
      await api.approvePoll(pollId, isApproved);
      showToast(`Poll ${isApproved ? 'approved and published' : 'rejected'}!`);
      setPendingPolls(prev => prev.filter(p => p.id !== pollId));
      fetchPolls();
    } catch {
      // Local fallback
      const target = pendingPolls.find(p => p.id === pollId);
      if (target && isApproved) {
        setActivePolls([
          {
            ...target,
            is_approved: true,
            votes: new Array(target.options?.length || 2).fill(0),
            total_votes: 0,
            language: 'English'
          },
          ...activePolls
        ]);
      }
      setPendingPolls(prev => prev.filter(p => p.id !== pollId));
      showToast(`Poll ${isApproved ? 'approved' : 'rejected'} (Local state update)!`);
    }
  };

  // Handle Delete Poll
  const handleDeletePoll = async (pollId) => {
    if (!window.confirm('Are you sure you want to permanently delete this poll?')) return;
    try {
      await api.deletePoll(pollId);
      showToast('Poll removed from database.');
      setActivePolls(prev => prev.filter(p => p.id !== pollId));
    } catch {
      setActivePolls(prev => prev.filter(p => p.id !== pollId));
      showToast('Poll removed from active view.');
    }
  };

  // Handle Test Vote
  const handleVoteSubmit = async () => {
    if (selectedVoteOption === null || !selectedPollForVote) return;

    try {
      await api.votePoll(selectedPollForVote.poll_uid, selectedVoteOption, user.uid);
      showToast(`Vote recorded for "${selectedPollForVote.options[selectedVoteOption]}"!`);
      fetchPolls();
    } catch {
      // Local update
      setActivePolls(prev => prev.map(p => {
        if (p.id === selectedPollForVote.id) {
          const newVotes = [...p.votes];
          newVotes[selectedVoteOption] = (newVotes[selectedVoteOption] || 0) + 1;
          return {
            ...p,
            votes: newVotes,
            total_votes: (p.total_votes || 0) + 1
          };
        }
        return p;
      }));
      showToast(`Vote recorded for "${selectedPollForVote.options[selectedVoteOption]}" (Local simulated vote)!`);
    } finally {
      setIsVoteModalOpen(false);
      setSelectedPollForVote(null);
      setSelectedVoteOption(null);
    }
  };

  // Calculations
  const totalVotesAcrossAll = activePolls.reduce((acc, p) => acc + (p.total_votes || 0), 0);
  const avgVotesPerPoll = activePolls.length > 0 ? Math.round(totalVotesAcrossAll / activePolls.length) : 0;

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
              <Vote className="text-primary" size={28} />
              Hyperlocal Polls & Citizen Sentiment
            </h1>
            <span className={`badge ${dbConnected ? 'badge-success' : 'badge-warning'}`} style={{ display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
              <span style={{ width: '8px', height: '8px', borderRadius: '50%', background: dbConnected ? '#34d399' : '#fbbf24', display: 'inline-block' }} />
              {dbConnected ? 'Live DB Sync' : 'Offline / Standalone'}
            </span>
          </div>
          <p style={{ marginTop: '0.3rem' }}>
            Real-time public sentiment monitoring, dynamic option voting, expiration enforcement, and community poll approval.
          </p>
        </div>

        <div style={{ display: 'flex', gap: '0.75rem', alignItems: 'center' }}>
          <button 
            className="btn btn-secondary" 
            onClick={fetchPolls} 
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
            <Plus size={18} /> Create New Poll
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
          title="Active Live Polls" 
          value={activePolls.length.toString()} 
          change={`${pendingPolls.length} pending approval`} 
          isPositive={true} 
          icon={Radio} 
          sparklineData={[2, 3, 3, 4, 3, activePolls.length]} 
        />
        <StatsCard 
          title="Total Votes Recorded" 
          value={totalVotesAcrossAll.toLocaleString()} 
          change="+18.2% this week" 
          isPositive={true} 
          icon={Users} 
          sparklineData={[1200, 1800, 2400, 3100, 3741]} 
        />
        <StatsCard 
          title="Avg. Participation" 
          value={`${avgVotesPerPoll} / poll`} 
          change="Strong citizen engagement" 
          isPositive={true} 
          icon={TrendingUp} 
          sparklineData={[450, 620, 780, 890, avgVotesPerPoll]} 
        />
        <StatsCard 
          title="Moderation Backlog" 
          value={pendingPolls.length.toString()} 
          change={pendingPolls.length > 0 ? "Requires review" : "All cleared"} 
          isPositive={pendingPolls.length === 0} 
          icon={Clock} 
          sparklineData={[4, 3, 2, 1, pendingPolls.length]} 
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
          <Flame size={16} color={currentTab === 'active' ? 'var(--primary)' : 'currentColor'} />
          Active Polls ({activePolls.length})
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
          Pending Moderation ({pendingPolls.length})
          {pendingPolls.length > 0 && (
            <span className="badge badge-warning" style={{ fontSize: '0.65rem', padding: '0.1rem 0.4rem' }}>
              Action Needed
            </span>
          )}
        </button>
      </div>

      {/* Tab Content: Active Polls */}
      {currentTab === 'active' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
          {activePolls.length === 0 ? (
            <div className="card text-center" style={{ padding: '3rem 1.5rem', textAlign: 'center' }}>
              <Vote size={48} style={{ margin: '0 auto 1rem', color: 'var(--text-muted)' }} />
              <h3 style={{ color: '#ffffff', marginBottom: '0.5rem' }}>No Active Polls Found</h3>
              <p style={{ maxWidth: '400px', margin: '0 auto 1.5rem' }}>
                There are currently no active public polls. Create a new poll to begin gathering citizen sentiment.
              </p>
              <button className="btn btn-primary" onClick={() => setIsCreateModalOpen(true)}>
                <Plus size={16} /> Launch First Poll
              </button>
            </div>
          ) : (
            <div style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fill, minmax(450px, 1fr))',
              gap: '1.25rem'
            }}>
              {activePolls.map(poll => {
                const total = poll.total_votes || 1;
                return (
                  <div key={poll.id} className="card" style={{ display: 'flex', flexDirection: 'column', justifyContent: 'space-between' }}>
                    <div>
                      {/* Top Meta */}
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.85rem' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                          <span className="badge badge-primary font-mono text-xs">{poll.poll_uid}</span>
                          <span className="badge badge-neutral text-xs" style={{ display: 'flex', alignItems: 'center', gap: '0.25rem' }}>
                            <Globe size={11} /> {poll.language || 'English'}
                          </span>
                        </div>

                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.35rem', fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                          <Clock size={12} />
                          <span>Expires {poll.expires_at ? new Date(poll.expires_at).toLocaleDateString() : 'Never'}</span>
                        </div>
                      </div>

                      {/* Question */}
                      <h3 style={{ color: '#ffffff', fontSize: '1.05rem', lineHeight: '1.4', marginBottom: '1.25rem' }}>
                        {poll.question}
                      </h3>

                      {/* Options & Progress Bars */}
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem', marginBottom: '1.5rem' }}>
                        {poll.options.map((option, idx) => {
                          const voteCount = (poll.votes && poll.votes[idx]) || 0;
                          const percentage = Math.round((voteCount / (poll.total_votes || 1)) * 100);

                          return (
                            <div key={idx} style={{
                              background: 'rgba(255, 255, 255, 0.03)',
                              borderRadius: 'var(--radius-md)',
                              padding: '0.75rem 0.9rem',
                              border: '1px solid var(--border-subtle)',
                              position: 'relative',
                              overflow: 'hidden'
                            }}>
                              {/* Background progress fill */}
                              <div style={{
                                position: 'absolute',
                                left: 0,
                                top: 0,
                                bottom: 0,
                                width: `${percentage}%`,
                                background: 'linear-gradient(90deg, rgba(99, 102, 241, 0.25), rgba(99, 102, 241, 0.1))',
                                zIndex: 0,
                                transition: 'width 0.4s ease-out'
                              }} />

                              <div style={{ position: 'relative', zIndex: 1, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                <span style={{ fontSize: '0.875rem', fontWeight: 600, color: '#f8fafc' }}>
                                  {option}
                                </span>
                                <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
                                  <span style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>
                                    {voteCount.toLocaleString()} votes
                                  </span>
                                  <span style={{ fontSize: '0.85rem', fontWeight: 700, color: 'var(--primary)' }}>
                                    {percentage}%
                                  </span>
                                </div>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    </div>

                    {/* Footer Actions */}
                    <div style={{
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      paddingTop: '0.9rem',
                      borderTop: '1px solid var(--border-subtle)',
                      fontSize: '0.8rem',
                      color: 'var(--text-muted)'
                    }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                        <Users size={14} />
                        <span><strong>{poll.total_votes?.toLocaleString() || 0}</strong> citizens participated</span>
                      </div>

                      <div style={{ display: 'flex', gap: '0.5rem' }}>
                        <button 
                          className="btn btn-secondary" 
                          style={{ fontSize: '0.775rem', padding: '0.35rem 0.75rem' }}
                          onClick={() => {
                            setSelectedPollForVote(poll);
                            setSelectedVoteOption(0);
                            setIsVoteModalOpen(true);
                          }}
                        >
                          <Vote size={14} /> Cast Vote
                        </button>

                        <button 
                          className="btn btn-danger" 
                          style={{ padding: '0.35rem 0.55rem' }}
                          title="Delete Poll"
                          onClick={() => handleDeletePoll(poll.id)}
                        >
                          <Trash2 size={14} />
                        </button>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* Tab Content: Pending Polls Moderation */}
      {currentTab === 'pending' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
          {pendingPolls.length === 0 ? (
            <div className="card text-center" style={{ padding: '3rem 1.5rem', textAlign: 'center' }}>
              <CheckCircle2 size={48} style={{ margin: '0 auto 1rem', color: 'var(--accent-emerald)' }} />
              <h3 style={{ color: '#ffffff', marginBottom: '0.5rem' }}>Moderation Queue Empty</h3>
              <p style={{ color: 'var(--text-secondary)' }}>
                All user-submitted polls have been moderated and processed. Great job!
              </p>
            </div>
          ) : (
            pendingPolls.map(poll => (
              <div key={poll.id} className="card" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '1.25rem' }}>
                <div style={{ flex: '1 1 350px' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.4rem' }}>
                    <span className="badge badge-warning text-xs font-mono">{poll.poll_uid}</span>
                    <span className="badge badge-neutral text-xs">Submitted by {poll.created_by || 'User'}</span>
                    <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                      {new Date(poll.created_at).toLocaleString()}
                    </span>
                  </div>

                  <h3 style={{ color: '#ffffff', fontSize: '1.05rem', marginBottom: '0.6rem' }}>
                    {poll.question}
                  </h3>

                  <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
                    {(poll.options || []).map((opt, idx) => (
                      <span key={idx} style={{
                        fontSize: '0.8rem',
                        padding: '0.2rem 0.6rem',
                        borderRadius: 'var(--radius-sm)',
                        background: 'rgba(255, 255, 255, 0.05)',
                        border: '1px solid var(--border-subtle)',
                        color: 'var(--text-secondary)'
                      }}>
                        {idx + 1}. {opt}
                      </span>
                    ))}
                  </div>
                </div>

                <div style={{ display: 'flex', gap: '0.75rem', alignItems: 'center' }}>
                  <button 
                    className="btn btn-success"
                    onClick={() => handleModeratePoll(poll.id, true)}
                    style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}
                  >
                    <CheckCircle2 size={16} /> Approve & Publish
                  </button>

                  <button 
                    className="btn btn-danger"
                    onClick={() => handleModeratePoll(poll.id, false)}
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

      {/* CREATE POLL MODAL */}
      <Modal
        isOpen={isCreateModalOpen}
        onClose={() => setIsCreateModalOpen(false)}
        title="Create & Broadcast New Poll"
        size="md"
      >
        <form onSubmit={handleCreatePollSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
          <div>
            <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 600, color: 'var(--text-secondary)', marginBottom: '0.4rem' }}>
              Poll Question *
            </label>
            <input 
              type="text" 
              required
              className="input"
              placeholder="e.g. Should the municipal body introduce electric feeder buses to metro stations?"
              value={newPollQuestion}
              onChange={(e) => setNewPollQuestion(e.target.value)}
            />
          </div>

          <div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.5rem' }}>
              <label style={{ fontSize: '0.8rem', fontWeight: 600, color: 'var(--text-secondary)' }}>
                Poll Options (Minimum 2, Maximum 8) *
              </label>
              <button 
                type="button" 
                className="btn btn-secondary" 
                style={{ fontSize: '0.75rem', padding: '0.2rem 0.6rem' }}
                onClick={handleAddOption}
              >
                + Add Option
              </button>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
              {newPollOptions.map((opt, idx) => (
                <div key={idx} style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
                  <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)', width: '20px' }}>
                    {idx + 1}.
                  </span>
                  <input 
                    type="text" 
                    required
                    className="input"
                    placeholder={`Option ${idx + 1} text`}
                    value={opt}
                    onChange={(e) => handleOptionChange(idx, e.target.value)}
                  />
                  {newPollOptions.length > 2 && (
                    <button 
                      type="button" 
                      onClick={() => handleRemoveOption(idx)}
                      style={{ background: 'transparent', border: 'none', color: '#fb7185', cursor: 'pointer', padding: '0.3rem' }}
                    >
                      <XCircle size={16} />
                    </button>
                  )}
                </div>
              ))}
            </div>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
            <div>
              <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 600, color: 'var(--text-secondary)', marginBottom: '0.4rem' }}>
                Primary Language
              </label>
              <select 
                className="input"
                value={newPollLang}
                onChange={(e) => setNewPollLang(e.target.value)}
              >
                <option value="en">English</option>
                <option value="te">Telugu (తెలుగు)</option>
                <option value="hi">Hindi (हिंदी)</option>
              </select>
            </div>

            <div>
              <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 600, color: 'var(--text-secondary)', marginBottom: '0.4rem' }}>
                Expiry Date & Time (Optional)
              </label>
              <input 
                type="datetime-local" 
                className="input"
                value={newPollExpiry}
                onChange={(e) => setNewPollExpiry(e.target.value)}
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
              disabled={isLoading}
            >
              {isLoading ? 'Creating Poll...' : 'Publish Poll'}
            </button>
          </div>
        </form>
      </Modal>

      {/* TEST VOTE MODAL */}
      <Modal
        isOpen={isVoteModalOpen}
        onClose={() => setIsVoteModalOpen(false)}
        title="Simulate / Record Citizen Vote"
        size="sm"
      >
        {selectedPollForVote && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
            <p style={{ color: '#f8fafc', fontWeight: 600, fontSize: '0.95rem' }}>
              {selectedPollForVote.question}
            </p>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.6rem' }}>
              {selectedPollForVote.options.map((option, idx) => (
                <label 
                  key={idx}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '0.6rem',
                    padding: '0.75rem',
                    borderRadius: 'var(--radius-md)',
                    background: selectedVoteOption === idx ? 'rgba(99, 102, 241, 0.15)' : 'rgba(255, 255, 255, 0.02)',
                    border: `1px solid ${selectedVoteOption === idx ? 'var(--primary)' : 'var(--border-subtle)'}`,
                    cursor: 'pointer'
                  }}
                >
                  <input 
                    type="radio" 
                    name="vote_option"
                    checked={selectedVoteOption === idx}
                    onChange={() => setSelectedVoteOption(idx)}
                  />
                  <span style={{ fontSize: '0.875rem', color: '#ffffff' }}>{option}</span>
                </label>
              ))}
            </div>

            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.75rem', marginTop: '0.5rem' }}>
              <button className="btn btn-secondary" onClick={() => setIsVoteModalOpen(false)}>
                Cancel
              </button>
              <button className="btn btn-primary" onClick={handleVoteSubmit}>
                Submit Vote
              </button>
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
}
