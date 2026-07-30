import { create } from 'zustand';
import { Place } from '../types/place';
import { OptimizerResult, OptimizerInput, optimizeRoute } from '../features/itinerary/services/routeOptimizer';

export interface ItineraryDraft {
  title: string;
  numDays: number;
  startDate: string; // YYYY-MM-DD
  numPeople: number;
  budgetTier: 'low' | 'mid' | 'high';
  transport: 'motorbike' | 'car' | 'walk' | 'bicycle';
  travelStyles: string[];
  selectedPlaces: Place[];
}

const defaultDraft: ItineraryDraft = {
  title: '',
  numDays: 3,
  startDate: new Date().toISOString().split('T')[0],
  numPeople: 2,
  budgetTier: 'mid',
  transport: 'motorbike',
  travelStyles: [],
  selectedPlaces: [],
};

interface ItineraryStore {
  draft: ItineraryDraft;
  result: OptimizerResult | null;
  myItineraries: any[];
  isOptimizing: boolean;
  setDraftField: <K extends keyof ItineraryDraft>(field: K, value: ItineraryDraft[K]) => void;
  addPlaceToDraft: (place: Place) => void;
  removePlaceFromDraft: (placeId: string) => void;
  optimize: () => Promise<void>;
  reset: () => void;
}

export const useItineraryStore = create<ItineraryStore>((set, get) => ({
  draft: { ...defaultDraft },
  result: null,
  myItineraries: [],
  isOptimizing: false,
  
  setDraftField: (field, value) => 
    set((state) => ({ draft: { ...state.draft, [field]: value } })),
    
  addPlaceToDraft: (place) => 
    set((state) => ({
      draft: {
        ...state.draft,
        selectedPlaces: state.draft.selectedPlaces.some(p => p.id === place.id)
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

  optimize: async () => {
    set({ isOptimizing: true });
    
    // Simulate API delay for UX (as shown in Optimizing Loading screen)
    await new Promise(resolve => setTimeout(resolve, 2000));
    
    const draft = get().draft;
    
    const input: OptimizerInput = {
      places: draft.selectedPlaces,
      numDays: draft.numDays,
      transport: draft.transport,
      startTime: '08:00', // Default
      endTime: '21:00',   // Default
      budgetTotal: draft.budgetTier === 'low' ? 500000 * draft.numDays : 
                   draft.budgetTier === 'mid' ? 1500000 * draft.numDays : 5000000 * draft.numDays,
    };
    
    const result = optimizeRoute(input);
    
    set({ result, isOptimizing: false });
  },
  
  reset: () => set({ draft: { ...defaultDraft }, result: null }),
}));
