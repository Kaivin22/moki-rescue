const ITINERARY_ERROR_MESSAGES: Record<string, string> = {
  ACCOUNT_NOT_ACTIVE: 'Tài khoản không còn hoạt động hoặc phiên đăng nhập đã hết hạn.',
  INVALID_ITINERARY_PAYLOAD: 'Dữ liệu lịch trình không hợp lệ.',
  INVALID_ITINERARY_FIELDS: 'Tên, số ngày, số người, ngày bắt đầu hoặc phương tiện không hợp lệ.',
  INVALID_TRAVEL_STYLE: 'Phong cách du lịch không hợp lệ.',
  INVALID_DAYS_PAYLOAD: 'Số ngày trong lịch không khớp với thông tin chuyến đi.',
  INVALID_ITINERARY_SLOTS: 'Số hoạt động trong lịch vượt giới hạn cho phép.',
  INVALID_PLACE_SELECTION: 'Lịch trình phải có từ 1 đến 40 địa điểm khác nhau.',
  START_DATE_IN_PAST: 'Ngày bắt đầu của chuyến đi mới không được nằm trong quá khứ.',
  INVALID_DAY_ORDER: 'Thứ tự ngày trong lịch không hợp lệ.',
  INVALID_SLOT_PAYLOAD: 'Có hoạt động chứa dữ liệu không hợp lệ.',
  ITINERARY_SLOT_TIME_CONFLICT: 'Có hoạt động chồng giờ hoặc nằm ngoài khung 08:00–21:00.',
  INVALID_MEAL_NAME: 'Tên khung nghỉ hoặc bữa ăn không hợp lệ.',
  PLACE_NOT_AVAILABLE: 'Có địa điểm đã ngừng hoạt động hoặc chưa được xuất bản. Hãy bỏ hoặc thay địa điểm đó.',
  PLACE_CLOSED_ON_DAY: 'Có địa điểm không mở cửa vào ngày đã xếp.',
  PLACE_CLOSED_AT_TIME: 'Có địa điểm không mở cửa trong khung giờ đã xếp.',
  ITINERARY_NOT_OWNED: 'Bạn không có quyền sửa lịch trình này.',
  ITINERARY_EDIT_CONFLICT: 'Lịch trình đã được cập nhật ở thiết bị khác. Hãy tải lại trước khi sửa tiếp.',
};

export function itineraryError(error: unknown): Error {
  const rawMessage = error instanceof Error
    ? error.message
    : typeof error === 'object' && error !== null && 'message' in error
      ? String((error as { message: unknown }).message)
      : String(error ?? '');
  const code = Object.keys(ITINERARY_ERROR_MESSAGES).find((candidate) => rawMessage.includes(candidate));
  return new Error(code ? ITINERARY_ERROR_MESSAGES[code] : 'Không thể xử lý lịch trình. Vui lòng thử lại.');
}
