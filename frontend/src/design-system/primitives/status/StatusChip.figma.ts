// url=https://www.figma.com/design/MbJ133Gwnp1OlkFLrjBLEh/Baldin-Library?node-id=5-34
// source=src/design-system/primitives/status/status-chip.tsx
// component=StatusChip
import figma from 'figma';

const instance = figma.selectedInstance;
const label = instance.getString('Label');
const variant = instance.getEnum('Variant', {
  Filled: 'filled',
  Outlined: 'outlined',
});
const size = instance.getEnum('Size', {
  Small: 'small',
  Medium: 'medium',
});
const color = instance.getEnum('Tone', {
  Primary: 'primary',
  Success: 'success',
  Warning: 'warning',
  Error: 'error',
});

export default {
  example: figma.code`
    <StatusChip
      label={${label}}
      color="${color}"
      variant="${variant}"
      size="${size}"
    />
  `,
  imports: ['import { StatusChip } from "@/design-system"'],
  id: 'status-chip',
  metadata: {
    nestable: true,
  },
};
