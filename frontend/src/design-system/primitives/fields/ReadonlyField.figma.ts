// url=https://www.figma.com/design/MbJ133Gwnp1OlkFLrjBLEh/Baldin-Library?node-id=218-127
// source=src/design-system/primitives/fields/text-field.tsx
// component=ReadonlyField
import figma from 'figma';

const instance = figma.selectedInstance;

const label = instance.getString('label');
const state = instance.getEnum('state', {
  Empty: 'empty',
  Filled: 'filled',
  Focused: 'focused',
  Disabled: 'disabled',
  Error: 'error',
});
const value = instance.getString('value');

const shouldRenderValue = state !== 'empty' && value.length > 0;
const valueProp = shouldRenderValue ? figma.tsx`value="${value}"` : null;
const focusedProp = state === 'focused' ? figma.tsx`autoFocus` : null;
const disabledProp = state === 'disabled' ? figma.tsx`disabled` : null;
const errorProp = state === 'error' ? figma.tsx`error` : null;

export default {
  example: figma.tsx`
    <ReadonlyField
      label="${label}"
      ${valueProp ?? ''}
      ${focusedProp ?? ''}
      ${disabledProp ?? ''}
      ${errorProp ?? ''}
    />
  `,
  imports: ['import { ReadonlyField } from "@/design-system"'],
  id: 'readonly-field',
};
