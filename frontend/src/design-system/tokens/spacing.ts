export const spacingTokens = {
  base: 4,
  controlGap: 2,
  cardPadding: 6,
  dialogPadding: 6,
  sectionGap: 6,
  pageGutter: 8,
} as const;

export function toSpacingPx(step: number): string {
  return `${step * spacingTokens.base}px`;
}
