// url=https://www.figma.com/design/MbJ133Gwnp1OlkFLrjBLEh/Baldin-Library?node-id=7-31
// source=src/design-system/patterns/metrics/metric-strip.tsx
// component=MetricStrip
import figma from 'figma';

const instance = figma.selectedInstance;
const variant = instance.getEnum('Variant', {
  Inline: 'inline',
  Card: 'card',
});
const label1 = instance.getString('Label 1');
const value1 = instance.getString('Value 1');
const label2 = instance.getString('Label 2');
const value2 = instance.getString('Value 2');
const label3 = instance.getString('Label 3');
const value3 = instance.getString('Value 3');

export default {
  example: figma.tsx`
    <MetricStrip
      variant="${variant}"
      items={[
        { label: "${label1}", value: "${value1}" },
        { label: "${label2}", value: "${value2}" },
        { label: "${label3}", value: "${value3}" },
      ]}
    />
  `,
  imports: ['import { MetricStrip } from "@/design-system"'],
  id: 'metric-strip',
};
