import { Outfit } from '../../outfits/types';
import { PaginationInfo } from '../../wardrobe/types';

export type TimeSlot =
  | 'All Day'
  | 'Morning'
  | 'Work'
  | 'Daytime'
  | 'Evening'
  | 'Night'
  | 'Workout'
  | 'Event';

export const TIME_SLOTS: TimeSlot[] = [
  'All Day',
  'Morning',
  'Work',
  'Daytime',
  'Evening',
  'Night',
  'Workout',
  'Event',
];

export interface ScheduledOutfit {
  _id: string;
  userId: string;
  outfitId: string | null;
  date: string; // YYYY-MM-DD
  slot: TimeSlot;
  notes: string;
  status: 'planned' | 'completed' | 'cancelled';
  wearLogId: string | null;
  outfit?: Outfit | null;
  createdAt: string;
  updatedAt: string;
}

export interface HistoricalGarmentSnapshot {
  garmentId: string | null;
  name: string;
  category: string;
  subCategory?: string | null;
  primaryColor?: string | null;
  colorFamily?: string | null;
  pattern?: string | null;
  season?: string[];
  signedUrl?: string | null;
}

export interface OutfitWearLog {
  _id: string;
  userId: string;
  outfitId: string | null;
  scheduledOutfitId: string | null;
  wornDate: string; // YYYY-MM-DD
  outfitName: string;
  notes: string;
  garments: HistoricalGarmentSnapshot[];
  createdAt: string;
  updatedAt: string;
}

export interface CalendarRangeResponse {
  success: boolean;
  scheduledOutfits: ScheduledOutfit[];
  range: {
    start: string;
    end: string;
  };
}

export interface ScheduledOutfitResponse {
  success: boolean;
  scheduledOutfit: ScheduledOutfit;
}

export interface DeleteScheduleResponse {
  success: boolean;
  message: string;
  scheduledOutfitId: string;
}

export interface MarkWornResponse {
  success: boolean;
  scheduledOutfit: ScheduledOutfit;
  wearLog: OutfitWearLog;
}

export interface WearLogResponse {
  success: boolean;
  wearLog: OutfitWearLog;
}

export interface DeleteWearLogResponse {
  success: boolean;
  message: string;
  wearLogId: string;
}

export interface WearHistoryResponse {
  success: boolean;
  wearHistory: OutfitWearLog[];
  pagination: PaginationInfo;
}

export interface UpcomingOutfitsResponse {
  success: boolean;
  upcomingOutfits: ScheduledOutfit[];
}

export interface ScheduleOutfitPayload {
  outfitId: string;
  date: string; // YYYY-MM-DD
  slot?: TimeSlot;
  notes?: string;
}

export interface UpdateSchedulePayload {
  date?: string; // YYYY-MM-DD
  slot?: TimeSlot;
  notes?: string;
}

export interface MarkWornPayload {
  actualDate?: string; // YYYY-MM-DD
  notes?: string;
}

export interface LogSpontaneousWearPayload {
  outfitId: string;
  wornDate: string; // YYYY-MM-DD
  notes?: string;
}
