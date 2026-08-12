import { itineraryError } from '../src/features/itinerary/services/itineraryErrors';

describe('itinerary domain errors', () => {
  it('turns database error codes into actionable Vietnamese messages', () => {
    expect(itineraryError({ message: 'P0001: PLACE_NOT_AVAILABLE' }).message)
      .toContain('ngừng hoạt động');
    expect(itineraryError(new Error('ITINERARY_EDIT_CONFLICT')).message)
      .toContain('thiết bị khác');
  });

  it('does not expose unknown database details', () => {
    expect(itineraryError({ message: 'relation private_table does not exist' }).message)
      .toBe('Không thể xử lý lịch trình. Vui lòng thử lại.');
  });
});
