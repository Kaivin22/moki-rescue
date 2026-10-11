export function clampSheetHeight(height: number, maximum: number): number {
  return Math.min(Math.max(0, height), Math.max(0, maximum));
}

export function shouldExpandSheet(height: number, maximum: number, velocityY: number): boolean {
  if (maximum <= 0) return false;
  if (Math.abs(velocityY) > 0.5) return velocityY < 0;
  return height >= maximum / 2;
}
