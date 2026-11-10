import React, { useState } from 'react';
import { Sparkles, ImageOff } from 'lucide-react';
import { Garment } from '../types';

interface GarmentCardProps {
  garment: Garment;
  onClick: (garment: Garment) => void;
  onRefreshUrl?: (garmentId: string) => Promise<string | null>;
}

export const GarmentCard: React.FC<GarmentCardProps> = ({ garment, onClick, onRefreshUrl }) => {
  const [imageSrc, setImageSrc] = useState<string>(garment.signedUrl);
  const [hasRefreshed, setHasRefreshed] = useState(false);
  const [imageError, setImageError] = useState(false);
  const [imageLoaded, setImageLoaded] = useState(false);

  // If the signed URL changes in props, sync it
  React.useEffect(() => {
    setImageSrc(garment.signedUrl);
    setImageError(false);
    setHasRefreshed(false);
  }, [garment.signedUrl]);

  const handleImageError = async () => {
    if (!hasRefreshed && onRefreshUrl) {
      setHasRefreshed(true);
      const newUrl = await onRefreshUrl(garment._id);
      if (newUrl) {
        setImageSrc(newUrl);
        setImageError(false);
        return;
      }
    }
    setImageError(true);
  };

  return (
    <div
      onClick={() => onClick(garment)}
      className="bg-[#FFFFFF] border border-[#ECE5DA] hover:border-[#5B1924]/40 rounded-2xl overflow-hidden p-3 shadow-xs hover:shadow-lg transition-all duration-300 group cursor-pointer flex flex-col justify-between"
      role="button"
      tabIndex={0}
      onKeyDown={(e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          onClick(garment);
        }
      }}
    >
      <div>
        {/* Photo Container with Editorial Aspect Ratio */}
        <div className="relative aspect-[3/4] w-full rounded-xl overflow-hidden bg-[#F2ECE1] mb-3 border border-[#E6DFD3]/60 flex items-center justify-center">
          {imageError ? (
            <div className="flex flex-col items-center justify-center p-4 text-center text-[#8C8379]">
              <ImageOff size={24} className="mb-1 text-[#8C8379]/70" />
              <span className="text-[10px] font-medium tracking-wide">Image Unavailable</span>
            </div>
          ) : (
            <>
              {!imageLoaded && (
                <div className="absolute inset-0 bg-[#EFE9DF] animate-pulse" />
              )}
              <img
                src={imageSrc}
                alt={garment.name}
                onError={handleImageError}
                onLoad={() => setImageLoaded(true)}
                className={`w-full h-full object-cover group-hover:scale-105 transition-transform duration-500 ${
                  imageLoaded ? 'opacity-100' : 'opacity-0'
                }`}
                loading="lazy"
              />
            </>
          )}

          {/* Category Chip */}
          <div className="absolute top-2.5 left-2.5 flex items-center gap-1">
            <span className="px-2.5 py-0.5 rounded-full bg-[#FFFFFF]/90 backdrop-blur-md text-[10px] font-semibold text-[#5B1924] border border-[#ECE5DA] shadow-xs">
              {garment.category}
            </span>
            {garment.category === 'Ethnic Wear' && garment.isCompleteSet && (
              <span className="px-2 py-0.5 rounded-full bg-[#5B1924]/90 backdrop-blur-md text-[9px] font-semibold text-[#FDFBF7] shadow-xs">
                Set
              </span>
            )}
          </div>

          {/* AI Analyzed Icon Badge */}
          {garment.aiAnalyzed && (
            <span
              title="Analyzed with Gemini AI"
              className="absolute top-2.5 right-2.5 w-6 h-6 rounded-full bg-[#5B1924]/90 backdrop-blur-md text-amber-200 flex items-center justify-center shadow-xs"
            >
              <Sparkles size={11} />
            </span>
          )}
        </div>

        {/* Title and Designer / SubCategory */}
        <h3 className="text-xs font-bold text-[#1C1817] truncate leading-tight group-hover:text-[#5B1924] transition-colors">
          {garment.name}
        </h3>

        <p className="text-[11px] text-[#5E564E] font-editorial italic mt-0.5 truncate">
          {garment.brand || garment.subCategory || garment.material || 'Custom Wardrobe Piece'}
        </p>
      </div>

      {/* Meta Bar */}
      <div className="pt-2.5 mt-2.5 border-t border-[#F2ECE1] flex items-center justify-between text-[10px] text-[#8C8379]">
        <span className="truncate max-w-[90px]">{garment.formality}</span>
        <div className="flex items-center gap-1.5 shrink-0">
          <span
            className="w-2.5 h-2.5 rounded-full border border-black/15 shrink-0 shadow-xs"
            style={{
              backgroundColor: garment.primaryColor.toLowerCase().includes('#')
                ? garment.primaryColor
                : undefined,
            }}
            title={`Primary Color: ${garment.primaryColor}`}
          />
          <span className="font-medium text-[10px] text-[#5E564E]">{garment.primaryColor}</span>
        </div>
      </div>
    </div>
  );
};
