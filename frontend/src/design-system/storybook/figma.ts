export function extractFigmaUrl(source: string): string {
  const match = source.match(/^\/\/ url=(.+)$/m);

  if (!match) {
    throw new Error('Missing `// url=` header in .figma.ts source');
  }

  return match[1].trim();
}

export function figmaDesignParameters(source: string) {
  return {
    design: {
      type: 'figma' as const,
      url: extractFigmaUrl(source),
    },
  };
}
