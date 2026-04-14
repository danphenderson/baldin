// url=https://www.figma.com/design/MbJ133Gwnp1OlkFLrjBLEh/Baldin-Library?node-id=49-11
// source=src/design-system/patterns/auth/auth-panel.tsx
// component=AuthPanel
import figma from 'figma';

const instance = figma.selectedInstance;
const title = instance.getString('Title');
const hasDescription = instance.getBoolean('HasDescription');
const description = hasDescription ? instance.getString('Description') : '';
const hasFooter = instance.getBoolean('HasFooter');
const footerText = hasFooter ? instance.getString('Footer Text') : '';

const footer = footerText
  ? figma.tsx`<p>${footerText}</p>`
  : null;

export default {
  example: figma.tsx`
    <AuthPanel
      icon={<span aria-hidden="true">B</span>}
      title="${title}"
      ${description ? figma.tsx`description="${description}"` : ''}
      ${footer ? figma.tsx`footer={${footer}}` : ''}
    >
      <form>
        <input type="email" placeholder="Email" />
        <input type="password" placeholder="Password" />
        <button type="submit">Continue</button>
      </form>
    </AuthPanel>
  `,
  imports: ['import { AuthPanel } from "@/design-system"'],
  id: 'auth-panel',
};
