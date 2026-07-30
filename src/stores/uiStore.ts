import { create } from 'zustand';
import { FilterState } from '../types/place';

interface UIStore {
  selectedCategory: string | null;
  searchQuery: string;
  filters: FilterState;
  setCategory: (cat: string | null) => void;
  setSearchQuery: (query: string) => void;
  setFilters: (filters: FilterState) => void;
}

const defaultFilters: FilterState = {
  categories: [],
  suitableFor: [],
  maxEntryFee: null,
  minDuration: null,
  minRating: null,
  openNow: false,
};

export const useUIStore = create<UIStore>((set) => ({
  selectedCategory: null,
  searchQuery: '',
  filters: defaultFilters,
  setCategory: (cat) => set({ selectedCategory: cat }),
  setSearchQuery: (query) => set({ searchQuery: query }),
  setFilters: (filters) => set({ filters }),
}));
