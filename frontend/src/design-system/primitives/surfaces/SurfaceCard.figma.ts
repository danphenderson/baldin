// url=https://www.figma.com/design/MbJ133Gwnp1OlkFLrjBLEh/Baldin-Library?node-id=42-35
// source=src/design-system/primitives/surfaces/surface-card.tsx
// component=SurfaceCard
import figma from 'figma';

const instance = figma.selectedInstance;

function renderText(name: string, fallback = '') {
  const layer = instance.findText(name);
  return layer && layer.type === 'TEXT' ? layer.__render__() : fallback;
}

const density = instance.getEnum('Density', {
  Compact: 'compact',
  Comfortable: 'comfortable',
  Spacious: 'spacious',
});

const centered = instance.getBoolean('Centered');

const title = renderText('Title', 'Card title');
const body = renderText('Body', 'Supporting copy that explains the card state.');
const support = renderText('Support', '');
const actionLabel = renderText('Action Label', 'Review details');

const densityProp = density !== 'comfortable' ? figma.tsx`density="${density}"` : null;
const centeredProp = centered ? figma.tsx`centered` : null;
const supportBlock = support ? figma.tsx`<p>${support}</p>` : null;

export default {
  example: figma.tsx`
    <SurfaceCard>
      <SurfaceCardContent
        ${densityProp ?? ''}
        ${centeredProp ?? ''}
      >
        <h3>${title}</h3>
        <p>${body}</p>
        ${supportBlock ?? ''}
        <button type="button">${actionLabel}</button>
      </SurfaceCardContent>
    </SurfaceCard>
  `,
  imports: ['import { SurfaceCard, SurfaceCardContent } from "@/design-system"'],
  id: 'surface-card',
};
