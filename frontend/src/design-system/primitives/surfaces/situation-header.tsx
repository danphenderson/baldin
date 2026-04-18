import React from 'react';
import {
  Box,
  Divider,
  Typography,
  type SxProps,
  type Theme,
} from '@mui/material';
import { alpha, useTheme } from '@mui/material/styles';
import { PageTitle } from '../typography/text';
import { toSpacingPx } from '../../tokens/spacing';

export interface SituationHeaderProps {
  title: React.ReactNode;
  titleVariant?: 'prominent' | 'compact';
  supportingText?: React.ReactNode;
  lead?: React.ReactNode;
  context?: React.ReactNode;
  actions?: React.ReactNode;
  footer?: React.ReactNode;
  divider?: boolean;
  density?: 'comfortable' | 'compact';
  sx?: SxProps<Theme>;
}

export const SituationHeader: React.FC<SituationHeaderProps> = ({
  title,
  titleVariant = 'prominent',
  supportingText,
  lead,
  context,
  actions,
  footer,
  divider = false,
  density = 'comfortable',
  sx,
}) => {
  const theme = useTheme();
  const baldin = (theme as Theme & { baldin?: Theme['baldin'] }).baldin;
  const subtleBorder = baldin?.border.subtle ?? alpha(theme.palette.divider, 0.72);
  const verticalPadding = density === 'compact' ? 1.5 : 2.5;
  const footerSpacing = density === 'compact' ? 1.5 : 2;
  const rootSx = {
    px: { xs: toSpacingPx(2), md: toSpacingPx(3) },
    py: toSpacingPx(verticalPadding),
  } as SxProps<Theme>;
  const mergedRootSx = (sx
    ? [rootSx, ...(Array.isArray(sx) ? sx : [sx])]
    : rootSx) as SxProps<Theme>;

  return (
    <Box data-situation-header-slot="root" sx={mergedRootSx}>
      <Box
        data-situation-header-slot="header"
        sx={{
          display: 'flex',
          flexWrap: 'wrap',
          alignItems: supportingText ? 'flex-start' : 'center',
          columnGap: 2,
          rowGap: 1.5,
        }}
      >
        {lead && (
          <Box data-situation-header-slot="lead" sx={{ flexShrink: 0 }}>
            {lead}
          </Box>
        )}

        <Box data-situation-header-slot="text" sx={{ minWidth: 0, flex: '0 1 auto' }}>
          {titleVariant === 'compact' ? (
            <Typography
              variant="subtitle2"
              color="text.primary"
              fontWeight={700}
              sx={{ lineHeight: 1.3 }}
            >
              {title}
            </Typography>
          ) : (
            <PageTitle sx={{ minWidth: 0, lineHeight: 1.15 }}>
              {title}
            </PageTitle>
          )}

          {supportingText && (
            <Typography
              variant="body2"
              color="text.secondary"
              sx={{ mt: 0.5, maxWidth: 720 }}
            >
              {supportingText}
            </Typography>
          )}
        </Box>

        {context && (
          <Box
            data-situation-header-slot="context"
            sx={{
              minWidth: 0,
              display: 'flex',
              alignItems: 'center',
              flexShrink: 0,
            }}
          >
            {context}
          </Box>
        )}

        {actions && (
          <>
            <Box
              aria-hidden
              data-situation-header-slot="connector"
              sx={{
                flex: 1,
                minWidth: 40,
                alignSelf: 'center',
                borderBottom: `1px solid ${subtleBorder}`,
                display: { xs: 'none', md: 'block' },
              }}
            />
            <Box
              data-situation-header-slot="actions"
              sx={{
                minWidth: 0,
                width: { xs: '100%', md: 'auto' },
                display: 'flex',
                flexWrap: 'wrap',
                alignItems: 'center',
                justifyContent: { xs: 'flex-start', md: 'flex-end' },
                gap: 1,
                ml: { md: 'auto' },
              }}
            >
              {actions}
            </Box>
          </>
        )}
      </Box>

      {footer && (
        <Box
          data-situation-header-slot="footer"
          sx={{ mt: toSpacingPx(footerSpacing) }}
        >
          {footer}
        </Box>
      )}

      {divider && (
        <Divider
          sx={{
            mt: toSpacingPx(footer ? footerSpacing : density === 'compact' ? 1.5 : 2),
            borderColor: subtleBorder,
          }}
        />
      )}
    </Box>
  );
};

export default SituationHeader;
