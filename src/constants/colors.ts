// Design Tokens — Da Nang Coastal (Ocean Breeze)
// Palette: F7FBFD · 282E30 · 92C5FD · DDF186
// Single shared theme. Prefer these tokens over hardcoded colors.

export const Colors = {
  // ─── Brand ────────────────────────────────────────────────────────────────
  primary: '#282E30',         // Charcoal dark — headers, text, nav
  primaryMuted: '#3D4548',    // Lightened primary
  accent: '#92C5FD',          // Sky blue — CTA buttons, links, highlights
  accentSoft: '#C4E0FE',      // Light sky — soft accent backgrounds
  accentDark: '#5A9FE8',      // Deeper blue — pressed states
  lime: '#DDF186',            // Lime green — VIP badge, success highlight
  limeDark: '#B8D450',        // Deeper lime — pressed lime
  secondary: '#5C6E75',       // Slate grey — secondary text, icons
  surface: '#EAF4F8',         // Very light blue-grey — chip backgrounds
  white: '#FFFFFF',

  // ─── Semantic surfaces ────────────────────────────────────────────────────
  background: '#F7FBFD',      // Near-white coastal haze — main app background
  cardBg: '#FFFFFF',          // Pure white card surfaces
  mist: '#D8EDF5',            // Soft mist — dividers, shimmer

  // ─── Text ─────────────────────────────────────────────────────────────────
  textPrimary: '#282E30',     // Same as primary for body text
  textSecondary: '#5C6E75',   // Secondary body text
  textMuted: '#8A9BA3',       // Placeholder, disabled text
  textOnDark: '#FFFFFF',      // Text on dark/primary backgrounds
  textOnAccent: '#282E30',    // Dark text on blue accent buttons
  textOnLime: '#1E3A00',      // Dark green on lime backgrounds

  // ─── Borders / dividers ───────────────────────────────────────────────────
  border: 'rgba(40, 46, 48, 0.10)',
  divider: '#D8EDF5',

  // ─── Status ───────────────────────────────────────────────────────────────
  success: '#3D9970',
  warning: '#F59E0B',
  error: '#E05252',
  info: '#92C5FD',            // Reuse accent for info

  // ─── Overlays ─────────────────────────────────────────────────────────────
  overlay: 'rgba(40, 46, 48, 0.55)',
  overlaySoft: 'rgba(40, 46, 48, 0.35)',
  overlayLight: 'rgba(247, 251, 253, 0.92)',
  glass: 'rgba(255, 255, 255, 0.18)',

  // ─── Scene tints (video/image headers) ───────────────────────────────────
  sceneMountain: '#1A2F20',
  sceneBeach: '#0D3F5A',
  sceneHoiAn: '#3D1F0D',
  sceneBridge: '#0A1A2E',

  // ─── Shimmer loading ──────────────────────────────────────────────────────
  shimmerBase: '#EAF4F8',
  shimmerHigh: '#F7FBFD',
} as const;
