import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Clock,
  Sparkles,
  CheckCircle2,
  Edit2,
  Trash2,
  ExternalLink,
  Shirt,
  MoreVertical,
  Loader2,
} from 'lucide-react';
import { ScheduledOutfit } from '../types';

interface ScheduledOutfitCardProps {
  schedule: ScheduledOutfit;
  onMarkWorn: (schedule: ScheduledOutfit) => void;
  onEdit: (schedule: ScheduledOutfit) => void;
  onDelete: (scheduleId: string) => Promise<void>;
  compact?: boolean;
}

export const ScheduledOutfitCard: React.FC<ScheduledOutfitCardProps> = ({
  schedule,
  onMarkWorn,
  onEdit,
  onDelete,
  compact = false,
}) => {
  const navigate = useNavigate();
  const [isDeleting, setIsDeleting] = useState<boolean>(false);
  const [showConfirmDelete, setShowConfirmDelete] = useState<boolean>(false);

  const outfit = schedule.outfit;
  const garments = outfit?.garments || [];
  const isCompleted = schedule.status === 'completed';

  const handleDelete = async () => {
    setIsDeleting(true);
    try {
      await onDelete(schedule._id);
    } finally {
      setIsDeleting(false);
      setShowConfirmDelete(false);
    }
  };

  const handleOpenOutfit = () => {
    if (schedule.outfitId) {
      navigate(`/outfits/${schedule.outfitId}`);
    } else {
      navigate('/outfits');
    }
  };

  // Compact variant for calendar date cells
  if (compact) {
    return (
      <div
        className={`p-1.5 rounded-lg border text-left text-[11px] transition-all group ${
          isCompleted
            ? 'bg-[#2E6B47]/8 border-[#2E6B47]/20 text-[#2E6B47]'
            : 'bg-[#FAF6EE] border-[#ECE5DA] hover:border-[#5B1924]/40 text-[#1C1817]'
        }`}
      >
        <div className="flex items-center justify-between gap-1">
          <span className="font-semibold truncate leading-tight">
            {outfit?.name || 'Look'}
          </span>
          {isCompleted && <CheckCircle2 size={10} className="text-[#2E6B47] shrink-0" />}
        </div>
        <div className="flex items-center gap-1 text-[9px] text-[#8C8379] mt-0.5">
          <span className="truncate">{schedule.slot}</span>
        </div>
      </div>
    );
  }

  // Full detailed card for selected date panel
  return (
    <div className="p-4 rounded-2xl bg-[#FFFFFF] border border-[#ECE5DA] shadow-xs hover:border-[#D8CEBD] transition-all flex flex-col justify-between gap-3">
      <div className="space-y-3">
        {/* Header: Slot Badge & Status */}
        <div className="flex items-center justify-between gap-2">
          <div className="flex items-center gap-1.5">
            <span className="px-2 py-0.5 rounded-full bg-[#FAF6EE] border border-[#ECE5DA] text-[10px] font-bold text-[#5B1924] uppercase tracking-wider flex items-center gap-1">
              <Clock size={10} />
              <span>{schedule.slot}</span>
            </span>
            {isCompleted && (
              <span className="px-2 py-0.5 rounded-full bg-[#2E6B47]/10 text-[#2E6B47] text-[10px] font-bold uppercase tracking-wider flex items-center gap-1">
                <CheckCircle2 size={10} />
                <span>Worn</span>
              </span>
            )}
          </div>

          <div className="text-[11px] text-[#8C8379]">
            {garments.length} {garments.length === 1 ? 'piece' : 'pieces'}
          </div>
        </div>

        {/* Outfit Title */}
        <div>
          <h4 className="font-editorial text-base font-bold text-[#1C1817] leading-snug">
            {outfit?.name || 'Curated Ensemble'}
          </h4>
          {schedule.notes && (
            <p className="text-xs text-[#5E564E] mt-1 line-clamp-2 italic">
              &ldquo;{schedule.notes}&rdquo;
            </p>
          )}
        </div>

        {/* Garments Visual Montage */}
        {garments.length > 0 && (
          <div className="grid grid-cols-4 gap-1.5 pt-1">
            {garments.slice(0, 4).map((g, idx) => (
              <div
                key={g._id || idx}
                className="aspect-square rounded-xl bg-[#FAF6EE] border border-[#ECE5DA] overflow-hidden relative group/item"
                title={`${g.name} (${g.category})`}
              >
                {g.signedUrl ? (
                  <img
                    src={g.signedUrl}
                    alt={g.name}
                    className="w-full h-full object-cover group-hover/item:scale-105 transition-transform duration-200"
                    loading="lazy"
                  />
                ) : (
                  <div className="w-full h-full flex flex-col items-center justify-center text-[#8C8379] p-1 text-center">
                    <Shirt size={12} className="opacity-50" />
                    <span className="text-[8px] font-medium truncate max-w-full">
                      {g.category}
                    </span>
                  </div>
                )}
                <div className="absolute bottom-0.5 left-0.5 px-1 rounded-sm bg-[#1C1817]/70 text-[7px] text-[#FDFBF7] truncate max-w-[90%]">
                  {g.category}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Card Actions */}
      <div className="pt-2 border-t border-[#ECE5DA]/70 flex items-center justify-between gap-2">
        <button
          type="button"
          onClick={handleOpenOutfit}
          className="inline-flex items-center gap-1 text-[11px] font-semibold text-[#5B1924] hover:text-[#48131C] transition-colors cursor-pointer"
        >
          <span>View Outfit</span>
          <ExternalLink size={11} />
        </button>

        <div className="flex items-center gap-1.5">
          {!isCompleted && (
            <button
              type="button"
              onClick={() => onMarkWorn(schedule)}
              className="inline-flex items-center gap-1 px-3 py-1.5 rounded-full bg-[#2E6B47]/10 hover:bg-[#2E6B47] text-[#2E6B47] hover:text-white text-[11px] font-semibold transition-all cursor-pointer"
            >
              <CheckCircle2 size={12} />
              <span>Mark Worn</span>
            </button>
          )}

          {!isCompleted && (
            <button
              type="button"
              onClick={() => onEdit(schedule)}
              className="p-1.5 rounded-lg text-[#8C8379] hover:text-[#1C1817] hover:bg-[#FAF6EE] transition-colors cursor-pointer"
              title="Edit Schedule"
            >
              <Edit2 size={13} />
            </button>
          )}

          {showConfirmDelete ? (
            <div className="flex items-center gap-1 animate-in fade-in">
              <button
                type="button"
                onClick={handleDelete}
                disabled={isDeleting}
                className="px-2 py-1 rounded-md bg-[#882434] text-white text-[10px] font-bold hover:bg-[#721C2A] transition-colors cursor-pointer disabled:opacity-50"
              >
                {isDeleting ? <Loader2 size={10} className="animate-spin" /> : 'Confirm'}
              </button>
              <button
                type="button"
                onClick={() => setShowConfirmDelete(false)}
                className="px-2 py-1 rounded-md text-[#8C8379] text-[10px] hover:text-[#1C1817] cursor-pointer"
              >
                Cancel
              </button>
            </div>
          ) : (
            <button
              type="button"
              onClick={() => setShowConfirmDelete(true)}
              className="p-1.5 rounded-lg text-[#8C8379] hover:text-[#882434] hover:bg-[#FFF6F6] transition-colors cursor-pointer"
              title="Remove Scheduled Look"
            >
              <Trash2 size={13} />
            </button>
          )}
        </div>
      </div>
    </div>
  );
};
