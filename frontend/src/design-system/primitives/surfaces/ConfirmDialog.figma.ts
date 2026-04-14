// url=https://www.figma.com/design/MbJ133Gwnp1OlkFLrjBLEh/Baldin-Library?node-id=46-135
// source=src/design-system/primitives/surfaces/confirm-dialog.tsx
// component=ConfirmDialog
import figma from 'figma';

const instance = figma.selectedInstance;

function renderText(name: string, fallback = '') {
  const layer = instance.findText(name);
  return layer && layer.type === 'TEXT' ? layer.__render__() : fallback;
}

function stripLoadingSuffix(label: string) {
  return label.replace(/(?:\.\.\.|…)+$/, '').trim();
}

const destructive = instance.getEnum('Destructive', {
  True: true,
  False: false,
});

const loading = instance.getEnum('Loading', {
  True: true,
  False: false,
});

const title = instance.getString('Title');
const message = instance.getString('Message');
const support = renderText('Support Copy', '').trim();
const cancelLabel = instance.getString('Cancel Label');
const confirmLabel = loading
  ? stripLoadingSuffix(instance.getString('Confirm Label'))
  : instance.getString('Confirm Label');

const messageProp = support
  ? figma.tsx`message={
      <>
        <p>${message}</p>
        <p>${support}</p>
      </>
    }`
  : figma.tsx`message="${message}"`;

const destructiveProp = destructive ? null : figma.tsx`destructive={false}`;
const loadingProp = loading ? figma.tsx`loading` : null;

export default {
  example: figma.tsx`
    <ConfirmDialog
      open
      title="${title}"
      ${messageProp}
      confirmLabel="${confirmLabel}"
      cancelLabel="${cancelLabel}"
      ${destructiveProp ?? ''}
      ${loadingProp ?? ''}
      onConfirm={() => {}}
      onCancel={() => {}}
    />
  `,
  imports: ['import { ConfirmDialog } from "@/design-system"'],
  id: 'confirm-dialog',
};
