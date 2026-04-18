// url=https://www.figma.com/design/MbJ133Gwnp1OlkFLrjBLEh/Baldin-Library?node-id=202-83
// source=src/design-system/primitives/feedback/loading-state.tsx
// component=LoadingState
import figma from 'figma';

const instance = figma.selectedInstance;

const kind = instance.getEnum('Kind', {
  List: 'list',
  Grid: 'grid',
  Section: 'section',
});

const count = kind === 'grid' ? 4 : kind === 'section' ? 3 : 4;
const itemHeight = kind === 'grid' ? 160 : kind === 'section' ? 160 : 88;
const columnsProp = kind === 'grid'
  ? figma.tsx`columns={{ xs: 1, sm: 2, md: 2 }}`
  : null;

export default {
  example: figma.tsx`
    <LoadingState
      kind="${kind}"
      count={${count}}
      itemHeight={${itemHeight}}
      ${columnsProp ?? ''}
    />
  `,
  imports: ['import { LoadingState } from "@/design-system"'],
  id: 'loading-state',
};
