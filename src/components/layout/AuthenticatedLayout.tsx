import React, { useState, useEffect, useCallback } from 'react';
import { Outlet } from 'react-router-dom';
import { AppLayout } from './AppLayout';
import { AuthUser } from '../landing/AuthPanel';
import { fetchWardrobeSummary } from '../../features/wardrobe/api/wardrobeApi';

export interface AuthenticatedLayoutContext {
  user: AuthUser;
  onLogout: () => void;
  closetCount: number | undefined;
  refreshClosetCount: () => Promise<void>;
}

interface AuthenticatedLayoutProps {
  user: AuthUser;
  onLogout: () => void;
}

export const AuthenticatedLayout: React.FC<AuthenticatedLayoutProps> = ({ user, onLogout }) => {
  const [closetCount, setClosetCount] = useState<number | undefined>(undefined);

  const refreshClosetCount = useCallback(async () => {
    try {
      const res = await fetchWardrobeSummary();
      if (res?.summary?.totalItems !== undefined) {
        setClosetCount(res.summary.totalItems);
      } else if (typeof (res as any)?.totalItems === 'number') {
        setClosetCount((res as any).totalItems);
      }
    } catch {
      // Quiet fail on network hiccups; count will remain unchanged
    }
  }, []);

  useEffect(() => {
    refreshClosetCount();
  }, [refreshClosetCount]);

  return (
    <AppLayout user={user} onLogout={onLogout} closetCount={closetCount}>
      <Outlet context={{ user, onLogout, closetCount, refreshClosetCount } satisfies AuthenticatedLayoutContext} />
    </AppLayout>
  );
};

export default AuthenticatedLayout;
