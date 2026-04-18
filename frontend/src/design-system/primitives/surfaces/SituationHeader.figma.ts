// url=https://www.figma.com/design/MbJ133Gwnp1OlkFLrjBLEh/Baldin-Library?node-id=366-87
// source=src/design-system/primitives/surfaces/situation-header.tsx
// component=SituationHeader
import figma from 'figma';

const instance = figma.selectedInstance;
const variant = instance.getEnum('Variant', {
  Compact: 'compact',
  Prominent: 'prominent',
});
const prominent = variant === 'prominent';

const title = prominent ? 'Alex Williams' : 'Aspirations';
const supportingText = prominent
  ? 'Keep direction, proof points, and aspiration handoff aligned before you rank leads or start an application.'
  : 'Keep roles and companies visible while the deeper editing flows stay on their focused routes.';
const leadProp = prominent ? figma.tsx`lead={<span aria-hidden="true" />}` : null;
const footerProp = prominent
  ? figma.tsx`footer={<span>Leadership + systems focus · San Francisco, CA · America/Los_Angeles</span>}`
  : figma.tsx`footer={<span>Shared shell only. MetricStrip and route-specific controls compose around it.</span>}`;
const contextProp = figma.tsx`context={<span>Direction set</span>}`;
const actionsProp = prominent
  ? figma.tsx`actions={<><button type="button">Review roles</button><button type="button">Review companies</button></>}`
  : figma.tsx`actions={<button type="button">Add aspiration</button>}`;
const compactTitleVariant = prominent ? null : 'titleVariant="compact"';

export default {
  example: figma.tsx`
    <SituationHeader
      title="${title}"
      ${compactTitleVariant}
      supportingText="${supportingText}"
      ${leadProp}
      ${contextProp}
      ${actionsProp}
      ${footerProp}
      divider
    />
  `,
  imports: ['import { SituationHeader } from "@/design-system"'],
  id: 'situation-header',
};
