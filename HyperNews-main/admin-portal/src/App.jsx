import React, { useState, useEffect } from 'react';
import { AuthProvider, useAuth } from './context/AuthContext';
import { ToastProvider } from './context/ToastContext';
import { Header } from './components/layout/Header';
import { Sidebar } from './components/layout/Sidebar';
import { DashboardView } from './views/DashboardView';
import NewsManagementView from './views/NewsManagementView';
import ModerationView from './views/ModerationView';
import AdsManagementView from './views/AdsManagementView';
import UserManagementView from './views/UserManagementView';
import AnalyticsView from './views/AnalyticsView';
import SystemSettingsView from './views/SystemSettingsView';
import PollsManagementView from './views/PollsManagementView';
import RewardsManagementView from './views/RewardsManagementView';
import SponsoredPostsView from './views/SponsoredPostsView';
import InsightsManagementView from './views/InsightsManagementView';
import ShortsManagementView from './views/ShortsManagementView';
import PostsManagementView from './views/PostsManagementView';
import ProfileView from './views/ProfileView';
import LocationManagementView from './views/LocationManagementView';
import { ShieldAlert } from 'lucide-react';

function PortalContent() {
  const { role, canAccess } = useAuth();
  const [activeTab, setActiveTab] = useState('dashboard');

  // If the active role changes and cannot access the current tab, fall back to dashboard
  useEffect(() => {
    if (!canAccess(activeTab)) {
      setActiveTab('dashboard');
    }
  }, [role, activeTab, canAccess]);

  const renderCurrentView = () => {
    switch (activeTab) {
      case 'dashboard':
        return <DashboardView setActiveTab={setActiveTab} />;
      case 'news':
        return <NewsManagementView />;
      case 'posts':
        return <PostsManagementView />;
      case 'insights':
        return <InsightsManagementView />;
      case 'shorts':
        return <ShortsManagementView />;
      case 'polls':
        return <PollsManagementView />;
      case 'rewards':
        return <RewardsManagementView />;
      case 'sponsored':
        return <SponsoredPostsView />;
      case 'moderation':
        return <ModerationView />;
      case 'ads':
        return <AdsManagementView />;
      case 'users':
        return <UserManagementView />;
      case 'analytics':
        return <AnalyticsView />;
      case 'location':
        return <LocationManagementView initialTab="languages" />;
      case 'events':
        return <LocationManagementView initialTab="events" />;
      case 'settings':
        return <SystemSettingsView />;
      case 'profile':
        return <ProfileView />;
      default:
        return (
          <div className="card glass-card p-12 text-center text-muted">
            <ShieldAlert size={48} className="mx-auto text-amber-400 mb-3" />
            <h3 className="text-lg font-bold text-white">Access Restricted</h3>
            <p className="text-sm mt-1">Your current role does not have authorization to view this module.</p>
          </div>
        );
    }
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100vh', overflow: 'hidden' }}>
      <Header onOpenProfile={() => setActiveTab('profile')} />
      <div style={{ display: 'flex', flex: 1, overflow: 'hidden', minHeight: 0 }}>
        <Sidebar activeTab={activeTab} setActiveTab={setActiveTab} />
        <main style={{ 
          flex: 1, 
          overflowY: 'auto', 
          padding: '1.75rem', 
          background: 'radial-gradient(ellipse at top, #0f172a 0%, #080c14 100%)',
          position: 'relative'
        }}>
          {renderCurrentView()}
        </main>
      </div>
    </div>
  );
}

export default function App() {
  return (
    <AuthProvider>
      <ToastProvider>
        <PortalContent />
      </ToastProvider>
    </AuthProvider>
  );
}
