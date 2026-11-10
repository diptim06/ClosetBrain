import React, { useState } from 'react';
import {
  Plus,
  Search,
  Filter,
  RefreshCw,
  AlertCircle,
  Shirt,
  ArrowUpDown,
  ChevronLeft,
  ChevronRight,
} from 'lucide-react';
import { Garment, GarmentCategory } from '../types';
import { useWardrobe } from '../hooks/useWardrobe';
import { GarmentCard } from './GarmentCard';
import { AddGarmentModal } from './AddGarmentModal';
import { GarmentDetailModal } from './GarmentDetailModal';

const CATEGORIES: (GarmentCategory | 'All')[] = [
  'All',
  'Tops',
  'Bottoms',
  'Outerwear',
  'Dresses',
  'Ethnic Wear',
  'Shoes',
  'Accessories',
];

const FORMALITIES = [
  'All',
  'Casual',
  'Smart Casual',
  'Business Casual',
  'Formal',
  'Lounge',
];

const SEASONS = [
  'All',
  'Spring',
  'Summer',
  'Autumn',
  'Winter',
  'All-Season',
];

export const ClosetView: React.FC = () => {
  const {
    garments,
    pagination,
    filters,
    isLoading,
    error,
    setCategory,
    setFormality,
    setSeason,
    setSort,
    setPage,
    setSearch,
    refresh,
    refreshGarmentUrl,
    handleGarmentCreated,
    handleGarmentUpdated,
    handleGarmentDeleted,
  } = useWardrobe();

  // Modal states
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [selectedGarment, setSelectedGarment] = useState<Garment | null>(null);
  const [isDetailModalOpen, setIsDetailModalOpen] = useState(false);

  const handleCardClick = (garment: Garment) => {
    setSelectedGarment(garment);
    setIsDetailModalOpen(true);
  };

  const handleUpdatedFromDetail = (updated: Garment) => {
    handleGarmentUpdated(updated);
    setSelectedGarment(updated);
  };

  const handleDeletedFromDetail = (deletedId: string) => {
    handleGarmentDeleted(deletedId);
    setSelectedGarment(null);
    setIsDetailModalOpen(false);
  };

  return (
    <div className="space-y-6">
      {/* 1. Header Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold font-editorial text-[#1C1817]">
            My <span className="font-cursive text-[1.25em] text-[#5B1924] font-normal leading-none inline-block px-1 align-baseline">Closet</span>
          </h2>
          <p className="text-xs text-[#78716C]">
            {pagination.totalItems}{' '}
            {pagination.totalItems === 1 ? 'garment' : 'garments'} cataloged across{' '}
            {CATEGORIES.length - 1} categories
          </p>
        </div>

        <button
          onClick={() => setIsAddModalOpen(true)}
          className="py-2.5 px-4 bg-[#5B1924] hover:bg-[#48131C] text-white text-xs font-semibold rounded-xl transition-all shadow-xs flex items-center gap-2 cursor-pointer border-0 shrink-0 self-start sm:self-auto"
        >
          <Plus size={16} /> Add New Garment
        </button>
      </div>

      {/* 2. Filter & Search Controls */}
      <div className="bg-white p-3.5 rounded-2xl border border-[#ECE7DE] shadow-xs space-y-3">
        {/* Category Filter Chips */}
        <div className="flex items-center gap-2 overflow-x-auto pb-1 font-medium text-xs no-scrollbar">
          {CATEGORIES.map((cat) => {
            const isActive = (filters.category || 'All') === cat;
            return (
              <button
                key={cat}
                onClick={() => setCategory(cat)}
                className={`px-3.5 py-1.5 rounded-xl transition-all cursor-pointer whitespace-nowrap text-xs border-0 ${
                  isActive
                    ? 'bg-[#5B1924] text-white font-bold shadow-xs'
                    : 'bg-[#FAF6EE] text-[#78716C] hover:text-[#1C1817] hover:bg-[#F2ECE1]'
                }`}
              >
                {cat}
              </button>
            );
          })}
        </div>

        {/* Search, Sort, Formality, and Season Controls */}
        <div className="flex flex-col md:flex-row items-stretch md:items-center justify-between gap-3 pt-2 border-t border-[#F2ECE1]">
          {/* Search Box */}
          <div className="relative flex-1 max-w-md">
            <Search size={14} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-[#9E968E]" />
            <input
              type="text"
              placeholder="Search by name, brand, color, or fabric..."
              value={filters.search || ''}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full bg-[#FAF6EE] border border-[#ECE7DE] focus:border-[#5B1924] rounded-xl pl-9 pr-3.5 py-2 text-xs text-[#1C1817] outline-none transition-colors"
            />
          </div>

          <div className="flex items-center gap-2 flex-wrap text-xs">
            {/* Occasion / Formality Selector */}
            <select
              value={filters.formality || 'All'}
              onChange={(e) => setFormality(e.target.value)}
              className="bg-[#FAF6EE] border border-[#ECE7DE] rounded-xl px-2.5 py-2 text-xs text-[#5E564E] outline-none cursor-pointer"
              aria-label="Filter by formality"
            >
              <option value="All">All Formalities</option>
              {FORMALITIES.filter((f) => f !== 'All').map((f) => (
                <option key={f} value={f}>
                  {f}
                </option>
              ))}
            </select>

            {/* Season Selector */}
            <select
              value={filters.season || 'All'}
              onChange={(e) => setSeason(e.target.value)}
              className="bg-[#FAF6EE] border border-[#ECE7DE] rounded-xl px-2.5 py-2 text-xs text-[#5E564E] outline-none cursor-pointer"
              aria-label="Filter by season"
            >
              <option value="All">All Seasons</option>
              {SEASONS.filter((s) => s !== 'All').map((s) => (
                <option key={s} value={s}>
                  {s}
                </option>
              ))}
            </select>

            {/* Sort Selector */}
            <div className="flex items-center gap-1.5 bg-[#FAF6EE] border border-[#ECE7DE] rounded-xl px-2.5 py-1.5">
              <ArrowUpDown size={13} className="text-[#8C8379]" />
              <select
                value={filters.sort || 'createdAt_desc'}
                onChange={(e) => setSort(e.target.value as any)}
                className="bg-transparent text-xs text-[#5E564E] outline-none cursor-pointer border-0 pr-1"
                aria-label="Sort garments"
              >
                <option value="createdAt_desc">Newest First</option>
                <option value="createdAt_asc">Oldest First</option>
                <option value="name_asc">Name (A-Z)</option>
                <option value="name_desc">Name (Z-A)</option>
              </select>
            </div>
          </div>
        </div>
      </div>

      {/* 3. Error Banner */}
      {error && (
        <div className="p-4 bg-red-50 border border-red-200 rounded-2xl flex items-center justify-between gap-3 text-xs text-red-800">
          <div className="flex items-center gap-2">
            <AlertCircle size={16} className="text-red-600 shrink-0" />
            <span>{error}</span>
          </div>
          <button
            onClick={() => refresh()}
            className="px-3 py-1 bg-red-100 hover:bg-red-200 text-red-900 rounded-lg font-semibold flex items-center gap-1 cursor-pointer transition-colors"
          >
            <RefreshCw size={12} /> Retry
          </button>
        </div>
      )}

      {/* 4. Garments Grid or Skeletons or Empty State */}
      {isLoading ? (
        /* Loading Skeletons */
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-4">
          {Array.from({ length: 12 }).map((_, i) => (
            <div
              key={i}
              className="bg-white border border-[#ECE5DA] rounded-2xl p-3 space-y-2.5 animate-pulse"
            >
              <div className="aspect-[3/4] rounded-xl bg-[#F2ECE1]" />
              <div className="h-2.5 bg-[#F2ECE1] rounded w-1/3" />
              <div className="h-3 bg-[#F2ECE1] rounded w-4/5" />
              <div className="h-2.5 bg-[#F2ECE1] rounded w-1/2 pt-2" />
            </div>
          ))}
        </div>
      ) : garments.length > 0 ? (
        /* Populated Grid */
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-4">
          {garments.map((garment) => (
            <GarmentCard
              key={garment._id}
              garment={garment}
              onClick={handleCardClick}
              onRefreshUrl={refreshGarmentUrl}
            />
          ))}
        </div>
      ) : (
        /* Empty State */
        <div className="bg-white border border-[#ECE5DA] rounded-3xl p-12 text-center space-y-4 max-w-lg mx-auto shadow-xs">
          <div className="w-14 h-14 rounded-2xl bg-[#FAF6EE] text-[#5B1924] flex items-center justify-center mx-auto shadow-xs border border-[#ECE5DA]">
            <Shirt size={26} />
          </div>

          <div>
            <h3 className="text-lg font-bold font-editorial text-[#1C1817]">
              {filters.search || filters.category !== 'All' || filters.season !== 'All' || filters.formality !== 'All'
                ? 'No matching garments found'
                : 'Your digital wardrobe is empty'}
            </h3>
            <p className="text-xs text-[#78716C] mt-1 max-w-sm mx-auto">
              {filters.search || filters.category !== 'All' || filters.season !== 'All' || filters.formality !== 'All'
                ? 'Try adjusting your search keywords, category filters, or occasion settings.'
                : 'Catalog your physical clothing collection with AI-assisted or manual entry to unlock intelligent outfit combinations.'}
            </p>
          </div>

          <div>
            {filters.search || filters.category !== 'All' || filters.season !== 'All' || filters.formality !== 'All' ? (
              <button
                onClick={() => {
                  setCategory('All');
                  setFormality('All');
                  setSeason('All');
                  setSearch('');
                }}
                className="py-2 px-4 bg-[#FAF6EE] hover:bg-[#F2ECE1] text-[#1C1817] text-xs font-semibold rounded-xl border border-[#ECE5DA] transition-colors cursor-pointer"
              >
                Clear All Filters
              </button>
            ) : (
              <button
                onClick={() => setIsAddModalOpen(true)}
                className="py-2.5 px-5 bg-[#5B1924] hover:bg-[#48131C] text-white text-xs font-semibold rounded-xl transition-all shadow-xs flex items-center gap-2 mx-auto cursor-pointer"
              >
                <Plus size={15} /> Add Your First Garment
              </button>
            )}
          </div>
        </div>
      )}

      {/* 5. Pagination Bar */}
      {pagination.totalPages > 1 && (
        <div className="flex items-center justify-between p-4 bg-white rounded-2xl border border-[#ECE5DA] text-xs text-[#5E564E]">
          <div>
            <span>
              Page <strong className="text-[#1C1817]">{pagination.page}</strong> of{' '}
              <strong className="text-[#1C1817]">{pagination.totalPages}</strong>
            </span>
            <span className="hidden sm:inline text-[#8C8379] ml-2">
              ({pagination.totalItems} total items)
            </span>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={() => setPage(pagination.page - 1)}
              disabled={!pagination.hasPrevPage || isLoading}
              className="px-3 py-1.5 rounded-lg border border-[#ECE5DA] hover:bg-[#FAF6EE] disabled:opacity-40 disabled:cursor-not-allowed text-xs font-medium flex items-center gap-1 transition-colors cursor-pointer"
            >
              <ChevronLeft size={14} /> Previous
            </button>
            <button
              onClick={() => setPage(pagination.page + 1)}
              disabled={!pagination.hasNextPage || isLoading}
              className="px-3 py-1.5 rounded-lg border border-[#ECE5DA] hover:bg-[#FAF6EE] disabled:opacity-40 disabled:cursor-not-allowed text-xs font-medium flex items-center gap-1 transition-colors cursor-pointer"
            >
              Next <ChevronRight size={14} />
            </button>
          </div>
        </div>
      )}

      {/* Add Garment Modal */}
      <AddGarmentModal
        isOpen={isAddModalOpen}
        onClose={() => setIsAddModalOpen(false)}
        onGarmentCreated={handleGarmentCreated}
      />

      {/* Garment Detail Modal */}
      <GarmentDetailModal
        garment={selectedGarment}
        isOpen={isDetailModalOpen}
        onClose={() => {
          setIsDetailModalOpen(false);
          setSelectedGarment(null);
        }}
        onGarmentUpdated={handleUpdatedFromDetail}
        onGarmentDeleted={handleDeletedFromDetail}
        onRefreshUrl={refreshGarmentUrl}
      />
    </div>
  );
};
