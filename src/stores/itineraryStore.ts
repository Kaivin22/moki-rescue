import { create } from 'zustand';
import { Place } from '../types/place';
import { OptimizerResult, OptimizerInput, optimizeRoute } from '../features/itinerary/services/routeOptimizer';
import { PLANNING_RULES } from '../features/itinerary/config/planningRules';
import type { ItineraryDraft } from '../types/itinerary';
import { normalizeItineraryDraft, PLANNING_LIMITS } from '../features/itinerary/config/planningPolicy';

const createDefaultDraft = (): ItineraryDraft => ({
  title: '',
  numDays: 1,
  startDate: '',
  numPeople: 2,
  transport: 'motorbike',
  travelStyles: [],
  selectedPlaces: [],
});

interface ItineraryStore {
  draft: ItineraryDraft;
  result: OptimizerResult | null;
  isOptimizing: boolean;
  editId?: string;
  expectedUpdatedAt?: string;
  preloadedDayPlans?: Place[][];
  preloadedSlotOverrides?: Record<string, { startTime: string; durationMin: number }>;
  draftSessionId: number;
  setDraftField: <K extends keyof ItineraryDraft>(field: K, value: ItineraryDraft[K]) => void;
  addPlaceToDraft: (place: Place) => void;
  removePlaceFromDraft: (placeId: string) => void;
  reorderPlaces: (places: Place[]) => void;
  optimize: () => Promise<void>;
  reset: () => void;
  setEditId: (id: string | undefined) => void;
  prefillDraft: (
    draft: ItineraryDraft,
    dayPlans: Place[][],
    options?: {
      editId?: string;
      expectedUpdatedAt?: string;
      slotOverrides?: Record<string, { startTime: string; durationMin: number }>;
    }
  ) => void;
}

export const useItineraryStore = create<ItineraryStore>((set, get) => ({
  draft: createDefaultDraft(),
  result: null,
  isOptimizing: false,
  editId: undefined,
  expectedUpdatedAt: undefined,
  preloadedDayPlans: undefined,
  preloadedSlotOverrides: undefined,
  draftSessionId: 0,
  
  setEditId: (id) => set({ editId: id }),
  prefillDraft: (draft, dayPlans, options) => set((state) => ({
    draft: normalizeItineraryDraft(draft),
    preloadedDayPlans: dayPlans,
    editId: options?.editId,
    expectedUpdatedAt: options?.expectedUpdatedAt,
    preloadedSlotOverrides: options?.slotOverrides,
    draftSessionId: state.draftSessionId + 1,
  })),

  setDraftField: (field, value) =>
    set((state) => {
      let normalizedValue = value;
      if (field === 'numDays') {
        normalizedValue = Math.min(PLANNING_LIMITS.maxDays, Math.max(PLANNING_LIMITS.minDays, Math.round(Number(value)))) as ItineraryDraft[typeof field];
      } else if (field === 'numPeople') {
        normalizedValue = Math.min(PLANNING_LIMITS.maxPeople, Math.max(PLANNING_LIMITS.minPeople, Math.round(Number(value)))) as ItineraryDraft[typeof field];
      }
      return { draft: { ...state.draft, [field]: normalizedValue } };
    }),
    
  addPlaceToDraft: (place) => 
    set((state) => ({
      draft: {
        ...state.draft,
        selectedPlaces: state.draft.selectedPlaces.some(p => p.id === place.id)
          || state.draft.selectedPlaces.length >= PLANNING_LIMITS.maxSelectedPlaces
          ? state.draft.selectedPlaces
          : [...state.draft.selectedPlaces, place]
      }
    })),
    
  removePlaceFromDraft: (placeId) =>
    set((state) => ({
      draft: {
        ...state.draft,
        selectedPlaces: state.draft.selectedPlaces.filter(p => p.id !== placeId)
      }
    })),

  reorderPlaces: (places) =>
    set((state) => ({
      draft: {
        ...state.draft,
        selectedPlaces: places.filter((place, index) => places.findIndex((item) => item.id === place.id) === index),
      },
    })),

  optimize: async () => {
    set({ isOptimizing: true });
    
    const draft = get().draft;
    
    const input: OptimizerInput = {
      places: draft.selectedPlaces,
      numDays: draft.numDays,
      transport: draft.transport,
      startTime: PLANNING_RULES.defaultDayStart,
      endTime: PLANNING_RULES.defaultDayEnd,
    };
    
    const result = optimizeRoute(input);
    
    set({ result, isOptimizing: false });
  },
  
  reset: () => set((state) => ({
    draft: createDefaultDraft(), result: null, editId: undefined,
    expectedUpdatedAt: undefined, preloadedDayPlans: undefined, preloadedSlotOverrides: undefined,
    draftSessionId: state.draftSessionId + 1,
  })),
}));
