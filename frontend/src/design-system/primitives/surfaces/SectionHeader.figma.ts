// url=https://www.figma.com/design/MbJ133Gwnp1OlkFLrjBLEh/Baldin-Library?node-id=6-24
// source=src/design-system/primitives/surfaces/section-header.tsx
// component=SectionHeader
import figma from 'figma';

const instance = figma.selectedInstance;
const title = instance.getString('Title');
const supportingText = instance.getString('Supporting Text');
const count = instance.getString('Count');
const actionLabel = instance.getString('Action Label');
const size = instance.getEnum('Size', {
  Default: 'default',
  Compact: 'compact',
});
const showIcon = instance.getBoolean('Show Icon');
const showCount = instance.getBoolean('Show Count');
const showAction = instance.getBoolean('Show Action');
const showDivider = instance.getBoolean('Show Divider');

const countProp = showCount ? figma.tsx`count="${count}"` : null;
const actionProp = showAction
  ? figma.tsx`action={<button type="button">${actionLabel}</button>}`
  : null;
const iconProp = showIcon
  ? figma.tsx`icon={<span aria-hidden="true" />}`
  : null;
const dividerProp = showDivider ? 'divider' : '';

export default {
  example: figma.tsx`
    <SectionHeader
      ${iconProp}
      title="${title}"
      supportingText="${supportingText}"
      ${countProp}
      ${actionProp}
      ${dividerProp}
      size="${size}"
    />
  `,
  imports: ['import { SectionHeader } from "@/design-system"'],
  id: 'section-header',
};
