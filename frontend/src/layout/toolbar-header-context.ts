import { createContext, useContext, useEffect } from 'react';
import type { Dispatch, SetStateAction } from 'react';

export interface ToolbarHeaderContent {
  title: string;
  subtitle?: string;
}

type ToolbarHeaderSetter = Dispatch<SetStateAction<ToolbarHeaderContent | null>>;

export const ToolbarHeaderContext = createContext<ToolbarHeaderSetter | null>(null);

export function usePageToolbarHeader(title: string, subtitle?: string) {
  const setToolbarHeader = useContext(ToolbarHeaderContext);

  if (!setToolbarHeader) {
    throw new Error('usePageToolbarHeader must be used within AppLayout.');
  }

  useEffect(() => {
    setToolbarHeader({ title, subtitle });
  }, [setToolbarHeader, title, subtitle]);

  useEffect(() => () => setToolbarHeader(null), [setToolbarHeader]);
}
