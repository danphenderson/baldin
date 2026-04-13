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

const countProp = showCount ? figma.code`count={${count}}` : null;
const actionProp = showAction
  ? figma.code`action={<button type="button">${actionLabel}</button>}`
  : null;
const iconProp = showIcon
  ? figma.code`icon={<span aria-hidden="true" />}`
  : null;

export default {
  example: figma.code`
    <SectionHeader
      ${iconProp}
      title={${title}}
      supportingText={${supportingText}}
      ${countProp}
      ${actionProp}
      divider={${showDivider}}
      size="${size}"
    />
  `,
  imports: ['import { SectionHeader } from "@/design-system"'],
  id: 'section-header',
};
