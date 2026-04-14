// url=https://www.figma.com/design/MbJ133Gwnp1OlkFLrjBLEh/Baldin-Library?node-id=47-65
// source=src/design-system/primitives/feedback/empty-state.tsx
// component=EmptyState
import figma from 'figma';

const instance = figma.selectedInstance;

const layout = instance.getEnum('Layout', {
  Page: 'page',
  Section: 'section',
});

const compact = instance.getEnum('Compact', {
  True: true,
  False: false,
});
const title = instance.getString('Title');
const hasDescription = instance.getBoolean('HasDescription');
const description = hasDescription ? instance.getString('Description') : '';
const hasAction = instance.getBoolean('HasAction');
const actionLabel = hasAction ? instance.getString('Action Label') : '';

const primaryAction = actionLabel
  ? figma.tsx`primaryAction={{ label: "${actionLabel}", onClick: () => {} }}`
  : null;

export default {
  example: figma.tsx`
    <EmptyState
      icon={<span aria-hidden="true">+</span>}
      title="${title}"
      ${description ? figma.tsx`description="${description}"` : ''}
      layout="${layout}"
      compact={${compact}}
      ${primaryAction ?? ''}
    />
  `,
  imports: ['import { EmptyState } from "@/design-system"'],
  id: 'empty-state',
};
