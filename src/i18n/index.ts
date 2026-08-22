import AsyncStorage from '@react-native-async-storage/async-storage';
import { create } from 'zustand';
import { createJSONStorage, persist } from 'zustand/middleware';

export type Language = 'vi' | 'en';

export const LANGUAGES: { code: Language; label: string; nativeName: string }[] = [
  { code: 'vi', label: 'Tiếng Việt', nativeName: 'Tiếng Việt' },
  { code: 'en', label: 'English', nativeName: 'English' },
];

const translations: Record<Language, Record<string, string>> = {
  vi: {
    'nav.home': 'Trang chủ',
    'nav.request': 'Cứu hộ',
    'nav.activity': 'Hoạt động',
    'nav.operations': 'Vận hành',
    'nav.profile': 'Tài khoản',
    'common.retry': 'Thử lại',
    'common.save': 'Lưu',
    'common.cancel': 'Hủy',
    'common.confirm': 'Xác nhận',
    'assistant.open': 'Mở trợ lý MotoRescue',
    'assistant.close': 'Đóng trợ lý',
    'assistant.clear': 'Xóa cuộc trò chuyện hiện tại',
    'assistant.title': 'Trợ lý MotoRescue',
    'assistant.scope': 'Hỗ trợ cách dùng app · Không chẩn đoán xe',
    'assistant.welcome':
      'Bạn cần hỗ trợ phần nào trong MotoRescue? Tôi chỉ trả lời về ứng dụng và quy trình cứu hộ.',
    'assistant.typing': 'Đang trả lời…',
    'assistant.remaining': 'Còn {count} lượt Gemini trong 24 giờ',
    'assistant.input': 'Nội dung cần trợ giúp',
    'assistant.placeholder': 'Hỏi về MotoRescue…',
    'assistant.send': 'Gửi câu hỏi',
    'assistant.privacy': 'Hội thoại chỉ giữ trong phiên này; máy chủ không lưu nội dung.',
    'assistant.error': 'Không thể liên hệ trợ lý. Vui lòng thử lại.',
  },
  en: {
    'nav.home': 'Home',
    'nav.request': 'Rescue',
    'nav.activity': 'Activity',
    'nav.operations': 'Operations',
    'nav.profile': 'Account',
    'common.retry': 'Retry',
    'common.save': 'Save',
    'common.cancel': 'Cancel',
    'common.confirm': 'Confirm',
    'assistant.open': 'Open MotoRescue assistant',
    'assistant.close': 'Close assistant',
    'assistant.clear': 'Clear this conversation',
    'assistant.title': 'MotoRescue assistant',
    'assistant.scope': 'App support · No vehicle diagnosis',
    'assistant.welcome':
      'What can I help you with in MotoRescue? I only answer questions about the app and rescue flow.',
    'assistant.typing': 'Replying…',
    'assistant.remaining': '{count} Gemini requests left in 24 hours',
    'assistant.input': 'Support question',
    'assistant.placeholder': 'Ask about MotoRescue…',
    'assistant.send': 'Send question',
    'assistant.privacy': 'Chat stays in this session; the server does not store its content.',
    'assistant.error': 'The assistant is unavailable. Please try again.',
  },
};

interface I18nState {
  language: Language;
  setLanguage: (language: Language) => void;
  t: (key: string, params?: Record<string, string | number>) => string;
}

function interpolate(template: string, params?: Record<string, string | number>) {
  if (!params) return template;
  return template.replace(/\{([a-zA-Z0-9_]+)\}/g, (match, key: string) =>
    Object.prototype.hasOwnProperty.call(params, key) ? String(params[key]) : match,
  );
}

export const useI18n = create<I18nState>()(
  persist(
    (set, get) => ({
      language: 'vi',
      setLanguage: (language) => set({ language }),
      t: (key, params) =>
        interpolate(translations[get().language][key] ?? translations.vi[key] ?? key, params),
    }),
    {
      name: 'motorescue:language:v1',
      storage: createJSONStorage(() => AsyncStorage),
    },
  ),
);

export function useTranslation() {
  return useI18n();
}

type CopyShape<T> = {
  [Key in keyof T]: T[Key] extends string ? string : CopyShape<T[Key]>;
};

export function useCopy<T>(copy: { vi: T; en: CopyShape<T> }): CopyShape<T> {
  const language = useI18n((state) => state.language);
  return copy[language] as CopyShape<T>;
}
