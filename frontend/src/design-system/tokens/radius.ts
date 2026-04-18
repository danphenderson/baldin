export const radiusTokens = {
  xs: 4,
  sm: 8,
  md: 10,
  lg: 12,
  xl: 16,
  feature: 20,
  pill: 999,
} as const;

export function toRadiusPx(radius: number): string {
  return `${radius}px`;
}
