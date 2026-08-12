import type { TransportMode } from '@/src/types/domain';
import type { ItineraryDraft } from '@/src/types/itinerary';
import { todayInTimeZone } from '@/src/utils/localDate';
import { TRANSPORT_OPTIONS, TRAVEL_STYLE_OPTIONS } from './planningOptions';
import { PLANNING_RULES } from './planningRules';

export const PLANNING_LIMITS = {
  minDays: 1,
  maxDays: 10,
  minPeople: 1,
  maxPeople: 30,
  maxTitleLength: 120,
  maxSelectedPlaces: 40,
  minPlaceDurationMin: 15,
  maxPlaceDurationMin: 720,
  minSlotDurationMin: 5,
  maxSlotDurationMin: 720,
} as const;

export type PlanningIssueCode =
  | 'TITLE_REQUIRED'
  | 'TITLE_TOO_LONG'
  | 'DAYS_OUT_OF_RANGE'
  | 'PEOPLE_OUT_OF_RANGE'
  | 'START_DATE_REQUIRED'
  | 'START_DATE_INVALID'
  | 'START_DATE_IN_PAST'
  | 'TRANSPORT_INVALID'
  | 'PLACES_REQUIRED'
  | 'TOO_MANY_PLACES'
  | 'DUPLICATE_PLACES'
  | 'PLACE_INVALID';

export interface PlanningIssue {
  code: PlanningIssueCode;
  field: keyof ItineraryDraft;
  message: string;
}

export interface PlanningValidationOptions {
  requireTitle?: boolean;
  requireStartDate?: boolean;
  requirePlaces?: boolean;
  allowPastStartDate?: boolean;
}

const transports = new Set<TransportMode>(TRANSPORT_OPTIONS.map((option) => option.value));
const travelStyles = new Set<string>(TRAVEL_STYLE_OPTIONS.map((option) => option.value));

function clampInteger(value: number, min: number, max: number, fallback: number): number {
  if (!Number.isFinite(value)) return fallback;
  return Math.min(max, Math.max(min, Math.round(value)));
}

export function isValidLocalDate(value: string): boolean {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;
  const [year, month, day] = value.split('-').map(Number);
  const parsed = new Date(Date.UTC(year, month - 1, day));
  return parsed.getUTCFullYear() === year
    && parsed.getUTCMonth() === month - 1
    && parsed.getUTCDate() === day;
}

/**
 * Normalize values crossing an external boundary (deep link, database preload, persisted state).
 * User selections over the hard place limit are intentionally preserved so validation can report
 * the problem instead of silently deleting places.
 */
export function normalizeItineraryDraft(input: ItineraryDraft): ItineraryDraft {
  const seen = new Set<string>();
  const selectedPlaces = input.selectedPlaces.filter((place) => {
    if (!place?.id || seen.has(place.id)) return false;
    seen.add(place.id);
    return true;
  });

  return {
    ...input,
    title: String(input.title ?? '').slice(0, PLANNING_LIMITS.maxTitleLength),
    numDays: clampInteger(input.numDays, PLANNING_LIMITS.minDays, PLANNING_LIMITS.maxDays, PLANNING_LIMITS.minDays),
    numPeople: clampInteger(input.numPeople, PLANNING_LIMITS.minPeople, PLANNING_LIMITS.maxPeople, PLANNING_LIMITS.minPeople),
    startDate: isValidLocalDate(input.startDate) ? input.startDate : '',
    transport: transports.has(input.transport) ? input.transport : 'motorbike',
    travelStyles: [...new Set((input.travelStyles ?? []).filter((style) => travelStyles.has(style)))],
    selectedPlaces,
  };
}

