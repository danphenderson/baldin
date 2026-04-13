import React from 'react';
import { Box, Link, Typography } from '@mui/material';
import Markdown from 'markdown-to-jsx';
import { monoFontFamily } from '../../design-system/tokens/typography';

export interface ChatMarkdownProps {
  children: string;
  color?: string;
}

const inlineCodeSx = {
  px: 0.5,
  py: 0.1,
  borderRadius: '4px',
  bgcolor: 'action.hover',
  fontFamily: monoFontFamily,
  fontSize: '0.85em',
};

const ChatMarkdown: React.FC<ChatMarkdownProps> = ({ children, color = 'inherit' }) => (
  <Box
    sx={{
      color,
      '& pre': {
        overflowX: 'auto',
        p: 1.5,
        borderRadius: '8px',
        bgcolor: 'rgba(15, 23, 42, 0.08)',
        fontSize: '0.85rem',
        lineHeight: 1.5,
      },
      '& code': inlineCodeSx,
      '& pre code': {
        p: 0,
        bgcolor: 'transparent',
        fontSize: 'inherit',
      },
      '& ul, & ol': {
        pl: 2.5,
        my: 0.75,
      },
      '& li + li': {
        mt: 0.35,
      },
      '& blockquote': {
        m: 0,
        pl: 1.5,
        borderLeft: '3px solid',
        borderColor: 'divider',
        color: 'text.secondary',
      },
      '& table': {
        width: '100%',
        borderCollapse: 'collapse',
        my: 1,
      },
      '& th, & td': {
        border: '1px solid',
        borderColor: 'divider',
        p: 0.75,
      },
    }}
  >
    <Markdown
      options={{
        forceBlock: true,
        overrides: {
          p: {
            component: Typography,
            props: {
              variant: 'body2',
              sx: { my: 0.6, lineHeight: 1.7, whiteSpace: 'pre-wrap', wordBreak: 'break-word' },
            },
          },
          h1: {
            component: Typography,
            props: { variant: 'h6', sx: { mt: 1.2, mb: 0.6 } },
          },
          h2: {
            component: Typography,
            props: { variant: 'subtitle1', sx: { mt: 1.2, mb: 0.6, fontWeight: 700 } },
          },
          h3: {
            component: Typography,
            props: { variant: 'subtitle2', sx: { mt: 1, mb: 0.5, fontWeight: 700 } },
          },
          a: {
            component: Link,
            props: { target: '_blank', rel: 'noreferrer', underline: 'hover' },
          },
        },
      }}
    >
      {children}
    </Markdown>
  </Box>
);

export default ChatMarkdown;
