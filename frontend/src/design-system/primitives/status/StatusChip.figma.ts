// url=https://www.figma.com/design/MbJ133Gwnp1OlkFLrjBLEh/Baldin-Library?node-id=5-34
// source=src/design-system/primitives/status/status-chip.tsx
// component=StatusChip
import figma from 'figma';

const instance = figma.selectedInstance;
const label = instance.getString('Label');
const emphasis = instance.getEnum('Variant', {
  Soft: 'soft',
  Outline: 'outline',
  Solid: 'solid',
});
const size = instance.getEnum('Size', {
  Small: 'small',
  Medium: 'medium',
});
const tone = instance.getEnum('Tone', {
  Primary: 'primary',
  Success: 'success',
  Warning: 'warning',
  Danger: 'danger',
});

export default {
  example: figma.tsx`
    <StatusChip
      label="${label}"
      tone="${tone}"
      emphasis="${emphasis}"
      size="${size}"
    />
  `,
  imports: ['import { StatusChip } from "@/design-system"'],
  id: 'status-chip',
  metadata: {
    nestable: true,
  },
};
