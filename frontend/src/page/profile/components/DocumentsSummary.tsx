import React, { useEffect, useState } from 'react';
import {
  Box, Card, CardContent, Typography, Button, Skeleton, useTheme, alpha,
} from '@mui/material';
import {
  Description as DocIcon,
  ArrowForward as ArrowIcon,
} from '@mui/icons-material';
import { useNavigate } from 'react-router-dom';
import { motion } from 'motion/react';
import { getDocuments, getPinnedDocuments } from '../../../service/documents';
import { stagger } from '../constants';
import { softBrandGradient } from '../../../theme/effects';

const MotionBox = motion.create(Box);

interface DocumentsSummaryProps {
  token: string | null;
}

export const DocumentsSummary: React.FC<DocumentsSummaryProps> = ({ token }) => {
  const theme = useTheme();
  const navigate = useNavigate();

  const [loading, setLoading] = useState(true);
  const [totalCount, setTotalCount] = useState(0);
  const [pinnedNames, setPinnedNames] = useState<string[]>([]);

  useEffect(() => {
    if (!token) {
      setLoading(false);
      return;
    }
    let cancelled = false;
    (async () => {
      try {
        const [docs, pinned] = await Promise.all([
          getDocuments(token),
          getPinnedDocuments(token),
        ]);
        if (!cancelled) {
          setTotalCount(docs.length);
          setPinnedNames(pinned.map(d => d.title || 'Untitled'));
        }
      } catch {
        // Silently degrade — this is an informational CTA
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => { cancelled = true; };
  }, [token]);

  const summary =
    totalCount > 0
      ? pinnedNames.length > 0
        ? `${totalCount} document${totalCount !== 1 ? 's' : ''} · Active: ${pinnedNames.join(', ')}`
        : `${totalCount} document${totalCount !== 1 ? 's' : ''}`
      : 'No documents yet';

  return (
    <MotionBox {...stagger} transition={{ duration: 0.25 }}>
      <Card
        sx={{
          borderRadius: '12px',
          background: softBrandGradient(theme, {
            startTone: 'main',
            endTone: 'main',
            startOpacity: 0.04,
            endOpacity: 0.04,
          }),
          border: `1px solid ${theme.palette.divider}`,
        }}
      >
        <CardContent
          sx={{
            display: 'flex',
            alignItems: 'center',
            gap: 2,
            px: { xs: 2, sm: 3 },
            py: 2.5,
            '&:last-child': { pb: 2.5 },
          }}
        >
          <Box
            sx={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              width: 40,
              height: 40,
              borderRadius: '8px',
              bgcolor: alpha(theme.palette.primary.main, 0.08),
              color: theme.palette.primary.main,
              flexShrink: 0,
            }}
          >
            <DocIcon />
          </Box>

          <Box sx={{ flex: 1, minWidth: 0 }}>
            <Typography variant="subtitle1" sx={{ fontWeight: 700, lineHeight: 1.3 }}>
              Workspace
            </Typography>
            {loading ? (
              <Skeleton width={140} height={18} />
            ) : (
              <Typography variant="body2" color="text.secondary">
                {summary}
              </Typography>
            )}
          </Box>

          <Button
            size="small"
            endIcon={<ArrowIcon />}
            onClick={() => navigate('/workspace')}
            sx={{ textTransform: 'none', fontWeight: 600, flexShrink: 0 }}
          >
            Open Workspace
          </Button>
        </CardContent>
      </Card>
    </MotionBox>
  );
};
