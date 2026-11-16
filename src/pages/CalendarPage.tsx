import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Calendar as CalendarIcon,
  Clock,
  Sparkles,
  ChevronLeft,
  ChevronRight,
  Plus,
  RefreshCw,
  AlertCircle,
  Loader2,
  CheckCircle2,
  Shirt,
  CalendarDays,
  History,
} from 'lucide-react';
import {
  ScheduledOutfit,
  OutfitWearLog,
  TimeSlot,
} from '../features/calendar/types';
import {
  fetchCalendarRange,
  deleteSchedule,
} from '../features/calendar/api/calendarApi';
import { ScheduleLookModal } from '../features/calendar/components/ScheduleLookModal';
import { MarkAsWornModal } from '../features/calendar/components/MarkAsWornModal';
import { EditScheduleModal } from '../features/calendar/components/EditScheduleModal';
import { ScheduledOutfitCard } from '../features/calendar/components/ScheduledOutfitCard';
import { WearHistoryView } from '../features/calendar/components/WearHistoryView';

const WEEKDAYS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
const MONTHS = [
  'January',
  'February',
  'March',
  'April',
  'May',
  'June',
  'July',
  'August',
  'September',
  'October',
  'November',
  'December',
];

function formatDateKey(d: Date): string {
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

export const CalendarPage: React.FC = () => {
  const navigate = useNavigate();

  // Active Tab: 'planner' | 'history'
  const [activeTab, setActiveTab] = useState<'planner' | 'history'>('planner');

  // View Mode in Planner: 'month' | 'week'
  const [viewMode, setViewMode] = useState<'month' | 'week'>('month');

  // Active viewing anchor date
  const [currentDate, setCurrentDate] = useState<Date>(new Date());

  // Selected date for the detail panel (YYYY-MM-DD)
  const [selectedDate, setSelectedDate] = useState<string>(() => formatDateKey(new Date()));

  // Schedules State
  const [schedules, setSchedules] = useState<ScheduledOutfit[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // Modals State
  const [isScheduleModalOpen, setIsScheduleModalOpen] = useState<boolean>(false);
  const [initialScheduleDate, setInitialScheduleDate] = useState<string>('');

  const [wornModalSchedule, setWornModalSchedule] = useState<ScheduledOutfit | null>(null);
  const [isWornModalOpen, setIsWornModalOpen] = useState<boolean>(false);

  const [editModalSchedule, setEditModalSchedule] = useState<ScheduledOutfit | null>(null);
  const [isEditModalOpen, setIsEditModalOpen] = useState<boolean>(false);

  // Compute start and end dates based on viewMode and currentDate
  const dateRange = useMemo(() => {
    const year = currentDate.getFullYear();
    const month = currentDate.getMonth();

    if (viewMode === 'month') {
      // First day of month
      const firstDay = new Date(year, month, 1);
      // Day of week: 0 (Sun) to 6 (Sat) -> transform to Mon=0 ... Sun=6
      const firstDayOfWeek = (firstDay.getDay() + 6) % 7;
      const start = new Date(year, month, 1 - firstDayOfWeek);

      // Last day of month
      const lastDay = new Date(year, month + 1, 0);
      const lastDayOfWeek = (lastDay.getDay() + 6) % 7;
      const end = new Date(year, month + 1, 6 - lastDayOfWeek);

      return {
        start: formatDateKey(start),
        end: formatDateKey(end),
      };
    } else {
      // Week View: Monday to Sunday
      const dayOfWeek = (currentDate.getDay() + 6) % 7;
      const monday = new Date(currentDate);
      monday.setDate(currentDate.getDate() - dayOfWeek);

      const sunday = new Date(monday);
      sunday.setDate(monday.getDate() + 6);

      return {
        start: formatDateKey(monday),
        end: formatDateKey(sunday),
      };
    }
  }, [currentDate, viewMode]);

  // Load schedules for active dateRange
  const loadSchedules = useCallback(async () => {
    setIsLoading(true);
    setErrorMessage(null);
    try {
      const res = await fetchCalendarRange(dateRange.start, dateRange.end);
      setSchedules(res.scheduledOutfits || []);
    } catch (err: any) {
      setErrorMessage(err.message || 'Failed to load calendar schedules.');
    } finally {
      setIsLoading(false);
    }
  }, [dateRange]);

  useEffect(() => {
    if (activeTab === 'planner') {
      loadSchedules();
    }
  }, [loadSchedules, activeTab]);

  // Map of schedules by date string
  const schedulesByDate = useMemo(() => {
    const map = new Map<string, ScheduledOutfit[]>();
    for (const s of schedules) {
      const list = map.get(s.date) || [];
      list.push(s);
      map.set(s.date, list);
    }
    return map;
  }, [schedules]);

  // Navigation handlers
  const handlePrev = () => {
    const next = new Date(currentDate);
    if (viewMode === 'month') {
      next.setMonth(next.getMonth() - 1);
    } else {
      next.setDate(next.getDate() - 7);
    }
    setCurrentDate(next);
  };

  const handleNext = () => {
    const next = new Date(currentDate);
    if (viewMode === 'month') {
      next.setMonth(next.getMonth() + 1);
    } else {
      next.setDate(next.getDate() + 7);
    }
    setCurrentDate(next);
  };

  const handleToday = () => {
    const today = new Date();
    setCurrentDate(today);
    setSelectedDate(formatDateKey(today));
  };

  // Card Action Handlers
  const handleOpenPlanModal = (targetDate?: string) => {
    setInitialScheduleDate(targetDate || selectedDate || formatDateKey(new Date()));
    setIsScheduleModalOpen(true);
  };

  const handleMarkWorn = (schedule: ScheduledOutfit) => {
    setWornModalSchedule(schedule);
    setIsWornModalOpen(true);
  };

  const handleEditSchedule = (schedule: ScheduledOutfit) => {
    setEditModalSchedule(schedule);
    setIsEditModalOpen(true);
  };

  const handleDeleteSchedule = async (scheduleId: string) => {
    await deleteSchedule(scheduleId);
    setSchedules((prev) => prev.filter((s) => s._id !== scheduleId));
  };

  const handleScheduleSuccess = (created: ScheduledOutfit) => {
    setSchedules((prev) => [...prev, created]);
    setSelectedDate(created.date);
  };

  const handleMarkWornSuccess = (updated: ScheduledOutfit) => {
    setSchedules((prev) => prev.map((s) => (s._id === updated._id ? updated : s)));
  };

  const handleEditSuccess = (updated: ScheduledOutfit) => {
    setSchedules((prev) => prev.map((s) => (s._id === updated._id ? updated : s)));
    setSelectedDate(updated.date);
  };

  // Build grid days for Month View
  const monthGridDays = useMemo(() => {
    if (viewMode !== 'month') return [];

    const start = new Date(dateRange.start + 'T00:00:00');
    const end = new Date(dateRange.end + 'T00:00:00');
    const days: Array<{ dateStr: string; dateObj: Date; isCurrentMonth: boolean; isToday: boolean }> = [];

    const cursor = new Date(start);
    const todayKey = formatDateKey(new Date());

    while (cursor <= end) {
      const dateStr = formatDateKey(cursor);
      days.push({
        dateStr,
        dateObj: new Date(cursor),
        isCurrentMonth: cursor.getMonth() === currentDate.getMonth(),
        isToday: dateStr === todayKey,
      });
      cursor.setDate(cursor.getDate() + 1);
    }

    return days;
  }, [viewMode, dateRange, currentDate]);

  // Build 7 days for Week View
  const weekGridDays = useMemo(() => {
    if (viewMode !== 'week') return [];

    const start = new Date(dateRange.start + 'T00:00:00');
    const days: Array<{ dateStr: string; dateObj: Date; isToday: boolean }> = [];
    const todayKey = formatDateKey(new Date());

    for (let i = 0; i < 7; i++) {
      const day = new Date(start);
      day.setDate(start.getDate() + i);
      const dateStr = formatDateKey(day);
      days.push({
        dateStr,
        dateObj: day,
        isToday: dateStr === todayKey,
      });
    }

    return days;
  }, [viewMode, dateRange]);

  // Selected date scheduled outfits
  const selectedDateSchedules = schedulesByDate.get(selectedDate) || [];

  return (
    <div className="space-y-6 lg:space-y-8 animate-in fade-in duration-200">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-3 border-b border-[#ECE5DA]">
        <div>
          <h1 className="font-editorial text-2xl sm:text-3xl lg:text-4xl font-bold tracking-tight text-[#1C1817]">
            Outfit{' '}
            <span className="font-cursive text-[1.25em] text-[#5B1924] font-normal leading-none inline-block px-1 align-baseline">
              Planner
            </span>
          </h1>
          <p className="text-xs sm:text-sm text-[#5E564E] mt-1 leading-relaxed">
            Curate your weekly ensemble schedule and track historical wardrobe wear telemetry.
          </p>
        </div>

        {/* Tab & Action Controls */}
        <div className="flex items-center gap-2.5">
          {/* Planner vs History Tabs */}
          <div className="p-1 rounded-full bg-[#FAF6EE] border border-[#ECE5DA] flex items-center">
            <button
              type="button"
              onClick={() => setActiveTab('planner')}
              className={`inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-full text-xs font-semibold transition-all cursor-pointer ${
                activeTab === 'planner'
                  ? 'bg-[#FFFFFF] text-[#5B1924] shadow-xs'
                  : 'text-[#8C8379] hover:text-[#1C1817]'
              }`}
            >
              <CalendarDays size={13} />
              <span>Calendar</span>
            </button>
            <button
              type="button"
              onClick={() => setActiveTab('history')}
              className={`inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-full text-xs font-semibold transition-all cursor-pointer ${
                activeTab === 'history'
                  ? 'bg-[#FFFFFF] text-[#5B1924] shadow-xs'
                  : 'text-[#8C8379] hover:text-[#1C1817]'
              }`}
            >
              <History size={13} />
              <span>Wear History</span>
            </button>
          </div>

          {activeTab === 'planner' && (
            <button
              type="button"
              onClick={() => handleOpenPlanModal()}
              className="inline-flex items-center gap-1.5 px-4 py-2 rounded-full bg-[#5B1924] text-[#FDFBF7] text-xs font-semibold hover:bg-[#48131C] active:scale-[0.98] transition-all shadow-md shadow-[#5B1924]/15 cursor-pointer shrink-0"
            >
              <Plus size={14} />
              <span>Plan Outfit</span>
            </button>
          )}
        </div>
      </div>

      {/* Main Content Area */}
      {activeTab === 'history' ? (
        <WearHistoryView />
      ) : (
        <div className="space-y-6">
          {/* Calendar Navigation Bar */}
          <div className="p-4 rounded-2xl bg-[#FFFFFF] border border-[#ECE5DA] shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            {/* Period Navigator */}
            <div className="flex items-center gap-3">
              <div className="flex items-center gap-1 bg-[#FAF6EE] border border-[#ECE5DA] rounded-xl p-0.5">
                <button
                  type="button"
                  onClick={handlePrev}
                  className="p-1.5 rounded-lg text-[#5E564E] hover:text-[#1C1817] hover:bg-white transition-colors cursor-pointer"
                  title="Previous"
                >
                  <ChevronLeft size={16} />
                </button>
                <button
                  type="button"
                  onClick={handleToday}
                  className="px-2.5 py-1 rounded-lg text-xs font-semibold text-[#5B1924] hover:bg-white transition-colors cursor-pointer"
                >
                  Today
                </button>
                <button
                  type="button"
                  onClick={handleNext}
                  className="p-1.5 rounded-lg text-[#5E564E] hover:text-[#1C1817] hover:bg-white transition-colors cursor-pointer"
                  title="Next"
                >
                  <ChevronRight size={16} />
                </button>
              </div>

              <h2 className="font-editorial text-lg sm:text-xl font-bold text-[#1C1817]">
                {MONTHS[currentDate.getMonth()]} {currentDate.getFullYear()}
              </h2>
            </div>

            {/* View Mode Switcher & Refresh */}
            <div className="flex items-center gap-2">
              <div className="p-1 rounded-xl bg-[#FAF6EE] border border-[#ECE5DA] flex items-center text-xs">
                <button
                  type="button"
                  onClick={() => setViewMode('month')}
                  className={`px-3 py-1 rounded-lg font-semibold transition-all cursor-pointer ${
                    viewMode === 'month'
                      ? 'bg-white text-[#5B1924] shadow-xs'
                      : 'text-[#8C8379] hover:text-[#1C1817]'
                  }`}
                >
                  Month
                </button>
                <button
                  type="button"
                  onClick={() => setViewMode('week')}
                  className={`px-3 py-1 rounded-lg font-semibold transition-all cursor-pointer ${
                    viewMode === 'week'
                      ? 'bg-white text-[#5B1924] shadow-xs'
                      : 'text-[#8C8379] hover:text-[#1C1817]'
                  }`}
                >
                  Week
                </button>
              </div>

              <button
                type="button"
                onClick={loadSchedules}
                className="p-2 rounded-xl border border-[#ECE5DA] text-[#8C8379] hover:text-[#1C1817] hover:bg-[#FAF6EE] transition-colors cursor-pointer"
                title="Refresh Calendar"
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
                onClick={loadSchedules}
                className="px-3 py-1 bg-[#882434] text-white rounded-lg font-semibold cursor-pointer"
              >
                Retry
              </button>
            </div>
          )}

          {/* Grid Layout: Left is Calendar Grid, Right is Selected Day Panel */}
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
            {/* Calendar Main Grid (lg:col-span-8) */}
            <div className="lg:col-span-8 bg-[#FFFFFF] border border-[#ECE5DA] rounded-3xl p-4 sm:p-6 shadow-xs overflow-hidden">
              {viewMode === 'month' ? (
                <div>
                  {/* Weekday Labels Header */}
                  <div className="grid grid-cols-7 gap-1 pb-2 border-b border-[#ECE5DA] text-center">
                    {WEEKDAYS.map((wd) => (
                      <div
                        key={wd}
                        className="text-[11px] font-bold text-[#8C8379] uppercase tracking-wider py-1"
                      >
                        {wd}
                      </div>
                    ))}
                  </div>

                  {/* Month Grid Cells */}
                  <div className="grid grid-cols-7 gap-1 sm:gap-2 pt-2">
                    {monthGridDays.map((day) => {
                      const daySchedules = schedulesByDate.get(day.dateStr) || [];
                      const isSelected = selectedDate === day.dateStr;

                      return (
                        <div
                          key={day.dateStr}
                          data-date={day.dateStr}
                          onClick={() => setSelectedDate(day.dateStr)}
                          className={`min-h-[85px] sm:min-h-[105px] p-1.5 sm:p-2 rounded-2xl border transition-all cursor-pointer flex flex-col justify-between ${
                            isSelected
                              ? 'bg-[#FAF6EE] border-[#5B1924] ring-1 ring-[#5B1924] shadow-xs'
                              : day.isCurrentMonth
                              ? 'bg-[#FFFFFF] border-[#ECE5DA] hover:border-[#D8CEBD] hover:bg-[#FCFAF7]'
                              : 'bg-[#FBF9F5]/60 border-[#F2ECE1] opacity-60 hover:opacity-100'
                          }`}
                        >
                          {/* Day Header: Date number & Today dot */}
                          <div className="flex items-center justify-between">
                            <span
                              className={`text-xs font-semibold inline-flex items-center justify-center w-6 h-6 rounded-full ${
                                day.isToday
                                  ? 'bg-[#5B1924] text-white font-bold'
                                  : isSelected
                                  ? 'text-[#5B1924] font-bold'
                                  : day.isCurrentMonth
                                  ? 'text-[#1C1817]'
                                  : 'text-[#8C8379]'
                              }`}
                            >
                              {day.dateObj.getDate()}
                            </span>

                            {daySchedules.length > 0 && (
                              <span className="text-[10px] font-bold text-[#5B1924] bg-[#5B1924]/10 px-1.5 py-0.2 rounded-md">
                                {daySchedules.length}
                              </span>
                            )}
                          </div>

                          {/* Scheduled Outfits Stack inside cell */}
                          <div className="space-y-1 my-1 overflow-hidden">
                            {daySchedules.slice(0, 2).map((s) => (
                              <ScheduledOutfitCard
                                key={s._id}
                                schedule={s}
                                onMarkWorn={handleMarkWorn}
                                onEdit={handleEditSchedule}
                                onDelete={handleDeleteSchedule}
                                compact={true}
                              />
                            ))}
                            {daySchedules.length > 2 && (
                              <div className="text-[9px] font-bold text-[#8C8379] px-1 text-center">
                                +{daySchedules.length - 2} more
                              </div>
                            )}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              ) : (
                /* Week View */
                <div>
                  <div className="grid grid-cols-1 sm:grid-cols-7 gap-2">
                    {weekGridDays.map((day) => {
                      const daySchedules = schedulesByDate.get(day.dateStr) || [];
                      const isSelected = selectedDate === day.dateStr;
                      const dayName = WEEKDAYS[(day.dateObj.getDay() + 6) % 7];

                      return (
                        <div
                          key={day.dateStr}
                          data-date={day.dateStr}
                          onClick={() => setSelectedDate(day.dateStr)}
                          className={`min-h-[200px] p-2.5 rounded-2xl border transition-all cursor-pointer flex flex-col justify-between ${
                            isSelected
                              ? 'bg-[#FAF6EE] border-[#5B1924] ring-1 ring-[#5B1924] shadow-xs'
                              : 'bg-[#FFFFFF] border-[#ECE5DA] hover:border-[#D8CEBD]'
                          }`}
                        >
                          <div>
                            {/* Header */}
                            <div className="flex items-center justify-between pb-1.5 border-b border-[#ECE5DA]">
                              <span className="text-[10px] font-bold uppercase tracking-wider text-[#8C8379]">
                                {dayName}
                              </span>
                              <span
                                className={`text-xs font-semibold w-6 h-6 rounded-full inline-flex items-center justify-center ${
                                  day.isToday ? 'bg-[#5B1924] text-white' : 'text-[#1C1817]'
                                }`}
                              >
                                {day.dateObj.getDate()}
                              </span>
                            </div>

                            {/* Stack */}
                            <div className="space-y-1.5 pt-2">
                              {daySchedules.map((s) => (
                                <ScheduledOutfitCard
                                  key={s._id}
                                  schedule={s}
                                  onMarkWorn={handleMarkWorn}
                                  onEdit={handleEditSchedule}
                                  onDelete={handleDeleteSchedule}
                                  compact={true}
                                />
                              ))}
                            </div>
                          </div>

                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              handleOpenPlanModal(day.dateStr);
                            }}
                            className="w-full mt-2 py-1 rounded-lg text-[10px] font-semibold text-[#5B1924] hover:bg-[#FAF6EE] border border-dashed border-[#ECE5DA] flex items-center justify-center gap-1 cursor-pointer"
                          >
                            <Plus size={10} />
                            <span>Add Look</span>
                          </button>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}
            </div>

            {/* Selected Date Detail Drawer / Panel (lg:col-span-4) */}
            <div className="lg:col-span-4 bg-[#FAF6EE] border border-[#ECE5DA] rounded-3xl p-5 sm:p-6 shadow-xs space-y-4">
              <div className="flex items-center justify-between pb-3 border-b border-[#ECE5DA]">
                <div>
                  <span className="text-[10px] font-bold uppercase tracking-wider text-[#5B1924]">
                    Selected Date
                  </span>
                  <h3 className="font-editorial text-lg font-bold text-[#1C1817]">
                    {new Date(selectedDate + 'T00:00:00').toLocaleDateString(undefined, {
                      weekday: 'short',
                      month: 'short',
                      day: 'numeric',
                      year: 'numeric',
                    })}
                  </h3>
                </div>

                <button
                  type="button"
                  onClick={() => handleOpenPlanModal(selectedDate)}
                  className="inline-flex items-center gap-1 px-3 py-1.5 rounded-full bg-[#5B1924] text-white text-xs font-semibold hover:bg-[#48131C] transition-all cursor-pointer shadow-xs"
                >
                  <Plus size={12} />
                  <span>Plan Look</span>
                </button>
              </div>

              {/* Scheduled Outfits List */}
              <div className="space-y-3 max-h-[600px] overflow-y-auto pr-0.5">
                {selectedDateSchedules.length === 0 ? (
                  <div className="p-8 text-center bg-[#FFFFFF] rounded-2xl border border-[#ECE5DA] space-y-2">
                    <CalendarIcon size={24} className="text-[#8C8379] mx-auto" />
                    <p className="text-xs font-semibold text-[#1C1817]">No outfits scheduled</p>
                    <p className="text-[11px] text-[#5E564E]">
                      Take the guesswork out of your day by scheduling a look in advance.
                    </p>
                    <div className="pt-2">
                      <button
                        type="button"
                        onClick={() => handleOpenPlanModal(selectedDate)}
                        className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-full bg-[#FAF6EE] border border-[#ECE5DA] text-xs font-semibold text-[#5B1924] hover:bg-[#5B1924] hover:text-white transition-all cursor-pointer"
                      >
                        <Plus size={12} />
                        <span>Schedule Outfit</span>
                      </button>
                    </div>
                  </div>
                ) : (
                  selectedDateSchedules.map((s) => (
                    <ScheduledOutfitCard
                      key={s._id}
                      schedule={s}
                      onMarkWorn={handleMarkWorn}
                      onEdit={handleEditSchedule}
                      onDelete={handleDeleteSchedule}
                      compact={false}
                    />
                  ))
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Modals */}
      <ScheduleLookModal
        isOpen={isScheduleModalOpen}
        onClose={() => setIsScheduleModalOpen(false)}
        onSuccess={handleScheduleSuccess}
        initialDate={initialScheduleDate}
      />

      <MarkAsWornModal
        isOpen={isWornModalOpen}
        schedule={wornModalSchedule}
        onClose={() => {
          setIsWornModalOpen(false);
          setWornModalSchedule(null);
        }}
        onSuccess={handleMarkWornSuccess}
      />

      <EditScheduleModal
        isOpen={isEditModalOpen}
        schedule={editModalSchedule}
        onClose={() => {
          setIsEditModalOpen(false);
          setEditModalSchedule(null);
        }}
        onSuccess={handleEditSuccess}
      />
    </div>
  );
};

export default CalendarPage;