export function validateItineraryDraft(
  draft: ItineraryDraft,
  options: PlanningValidationOptions = {},
): PlanningIssue[] {
  const issues: PlanningIssue[] = [];
  const title = draft.title.trim();

  if (options.requireTitle && !title) {
    issues.push({ code: 'TITLE_REQUIRED', field: 'title', message: 'Vui lòng nhập tên lịch trình.' });
  } else if (title.length > PLANNING_LIMITS.maxTitleLength) {
    issues.push({
      code: 'TITLE_TOO_LONG',
      field: 'title',
      message: `Tên lịch trình không được vượt quá ${PLANNING_LIMITS.maxTitleLength} ký tự.`,
    });
  }

  if (!Number.isInteger(draft.numDays)
    || draft.numDays < PLANNING_LIMITS.minDays
    || draft.numDays > PLANNING_LIMITS.maxDays) {
    issues.push({
      code: 'DAYS_OUT_OF_RANGE',
      field: 'numDays',
      message: `Số ngày phải từ ${PLANNING_LIMITS.minDays} đến ${PLANNING_LIMITS.maxDays}.`,
    });
  }

  if (!Number.isInteger(draft.numPeople)
    || draft.numPeople < PLANNING_LIMITS.minPeople
    || draft.numPeople > PLANNING_LIMITS.maxPeople) {
    issues.push({
      code: 'PEOPLE_OUT_OF_RANGE',
      field: 'numPeople',
      message: `Số người phải từ ${PLANNING_LIMITS.minPeople} đến ${PLANNING_LIMITS.maxPeople}.`,
    });
  }

  if (options.requireStartDate && !draft.startDate) {
    issues.push({ code: 'START_DATE_REQUIRED', field: 'startDate', message: 'Vui lòng chọn ngày bắt đầu.' });
  } else if (draft.startDate && !isValidLocalDate(draft.startDate)) {
    issues.push({ code: 'START_DATE_INVALID', field: 'startDate', message: 'Ngày bắt đầu không hợp lệ.' });
  } else if (draft.startDate && !options.allowPastStartDate && draft.startDate < todayInTimeZone()) {
    issues.push({
      code: 'START_DATE_IN_PAST',
      field: 'startDate',
      message: 'Ngày bắt đầu không được trước ngày hiện tại tại Việt Nam.',
    });
  }

  if (!transports.has(draft.transport)) {
    issues.push({ code: 'TRANSPORT_INVALID', field: 'transport', message: 'Phương tiện di chuyển không hợp lệ.' });
  }

  if (options.requirePlaces && draft.selectedPlaces.length === 0) {
    issues.push({ code: 'PLACES_REQUIRED', field: 'selectedPlaces', message: 'Vui lòng chọn ít nhất một địa điểm.' });
  }
  if (draft.selectedPlaces.length > PLANNING_LIMITS.maxSelectedPlaces) {
    issues.push({
      code: 'TOO_MANY_PLACES',
      field: 'selectedPlaces',
      message: `Mỗi lịch trình được chọn tối đa ${PLANNING_LIMITS.maxSelectedPlaces} địa điểm.`,
    });
  }

  const ids = draft.selectedPlaces.map((place) => place.id);
  if (new Set(ids).size !== ids.length) {
    issues.push({ code: 'DUPLICATE_PLACES', field: 'selectedPlaces', message: 'Danh sách có địa điểm bị trùng.' });
  }
  if (draft.selectedPlaces.some((place) => !place.id
    || !Number.isFinite(place.lat)
    || !Number.isFinite(place.lng)
    || !Number.isFinite(place.avg_duration_min)
    || place.avg_duration_min < PLANNING_LIMITS.minPlaceDurationMin
    || place.avg_duration_min > PLANNING_LIMITS.maxPlaceDurationMin)) {
    issues.push({
      code: 'PLACE_INVALID',
      field: 'selectedPlaces',
      message: 'Có địa điểm thiếu tọa độ hoặc thời lượng tham quan không hợp lệ.',
    });
  }

  return issues;
}

/** Ước tính trước khi có ma trận đường; kết quả định tuyến ở bước 3 vẫn là nguồn quyết định. */
export function estimateRequiredDays(draft: Pick<ItineraryDraft, 'selectedPlaces' | 'transport'>): number {
  if (draft.selectedPlaces.length === 0) return 0;
  const visitMinutes = draft.selectedPlaces.reduce(
    (sum, place) => sum + (Number.isFinite(place.avg_duration_min)
      ? place.avg_duration_min
      : PLANNING_RULES.defaultVisitDurationMin),
    0,
  );
  const transitionMinutes = PLANNING_RULES.transitionBufferMin
    + PLANNING_RULES.estimatedTransferMinutes[draft.transport];

  for (let days = PLANNING_LIMITS.minDays; days <= PLANNING_LIMITS.maxDays; days++) {
    const transitions = Math.max(0, draft.selectedPlaces.length - days);
    if (visitMinutes + transitions * transitionMinutes <= days * PLANNING_RULES.usableVisitMinutesPerDay) {
      return days;
    }
  }
  return PLANNING_LIMITS.maxDays + 1;
}
