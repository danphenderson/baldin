import React from 'react';

export const DateSpan: React.FC<{ value: string | null | undefined }> = ({ value }) => {
  if (!value) return <>Present</>;
  try {
    return <>{new Date(value).toLocaleDateString('en-US', { month: 'short', year: 'numeric' })}</>;
  } catch {
    return <>{value}</>;
  }
};
