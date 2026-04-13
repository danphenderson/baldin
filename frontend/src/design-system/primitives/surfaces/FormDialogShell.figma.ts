// url=https://www.figma.com/design/MbJ133Gwnp1OlkFLrjBLEh/Baldin-Library?node-id=8-24
// source=src/design-system/primitives/surfaces/form-dialog-shell.tsx
// component=FormDialogShell
import figma from 'figma';

const instance = figma.selectedInstance;
const title = instance.getString('Title');
const subtitle = instance.getString('Subtitle');
const bodyCopy = instance.getString('Body Copy');
const secondaryButtonLabel = instance.getString('Secondary Button Label');
const primaryButtonLabel = instance.getString('Primary Button Label');

const actions = figma.code`
  <>
    <button type="button">${secondaryButtonLabel}</button>
    <button type="button">${primaryButtonLabel}</button>
  </>
`;

export default {
  example: figma.code`
    <FormDialogShell
      open
      onClose={() => {}}
      title={${title}}
      subtitle={${subtitle}}
      actions={${actions}}
    >
      <p>${bodyCopy}</p>
    </FormDialogShell>
  `,
  imports: ['import { FormDialogShell } from "@/design-system"'],
  id: 'form-dialog-shell',
};
