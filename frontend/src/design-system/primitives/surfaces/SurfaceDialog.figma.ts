// url=https://www.figma.com/design/MbJ133Gwnp1OlkFLrjBLEh/Baldin-Library?node-id=45-33
// source=src/design-system/primitives/surfaces/surface-dialog.tsx
// component=SurfaceDialog
import figma from 'figma';

const instance = figma.selectedInstance;

function renderText(name: string, fallback = '') {
  const layer = instance.findText(name);
  return layer && layer.type === 'TEXT' ? layer.__render__() : fallback;
}

const title = renderText('Title', 'Dialog title');
const subtitle = renderText('Subtitle', '');
const bodyCopy = renderText('Body Copy', 'Dialog body');
const supportCopy = renderText('Support Copy', '');
const secondaryActionLabel = renderText('Button Label', 'Cancel');
const primaryActionLabel = 'Primary action';
const titleActionLabel = 'Preview';

const actions = figma.tsx`
  <>
    <button type="button">${secondaryActionLabel}</button>
    <button type="button">${primaryActionLabel}</button>
  </>
`;

const content = supportCopy
  ? figma.tsx`
      <>
        <p>${bodyCopy}</p>
        <p>${supportCopy}</p>
      </>
    `
  : figma.tsx`<p>${bodyCopy}</p>`;

export default {
  example: figma.tsx`
    <SurfaceDialog open onClose={() => {}}>
      <SurfaceDialogTitle
        icon={<span aria-hidden="true">i</span>}
        ${subtitle ? figma.tsx`subtitle="${subtitle}"` : ''}
        actions={<button type="button">${titleActionLabel}</button>}
      >
        ${title}
      </SurfaceDialogTitle>
      <SurfaceDialogContent>
        ${content}
      </SurfaceDialogContent>
      <SurfaceDialogActions>
        ${actions}
      </SurfaceDialogActions>
    </SurfaceDialog>
  `,
  imports: ['import { SurfaceDialog, SurfaceDialogActions, SurfaceDialogContent, SurfaceDialogTitle } from "@/design-system"'],
  id: 'surface-dialog',
};
