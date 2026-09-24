// src/context/AuthContext.jsx
import React, { createContext, useContext, useState, useEffect } from 'react';
import { api } from '../api/client';

export const ROLES = {
  GUEST: 0,
  USER: 1,
  PUBLISHER: 2,
  MODERATOR: 3,
  EDITOR: 4,
  ADMIN: 5,
  SUPER_ADMIN: 6,
  NEWS_EDITOR: 7,
  CONTENT_MANAGER: 8,
  AD_MANAGER: 9,
  ANALYST: 10,
  REPORTER: 11,
  VERIFIER: 12,
  SUPPORT: 13,
};

export const ROLE_DETAILS = {
  [ROLES.GUEST]: { label: 'Guest', color: 'neutral', desc: 'Read-only public access' },
  [ROLES.USER]: { label: 'User', color: 'neutral', desc: 'Standard subscriber' },
  [ROLES.PUBLISHER]: { label: 'Publisher', color: 'cyan', desc: 'Drafts & publishes content' },
  [ROLES.MODERATOR]: { label: 'Moderator', color: 'amber', desc: 'Content review & comment moderation' },
  [ROLES.EDITOR]: { label: 'Editor', color: 'primary', desc: 'Full editorial & category control' },
  [ROLES.ADMIN]: { label: 'Admin', color: 'primary', desc: 'Full operational access' },
  [ROLES.SUPER_ADMIN]: { label: 'Super Admin', color: 'rose', desc: 'Complete unrestricted system access' },
  [ROLES.NEWS_EDITOR]: { label: 'News Editor', color: 'primary', desc: 'News authoring & feed ingestion' },
  [ROLES.CONTENT_MANAGER]: { label: 'Content Manager', color: 'emerald', desc: 'Categories, RSS sources & metrics' },
  [ROLES.AD_MANAGER]: { label: 'Ad Manager', color: 'amber', desc: 'Campaigns & sponsored posts' },
  [ROLES.ANALYST]: { label: 'Analyst', color: 'cyan', desc: 'Analytics, audits & data export' },
  [ROLES.REPORTER]: { label: 'Reporter', color: 'cyan', desc: 'Submits field news drafts' },
  [ROLES.VERIFIER]: { label: 'Verifier', color: 'amber', desc: 'Fact-checks and verifies reports' },
  [ROLES.SUPPORT]: { label: 'Support', color: 'neutral', desc: 'Handles user tickets & inquiries' },
};

export const ROLE_NAMES = {
  0: 'Guest',
  1: 'User',
  2: 'Publisher',
  3: 'Moderator',
  4: 'Editor',
  5: 'Admin',
  6: 'Super Admin',
  7: 'News Editor',
  8: 'Content Manager',
  9: 'Ad Manager',
  10: 'Analyst',
  11: 'Reporter',
  12: 'Verifier',
  13: 'Support',
};

const AuthContext = createContext(null);

