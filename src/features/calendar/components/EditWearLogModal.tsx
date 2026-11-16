import React, { useState } from 'react';
import { X, Calendar, AlertCircle, Loader2 } from 'lucide-react';
import { OutfitWearLog } from '../types';
import { updateWearLog, CalendarApiError } from '../api/calendarApi';

interface EditWearLogModalProps {
  isOpen: boolean;
  wearLog: OutfitWearLog | null;
  onClose: () => void;
  onSuccess: (updated: OutfitWearLog) => void;
}

export const EditWearLogModal: React.FC<EditWearLogModalProps> = ({
  isOpen,
  wearLog,
  onClose,
  onSuccess,
}) => {
  if (!isOpen || !wearLog) return null;

  const [wornDate, setWornDate] = useState<string>(wearLog.wornDate);
  const [notes, setNotes] = useState<string>(wearLog.notes || '');
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    setErrorMessage(null);

    try {
      const res = await updateWearLog(wearLog._id, {
        wornDate,
        notes: notes.trim(),
      });
      onSuccess(res.wearLog);
      onClose();
    } catch (err: any) {
      if (err instanceof CalendarApiError && err.status === 409) {
        setErrorMessage(err.message);
      } else {
        setErrorMessage(err.message || 'Failed to update wear record.');
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-[#1C1817]/60 backdrop-blur-xs animate-in fade-in duration-200">
      <div className="bg-[#FFFFFF] border border-[#ECE5DA] rounded-3xl w-full max-w-md overflow-hidden shadow-xl animate-in zoom-in-95 duration-150">
        {/* Header */}
        <div className="px-6 py-5 border-b border-[#ECE5DA] flex items-center justify-between bg-[#FAF6EE]">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-[#FFFFFF] border border-[#ECE5DA] text-[#5B1924] flex items-center justify-center shadow-xs">
              <Calendar size={18} />
            </div>
            <div>
              <h2 className="font-editorial text-lg font-bold text-[#1C1817]">Edit Wear Record</h2>
              <p className="text-xs text-[#5E564E]">{wearLog.outfitName}</p>
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
        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          {errorMessage && (
            <div className="p-3.5 rounded-2xl bg-[#FFF6F6] border border-[#F5DADA] text-[#882434] flex items-start gap-2 text-xs">
              <AlertCircle size={14} className="shrink-0 mt-0.5" />
              <span>{errorMessage}</span>
            </div>
          )}

          <div>
            <label className="block text-xs font-semibold text-[#1C1817] mb-1.5 flex items-center gap-1.5">
              <Calendar size={13} className="text-[#5B1924]" />
              <span>Actual Worn Date</span>
            </label>
            <input
              type="date"
              required
              value={wornDate}
              onChange={(e) => setWornDate(e.target.value)}
              className="w-full px-3.5 py-2.5 rounded-xl bg-[#FAF6EE] border border-[#ECE5DA] text-xs font-medium text-[#1C1817] focus:outline-none focus:border-[#5B1924]"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-[#1C1817] mb-1.5">
              Notes
            </label>
            <textarea
              rows={2}
              maxLength={300}
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              className="w-full px-3.5 py-2.5 rounded-xl bg-[#FAF6EE] border border-[#ECE5DA] text-xs text-[#1C1817] focus:outline-none focus:border-[#5B1924] resize-none"
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
              disabled={isSubmitting || !wornDate}
              className="inline-flex items-center gap-2 px-5 py-2.5 rounded-full bg-[#5B1924] text-[#FDFBF7] text-xs font-semibold hover:bg-[#48131C] active:scale-[0.98] transition-all shadow-md shadow-[#5B1924]/15 cursor-pointer disabled:opacity-50"
            >
              {isSubmitting ? (
                <>
                  <Loader2 size={13} className="animate-spin" />
                  <span>Saving...</span>
                </>
              ) : (
                <span>Save Changes</span>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
