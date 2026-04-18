// url=https://www.figma.com/design/MbJ133Gwnp1OlkFLrjBLEh/Baldin-Library?node-id=8-23
// source=src/design-system/patterns/collections/collection-toolbar.tsx
// component=CollectionToolbar
import figma from 'figma';

const instance = figma.selectedInstance;
const searchPlaceholder = instance.getString('Search Placeholder');
const primaryActionLabel = instance.getString('Primary Action Label');
const secondaryActionLabel = instance.getString('Secondary Action Label');
const controlsLabel = instance.getString('Controls Label');
const layout = instance.getEnum('Layout', {
  Inline: 'inline',
  Stacked: 'stacked',
});

const search = figma.tsx`<input placeholder="${searchPlaceholder}" />`;
const controls = figma.tsx`<button type="button">${controlsLabel}</button>`;
const actions = figma.tsx`<button type="button">${primaryActionLabel}</button>`;
const secondary = layout === 'stacked'
  ? figma.tsx`<div>${secondaryActionLabel}</div>`
  : null;

export default {
  example: figma.tsx`
    <CollectionToolbar
      search={${search}}
      controls={${controls}}
      actions={${actions}}
      ${secondary ? figma.tsx`secondary={${secondary}}` : ''}
    />
  `,
  imports: ['import { CollectionToolbar } from "@/design-system"'],
  id: 'collection-toolbar',
};
