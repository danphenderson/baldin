import React from 'react';
import {
  Box, Card, CardContent, Typography, Stack, Button, LinearProgress,
  Chip, Collapse, useTheme, alpha,
} from '@mui/material';
import {
  CheckCircle as CheckIcon,
  Code as SkillIcon,
  Work as WorkIcon,
  School as SchoolIcon,
  CardMembership as CertIcon,
  Contacts as ContactIcon,
  Edit as EditIcon,
  Upload as UploadIcon,
  AutoAwesome as AIIcon,
  ExpandMore as ExpandIcon,
  ArrowForward as ArrowForwardIcon,
} from '@mui/icons-material';
import { motion } from 'motion/react';
import { useNavigate } from 'react-router-dom';
import type { SectionKey } from '../types';

const MotionBox = motion.create(Box);

interface RankedTask {
  section: string;
  action: string;
  label: string;
  priority: number;
}

interface ProfileBuilderPanelProps {
  completionPercent: number;
  rankedTasks: RankedTask[];
  openCreate: (section: SectionKey) => void;
  startEditProfile: () => void;
  // AI extraction
  extracting: boolean;
  extractFile: File | null;
  setExtractFile: (f: File | null) => void;
  aiExpanded: boolean;
  setAiExpanded: (v: boolean | ((prev: boolean) => boolean)) => void;
  handleExtractSkills: () => Promise<void>;
}

const SECTION_ICONS: Record<string, React.ReactElement> = {
  profile: <EditIcon />,
  skills: <SkillIcon />,
  experiences: <WorkIcon />,
  education: <SchoolIcon />,
  certificates: <CertIcon />,
  contacts: <ContactIcon />,
};