export const AuthProvider = ({ children }) => {
  // Default to Admin (Role 5) for portal view, with fast dev switcher for Roles 3-10
  const [role, setRoleState] = useState(() => {
    const saved = localStorage.getItem('hypernews_active_role');
    return saved !== null ? parseInt(saved, 10) : ROLES.ADMIN;
  });

  const roleInfo = ROLE_DETAILS[role] || { label: 'Unknown', color: 'neutral', desc: '' };

  const [user, setUser] = useState({
    uid: 'USR-ADMIN-01',
    name: 'Roshith (Lead Admin)',
    email: 'roshith@hypernews.com',
    role: ROLES.ADMIN,
    roleTitle: 'Admin',
  });

  const [isServerConnected, setIsServerConnected] = useState(false);

  useEffect(() => {
    localStorage.setItem('hypernews_active_role', role);
    setUser((prev) => ({ 
      ...prev, 
      role, 
      roleTitle: roleInfo.label 
    }));
  }, [role, roleInfo.label]);

  // Periodic health check to FastAPI backend
  useEffect(() => {
    const checkBackend = async () => {
      const healthy = await api.checkHealth();
      setIsServerConnected(healthy);
    };
    checkBackend();
    const interval = setInterval(checkBackend, 15000);
    return () => clearInterval(interval);
  }, []);

  const setRole = (newRole) => {
    setRoleState(newRole);
  };

  /**
   * Check if the active role has permission to access a specific module
   */
  const canAccess = (moduleName) => {
    switch (moduleName) {
      case 'dashboard':
        return true;

      case 'news':
        // Roles 4 (Editor), 5 (Admin), 6 (Super Admin), 7 (News Editor), 8 (Content Manager), 11 (Reporter), 2 (Publisher)
        return [ROLES.EDITOR, ROLES.ADMIN, ROLES.SUPER_ADMIN, ROLES.NEWS_EDITOR, ROLES.CONTENT_MANAGER, ROLES.REPORTER, ROLES.PUBLISHER].includes(role);

      case 'posts':
        // Community posts - accessible across editorial and management roles
        return [ROLES.USER, ROLES.PUBLISHER, ROLES.MODERATOR, ROLES.EDITOR, ROLES.ADMIN, ROLES.SUPER_ADMIN, ROLES.NEWS_EDITOR, ROLES.CONTENT_MANAGER, ROLES.ANALYST, ROLES.REPORTER].includes(role);

      case 'moderation':
        // Roles 3 (Moderator), 5 (Admin), 6 (Super Admin), 12 (Verifier)
        return [ROLES.MODERATOR, ROLES.ADMIN, ROLES.SUPER_ADMIN, ROLES.VERIFIER].includes(role);

      case 'polls':
        // Roles 2 (Publisher), 3 (Moderator), 4 (Editor), 5 (Admin), 6 (Super Admin), 7 (News Editor), 8 (Content Manager)
        return [ROLES.PUBLISHER, ROLES.MODERATOR, ROLES.EDITOR, ROLES.ADMIN, ROLES.SUPER_ADMIN, ROLES.NEWS_EDITOR, ROLES.CONTENT_MANAGER].includes(role);

      case 'insights':
        // Roles 2 (Publisher), 4 (Editor), 5 (Admin), 6 (Super Admin), 7 (News Editor), 8 (Content Manager), 3 (Moderator)
        return [ROLES.PUBLISHER, ROLES.EDITOR, ROLES.ADMIN, ROLES.SUPER_ADMIN, ROLES.NEWS_EDITOR, ROLES.CONTENT_MANAGER, ROLES.MODERATOR].includes(role);

      case 'shorts':
        // Roles 2 (Publisher), 4 (Editor), 5 (Admin), 6 (Super Admin), 7 (News Editor), 8 (Content Manager), 11 (Reporter), 3 (Moderator)
        return [ROLES.PUBLISHER, ROLES.EDITOR, ROLES.ADMIN, ROLES.SUPER_ADMIN, ROLES.NEWS_EDITOR, ROLES.CONTENT_MANAGER, ROLES.REPORTER, ROLES.MODERATOR].includes(role);

      case 'rewards':
        // Roles 5 (Admin), 6 (Super Admin), 10 (Analyst)
        return [ROLES.ADMIN, ROLES.SUPER_ADMIN, ROLES.ANALYST].includes(role);

      case 'sponsored':
        // Roles 4 (Editor), 5 (Admin), 6 (Super Admin), 8 (Content Manager), 9 (Ad Manager)
        return [ROLES.EDITOR, ROLES.ADMIN, ROLES.SUPER_ADMIN, ROLES.CONTENT_MANAGER, ROLES.AD_MANAGER].includes(role);

      case 'ads':
        // Roles 5 (Admin), 6 (Super Admin), 9 (Ad Manager)
        return [ROLES.ADMIN, ROLES.SUPER_ADMIN, ROLES.AD_MANAGER].includes(role);

      case 'users':
        // Roles 5 (Admin), 6 (Super Admin)
        return [ROLES.ADMIN, ROLES.SUPER_ADMIN].includes(role);

      case 'analytics':
        // Roles 5 (Admin), 6 (Super Admin), 8 (Content Manager), 9 (Ad Manager), 10 (Analyst)
        return [ROLES.ADMIN, ROLES.SUPER_ADMIN, ROLES.CONTENT_MANAGER, ROLES.AD_MANAGER, ROLES.ANALYST].includes(role);

      case 'settings':
        // Roles 5 (Admin), 6 (Super Admin)
        return [ROLES.ADMIN, ROLES.SUPER_ADMIN].includes(role);

      case 'location':
        // Roles 4 (Editor), 5 (Admin), 6 (Super Admin), 8 (Content Manager), 10 (Analyst)
        return [ROLES.EDITOR, ROLES.ADMIN, ROLES.SUPER_ADMIN, ROLES.CONTENT_MANAGER, ROLES.ANALYST].includes(role);

      case 'events':
        // Roles 2 (Publisher), 3 (Moderator), 4 (Editor), 5 (Admin), 6 (Super Admin), 8 (Content Manager)
        return [ROLES.PUBLISHER, ROLES.MODERATOR, ROLES.EDITOR, ROLES.ADMIN, ROLES.SUPER_ADMIN, ROLES.CONTENT_MANAGER].includes(role);

      case 'profile':
        return true;

      default:
        return false;
    }
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        role,
        currentRole: role,
        setRole,
        roleInfo,
        canAccess,
        isServerConnected,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
