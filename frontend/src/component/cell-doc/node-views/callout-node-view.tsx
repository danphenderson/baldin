import React from 'react';
import { NodeViewWrapper, NodeViewContent } from '@tiptap/react';
import { Box, useTheme, alpha } from '@mui/material';
import {
  InfoOutlined,
  WarningAmberOutlined,
  TipsAndUpdatesOutlined,
  ErrorOutline,
} from '@mui/icons-material';
import type { NodeViewProps } from '@tiptap/react';
import type { CalloutType } from '../extensions/callout-types';
import { CalloutTypePicker } from './callout-type-picker';

const CALLOUT_META: Record<CalloutType, { icon: React.ReactElement; label: string; palette: string }> = {
  info:    { icon: <InfoOutlined fontSize="small" />,             label: 'Info',    palette: 'info' },
  warning: { icon: <WarningAmberOutlined fontSize="small" />,     label: 'Warning', palette: 'warning' },
  tip:     { icon: <TipsAndUpdatesOutlined fontSize="small" />,   label: 'Tip',     palette: 'success' },
  danger:  { icon: <ErrorOutline fontSize="small" />,             label: 'Danger',  palette: 'error' },
};

export const CalloutNodeView: React.FC<NodeViewProps> = ({ node, updateAttributes, editor }) => {
  const theme = useTheme();
  const calloutType = (node.attrs.callout_type ?? 'info') as CalloutType;
  const meta = CALLOUT_META[calloutType] ?? CALLOUT_META.info;
  const isLocked = node.attrs.locked === true;

  /* Resolve MUI palette color dynamically */
  const paletteColor = (theme.palette as unknown as Record<string, { main?: string; light?: string }>)[meta.palette];
  const borderColor = paletteColor?.main ?? theme.palette.divider;
  const bgColor = paletteColor?.light ? alpha(paletteColor.light, 0.15) : alpha(theme.palette.divider, 0.08);

  return (
    <NodeViewWrapper
      data-block-id={node.attrs.blockId}
      data-block-locked={isLocked ? 'true' : undefined}
    >
      <Box
        data-testid="callout-node-view"
        sx={{
          display: 'flex',
          gap: 1,
          borderLeft: `4px solid ${borderColor}`,
          borderRadius: '4px',
          background: bgColor,
          p: 1.5,
          my: 1,
          opacity: isLocked ? 0.78 : 1,
        }}
      >
        <CalloutTypePicker
          value={calloutType}
          color={borderColor}
          disabled={!editor.isEditable}
          onChange={(nextType) => updateAttributes({ callout_type: nextType })}
        />
        <Box sx={{ flex: 1, minWidth: 0 }}>
          <NodeViewContent />
        </Box>
      </Box>
    </NodeViewWrapper>
  );
};