export const ProfileBuilderPanel: React.FC<ProfileBuilderPanelProps> = ({
  completionPercent,
  rankedTasks,
  openCreate,
  startEditProfile,
  extracting,
  extractFile,
  setExtractFile,
  aiExpanded,
  setAiExpanded,
  handleExtractSkills,
}) => {
  const theme = useTheme();
  const navigate = useNavigate();
  const visibleTasks = rankedTasks.slice(0, 4);
  const isComplete = rankedTasks.length === 0;

  const handleTaskAction = (task: RankedTask) => {
    if (task.action === 'edit') {
      startEditProfile();
    } else {
      openCreate(task.section as SectionKey);
    }
  };

  return (
    <Card
      sx={{
        mb: 3,
        border: `1px solid ${alpha(theme.palette.primary.main, 0.12)}`,
        bgcolor: alpha(theme.palette.primary.main, 0.02),
      }}
    >
      <CardContent sx={{ p: { xs: 2, sm: 3 }, '&:last-child': { pb: { xs: 2, sm: 3 } } }}>
        {/* ── Completion Header ─── */}
        <Box sx={{ mb: isComplete ? 0 : 2.5 }}>
          <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 1 }}>
            <Typography variant="subtitle2" fontWeight={700}>
              {isComplete ? 'Profile Complete' : `Profile ${completionPercent}% complete`}
            </Typography>
            <Typography variant="caption" color="text.secondary">
              {isComplete ? '6 of 6' : `${Math.round((completionPercent / 100) * 6)} of 6 sections`}
            </Typography>
          </Box>
          <LinearProgress
            variant="determinate"
            value={completionPercent}
            sx={{
              height: 6,
              borderRadius: 3,
              bgcolor: alpha(theme.palette.primary.main, 0.08),
              '& .MuiLinearProgress-bar': {
                borderRadius: 3,
                background: isComplete
                  ? theme.palette.success.main
                  : `linear-gradient(90deg, ${theme.palette.primary.main}, ${theme.palette.secondary.main})`,
              },
            }}
          />
        </Box>

        {/* ── Complete state ─── */}
        {isComplete ? (
          <MotionBox
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.3 }}
            sx={{
              display: 'flex',
              alignItems: 'center',
              gap: 1.5,
              mt: 2,
              p: 2,
              borderRadius: 2,
              bgcolor: alpha(theme.palette.success.main, 0.06),
            }}
          >
            <CheckIcon sx={{ color: theme.palette.success.main, fontSize: 28 }} />
            <Box>
              <Typography variant="body2" fontWeight={600}>
                Your profile is complete!
              </Typography>
              <Typography variant="caption" color="text.secondary">
                All sections are filled — you&apos;re ready to go.
              </Typography>
            </Box>
          </MotionBox>
        ) : (
          /* ── Task list ─── */
          <Stack spacing={0}>
            {visibleTasks.map((task, i) => (
              <MotionBox
                key={task.section}
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.2, delay: i * 0.05 }}
                sx={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 1.5,
                  py: 1.25,
                  px: 0.5,
                  borderBottom:
                    i < visibleTasks.length - 1
                      ? `1px solid ${theme.palette.divider}`
                      : 'none',
                }}
              >
                <Box
                  sx={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    width: 32,
                    height: 32,
                    borderRadius: 1.5,
                    bgcolor: alpha(theme.palette.primary.main, 0.08),
                    color: theme.palette.primary.main,
                    flexShrink: 0,
                    '& .MuiSvgIcon-root': { fontSize: 18 },
                  }}
                >
                  {SECTION_ICONS[task.section] ?? <EditIcon />}
                </Box>
                <Typography variant="body2" sx={{ flex: 1, minWidth: 0 }}>
                  {task.label}
                </Typography>
                <Button
                  size="small"
                  variant="text"
                  onClick={() => handleTaskAction(task)}
                  sx={{ flexShrink: 0, fontWeight: 600, fontSize: '0.75rem' }}
                >
                  {task.action === 'edit' ? 'Edit' : 'Add'}
                </Button>
              </MotionBox>
            ))}
          </Stack>
        )}

        {/* ── AI Resume Import (collapsed) ─── */}
        <Box sx={{ mt: 2, pt: 2, borderTop: `1px solid ${theme.palette.divider}` }}>
          <Box
            sx={{ display: 'flex', alignItems: 'center', gap: 1.5, cursor: 'pointer' }}
            onClick={() => setAiExpanded((prev: boolean) => !prev)}
            role="button"
            tabIndex={0}
            aria-expanded={aiExpanded}
            aria-label="Toggle AI resume import"
            onKeyDown={e => {
              if (e.key === 'Enter' || e.key === ' ') {
                e.preventDefault();
                setAiExpanded((prev: boolean) => !prev);
              }
            }}
          >
            <AIIcon sx={{ color: theme.palette.primary.main, fontSize: 18 }} />
            <Typography variant="body2" fontWeight={600} sx={{ flex: 1 }}>
              Import skills from resume
            </Typography>
            <ExpandIcon
              sx={{
                fontSize: 18,
                transform: aiExpanded ? 'rotate(180deg)' : 'rotate(0deg)',
                transition: 'transform 0.25s',
                color: 'text.secondary',
              }}
            />
          </Box>
          <Collapse in={aiExpanded}>
            <Stack
              direction={{ xs: 'column', sm: 'row' }}
              spacing={2}
              alignItems={{ sm: 'center' }}
              sx={{ mt: 2 }}
            >
              <Button
                component="label"
                variant="outlined"
                size="small"
                startIcon={<UploadIcon />}
                disabled={extracting}
                sx={{ flexShrink: 0 }}
              >
                Choose File
                <input
                  type="file"
                  hidden
                  accept=".pdf,.txt,.html"
                  onChange={e => setExtractFile(e.target.files?.[0] ?? null)}
                />
              </Button>
              {extractFile && (
                <Chip
                  label={extractFile.name}
                  size="small"
                  onDelete={() => setExtractFile(null)}
                  sx={{ maxWidth: 250 }}
                />
              )}
              <Button
                variant="contained"
                size="small"
                startIcon={<AIIcon />}
                onClick={handleExtractSkills}
                disabled={extracting || !extractFile}
                sx={{ flexShrink: 0 }}
              >
                {extracting ? 'Extracting…' : 'Extract Skills'}
              </Button>
            </Stack>
            {extracting && <LinearProgress sx={{ mt: 2 }} />}
          </Collapse>
        </Box>

        {/* ── Documents Studio CTA ─── */}
        <Box sx={{ mt: 2, pt: 2, borderTop: `1px solid ${theme.palette.divider}` }}>
          <Button
            size="small"
            variant="text"
            endIcon={<ArrowForwardIcon sx={{ fontSize: 16 }} />}
            onClick={() => navigate('/me/documents')}
            sx={{ fontWeight: 600, fontSize: '0.8rem', color: 'text.secondary' }}
          >
            Open Documents Studio
          </Button>
        </Box>
      </CardContent>
    </Card>
  );
};
