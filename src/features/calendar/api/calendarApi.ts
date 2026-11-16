import {
  CalendarRangeResponse,
  ScheduledOutfitResponse,
  DeleteScheduleResponse,
  MarkWornResponse,
  WearLogResponse,
  DeleteWearLogResponse,
  WearHistoryResponse,
  UpcomingOutfitsResponse,
  ScheduleOutfitPayload,
  UpdateSchedulePayload,
  MarkWornPayload,
  LogSpontaneousWearPayload,
} from '../types';

export class CalendarApiError extends Error {
  status?: number;
  code?: string;
  errors?: string[];

  constructor(message: string, status?: number, code?: string, errors?: string[]) {
    super(message);
    this.name = 'CalendarApiError';
    this.status = status;
    this.code = code;
    this.errors = errors;
  }
}

async function handleResponse<T>(res: Response): Promise<T> {
  const isJson = res.headers.get('content-type')?.includes('application/json');
  const data = isJson ? await res.json() : null;

  if (!res.ok) {
    const message = data?.error || data?.message || `Request failed with status ${res.status}`;
    throw new CalendarApiError(message, res.status, data?.code, data?.errors);
  }

  return data as T;
}

/**
 * Fetches scheduled outfits within a start and end date range (YYYY-MM-DD).
 */
export async function fetchCalendarRange(
  start: string,
  end: string
): Promise<CalendarRangeResponse> {
  const params = new URLSearchParams({ start, end });
  const res = await fetch(`/api/calendar?${params.toString()}`, {
    method: 'GET',
    credentials: 'include',
  });
  return handleResponse<CalendarRangeResponse>(res);
}

/**
 * Schedules an outfit for a specific date and time slot.
 */
export async function scheduleOutfit(
  payload: ScheduleOutfitPayload
): Promise<ScheduledOutfitResponse> {
  const res = await fetch('/api/calendar', {
    method: 'POST',
    credentials: 'include',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  });
  return handleResponse<ScheduledOutfitResponse>(res);
}

/**
 * Retrieves a single scheduled outfit by ID.
 */
export async function fetchScheduleById(
  scheduleId: string
): Promise<ScheduledOutfitResponse> {
  const res = await fetch(`/api/calendar/${encodeURIComponent(scheduleId)}`, {
    method: 'GET',
    credentials: 'include',
  });
  return handleResponse<ScheduledOutfitResponse>(res);
}

/**
 * Updates an active scheduled outfit (date, slot, notes).
 */
export async function updateSchedule(
  scheduleId: string,
  payload: UpdateSchedulePayload
): Promise<ScheduledOutfitResponse> {
  const res = await fetch(`/api/calendar/${encodeURIComponent(scheduleId)}`, {
    method: 'PATCH',
    credentials: 'include',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  });
  return handleResponse<ScheduledOutfitResponse>(res);
}

/**
 * Removes a scheduled outfit.
 */
export async function deleteSchedule(
  scheduleId: string
): Promise<DeleteScheduleResponse> {
  const res = await fetch(`/api/calendar/${encodeURIComponent(scheduleId)}`, {
    method: 'DELETE',
    credentials: 'include',
  });
  return handleResponse<DeleteScheduleResponse>(res);
}

/**
 * Marks a scheduled outfit as worn (idempotent, transactional).
 */
export async function markScheduledOutfitAsWorn(
  scheduleId: string,
  payload: MarkWornPayload = {}
): Promise<MarkWornResponse> {
  const res = await fetch(`/api/calendar/${encodeURIComponent(scheduleId)}/wear`, {
    method: 'POST',
    credentials: 'include',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  });
  return handleResponse<MarkWornResponse>(res);
}

/**
 * Logs spontaneous wear without a prior schedule.
 */
export async function logSpontaneousWear(
  payload: LogSpontaneousWearPayload
): Promise<WearLogResponse> {
  const res = await fetch('/api/calendar/wear', {
    method: 'POST',
    credentials: 'include',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  });
  return handleResponse<WearLogResponse>(res);
}

/**
 * Retrieves paginated wear history.
 */
export async function fetchWearHistory(params?: {
  start?: string;
  end?: string;
  page?: number;
  limit?: number;
  outfitId?: string;
  garmentId?: string;
}): Promise<WearHistoryResponse> {
  const query = new URLSearchParams();
  if (params?.start) query.append('start', params.start);
  if (params?.end) query.append('end', params.end);
  if (params?.page) query.append('page', String(params.page));
  if (params?.limit) query.append('limit', String(params.limit));
  if (params?.outfitId) query.append('outfitId', params.outfitId);
  if (params?.garmentId) query.append('garmentId', params.garmentId);

  const url = `/api/calendar/wear-history${query.toString() ? `?${query.toString()}` : ''}`;
  const res = await fetch(url, {
    method: 'GET',
    credentials: 'include',
  });
  return handleResponse<WearHistoryResponse>(res);
}

/**
 * Updates a wear log's date and notes.
 */
export async function updateWearLog(
  wearLogId: string,
  payload: { wornDate?: string; notes?: string }
): Promise<WearLogResponse> {
  const res = await fetch(`/api/calendar/wear-history/${encodeURIComponent(wearLogId)}`, {
    method: 'PATCH',
    credentials: 'include',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  });
  return handleResponse<WearLogResponse>(res);
}

/**
 * Deletes a wear log (reverting linked schedule to 'planned' if applicable).
 */
export async function deleteWearLog(
  wearLogId: string
): Promise<DeleteWearLogResponse> {
  const res = await fetch(`/api/calendar/wear-history/${encodeURIComponent(wearLogId)}`, {
    method: 'DELETE',
    credentials: 'include',
  });
  return handleResponse<DeleteWearLogResponse>(res);
}

/**
 * Retrieves upcoming planned looks for the Dashboard widget.
 */
export async function fetchUpcomingOutfits(
  days = 7
): Promise<UpcomingOutfitsResponse> {
  const res = await fetch(`/api/calendar/upcoming?days=${days}`, {
    method: 'GET',
    credentials: 'include',
  });
  return handleResponse<UpcomingOutfitsResponse>(res);
}
