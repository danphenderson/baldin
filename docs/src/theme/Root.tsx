import React from 'react';
import CommandPalette from '../components/command-palette';

type RootProps = {
  children: React.ReactNode;
};

export default function Root({children}: RootProps): React.JSX.Element {
  return (
    <>
      {children}
      <CommandPalette />
    </>
  );
}
