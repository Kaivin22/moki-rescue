// Design Tokens — Da Nang Tropical (Toutoucans × Wellness)
// Palette 1: 30545C · C9E9F1 · ACD87D · 427D71
// Palette 2: E4E4DF · 1C726F · CBDBA7 · C6D9ED
// Combined into a harmonious tropical-coastal theme.

export const Colors = {
  // ─── Brand ────────────────────────────────────────────────────────────────
  primary: '#1C726F',         // Deep teal — headers, nav, primary actions
  primaryDark: '#30545C',     // Darker teal — pressed states, shadows
  primaryMuted: '#427D71',    // Mid teal — secondary actions, borders
  accent: '#ACD87D',          // Tropical lime green — CTA buttons, highlights
  accentSoft: '#CBDBA7',      // Soft sage green — light accent backgrounds
  accentDark: '#8BBE58',      // Deeper lime — pressed states
  sky: '#C9E9F1',             // Aqua sky — info, badges, chips
  skyBlue: '#C6D9ED',         // Periwinkle blue — secondary backgrounds
  lime: '#ACD87D',            // Same as accent — VIP badge, success
  limeDark: '#8BBE58',        // Deeper lime — pressed lime
  white: '#FFFFFF',

  // ─── Semantic surfaces ────────────────────────────────────────────────────
  background: '#E4E4DF',      // Warm off-white — main app background
  cardBg: '#FFFFFF',          // Pure white card surfaces
  surface: '#C9E9F1',         // Aqua sky — chip backgrounds, input fills
  surfaceWarm: '#F0F2EE',     // Warm light — secondary card backgrounds
  mist: '#CBDBA7',            // Soft sage — dividers, shimmer

  // ─── Text ─────────────────────────────────────────────────────────────────
  textPrimary: '#30545C',     // Dark teal — primary body text
  textSecondary: '#427D71',   // Mid teal — secondary body text
  textMuted: '#7A9E99',       // Muted teal — placeholder, disabled text
  textOnDark: '#FFFFFF',      // Text on dark/primary backgrounds
  textOnAccent: '#1C3A20',    // Dark green text on lime accent buttons
  textOnSky: '#1C4A5C',       // Dark text on sky blue backgrounds

  // ─── Borders / dividers ───────────────────────────────────────────────────
  border: 'rgba(28, 114, 111, 0.15)',
  divider: '#C9E9F1',

  // ─── Status ───────────────────────────────────────────────────────────────
  success: '#427D71',
  warning: '#D4A84B',
  error: '#C0555A',
  info: '#C6D9ED',            // Periwinkle blue for info

  // ─── Overlays ─────────────────────────────────────────────────────────────
  overlay: 'rgba(28, 114, 111, 0.55)',
  overlaySoft: 'rgba(48, 84, 92, 0.35)',
  overlayLight: 'rgba(228, 228, 223, 0.92)',
  glass: 'rgba(201, 233, 241, 0.25)',

  // ─── Scene tints (video/image headers) ───────────────────────────────────
  sceneMountain: '#1A3030',
  sceneBeach: '#0D3A4A',
  sceneHoiAn: '#2A2010',
  sceneBridge: '#0A1A2E',

  // ─── Chart colors ─────────────────────────────────────────────────────────
  chart1: '#1C726F',
  chart2: '#ACD87D',
  chart3: '#C9E9F1',
  chart4: '#427D71',
  chart5: '#CBDBA7',
  chart6: '#C6D9ED',

  // ─── Shimmer loading ──────────────────────────────────────────────────────
  shimmerBase: '#C9E9F1',
  shimmerHigh: '#E4E4DF',

  // ─── Legacy aliases (để không phá code cũ) ────────────────────────────────
  secondary: '#427D71',
} as const;
