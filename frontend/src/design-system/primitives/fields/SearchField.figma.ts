// url=https://www.figma.com/design/MbJ133Gwnp1OlkFLrjBLEh/Baldin-Library?node-id=40-48
// source=src/design-system/primitives/fields/text-field.tsx
// component=SearchField
import figma from 'figma';

const instance = figma.selectedInstance;

const placeholder = instance.getString('placeholder');
const state = instance.getEnum('state', {
  Empty: 'empty',
  Filled: 'filled',
  Focused: 'focused',
  Disabled: 'disabled',
  Error: 'error',
});
const value = instance.getString('value');

const shouldRenderValue = state !== 'empty' && value.length > 0;
const valueProp = shouldRenderValue ? figma.tsx`defaultValue="${value}"` : null;
const focusedProp = state === 'focused' ? figma.tsx`autoFocus` : null;
const disabledProp = state === 'disabled' ? figma.tsx`disabled` : null;
const errorProp = state === 'error' ? figma.tsx`error` : null;

export default {
  example: figma.tsx`
    <SearchField
      placeholder="${placeholder}"
      ${valueProp ?? ''}
      ${focusedProp ?? ''}
      ${disabledProp ?? ''}
      ${errorProp ?? ''}
    />
  `,
  imports: ['import { SearchField } from "@/design-system"'],
  id: 'search-field',
};
