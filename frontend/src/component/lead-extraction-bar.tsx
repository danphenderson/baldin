import React from 'react';
import {
  Card, CardContent, Typography, Button, TextField, Stack,
  InputAdornment, LinearProgress, useTheme,
} from '@mui/material';
import { alpha } from '@mui/material/styles';
import { Bolt as BoltIcon, OpenInNew as OpenIcon } from '@mui/icons-material';

export interface LeadExtractionBarProps {
  url: string;
  extracting: boolean;
  onUrlChange: (url: string) => void;
  onExtract: () => void;
}

const LeadExtractionBar: React.FC<LeadExtractionBarProps> = ({
  url, extracting, onUrlChange, onExtract,
}) => {
  const theme = useTheme();

  const gradientBg = `linear-gradient(135deg, ${theme.palette.primary.main}, ${theme.palette.secondary.main})`;

  return (
    <Card
      sx={{
        mb: 3,
        position: 'relative',
        overflow: 'hidden',
        background: theme.palette.mode === 'dark'
          ? `linear-gradient(135deg, ${alpha(theme.palette.primary.dark, 0.18)}, ${alpha(theme.palette.secondary.dark, 0.10)})`
          : `linear-gradient(135deg, ${alpha(theme.palette.primary.light, 0.08)}, ${alpha(theme.palette.secondary.light, 0.05)})`,
        borderLeft: `3px solid ${theme.palette.primary.main}`,
      }}
    >
      {extracting && <LinearProgress sx={{ position: 'absolute', top: 0, left: 0, right: 0 }} />}
      <CardContent sx={{ p: { xs: 2, sm: 3 } }}>
        <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2} alignItems={{ sm: 'center' }}>
          <Stack direction="row" spacing={1} alignItems="center" sx={{ flexShrink: 0 }}>
            <BoltIcon sx={{ color: theme.palette.primary.main }} />
            <Typography variant="subtitle1" fontWeight={600} sx={{ whiteSpace: 'nowrap' }}>
              AI Extract
            </Typography>
          </Stack>
          <TextField
            fullWidth
            size="small"
            placeholder="Paste a job posting URL to auto-extract lead details..."
            value={url}
            onChange={(e) => onUrlChange(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && onExtract()}
            disabled={extracting}
            slotProps={{
              input: {
                startAdornment: (
                  <InputAdornment position="start">
                    <OpenIcon sx={{ fontSize: 18, color: 'text.secondary' }} />
                  </InputAdornment>
                ),
                'aria-label': 'Job posting URL for AI extraction',
              },
            }}
          />
          <Button
            variant="contained"
            onClick={onExtract}
            disabled={!url.trim() || extracting}
            sx={{ whiteSpace: 'nowrap', minWidth: 110, background: gradientBg }}
          >
            {extracting ? 'Extracting...' : 'Extract'}
          </Button>
        </Stack>
      </CardContent>
    </Card>
  );
};

export default LeadExtractionBar;
