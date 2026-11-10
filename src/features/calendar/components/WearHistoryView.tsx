import React, { useState, useEffect, useCallback } from 'react';
import {
  Calendar,
  Clock,
  Sparkles,
  Edit2,
  Trash2,
  CheckCircle2,
  ChevronLeft,
  ChevronRight,
  Shirt,
  AlertCircle,
  Loader2,
  RefreshCw,
} from 'lucide-react';
import { OutfitWearLog, HistoricalGarmentSnapshot } from '../types';
import { fetchWearHistory, deleteWearLog } from '../api/calendarApi';
import { EditWearLogModal } from './EditWearLogModal';

const SnapshotGarmentTile: React.FC<{ garment: HistoricalGarmentSnapshot; index: number }> = ({
  garment,
  index,
}) => {
  const [imageFailed, setImageFailed] = useState<boolean>(false);
  const showFallback = imageFailed || !garment.signedUrl;

  return (
    <div
      key={garment.garmentId || index}
      className="aspect-square rounded-xl bg-[#FAF6EE] border border-[#ECE5DA] overflow-hidden relative group/item"
      title={`${garment.name} (${garment.category})`}
    >
      {!showFallback ? (
        <img
          src={garment.signedUrl!}
          alt={garment.name}
          onError={() => setImageFailed(true)}
          className="w-full h-full object-cover group-hover/item:scale-105 transition-transform duration-200"
          loading="lazy"
        />
      ) : (
        <div className="w-full h-full flex flex-col items-center justify-center text-[#8C8379] p-1 text-center bg-[#FAF6EE]">
          <Shirt size={13} className="opacity-50" />
          <span className="text-[8px] font-medium truncate max-w-full">
            {garment.category}
          </span>
        </div>
      )}
      <div className="absolute bottom-0.5 left-0.5 px-1 rounded-sm bg-[#1C1817]/70 text-[7px] text-[#FDFBF7] truncate max-w-[90%]">
        {garment.category}
      </div>
    </div>
  );
};

