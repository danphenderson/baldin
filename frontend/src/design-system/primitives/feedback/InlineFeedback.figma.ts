// url=https://www.figma.com/design/MbJ133Gwnp1OlkFLrjBLEh/Baldin-Library?node-id=30-62
// source=src/design-system/primitives/feedback/inline-feedback.tsx
// component=InlineFeedback
import figma from 'figma';

const instance = figma.selectedInstance;

const tone = instance.getEnum('Tone', {
  Info: 'info',
  Success: 'success',
  Warning: 'warning',
  Error: 'error',
});

const variant = instance.getEnum('Variant', {
  Soft: 'soft',
  Outlined: 'outlined',
  Filled: 'filled',
});

const titleLayer = instance.findText('Title');
const bodyLayer = instance.findText('Body');

const title = titleLayer && titleLayer.type === 'TEXT' ? titleLayer.__render__() : '';
const body = bodyLayer && bodyLayer.type === 'TEXT' ? bodyLayer.__render__() : '';

const content = body
  ? figma.tsx`<><strong>${title}</strong> ${body}</>`
  : figma.tsx`${title}`;

export default {
  example: figma.tsx`
    <InlineFeedback
      tone="${tone}"
      variant="${variant}"
    >
      ${content}
    </InlineFeedback>
  `,
  imports: ['import { InlineFeedback } from "@/design-system"'],
  id: 'inline-feedback',
  metadata: {
    nestable: true,
  },
};
