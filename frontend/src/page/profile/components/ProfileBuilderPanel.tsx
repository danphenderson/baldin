import React from 'react';
import {
  Box, Card, CardContent, Typography, Stack, Button, LinearProgress,
  useTheme, alpha,
} from '@mui/material';
import {
  CheckCircle as CheckIcon,
  Code as SkillIcon,
  Work as WorkIcon,
  School as SchoolIcon,
  CardMembership as CertIcon,
  Contacts as ContactIcon,
  Edit as EditIcon,
  AutoAwesome as AIIcon,
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
  onOpenImportModal: () => void;
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
  onOpenImportModal,
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

        {/* ── AI Profile Import ─── */}
        <Box sx={{ mt: 2, pt: 2, borderTop: `1px solid ${theme.palette.divider}` }}>
          <Button
            size="small"
            variant="outlined"
            startIcon={<AIIcon />}
            onClick={onOpenImportModal}
            sx={{ fontWeight: 600, fontSize: '0.8rem' }}
          >
            Import Profile
          </Button>
        </Box>

        {/* ── Documents CTA ─── */}
        <Box sx={{ mt: 2, pt: 2, borderTop: `1px solid ${theme.palette.divider}` }}>
          <Button
            size="small"
            variant="text"
            endIcon={<ArrowForwardIcon sx={{ fontSize: 16 }} />}
            onClick={() => navigate('/documents')}
            sx={{ fontWeight: 600, fontSize: '0.8rem', color: 'text.secondary' }}
          >
            Open Documents
          </Button>
        </Box>
      </CardContent>
    </Card>
  );
};
