import React from 'react';
import { CardShell } from '../../primitives/surfaces/card-shell';
import type { CardShellProps } from '../../primitives/surfaces/card-shell';

export interface SectionCardProps extends Omit<CardShellProps, 'children'> {
  id?: string;
  header: React.ReactNode;
  children: React.ReactNode;
  padding?: 'default' | 'dense';
}

export const SectionCard: React.FC<SectionCardProps> = ({
  id,
  header,
  children,
  padding = 'default',
  ...props
}) => (
  <CardShell
    {...props}
    id={id}
    padding={padding}
  >
    {header}
    {children}
  </CardShell>
);

export default SectionCard;
