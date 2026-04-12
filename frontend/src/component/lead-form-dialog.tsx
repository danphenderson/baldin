import React, { useEffect, useState } from 'react';
import {
  Button,
  TextField,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Stack,
  Chip,
} from '@mui/material';
import Grid from '@mui/material/Grid';
import { FormDialogShell } from '../design-system';
import type { LeadRead, LeadCreate, LeadUpdate } from '../service/leads';
import type { CompanyRead } from '../service/companies';

interface LeadFormDialogProps {
  open: boolean;
  onClose: () => void;
  onSave: (data: LeadCreate | LeadUpdate) => Promise<void>;
  lead: LeadRead | null;
  companies: CompanyRead[];
}

const EMPLOYMENT_TYPES = ['Full-time', 'Part-time', 'Contract', 'Internship', 'Freelance'];
const SENIORITY_LEVELS = ['Entry', 'Mid', 'Senior', 'Lead', 'Staff', 'Director', 'Executive'];

const LeadFormDialog: React.FC<LeadFormDialogProps> = ({
  open,
  onClose,
  onSave,
  lead,
  companies,
}) => {
  const isEdit = Boolean(lead?.id);

  const [url, setUrl] = useState('');
  const [title, setTitle] = useState('');
  const [location, setLocation] = useState('');
  const [salary, setSalary] = useState('');
  const [employmentType, setEmploymentType] = useState('');
  const [jobFunction, setJobFunction] = useState('');
  const [seniorityLevel, setSeniorityLevel] = useState('');
  const [educationLevel, setEducationLevel] = useState('');
  const [hiringManager, setHiringManager] = useState('');
  const [description, setDescription] = useState('');
  const [companyIds, setCompanyIds] = useState<string[]>([]);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!open) return;

    if (lead) {
      setUrl(lead.url || '');
      setTitle(lead.title || '');
      setLocation(lead.location || '');
      setSalary(lead.salary || '');
      setEmploymentType(lead.employment_type || '');
      setJobFunction(lead.job_function || '');
      setSeniorityLevel(lead.seniority_level || '');
      setEducationLevel(lead.education_level || '');
      setHiringManager(lead.hiring_manager || '');
      setDescription(lead.description || '');
      setCompanyIds(lead.companies?.map((company) => company.id) || []);
      return;
    }

    setUrl('');
    setTitle('');
    setLocation('');
    setSalary('');
    setEmploymentType('');
    setJobFunction('');
    setSeniorityLevel('');
    setEducationLevel('');
    setHiringManager('');
    setDescription('');
    setCompanyIds([]);
  }, [lead, open]);

  const handleSave = async () => {
    setSaving(true);

    try {
      if (isEdit) {
        const data: LeadUpdate = {
          title: title || null,
          description: description || null,
          location: location || null,
          salary: salary || null,
          job_function: jobFunction || null,
          employment_type: employmentType || null,
          seniority_level: seniorityLevel || null,
          education_level: educationLevel || null,
          hiring_manager: hiringManager || null,
          company_ids: companyIds,
        };
        await onSave(data);
      } else {
        const data: LeadCreate = {
          url,
          title: title || null,
          description: description || null,
          location: location || null,
          salary: salary || null,
          job_function: jobFunction || null,
          employment_type: employmentType || null,
          seniority_level: seniorityLevel || null,
          education_level: educationLevel || null,
          hiring_manager: hiringManager || null,
          company_ids: companyIds.length > 0 ? companyIds : null,
        };
        await onSave(data);
      }
    } finally {
      setSaving(false);
    }
  };

  return (
    <FormDialogShell
      open={open}
      onClose={onClose}
      maxWidth="md"
      fullWidth
      busy={saving}
      title={isEdit ? 'Add Shared Context' : 'Add Lead'}
      actions={(
        <>
          <Button onClick={onClose} disabled={saving}>Cancel</Button>
          <Button variant="contained" onClick={handleSave} disabled={saving || (!isEdit && !url.trim())}>
            {saving ? 'Saving...' : isEdit ? 'Save Shared Fields' : 'Create Lead'}
          </Button>
        </>
      )}
    >
        <Grid container spacing={2} sx={{ mt: 0 }}>
          {!isEdit && (
            <Grid size={12}>
              <TextField
                fullWidth
                label="Job Posting URL"
                value={url}
                onChange={(event) => setUrl(event.target.value)}
                placeholder="https://..."
                required
                slotProps={{ htmlInput: { 'aria-label': 'Job posting URL' } }}
              />
            </Grid>
          )}

          <Grid size={{ xs: 12, sm: 6 }}>
            <TextField fullWidth label="Title" value={title} onChange={(event) => setTitle(event.target.value)} />
          </Grid>
          <Grid size={{ xs: 12, sm: 6 }}>
            <TextField fullWidth label="Location" value={location} onChange={(event) => setLocation(event.target.value)} />
          </Grid>
          <Grid size={{ xs: 12, sm: 6 }}>
            <TextField fullWidth label="Salary" value={salary} onChange={(event) => setSalary(event.target.value)} />
          </Grid>
          <Grid size={{ xs: 12, sm: 6 }}>
            <FormControl fullWidth>
              <InputLabel>Employment Type</InputLabel>
              <Select value={employmentType} label="Employment Type" onChange={(event) => setEmploymentType(event.target.value)}>
                <MenuItem value="">None</MenuItem>
                {EMPLOYMENT_TYPES.map((item) => <MenuItem key={item} value={item}>{item}</MenuItem>)}
              </Select>
            </FormControl>
          </Grid>
          <Grid size={{ xs: 12, sm: 6 }}>
            <TextField fullWidth label="Job Function" value={jobFunction} onChange={(event) => setJobFunction(event.target.value)} />
          </Grid>
          <Grid size={{ xs: 12, sm: 6 }}>
            <FormControl fullWidth>
              <InputLabel>Seniority Level</InputLabel>
              <Select value={seniorityLevel} label="Seniority Level" onChange={(event) => setSeniorityLevel(event.target.value)}>
                <MenuItem value="">None</MenuItem>
                {SENIORITY_LEVELS.map((item) => <MenuItem key={item} value={item}>{item}</MenuItem>)}
              </Select>
            </FormControl>
          </Grid>
          <Grid size={{ xs: 12, sm: 6 }}>
            <TextField fullWidth label="Education Level" value={educationLevel} onChange={(event) => setEducationLevel(event.target.value)} />
          </Grid>
          <Grid size={{ xs: 12, sm: 6 }}>
            <TextField fullWidth label="Hiring Manager" value={hiringManager} onChange={(event) => setHiringManager(event.target.value)} />
          </Grid>

          {companies.length > 0 && (
            <Grid size={12}>
              <FormControl fullWidth>
                <InputLabel>Associated Companies</InputLabel>
                <Select
                  multiple
                  value={companyIds}
                  label="Associated Companies"
                  onChange={(event) => setCompanyIds(event.target.value as string[])}
                  renderValue={(selected) => (
                    <Stack direction="row" spacing={0.5} flexWrap="wrap" useFlexGap>
                      {selected.map((id) => {
                        const company = companies.find((item) => item.id === id);
                        return <Chip key={id} label={company?.name || id} size="small" />;
                      })}
                    </Stack>
                  )}
                >
                  {companies.map((company) => (
                    <MenuItem key={company.id} value={company.id}>{company.name}</MenuItem>
                  ))}
                </Select>
              </FormControl>
            </Grid>
          )}

          <Grid size={12}>
            <TextField
              fullWidth
              label="Description"
              multiline
              rows={5}
              value={description}
              onChange={(event) => setDescription(event.target.value)}
            />
          </Grid>
        </Grid>
    </FormDialogShell>
  );
};

export default LeadFormDialog;
