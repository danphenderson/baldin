// url=https://www.figma.com/design/MbJ133Gwnp1OlkFLrjBLEh/Baldin-Library?node-id=7-5
// source=src/design-system/patterns/sections/section-card.tsx
// component=SectionCard
import figma from 'figma';

const instance = figma.selectedInstance;
const title = instance.getString('Title');
const count = instance.getString('Count');
const body = instance.getString('Body');

const header = figma.code`
  <SectionHeader
    title={${title}}
    count={${count}}
  />
`;

export default {
  example: figma.code`
    <SectionCard header={${header}}>
      <p>${body}</p>
    </SectionCard>
  `,
  imports: [
    'import { SectionCard, SectionHeader } from "@/design-system"',
  ],
  id: 'section-card',
};
