import type { SectionKey, EditableItem, FieldConfig } from './types';

// ---------------------------------------------------------------------------
// Field configs for each section dialog
// ---------------------------------------------------------------------------

export const SKILL_FIELDS: FieldConfig[] = [
  { key: 'name', label: 'Skill Name' },
  { key: 'category', label: 'Category' },
  { key: 'yoe', label: 'Years of Experience', type: 'number' },
  { key: 'subskills', label: 'Sub-skills', isArray: true },
];

export const EXPERIENCE_FIELDS: FieldConfig[] = [
  { key: 'title', label: 'Job Title' },
  { key: 'company', label: 'Company' },
  { key: 'location', label: 'Location' },
  { key: 'start_date', label: 'Start Date', type: 'date' },
  { key: 'end_date', label: 'End Date', type: 'date' },
  { key: 'description', label: 'Description', multiline: true, rows: 3 },
  { key: 'projects', label: 'Projects', multiline: true, rows: 2, isArray: true },
];

export const EDUCATION_FIELDS: FieldConfig[] = [
  { key: 'degree', label: 'Degree' },
  { key: 'university', label: 'University' },
  { key: 'grade_point', label: 'GPA' },
  { key: 'start_date', label: 'Start Date', type: 'date' },
  { key: 'end_date', label: 'End Date', type: 'date' },
  { key: 'activities', label: 'Activities', multiline: true, rows: 2, isArray: true },
  { key: 'achievements', label: 'Achievements', multiline: true, rows: 2, isArray: true },
];

export const CERTIFICATE_FIELDS: FieldConfig[] = [
  { key: 'title', label: 'Certificate Title' },
  { key: 'issuer', label: 'Issuer' },
  { key: 'issued_date', label: 'Issued Date', type: 'date' },
  { key: 'expiration_date', label: 'Expiration Date', type: 'date' },
];

export const CONTACT_FIELDS: FieldConfig[] = [
  { key: 'first_name', label: 'First Name' },
  { key: 'last_name', label: 'Last Name' },
  { key: 'email', label: 'Email' },
  { key: 'phone_number', label: 'Phone Number' },
  { key: 'time_zone', label: 'Time Zone' },
  { key: 'notes', label: 'Notes', multiline: true, rows: 3 },
];

export const SECTION_FIELDS: Record<SectionKey, FieldConfig[]> = {
  skills: SKILL_FIELDS,
  experiences: EXPERIENCE_FIELDS,
  education: EDUCATION_FIELDS,
  certificates: CERTIFICATE_FIELDS,
  contacts: CONTACT_FIELDS,
};

export const SECTION_LABELS: Record<SectionKey, string> = {
  skills: 'Skill',
  experiences: 'Experience',
  education: 'Education',
  certificates: 'Certificate',
  contacts: 'Contact',
};

export const BLANK_TEMPLATES: Record<SectionKey, EditableItem> = {
  skills: { name: '', category: '', yoe: 0, subskills: [] as string[] },
  experiences: { title: '', company: '', location: '', start_date: '', end_date: '', description: '', projects: [] as string[] },
  education: { university: '', degree: '', grade_point: '', start_date: '', end_date: '', activities: [] as string[], achievements: [] as string[] },
  certificates: { title: '', issuer: '', issued_date: '', expiration_date: '' },
  contacts: { first_name: '', last_name: '', email: '', phone_number: '', time_zone: '', notes: '' },
};

// ---------------------------------------------------------------------------
// Animations
// ---------------------------------------------------------------------------

export const stagger = {
  initial: { opacity: 0, y: 12 },
  animate: { opacity: 1, y: 0 },
  exit: { opacity: 0, y: -8 },
};
