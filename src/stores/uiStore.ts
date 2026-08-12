import { create } from 'zustand';
import { FilterState } from '../types/place';

interface UIStore {
  selectedCategory: string | null;
  filters: FilterState;
  setCategory: (cat: string | null) => void;
  setFilters: (filters: FilterState) => void;
}

const defaultFilters: FilterState = {
  categories: [],
  suitableFor: [],
  minDuration: null,
  minRating: null,
  openNow: false,
};

export const useUIStore = create<UIStore>((set) => ({
  selectedCategory: null,
  filters: defaultFilters,
  setCategory: (cat) => set({ selectedCategory: cat }),
  setFilters: (filters) => set({ filters }),
}));