export const WearHistoryView: React.FC = () => {
  const [wearHistory, setWearHistory] = useState<OutfitWearLog[]>([]);
  const [currentPage, setCurrentPage] = useState<number>(1);
  const [totalPages, setTotalPages] = useState<number>(1);
  const [totalItems, setTotalItems] = useState<number>(0);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // Edit Modal State
  const [editingLog, setEditingLog] = useState<OutfitWearLog | null>(null);
  const [isEditModalOpen, setIsEditModalOpen] = useState<boolean>(false);

  // Deleting State
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);

  const loadHistory = useCallback(async (page: number) => {
    setIsLoading(true);
    setErrorMessage(null);
    try {
      const res = await fetchWearHistory({ page, limit: 12 });
      setWearHistory(res.wearHistory || []);
      setCurrentPage(res.pagination?.page || 1);
      setTotalPages(res.pagination?.totalPages || 1);
      setTotalItems(res.pagination?.totalItems || 0);
    } catch (err: any) {
      setErrorMessage(err.message || 'Failed to load wear history.');
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    loadHistory(currentPage);
  }, [loadHistory, currentPage]);

  const handleDelete = async (logId: string) => {
    setDeletingId(logId);
    try {
      await deleteWearLog(logId);
      setConfirmDeleteId(null);
      loadHistory(currentPage);
    } catch (err: any) {
      setErrorMessage(err.message || 'Failed to delete wear log.');
    } finally {
      setDeletingId(null);
    }
  };

  const handleEditSuccess = (updated: OutfitWearLog) => {
    setWearHistory((prev) => prev.map((l) => (l._id === updated._id ? updated : l)));
  };

  return (
    <div className="space-y-6 animate-in fade-in duration-200">
      {/* Subheader */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-2 border-b border-[#ECE5DA]">
        <div>
          <h2 className="font-editorial text-xl font-bold text-[#1C1817]">
            Wardrobe Wear Telemetry
          </h2>
          <p className="text-xs text-[#5E564E]">
            Immutable records of ensembles worn in real life with snapshotted pieces.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <span className="px-3 py-1 rounded-full bg-[#FAF6EE] border border-[#ECE5DA] text-xs font-semibold text-[#5B1924]">
            {totalItems} {totalItems === 1 ? 'Wear Event' : 'Wear Events'}
          </span>
          <button
            type="button"
            onClick={() => loadHistory(currentPage)}
            className="p-1.5 rounded-xl border border-[#ECE5DA] text-[#8C8379] hover:text-[#1C1817] hover:bg-[#FAF6EE] transition-colors cursor-pointer"
            title="Refresh"
          >
            <RefreshCw size={14} className={isLoading ? 'animate-spin' : ''} />
          </button>
        </div>
      </div>

      {errorMessage && (
        <div className="p-4 rounded-2xl bg-[#FFF6F6] border border-[#F5DADA] text-[#882434] flex items-center justify-between text-xs">
          <div className="flex items-center gap-2">
            <AlertCircle size={15} />
            <span>{errorMessage}</span>
          </div>
          <button
            type="button"
            onClick={() => loadHistory(currentPage)}
            className="px-3 py-1 bg-[#882434] text-white rounded-lg font-semibold cursor-pointer"
          >
            Retry
          </button>
        </div>
      )}

      {/* History Grid */}
      {isLoading ? (
        <div className="p-12 text-center bg-[#FFFFFF] rounded-3xl border border-[#ECE5DA]">
          <Loader2 size={24} className="animate-spin text-[#5B1924] mx-auto mb-2" />
          <p className="text-xs text-[#8C8379]">Loading wear history ledger...</p>
        </div>
      ) : wearHistory.length === 0 ? (
        <div className="p-12 text-center bg-[#FFFFFF] rounded-3xl border border-[#ECE5DA] space-y-3">
          <div className="w-12 h-12 rounded-2xl bg-[#FAF6EE] border border-[#ECE5DA] text-[#8C8379] flex items-center justify-center mx-auto">
            <CheckCircle2 size={22} />
          </div>
          <h3 className="font-editorial text-lg font-bold text-[#1C1817]">No Worn Looks Yet</h3>
          <p className="text-xs text-[#5E564E] max-w-md mx-auto leading-relaxed">
            As you schedule outfits and mark them as worn, ClosetBrain creates permanent records of your wardrobe rotation here.
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          {wearHistory.map((log) => {
            const garments = log.garments || [];

            return (
              <div
                key={log._id}
                className="p-5 rounded-3xl bg-[#FFFFFF] border border-[#ECE5DA] shadow-xs hover:border-[#D8CEBD] transition-all flex flex-col justify-between"
              >
                <div className="space-y-3.5">
                  {/* Date Badge & Fulfillment Pill */}
                  <div className="flex items-center justify-between">
                    <span className="px-2.5 py-1 rounded-full bg-[#2E6B47]/10 text-[#2E6B47] text-[10px] font-bold uppercase tracking-wider flex items-center gap-1.5">
                      <CheckCircle2 size={11} />
                      <span>{log.wornDate}</span>
                    </span>
                    <span className="text-[10px] text-[#8C8379] font-medium">
                      {garments.length} {garments.length === 1 ? 'piece' : 'pieces'}
                    </span>
                  </div>

                  {/* Outfit Name */}
                  <div>
                    <h4 className="font-editorial text-base font-bold text-[#1C1817] leading-snug">
                      {log.outfitName}
                    </h4>
                    {log.notes && (
                      <p className="text-xs text-[#5E564E] mt-1 italic line-clamp-2">
                        &ldquo;{log.notes}&rdquo;
                      </p>
                    )}
                  </div>

                  {/* Snapshotted Garments Montage */}
                  <div className="grid grid-cols-4 gap-1.5 pt-1">
                    {garments.slice(0, 4).map((g, idx) => (
                      <SnapshotGarmentTile key={g.garmentId || idx} garment={g} index={idx} />
                    ))}
                  </div>
                </div>

                {/* Actions */}
                <div className="pt-3 mt-3 border-t border-[#ECE5DA]/70 flex items-center justify-between">
                  <span className="text-[10px] text-[#8C8379]">Recorded wear</span>

                  <div className="flex items-center gap-1.5">
                    <button
                      type="button"
                      onClick={() => {
                        setEditingLog(log);
                        setIsEditModalOpen(true);
                      }}
                      className="p-1.5 rounded-lg text-[#8C8379] hover:text-[#1C1817] hover:bg-[#FAF6EE] transition-colors cursor-pointer"
                      title="Edit Date or Notes"
                    >
                      <Edit2 size={13} />
                    </button>

                    {confirmDeleteId === log._id ? (
                      <div className="flex items-center gap-1">
                        <button
                          type="button"
                          onClick={() => handleDelete(log._id)}
                          disabled={deletingId === log._id}
                          className="px-2 py-1 rounded-md bg-[#882434] text-white text-[10px] font-bold cursor-pointer disabled:opacity-50"
                        >
                          {deletingId === log._id ? (
                            <Loader2 size={10} className="animate-spin" />
                          ) : (
                            'Confirm'
                          )}
                        </button>
                        <button
                          type="button"
                          onClick={() => setConfirmDeleteId(null)}
                          className="px-1.5 py-1 text-[10px] text-[#8C8379] hover:text-[#1C1817] cursor-pointer"
                        >
                          Cancel
                        </button>
                      </div>
                    ) : (
                      <button
                        type="button"
                        onClick={() => setConfirmDeleteId(log._id)}
                        className="p-1.5 rounded-lg text-[#8C8379] hover:text-[#882434] hover:bg-[#FFF6F6] transition-colors cursor-pointer"
                        title="Delete Wear Record"
                      >
                        <Trash2 size={13} />
                      </button>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Pagination Controls */}
      {totalPages > 1 && (
        <div className="pt-4 flex items-center justify-between border-t border-[#ECE5DA]">
          <span className="text-xs text-[#5E564E]">
            Page {currentPage} of {totalPages} ({totalItems} total records)
          </span>
          <div className="flex items-center gap-2">
            <button
              type="button"
              disabled={currentPage <= 1 || isLoading}
              onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
              className="inline-flex items-center gap-1 px-3 py-1.5 rounded-xl border border-[#ECE5DA] bg-[#FFFFFF] text-xs font-semibold text-[#1C1817] hover:bg-[#FAF6EE] transition-colors disabled:opacity-40 cursor-pointer"
            >
              <ChevronLeft size={13} />
              <span>Previous</span>
            </button>
            <button
              type="button"
              disabled={currentPage >= totalPages || isLoading}
              onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
              className="inline-flex items-center gap-1 px-3 py-1.5 rounded-xl border border-[#ECE5DA] bg-[#FFFFFF] text-xs font-semibold text-[#1C1817] hover:bg-[#FAF6EE] transition-colors disabled:opacity-40 cursor-pointer"
            >
              <span>Next</span>
              <ChevronRight size={13} />
            </button>
          </div>
        </div>
      )}

      {/* Edit Modal */}
      <EditWearLogModal
        isOpen={isEditModalOpen}
        wearLog={editingLog}
        onClose={() => {
          setIsEditModalOpen(false);
          setEditingLog(null);
        }}
        onSuccess={handleEditSuccess}
      />
    </div>
  );
};
