export const motionTokens = {
  duration: {
    fast: 150,
    standard: 200,
    emphasized: 320,
  },
  easing: {
    standard: 'ease',
    emphasized: 'cubic-bezier(0.2, 0.8, 0.2, 1)',
  },
  stagger: {
    headerAction: 70,
  },
} as const;
