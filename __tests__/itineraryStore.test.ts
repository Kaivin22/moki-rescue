import { PLANNING_LIMITS } from '../src/features/itinerary/config/planningPolicy';
import { useItineraryStore } from '../src/stores/itineraryStore';
import type { ItineraryDraft } from '../src/types/itinerary';
import type { Place } from '../src/types/place';

const place = (index: number) => ({
  id: `place-${index}`,
  name: `Place ${index}`,
  lat: 16.05,
  lng: 108.2,
  avg_duration_min: 60,
}) as Place;

describe('itinerary draft store', () => {
  beforeEach(() => useItineraryStore.getState().reset());

  it('starts with a valid day count but requires an explicit trip date', () => {
    const { draft } = useItineraryStore.getState();
    expect(draft.numDays).toBe(1);
    expect(draft.startDate).toBe('');
  });

  it('deduplicates selections and enforces the central hard limit', () => {
    const { addPlaceToDraft } = useItineraryStore.getState();
    Array.from({ length: PLANNING_LIMITS.maxSelectedPlaces + 5 }, (_, index) => place(index))
      .forEach(addPlaceToDraft);
    addPlaceToDraft(place(0));

    expect(useItineraryStore.getState().draft.selectedPlaces)
      .toHaveLength(PLANNING_LIMITS.maxSelectedPlaces);
  });

  it('normalizes a preloaded draft and opens a new local session', () => {
    const previousSession = useItineraryStore.getState().draftSessionId;
    const invalidDraft = {
      title: 'Draft',
      numDays: 0,
      startDate: 'not-a-date',
      numPeople: 99,
      transport: 'motorbike',
      travelStyles: ['beach', 'beach'],
      selectedPlaces: [place(1), place(1)],
    } as ItineraryDraft;

    useItineraryStore.getState().prefillDraft(invalidDraft, [[place(1)]], { editId: 'itinerary-1' });
    const state = useItineraryStore.getState();
    expect(state.draftSessionId).toBe(previousSession + 1);
    expect(state.draft.numDays).toBe(1);
    expect(state.draft.numPeople).toBe(PLANNING_LIMITS.maxPeople);
    expect(state.draft.startDate).toBe('');
    expect(state.draft.selectedPlaces).toHaveLength(1);
    expect(state.editId).toBe('itinerary-1');
  });
});
