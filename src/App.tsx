import React, { useState, useEffect } from 'react';
import {
  BrowserRouter,
  Routes,
  Route,
  Navigate,
  useNavigate,
  useLocation,
  useSearchParams,
} from 'react-router-dom';
import { LandingPage } from './components/landing/LandingPage';
import { AuthUser } from './components/landing/AuthPanel';
import { AuthenticatedLayout } from './components/layout/AuthenticatedLayout';
import { DashboardPage } from './features/dashboard';
import { WardrobePage } from './features/wardrobe';
import { StudioPage, LookbookPage, OutfitsPage } from './features/outfits';
import { CalendarPage } from './pages/CalendarPage';
import { InsightsPage } from './pages/InsightsPage';
import { AssistantPage } from './pages/AssistantPage';
import { SettingsPage } from './pages/SettingsPage';
import { NotFoundPage } from './pages/NotFoundPage';

// Minimal elegant loading screen during session restoration
const SessionLoadingScreen: React.FC = () => (
  <div className="min-h-screen bg-[#FDFBF7] flex flex-col items-center justify-center p-4">
    <div className="w-11 h-11 rounded-2xl bg-[#5B1924] flex items-center justify-center text-[#FDFBF7] shadow-xl mb-3 animate-pulse">
      <span className="font-editorial text-lg font-bold">CB</span>
    </div>
    <p className="text-xs uppercase tracking-widest text-[#8C8379] font-medium animate-pulse">
      Restoring session...
    </p>
  </div>
);

// Landing route wrapper with support for query/state-driven auth modal opening
const LandingRoute: React.FC<{
  user: AuthUser | null;
  onAuthSuccess: (user: AuthUser) => void;
}> = ({ user, onAuthSuccess }) => {
  const navigate = useNavigate();
  const location = useLocation();
  const searchParams = new URLSearchParams(location.search);
  const shouldOpenAuth =
    searchParams.get('auth') === 'login' ||
    Boolean((location.state as any)?.openAuth);

  return (
    <LandingPage
      onOpenApp={() => {
        if (user) {
          navigate('/dashboard');
        }
      }}
      onAuthSuccess={onAuthSuccess}
      initialOpenAuth={shouldOpenAuth}
    />
  );
};

// Protected layout route with session restoration check and automatic redirect to login
const ProtectedRoute: React.FC<{
  user: AuthUser | null;
  isCheckingSession: boolean;
  onLogout: () => void;
}> = ({ user, isCheckingSession, onLogout }) => {
  const location = useLocation();

  if (isCheckingSession) {
    return <SessionLoadingScreen />;
  }

  if (!user) {
    return (
      <Navigate
        to="/?auth=login"
        replace
        state={{ openAuth: true, from: location }}
      />
    );
  }

  return <AuthenticatedLayout user={user} onLogout={onLogout} />;
};

// Redirect helper for legacy /studio paths (preserving any outfitId query param)
const StudioRedirect: React.FC = () => {
  const [searchParams] = useSearchParams();
  const outfitId = searchParams.get('outfitId');
  if (outfitId) {
    return <Navigate to={`/outfits/${encodeURIComponent(outfitId)}`} replace />;
  }
  return <Navigate to="/outfits/create" replace />;
};

// Main routing container
const AppRoutes: React.FC = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const [user, setUser] = useState<AuthUser | null>(null);
  const [isCheckingSession, setIsCheckingSession] = useState(true);

  // Restore authenticated session from MongoDB Atlas cookie on startup
  useEffect(() => {
    let isMounted = true;
    const restoreSession = async () => {
      try {
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 2000);
        const res = await fetch('/api/auth/me', {
          credentials: 'include',
          signal: controller.signal,
        });
        clearTimeout(timeoutId);
        if (res.ok) {
          const data = await res.json();
          if (isMounted && data?.user) {
            setUser(data.user);
          }
        }
      } catch (err) {
        // Offline or unauthenticated initial state
      } finally {
        if (isMounted) {
          setIsCheckingSession(false);
        }
      }
    };

    restoreSession();
    return () => {
      isMounted = false;
    };
  }, []);

  // Handle successful login or signup (email/password or Google)
  const handleAuthSuccess = (authenticatedUser: AuthUser) => {
    setUser(authenticatedUser);
    const returnPath = (location.state as any)?.from?.pathname;
    navigate(returnPath && returnPath !== '/' ? returnPath : '/dashboard');
  };

  // Handle server logout, destroy session, and return to landing
  const handleLogout = async () => {
    try {
      await fetch('/api/auth/logout', {
        method: 'POST',
        credentials: 'include',
      });
    } catch (err) {
      console.error('Logout request error:', err);
    } finally {
      setUser(null);
      navigate('/');
    }
  };

  return (
    <Routes>
      {/* 1. Public Landing Page */}
      <Route
        path="/"
        element={
          <LandingRoute
            user={user}
            onAuthSuccess={handleAuthSuccess}
          />
        }
      />

      {/* 2. Authenticated Application Layout with Persistent Navigation */}
      <Route
        element={
          <ProtectedRoute
            user={user}
            isCheckingSession={isCheckingSession}
            onLogout={handleLogout}
          />
        }
      >
        <Route path="/dashboard" element={<DashboardPage user={user!} onLogout={handleLogout} />} />
        <Route path="/wardrobe" element={<WardrobePage />} />

        {/* Unified Outfits Destination */}
        <Route path="/outfits" element={<OutfitsPage />} />
        <Route path="/outfits/create" element={<StudioPage />} />
        <Route path="/outfits/:id" element={<StudioPage />} />

        <Route path="/calendar" element={<CalendarPage />} />
        <Route path="/insights" element={<InsightsPage />} />
        <Route path="/assistant" element={<AssistantPage />} />
        <Route path="/settings" element={<SettingsPage user={user!} onLogout={handleLogout} />} />

        {/* Legacy aliases and convenience redirects */}
        <Route path="/studio" element={<StudioRedirect />} />
        <Route path="/lookbook" element={<Navigate to="/outfits" replace />} />
        <Route path="/closet" element={<Navigate to="/wardrobe" replace />} />
        <Route path="/planner" element={<Navigate to="/calendar" replace />} />
        <Route path="/shopping" element={<Navigate to="/assistant" replace />} />

        {/* Authenticated 404 */}
        <Route path="*" element={<NotFoundPage />} />
      </Route>

      {/* 3. Unauthenticated Catch-all Redirect */}
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
};

export const App: React.FC = () => {
  return (
    <BrowserRouter>
      <AppRoutes />
    </BrowserRouter>
  );
};

export default App;
