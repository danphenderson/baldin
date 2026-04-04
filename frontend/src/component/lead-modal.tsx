import React, { useState, useEffect } from 'react';
import {
  Dialog, DialogTitle, DialogContent, DialogActions, Button, TextField,
  FormControl, InputLabel, Select, MenuItem, Stack, Chip, Typography,
  IconButton,
} from '@mui/material';
import Grid from '@mui/material/Grid';
import { Close as CloseIcon } from '@mui/icons-material';
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

const LeadFormDialog: React.FC<LeadFormDialogProps> = ({ open, onClose, onSave, lead, companies }) => {
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
  const [notes, setNotes] = useState('');
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
      setNotes(lead.notes || '');
      setCompanyIds(lead.companies?.map((c) => c.id) || []);
    } else {
      setUrl(''); setTitle(''); setLocation(''); setSalary('');
      setEmploymentType(''); setJobFunction(''); setSeniorityLevel('');
      setEducationLevel(''); setHiringManager(''); setDescription('');
      setNotes(''); setCompanyIds([]);
    }
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
          notes: notes || null,
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
          notes: notes || null,
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
    <Dialog
      open={open}
      onClose={saving ? undefined : onClose}
      maxWidth="md"
      fullWidth
      aria-labelledby="lead-form-title"
    >
      <DialogTitle
        id="lead-form-title"
        sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', pb: 1 }}
      >
        <Typography variant="h6" component="span" fontWeight={700}>
          {isEdit ? 'Edit Lead' : 'Add Lead'}
        </Typography>
        <IconButton onClick={onClose} size="small" aria-label="Close dialog" disabled={saving}>
          <CloseIcon />
        </IconButton>
      </DialogTitle>

      <DialogContent dividers>
        <Grid container spacing={2} sx={{ mt: 0 }}>
          {!isEdit && (
            <Grid size={12}>
              <TextField
                fullWidth label="Job Posting URL" value={url}
                onChange={(e) => setUrl(e.target.value)}
                placeholder="https://..." required
                slotProps={{ htmlInput: { 'aria-label': 'Job posting URL' } }}
              />
            </Grid>
          )}
          <Grid size={{ xs: 12, sm: 6 }}>
            <TextField fullWidth label="Title" value={title} onChange={(e) => setTitle(e.target.value)} />
          </Grid>
          <Grid size={{ xs: 12, sm: 6 }}>
            <TextField fullWidth label="Location" value={location} onChange={(e) => setLocation(e.target.value)} />
          </Grid>
          <Grid size={{ xs: 12, sm: 6 }}>
            <TextField fullWidth label="Salary" value={salary} onChange={(e) => setSalary(e.target.value)} />
          </Grid>
          <Grid size={{ xs: 12, sm: 6 }}>
            <FormControl fullWidth>
              <InputLabel>Employment Type</InputLabel>
              <Select value={employmentType} label="Employment Type" onChange={(e) => setEmploymentType(e.target.value)}>
                <MenuItem value="">None</MenuItem>
                {EMPLOYMENT_TYPES.map((t) => <MenuItem key={t} value={t}>{t}</MenuItem>)}
              </Select>
            </FormControl>
          </Grid>
          <Grid size={{ xs: 12, sm: 6 }}>
            <TextField fullWidth label="Job Function" value={jobFunction} onChange={(e) => setJobFunction(e.target.value)} />
          </Grid>
          <Grid size={{ xs: 12, sm: 6 }}>
            <FormControl fullWidth>
              <InputLabel>Seniority Level</InputLabel>
              <Select value={seniorityLevel} label="Seniority Level" onChange={(e) => setSeniorityLevel(e.target.value)}>
                <MenuItem value="">None</MenuItem>
                {SENIORITY_LEVELS.map((l) => <MenuItem key={l} value={l}>{l}</MenuItem>)}
              </Select>
            </FormControl>
          </Grid>
          <Grid size={{ xs: 12, sm: 6 }}>
            <TextField fullWidth label="Education Level" value={educationLevel} onChange={(e) => setEducationLevel(e.target.value)} />
          </Grid>
          <Grid size={{ xs: 12, sm: 6 }}>
            <TextField fullWidth label="Hiring Manager" value={hiringManager} onChange={(e) => setHiringManager(e.target.value)} />
          </Grid>
          {companies.length > 0 && (
            <Grid size={12}>
              <FormControl fullWidth>
                <InputLabel>Associated Companies</InputLabel>
                <Select
                  multiple value={companyIds} label="Associated Companies"
                  onChange={(e) => setCompanyIds(e.target.value as string[])}
                  renderValue={(selected) => (
                    <Stack direction="row" spacing={0.5} flexWrap="wrap" useFlexGap>
                      {selected.map((id) => {
                        const c = companies.find((co) => co.id === id);
                        return <Chip key={id} label={c?.name || id} size="small" />;
                      })}
                    </Stack>
                  )}
                >
                  {companies.map((c) => (
                    <MenuItem key={c.id} value={c.id}>{c.name}</MenuItem>
                  ))}
                </Select>
              </FormControl>
            </Grid>
          )}
          <Grid size={12}>
            <TextField
              fullWidth label="Description" multiline rows={4}
              value={description} onChange={(e) => setDescription(e.target.value)}
            />
          </Grid>
          <Grid size={12}>
            <TextField
              fullWidth label="Notes (internal)" multiline rows={2}
              value={notes} onChange={(e) => setNotes(e.target.value)}
              placeholder="Private notes about this opportunity..."
            />
          </Grid>
        </Grid>
      </DialogContent>

      <DialogActions sx={{ px: 3, pb: 2 }}>
        <Button onClick={onClose} disabled={saving}>Cancel</Button>
        <Button variant="contained" onClick={handleSave} disabled={saving || (!isEdit && !url.trim())}>
          {saving ? 'Saving...' : isEdit ? 'Update' : 'Create'}
        </Button>
      </DialogActions>
    </Dialog>
  );
};

export default LeadFormDialog;
