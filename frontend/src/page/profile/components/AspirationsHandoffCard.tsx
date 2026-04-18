import React from 'react';
import { Button, Stack, Typography } from '@mui/material';
import {
  ArrowOutward as OpenIcon,
  Badge as RolesIcon,
  BusinessOutlined as CompaniesIcon,
  CompareArrows as HandoffIcon,
} from '@mui/icons-material';
import { Link as RouterLink } from 'react-router-dom';
import { MetricStrip, SectionCard, SectionHeader } from '../../../design-system';

interface AspirationsHandoffCardProps {
  roleCount: number;
  companyCount: number;
}

export const AspirationsHandoffCard: React.FC<AspirationsHandoffCardProps> = ({
  roleCount,
  companyCount,
}) => {
  return (
    <SectionCard
      id="section-aspirations-handoff"
      density="compact"
      tone="primary"
      surface="inset"
      header={(
        <SectionHeader
          icon={<HandoffIcon />}
          title="Roles & companies handoff"
          supportingText="Keep /me as the overview surface, then move into the dedicated routes when you need focused suggestion review or CRUD."
          divider
          size="compact"
        />
      )}
    >
      <Stack spacing={2}>
        <MetricStrip
          variant="inline"
          items={[
            { label: 'Roles saved', value: roleCount },
            { label: 'Companies saved', value: companyCount },
          ]}
        />

        <Typography variant="body2" color="text.secondary">
          The deep links stay intact for role and company-specific editing, while this page keeps the combined profile and aspiration context visible.
        </Typography>

        <Stack direction={{ xs: 'column', sm: 'row', lg: 'column' }} spacing={1.5}>
          <Button
            variant="contained"
            component={RouterLink}
            to="/me/aspirations/roles"
            startIcon={<RolesIcon />}
            endIcon={<OpenIcon sx={{ fontSize: 16 }} />}
          >
            Manage roles
          </Button>
          <Button
            variant="outlined"
            component={RouterLink}
            to="/me/aspirations/companies"
            startIcon={<CompaniesIcon />}
            endIcon={<OpenIcon sx={{ fontSize: 16 }} />}
          >
            Manage companies
          </Button>
        </Stack>
      </Stack>
    </SectionCard>
  );
};

export default AspirationsHandoffCard;
