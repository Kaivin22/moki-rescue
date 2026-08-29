// Design Tokens — Spacing, Radius, Typography

export const Spacing = {
  xs: 4,
  sm: 8,
  md: 16,
  lg: 24,
  xl: 32,
  xxl: 48,
  xxxl: 64,
} as const;

export const Radius = {
  sm: 8,
  md: 12,
  lg: 16,
  xl: 24,
  xxl: 28,
  display: 54,
  full: 9999,
} as const;

export const Fonts = {
  display: 'BeVietnamPro_700Bold',
  displayMedium: 'BeVietnamPro_600SemiBold',
  body: 'BeVietnamPro_400Regular',
  bodyMedium: 'BeVietnamPro_500Medium',
  bodySemi: 'BeVietnamPro_600SemiBold',
  bodyBold: 'BeVietnamPro_700Bold',
} as const;

export const Typography = {
  display: {
    fontFamily: Fonts.display,
    fontSize: 34,
    lineHeight: 42,
    letterSpacing: -0.4,
  },
  h1: {
    fontFamily: Fonts.display,
    fontSize: 28,
    lineHeight: 36,
    letterSpacing: -0.3,
  },
  h2: {
    fontFamily: Fonts.bodyBold,
    fontSize: 22,
    lineHeight: 28,
  },
  h3: {
    fontFamily: Fonts.bodySemi,
    fontSize: 18,
    lineHeight: 24,
  },
  body: {
    fontFamily: Fonts.body,
    fontSize: 15,
    lineHeight: 22,
  },
  bodyBold: {
    fontFamily: Fonts.bodySemi,
    fontSize: 15,
    lineHeight: 22,
  },
  caption: {
    fontFamily: Fonts.body,
    fontSize: 13,
    lineHeight: 18,
  },
  label: {
    fontFamily: Fonts.bodyBold,
    fontSize: 12,
    lineHeight: 16,
    letterSpacing: 0.2,
  },
  nav: {
    fontFamily: Fonts.bodySemi,
    fontSize: 10,
    lineHeight: 14,
  },
} as const;

export const Shadow = {
  floating: {
    elevation: 8,
    shadowOpacity: 0.2,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 4 },
  },
} as const;
