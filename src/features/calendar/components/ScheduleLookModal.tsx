import React, { useState, useEffect } from 'react';
import { X, Calendar, Clock, Sparkles, AlertCircle, Check, Loader2, Shirt } from 'lucide-react';
import { Outfit } from '../../outfits/types';
import { fetchOutfits } from '../../outfits/api/outfitApi';
import { scheduleOutfit, CalendarApiError } from '../api/calendarApi';
import { TimeSlot, TIME_SLOTS, ScheduledOutfit } from '../types';

interface ScheduleLookModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: (scheduled: ScheduledOutfit) => void;
  initialDate?: string; // YYYY-MM-DD
}

export const ScheduleLookModal: React.FC<ScheduleLookModalProps> = ({
  isOpen,
  onClose,
  onSuccess,
  initialDate,
}) => {
  const [date, setDate] = useState<string>('');
  const [slot, setSlot] = useState<TimeSlot>('All Day');
  const [notes, setNotes] = useState<string>('');
  const [selectedOutfitId, setSelectedOutfitId] = useState<string>('');

  const [outfits, setOutfits] = useState<Outfit[]>([]);
  const [isLoadingOutfits, setIsLoadingOutfits] = useState<boolean>(true);
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState<string>('');

  useEffect(() => {
    if (isOpen) {
      const today = new Date().toISOString().split('T')[0];
      setDate(initialDate || today);
      setSlot('All Day');
      setNotes('');
      setSelectedOutfitId('');
      setErrorMessage(null);
      setSearchQuery('');

      setIsLoadingOutfits(true);
      fetchOutfits({ limit: 100 })
        .then((res) => {
          setOutfits(res.outfits || []);
          if (res.outfits && res.outfits.length > 0) {
            setSelectedOutfitId(res.outfits[0]._id);
          }
        })
        .catch((err) => {
          setErrorMessage(err.message || 'Failed to load outfits.');
        })
        .finally(() => {
          setIsLoadingOutfits(false);
        });
    }
  }, [isOpen, initialDate]);

  if (!isOpen) return null;

  const filteredOutfits = outfits.filter((o) =>
    o.name.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedOutfitId) {
      setErrorMessage('Please select an outfit to schedule.');
      return;
    }
    if (!date) {
      setErrorMessage('Please choose a valid date.');
      return;
    }

    setIsSubmitting(true);
    setErrorMessage(null);

    try {
      const res = await scheduleOutfit({
        outfitId: selectedOutfitId,
        date,
        slot,
        notes: notes.trim(),
      });
      onSuccess(res.scheduledOutfit);
      onClose();
    } catch (err: any) {
      if (err instanceof CalendarApiError && err.status === 409) {
        setErrorMessage(err.message);
      } else {
        setErrorMessage(err.message || 'Failed to schedule outfit.');
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-[#1C1817]/60 backdrop-blur-xs animate-in fade-in duration-200">
      <div className="bg-[#FFFFFF] border border-[#ECE5DA] rounded-3xl w-full max-w-2xl overflow-hidden shadow-xl max-h-[90vh] flex flex-col">
        {/* Header */}
        <div className="px-6 py-5 border-b border-[#ECE5DA] flex items-center justify-between bg-[#FAF6EE]">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-[#FFFFFF] border border-[#ECE5DA] text-[#5B1924] flex items-center justify-center shadow-xs">
              <Calendar size={18} />
            </div>
            <div>
              <h2 className="font-editorial text-xl font-bold text-[#1C1817]">Plan an Outfit</h2>
              <p className="text-xs text-[#5E564E]">Assign a curated look to your calendar</p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="w-8 h-8 rounded-full bg-[#FFFFFF] border border-[#ECE5DA] text-[#8C8379] hover:text-[#1C1817] flex items-center justify-center transition-colors cursor-pointer"
          >
            <X size={16} />
          </button>
        </div>

        {/* Form Body */}
        <form onSubmit={handleSubmit} className="p-6 overflow-y-auto space-y-5 flex-1">
          {errorMessage && (
            <div className="p-4 rounded-2xl bg-[#FFF6F6] border border-[#F5DADA] text-[#882434] flex items-start gap-2.5 text-xs animate-in fade-in">
              <AlertCircle size={15} className="shrink-0 mt-0.5 text-[#882434]" />
              <span className="leading-relaxed">{errorMessage}</span>
            </div>
          )}

          {/* Date & Time Slot Grid */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-[#1C1817] mb-1.5 flex items-center gap-1.5">
                <Calendar size={13} className="text-[#5B1924]" />
                <span>Date</span>
              </label>
              <input
                type="date"
                required
                value={date}
                onChange={(e) => setDate(e.target.value)}
                className="w-full px-3.5 py-2.5 rounded-xl bg-[#FAF6EE] border border-[#ECE5DA] text-xs font-medium text-[#1C1817] focus:outline-none focus:border-[#5B1924] transition-colors"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-[#1C1817] mb-1.5 flex items-center gap-1.5">
                <Clock size={13} className="text-[#5B1924]" />
                <span>Time Slot</span>
              </label>
              <select
                value={slot}
                onChange={(e) => setSlot(e.target.value as TimeSlot)}
                className="w-full px-3.5 py-2.5 rounded-xl bg-[#FAF6EE] border border-[#ECE5DA] text-xs font-medium text-[#1C1817] focus:outline-none focus:border-[#5B1924] transition-colors cursor-pointer"
              >
                {TIME_SLOTS.map((s) => (
                  <option key={s} value={s}>
                    {s}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Select Outfit */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <label className="text-xs font-semibold text-[#1C1817] flex items-center gap-1.5">
                <Sparkles size={13} className="text-[#5B1924]" />
                <span>Select Saved Outfit</span>
              </label>
              {outfits.length > 5 && (
                <input
                  type="text"
                  placeholder="Filter outfits..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="px-2.5 py-1 text-[11px] rounded-lg bg-[#FAF6EE] border border-[#ECE5DA] text-[#1C1817] focus:outline-none focus:border-[#5B1924]"
                />
              )}
            </div>

            {isLoadingOutfits ? (
              <div className="p-8 text-center bg-[#FAF6EE] rounded-2xl border border-[#ECE5DA]">
                <Loader2 size={20} className="animate-spin text-[#5B1924] mx-auto mb-2" />
                <p className="text-xs text-[#8C8379]">Loading your wardrobe outfits...</p>
              </div>
            ) : outfits.length === 0 ? (
              <div className="p-6 text-center bg-[#FAF6EE] rounded-2xl border border-[#ECE5DA] space-y-2">
                <Shirt size={24} className="text-[#8C8379] mx-auto" />
                <p className="text-xs font-semibold text-[#1C1817]">No saved outfits found</p>
                <p className="text-[11px] text-[#5E564E]">
                  Create outfits in the Outfit Studio first to schedule them here.
                </p>
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 max-h-56 overflow-y-auto p-1 border border-[#ECE5DA] rounded-2xl bg-[#FAF6EE]/50">
                {filteredOutfits.map((outfit) => {
                  const isSelected = selectedOutfitId === outfit._id;
                  const garments = outfit.garments || [];

                  return (
                    <div
                      key={outfit._id}
                      onClick={() => setSelectedOutfitId(outfit._id)}
                      className={`p-3 rounded-xl border transition-all cursor-pointer flex items-center gap-3 ${
                        isSelected
                          ? 'bg-[#FFFFFF] border-[#5B1924] shadow-xs ring-1 ring-[#5B1924]'
                          : 'bg-[#FFFFFF] border-[#ECE5DA] hover:border-[#D8CEBD]'
                      }`}
                    >
                      {/* Thumbnail montage */}
                      <div className="w-12 h-12 rounded-lg bg-[#FAF6EE] border border-[#ECE5DA] overflow-hidden shrink-0 flex items-center justify-center relative">
                        {garments[0]?.signedUrl ? (
                          <img
                            src={garments[0].signedUrl}
                            alt={outfit.name}
                            className="w-full h-full object-cover"
                          />
                        ) : (
                          <Shirt size={16} className="text-[#8C8379]" />
                        )}
                        {isSelected && (
                          <div className="absolute inset-0 bg-[#5B1924]/20 flex items-center justify-center text-white">
                            <Check size={14} className="bg-[#5B1924] rounded-full p-0.5" />
                          </div>
                        )}
                      </div>

                      <div className="flex-1 min-w-0">
                        <h4 className="text-xs font-bold text-[#1C1817] truncate leading-tight">
                          {outfit.name}
                        </h4>
                        <p className="text-[10px] text-[#8C8379] mt-0.5">
                          {garments.length} {garments.length === 1 ? 'piece' : 'pieces'}
                        </p>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* Notes */}
          <div>
            <label className="block text-xs font-semibold text-[#1C1817] mb-1.5">
              Styling Notes (Optional)
            </label>
            <textarea
              rows={2}
              maxLength={300}
              placeholder="e.g. Add cashmere scarf if breezy; client dinner dress code"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              className="w-full px-3.5 py-2.5 rounded-xl bg-[#FAF6EE] border border-[#ECE5DA] text-xs text-[#1C1817] focus:outline-none focus:border-[#5B1924] transition-colors resize-none placeholder:text-[#8C8379]"
            />
          </div>

          {/* Footer Actions */}
          <div className="pt-2 flex items-center justify-end gap-3 border-t border-[#ECE5DA]">
            <button
              type="button"
              onClick={onClose}
              disabled={isSubmitting}
              className="px-4 py-2 rounded-xl text-xs font-semibold text-[#5E564E] hover:bg-[#FAF6EE] transition-colors cursor-pointer"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSubmitting || !selectedOutfitId || !date}
              className="inline-flex items-center gap-2 px-5 py-2.5 rounded-full bg-[#5B1924] text-[#FDFBF7] text-xs font-semibold hover:bg-[#48131C] active:scale-[0.98] transition-all shadow-md shadow-[#5B1924]/15 cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isSubmitting ? (
                <>
                  <Loader2 size={13} className="animate-spin" />
                  <span>Scheduling...</span>
                </>
              ) : (
                <>
                  <Calendar size={13} />
                  <span>Schedule Look</span>
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
