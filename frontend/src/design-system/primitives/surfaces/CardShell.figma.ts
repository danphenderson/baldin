// url=https://www.figma.com/design/MbJ133Gwnp1OlkFLrjBLEh/Baldin-Library?node-id=291-35
// source=src/design-system/primitives/surfaces/card-shell.tsx
// component=CardShell
import figma from 'figma';

const instance = figma.selectedInstance;
const title = instance.getString('Title');
const body = instance.getString('Body');
const interactive = instance.getBoolean('Interactive');

const tone = instance.getEnum('Tone', {
  Neutral: 'neutral',
  Primary: 'primary',
  Info: 'info',
  Success: 'success',
  Warning: 'warning',
  Danger: 'danger',
});

const density = instance.getEnum('Density', {
  Comfortable: 'comfortable',
  Compact: 'compact',
});

// The Figma COMPONENT_SET (291:35) has Tone×Density axes only.
// The code contract also exposes `surface` (base | raised | inset), but that
// axis was not promoted to a Figma variant property.  Hardcode the default
// so the mapping stays honest about what the library node actually covers.
const interactiveProp = interactive ? figma.tsx`interactive` : null;

export default {
  example: figma.tsx`
    <CardShell tone="${tone}" surface="raised" density="${density}" ${interactiveProp ?? ''}>
      <div>
        <strong>${title}</strong>
        <p>${body}</p>
      </div>
    </CardShell>
  `,
  imports: ['import { CardShell } from "@/design-system"'],
  id: 'card-shell',
};
