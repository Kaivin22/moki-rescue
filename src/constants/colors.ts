/** Bốn primitive thương hiệu do chủ dự án phê duyệt. */
export const BrandColors = {
  canvas: '#F7FBFD',
  ink: '#282E30',
  blue: '#92C5FD',
  lime: '#DDF186',
} as const;

/**
 * Semantic color tokens cho runtime React Native.
 * Màu brand sáng chỉ dùng làm surface/highlight với chữ màu ink. Các biến thể
 * đậm hơn dành cho chữ, focus và trạng thái để giữ tương phản WCAG AA.
 */
export const Colors = {
  brandBlue: BrandColors.blue,
  brandLime: BrandColors.lime,
  primary: '#2B659B',
  primaryDark: BrandColors.ink,
  primaryMuted: '#5C686C',
  accent: BrandColors.lime,
  accentSoft: '#EFF8D7',
  accentDark: '#5D6700',
  sky: '#DFF0FD',
  skyBlue: BrandColors.blue,
  white: BrandColors.canvas,

  background: BrandColors.canvas,
  cardBg: '#EFF7FD',
  surface: '#E5F1FD',
  mist: 'rgba(40, 46, 48, 0.22)',

  textPrimary: BrandColors.ink,
  textSecondary: '#465154',
  textMuted: '#5C686C',
  textOnAccent: BrandColors.ink,

  border: 'rgba(40, 46, 48, 0.22)',
  borderStrong: '#697477',
  focus: '#2B659B',
  divider: 'rgba(40, 46, 48, 0.18)',
  success: '#28744B',
  successSoft: '#EAF5EF',
  warning: '#875400',
  warningSoft: '#F8F1DD',
  error: '#B4232C',
  errorSoft: '#FBEDEE',
  errorSubtle: '#FDF6F6',
  errorBorder: '#D89197',
  info: '#2B659B',

  overlay: 'rgba(40, 46, 48, 0.68)',
  overlayLight: 'rgba(247, 251, 253, 0.94)',
  glass: 'rgba(247, 251, 253, 0.92)',
  mapScrim: 'rgba(247, 251, 253, 0.72)',
  borderOnDark: 'rgba(247, 251, 253, 0.38)',

  secondary: '#465154',
} as const;
