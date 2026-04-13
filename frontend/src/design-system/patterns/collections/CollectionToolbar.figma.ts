// url=https://www.figma.com/design/MbJ133Gwnp1OlkFLrjBLEh/Baldin-Library?node-id=8-23
// source=src/design-system/patterns/collections/collection-toolbar.tsx
// component=CollectionToolbar
import figma from 'figma';

const instance = figma.selectedInstance;
const searchPlaceholder = instance.getString('Search Placeholder');
const primaryActionLabel = instance.getString('Primary Action Label');
const secondaryActionLabel = instance.getString('Secondary Action Label');
const layout = instance.getEnum('Layout', {
  Inline: 'inline',
  Stacked: 'stacked',
});

const controls = figma.code`<button type="button">${secondaryActionLabel}</button>`;
const actions = figma.code`<button type="button">${primaryActionLabel}</button>`;
const secondary = layout === 'stacked'
  ? figma.code`secondary={<div>Active only</div>}`
  : null;

export default {
  example: figma.code`
    <CollectionToolbar
      search={<input placeholder="${searchPlaceholder}" />}
      controls={${controls}}
      actions={${actions}}
      ${secondary}
    />
  `,
  imports: ['import { CollectionToolbar } from "@/design-system"'],
  id: 'collection-toolbar',
};
