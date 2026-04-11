import type { SkillRead, SkillCreate } from '../../service/skills';
import type { ExperienceRead, ExperienceCreate } from '../../service/experiences';
import type { EducationRead, EducationCreate } from '../../service/education';
import type { CertificateRead, CertificateCreate } from '../../service/certificates';
import type { ContactRead, ContactCreate } from '../../service/contacts';

export type SectionKey = 'skills' | 'experiences' | 'education' | 'certificates' | 'contacts';

export type EditableItem =
  | (SkillRead | SkillCreate)
  | (ExperienceRead | ExperienceCreate)
  | (EducationRead | EducationCreate)
  | (CertificateRead | CertificateCreate)
  | (ContactRead | ContactCreate);

export interface DeleteTarget {
  id: string;
  section: SectionKey;
  label: string;
}

export interface FieldConfig {
  key: string;
  label: string;
  type?: 'text' | 'number' | 'date';
  multiline?: boolean;
  rows?: number;
  /** When true, the API value is string[] but the form edits as comma-separated text. */
  isArray?: boolean;
}
