import React from 'react';
import { useLocation, useNavigate, useParams, useSearchParams } from 'react-router-dom';
import { OutfitStudioView } from '../components/OutfitStudioView';
import { Garment } from '../../wardrobe/types';

interface StudioLocationState {
  prefillGarments?: Garment[];
  prefillName?: string;
  prefillNotes?: string;
}

export const StudioPage: React.FC = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { id } = useParams<{ id: string }>();
  const [searchParams] = useSearchParams();
  const outfitId = id || searchParams.get('outfitId');
  const state = (location.state as StudioLocationState) || {};

  return (
    <div className="animate-in fade-in duration-200">
      <OutfitStudioView
        initialOutfitId={outfitId}
        initialGarments={state.prefillGarments}
        initialOutfitName={state.prefillName}
        initialOutfitNotes={state.prefillNotes}
        onNavigateToCloset={() => navigate('/wardrobe')}
        onNavigateToLookbook={() => navigate('/outfits')}
        onNavigateToCreate={() => navigate('/outfits/create')}
      />
    </div>
  );
};

export default StudioPage;
