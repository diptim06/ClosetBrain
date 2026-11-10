import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate, useOutletContext } from 'react-router-dom';
import { WelcomeHero } from '../components/WelcomeHero';
import { WardrobeOverview } from '../components/WardrobeOverview';
import { TodayOutfit } from '../components/TodayOutfit';
import { MannequinPreview } from '../components/MannequinPreview';
import { RecentlyAdded } from '../components/RecentlyAdded';
import { UpcomingOutfits } from '../components/UpcomingOutfits';
import { StyleInsights } from '../components/StyleInsights';
import { MOCK_TODAY_OUTFIT } from '../../../data/mockData';
import { AuthUser } from '../../../components/landing/AuthPanel';
import {
  Garment,
  WardrobeSummary,
  fetchWardrobeSummary,
  fetchGarments,
  GarmentDetailModal,
} from '../../wardrobe';
import { AuthenticatedLayoutContext } from '../../../components/layout/AuthenticatedLayout';

interface DashboardPageProps {
  user?: AuthUser;
  onLogout?: () => void;
}

export const DashboardPage: React.FC<DashboardPageProps> = (props) => {
  const navigate = useNavigate();
  const outletCtx = useOutletContext<AuthenticatedLayoutContext | undefined>();

  const currentUser = props.user || outletCtx?.user;

  // Live wardrobe state
  const [summary, setSummary] = useState<WardrobeSummary | null>(null);
  const [recentGarments, setRecentGarments] = useState<Garment[]>([]);
  const [isLoadingSummary, setIsLoadingSummary] = useState<boolean>(true);
  const [isLoadingRecent, setIsLoadingRecent] = useState<boolean>(true);
  const [summaryError, setSummaryError] = useState<string | null>(null);
  const [recentError, setRecentError] = useState<string | null>(null);

  // Modal state for direct dashboard item inspection
  const [selectedGarment, setSelectedGarment] = useState<Garment | null>(null);
  const [isDetailModalOpen, setIsDetailModalOpen] = useState(false);

  // Fetch live dashboard metrics and recent garments
  const loadDashboardData = useCallback(async () => {
    setIsLoadingSummary(true);
    setIsLoadingRecent(true);
    setSummaryError(null);
    setRecentError(null);

    try {
      const [summaryRes, garmentsRes] = await Promise.all([
        fetchWardrobeSummary().catch((err) => {
          setSummaryError(err.message || 'Failed to load wardrobe summary.');
          return null;
        }),
        fetchGarments({ sort: 'createdAt_desc', limit: 4 }).catch((err) => {
          setRecentError(err.message || 'Failed to load recently added garments.');
          return null;
        }),
      ]);

      if (summaryRes?.summary) {
        setSummary(summaryRes.summary);
      } else if (summaryRes && typeof (summaryRes as any).totalItems === 'number') {
        setSummary(summaryRes as unknown as WardrobeSummary);
      }

      if (garmentsRes?.garments) {
        setRecentGarments(garmentsRes.garments);
      }
    } finally {
      setIsLoadingSummary(false);
      setIsLoadingRecent(false);
    }
  }, []);

  useEffect(() => {
    loadDashboardData();
  }, [loadDashboardData]);

  // Section navigation handlers mapping to real routes
  const handleOpenStudio = () => navigate('/outfits/create');
  const handleOpenPlanner = () => navigate('/calendar');
  const handleViewCloset = () => navigate('/wardrobe');
  const handleViewOutfits = () => navigate('/outfits');
  const handleViewAllInsights = () => navigate('/insights');

  // Handle direct item interaction
  const handleSelectGarment = (garment: Garment) => {
    setSelectedGarment(garment);
    setIsDetailModalOpen(true);
  };

  const handleGarmentUpdated = (updated: Garment) => {
    setSelectedGarment(updated);
    loadDashboardData();
    outletCtx?.refreshClosetCount();
  };

  const handleGarmentDeleted = () => {
    setIsDetailModalOpen(false);
    setSelectedGarment(null);
    loadDashboardData();
    outletCtx?.refreshClosetCount();
  };

  if (!currentUser) {
    return null;
  }

  return (
    <div className="space-y-6 lg:space-y-8 animate-in fade-in duration-300">
      {/* Welcome Hero */}
      <WelcomeHero
        user={currentUser}
        onGenerateOutfit={handleOpenStudio}
        onOpenPlanner={handleOpenPlanner}
      />

      {/* Wardrobe Overview Metrics - Connected to Live Summary */}
      <WardrobeOverview
        totalItems={summary?.totalItems ?? 0}
        recentlyAddedThisWeek={summary?.recentlyAddedThisWeek ?? 0}
        isLoading={isLoadingSummary}
        onViewCloset={handleViewCloset}
        onViewOutfits={handleViewOutfits}
        onViewPlanner={handleOpenPlanner}
      />

      {/* Primary Focal Section: Today's Outfit + 3D Mannequin Preview */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-stretch">
        <div className="lg:col-span-8">
          <TodayOutfit
            data={MOCK_TODAY_OUTFIT}
            onOpenStudio={handleOpenStudio}
          />
        </div>
        <div className="lg:col-span-4">
          <MannequinPreview onOpenStudio={handleOpenStudio} />
        </div>
      </div>

      {/* Recently Added Wardrobe Gallery - Connected to Live R2 & MongoDB */}
      <RecentlyAdded
        garments={recentGarments}
        isLoading={isLoadingRecent}
        error={recentError}
        totalGarments={summary?.totalItems ?? 0}
        onViewCloset={handleViewCloset}
        onSelectGarment={handleSelectGarment}
        onAddItem={handleViewCloset}
        onRetry={loadDashboardData}
      />

      {/* Secondary Grid: Upcoming Outfits & Style Insights */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-stretch">
        <div className="lg:col-span-6">
          <UpcomingOutfits onOpenPlanner={handleOpenPlanner} />
        </div>
        <div className="lg:col-span-6">
          <StyleInsights
            colorBreakdown={summary?.colorDistribution ?? []}
            topTone={summary?.topTone ?? 'None'}
            favoriteBrands={summary?.topBrands ?? []}
            totalItems={summary?.totalItems ?? 0}
            isLoading={isLoadingSummary}
            onViewAllInsights={handleViewAllInsights}
          />
        </div>
      </div>

      {/* Direct Garment Detail Modal when clicking Recently Added cards */}
      <GarmentDetailModal
        isOpen={isDetailModalOpen}
        onClose={() => setIsDetailModalOpen(false)}
        garment={selectedGarment}
        onGarmentUpdated={handleGarmentUpdated}
        onGarmentDeleted={handleGarmentDeleted}
      />
    </div>
  );
};

export default DashboardPage;
