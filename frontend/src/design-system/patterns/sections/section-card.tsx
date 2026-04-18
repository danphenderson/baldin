import React from 'react';
import { CardShell } from '../../primitives/surfaces/card-shell';
import type { CardShellProps } from '../../primitives/surfaces/card-shell';

export interface SectionCardProps extends Omit<CardShellProps, 'children'> {
  id?: string;
  header: React.ReactNode;
  children: React.ReactNode;
  density?: 'comfortable' | 'compact';
}

export const SectionCard: React.FC<SectionCardProps> = ({
  id,
  header,
  children,
  density = 'comfortable',
  ...props
}) => (
  <CardShell
    {...props}
    id={id}
    density={density}
  >
    {header}
    {children}
  </CardShell>
);

export default SectionCard;
