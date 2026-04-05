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
import { getResumes } from '../../../service/resumes';
import { getCoverLetters } from '../../../service/cover-letters';
import { stagger } from '../constants';

const MotionBox = motion.create(Box);

interface DocumentsSummaryProps {
  token: string | null;
}

export const DocumentsSummary: React.FC<DocumentsSummaryProps> = ({ token }) => {
  const theme = useTheme();
  const navigate = useNavigate();

  const [loading, setLoading] = useState(true);
  const [resumeCount, setResumeCount] = useState(0);
  const [coverLetterCount, setCoverLetterCount] = useState(0);

  useEffect(() => {
    if (!token) {
      setLoading(false);
      return;
    }
    let cancelled = false;
    (async () => {
      try {
        const [resumes, letters] = await Promise.all([
          getResumes(token),
          getCoverLetters(token),
        ]);
        if (!cancelled) {
          setResumeCount(resumes.length);
          setCoverLetterCount(letters.length);
        }
      } catch {
        // Silently degrade — this is an informational CTA
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => { cancelled = true; };
  }, [token]);

  const total = resumeCount + coverLetterCount;
  const summary =
    total > 0
      ? `${resumeCount} resume${resumeCount !== 1 ? 's' : ''} · ${coverLetterCount} cover letter${coverLetterCount !== 1 ? 's' : ''}`
      : 'No documents yet';

  return (
    <MotionBox {...stagger} transition={{ duration: 0.25 }}>
      <Card
        sx={{
          borderRadius: 3,
          background: `linear-gradient(135deg, ${alpha(theme.palette.primary.main, 0.04)} 0%, ${alpha(theme.palette.secondary.main, 0.04)} 100%)`,
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
              borderRadius: 2,
              bgcolor: alpha(theme.palette.primary.main, 0.08),
              color: theme.palette.primary.main,
              flexShrink: 0,
            }}
          >
            <DocIcon />
          </Box>

          <Box sx={{ flex: 1, minWidth: 0 }}>
            <Typography variant="subtitle1" sx={{ fontWeight: 700, lineHeight: 1.3 }}>
              Documents Studio
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
            onClick={() => navigate('/me/documents')}
            sx={{ textTransform: 'none', fontWeight: 600, flexShrink: 0 }}
          >
            Open Studio
          </Button>
        </CardContent>
      </Card>
    </MotionBox>
  );
};
