import { useMemo } from 'react';
import type { UserRead } from '../../../service/users';
import type { SkillRead } from '../../../service/skills';
import type { ExperienceRead } from '../../../service/experiences';
import type { EducationRead } from '../../../service/education';
import type { CertificateRead } from '../../../service/certificates';
import type { ContactRead } from '../../../service/contacts';

interface RankedTask {
  section: string;
  action: string;
  label: string;
  priority: number;
}

export interface UseProfileCompletionReturn {
  completionPercent: number;
  completedSections: string[];
  incompleteSections: string[];
  rankedTasks: RankedTask[];
}

const SECTION_COUNT = 6;

export function useProfileCompletion(
  profile: UserRead | null,
  skills: SkillRead[],
  experiences: ExperienceRead[],
  education: EducationRead[],
  certificates: CertificateRead[],
  contacts: ContactRead[],
): UseProfileCompletionReturn {
  return useMemo(() => {
    const completed: string[] = [];
    const incomplete: string[] = [];

    // Core profile fields
    const coreComplete = !!(
      profile?.first_name &&
      profile?.last_name &&
      profile?.email
    );
    if (coreComplete) completed.push('profile');
    else incomplete.push('profile');

    // Section arrays
    const sections: { key: string; items: unknown[]; priority: number; action: string; label: string }[] = [
      { key: 'skills', items: skills, priority: 1, action: 'add', label: 'Add your first skill' },
      { key: 'experiences', items: experiences, priority: 2, action: 'add', label: 'Add work experience' },
      { key: 'education', items: education, priority: 3, action: 'add', label: 'Add education' },
      { key: 'certificates', items: certificates, priority: 4, action: 'add', label: 'Add a certificate' },
      { key: 'contacts', items: contacts, priority: 5, action: 'add', label: 'Add a contact' },
    ];

    const tasks: RankedTask[] = [];

    if (!coreComplete) {
      tasks.push({
        section: 'profile',
        action: 'edit',
        label: 'Complete your basic profile info',
        priority: 0,
      });
    }

    for (const s of sections) {
      if (s.items.length > 0) {
        completed.push(s.key);
      } else {
        incomplete.push(s.key);
        tasks.push({
          section: s.key,
          action: s.action,
          label: s.label,
          priority: s.priority,
        });
      }
    }

    tasks.sort((a, b) => a.priority - b.priority);

    const completionPercent = Math.round((completed.length / SECTION_COUNT) * 100);

    return { completionPercent, completedSections: completed, incompleteSections: incomplete, rankedTasks: tasks };
  }, [profile, skills, experiences, education, certificates, contacts]);
}
