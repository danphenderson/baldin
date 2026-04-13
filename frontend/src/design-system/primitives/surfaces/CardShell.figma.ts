// url=https://www.figma.com/design/MbJ133Gwnp1OlkFLrjBLEh/Baldin-Library?node-id=7-2
// source=src/design-system/primitives/surfaces/card-shell.tsx
// component=CardShell
import figma from 'figma';

const instance = figma.selectedInstance;
const title = instance.getString('Title');
const body = instance.getString('Body');

export default {
  example: figma.tsx`
    <CardShell tone="primary" surface="raised" density="comfortable">
      <div>
        <strong>${title}</strong>
        <p>${body}</p>
      </div>
    </CardShell>
  `,
  imports: ['import { CardShell } from "@/design-system"'],
  id: 'card-shell',
};
