import { useState, useCallback } from 'react';
import { getUser, updateUser, type UserRead, type UserUpdate } from '../../../service/users';
import { getSkills, createSkill, updateSkill, deleteSkill, type SkillRead } from '../../../service/skills';
import { getExperiences, createExperience, updateExperience, deleteExperience, type ExperienceRead } from '../../../service/experiences';
import { getEducations as getEducation, createEducation, updateEducation, deleteEducation, type EducationRead } from '../../../service/education';
import { getCertificates, createCertificate, updateCertificate, deleteCertificate, type CertificateRead } from '../../../service/certificates';
import { getContacts, createContact, updateContact, deleteContact, type ContactRead } from '../../../service/contacts';
import { SECTION_LABELS, BLANK_TEMPLATES, SECTION_FIELDS } from '../constants';
import type { SectionKey, EditableItem, DeleteTarget } from '../types';

export interface UseProfileDataReturn {
  loading: boolean;
  saving: boolean;
  error: string;
  setError: (e: string) => void;
  toast: string;
  setToast: (t: string) => void;

  profile: UserRead | null;
  profileDraft: UserUpdate;
  editingProfile: boolean;
  skills: SkillRead[];
  experiences: ExperienceRead[];
  education: EducationRead[];
  certificates: CertificateRead[];
  contacts: ContactRead[];

  refresh: () => Promise<void>;
  startEditProfile: () => void;
  cancelEditProfile: () => void;
  handleSaveProfile: () => Promise<void>;
  pf: (key: keyof UserUpdate, value: string) => void;
  setUser: ((u: UserRead) => void) | undefined;

  // Profile import modal
  showImportModal: boolean;
  setShowImportModal: (v: boolean) => void;

  // Section CRUD
  editOpen: boolean;
  editSection: SectionKey;
  editItem: Record<string, unknown> | null;
  editSaving: boolean;
  setEditItem: React.Dispatch<React.SetStateAction<Record<string, unknown> | null>>;
  openCreate: (section: SectionKey) => void;
  openEdit: (section: SectionKey, item: EditableItem) => void;
  handleSaveItem: () => Promise<void>;
  closeEdit: () => void;

  // Delete
  deleteTarget: DeleteTarget | null;
  confirmDelete: (id: string, section: SectionKey, label: string) => void;
  handleDelete: () => Promise<void>;
  cancelDelete: () => void;
}

export function useProfileData(
  token: string | null,
  setUserCtx?: (u: UserRead) => void,
): UseProfileDataReturn {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [editingProfile, setEditingProfile] = useState(false);
  const [showImportModal, setShowImportModal] = useState(false);

  const [error, setError] = useState('');
  const [toast, setToast] = useState('');

  const [profile, setProfile] = useState<UserRead | null>(null);
  const [profileDraft, setProfileDraft] = useState<UserUpdate>({});

  const [skills, setSkills] = useState<SkillRead[]>([]);
  const [experiences, setExperiences] = useState<ExperienceRead[]>([]);
  const [education, setEducation] = useState<EducationRead[]>([]);
  const [certificates, setCertificates] = useState<CertificateRead[]>([]);
  const [contacts, setContacts] = useState<ContactRead[]>([]);

  const [editOpen, setEditOpen] = useState(false);
  const [editSection, setEditSection] = useState<SectionKey>('skills');
  const [editItem, setEditItem] = useState<Record<string, unknown> | null>(null);
  const [editSaving, setEditSaving] = useState(false);

  const [deleteTarget, setDeleteTarget] = useState<DeleteTarget | null>(null);



  // -----------------------------------------------------------------------
  // Data fetching
  // -----------------------------------------------------------------------

  const refresh = useCallback(async () => {
    if (!token) return;
    setLoading(true);
    try {
      const [u, sk, ex, ed, ce, co] = await Promise.all([
        getUser(token), getSkills(token), getExperiences(token),
        getEducation(token), getCertificates(token), getContacts(token),
      ]);
      setProfile(u);
      setSkills(sk || []);
      setExperiences(ex || []);
      setEducation(ed || []);
      setCertificates(ce || []);
      setContacts(co || []);
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : 'Failed to load profile data');
    }
    setLoading(false);
  }, [token]);

  // -----------------------------------------------------------------------
  // Profile handlers
  // -----------------------------------------------------------------------

  const startEditProfile = () => {
    if (!profile) return;
    setProfileDraft({
      first_name: profile.first_name ?? '',
      last_name: profile.last_name ?? '',
      phone_number: profile.phone_number ?? '',
      address_line_1: profile.address_line_1 ?? '',
      address_line_2: profile.address_line_2 ?? '',
      city: profile.city ?? '',
      state: profile.state ?? '',
      zip_code: profile.zip_code ?? '',
      country: profile.country ?? '',
      time_zone: profile.time_zone ?? '',
    });
    setEditingProfile(true);
  };

  const cancelEditProfile = () => {
    setEditingProfile(false);
  };

  const handleSaveProfile = async () => {
    if (!token) return;
    setSaving(true);
    try {
      const updated = await updateUser(token, profileDraft);
      if (setUserCtx) setUserCtx(updated);
      setProfile(updated);
      setEditingProfile(false);
      setToast('Profile updated');
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : 'Failed to update profile');
    }
    setSaving(false);
  };

  const pf = (key: keyof UserUpdate, value: string) =>
    setProfileDraft(prev => ({ ...prev, [key]: value }));



  // -----------------------------------------------------------------------
  // Section CRUD
  // -----------------------------------------------------------------------

  const openCreate = (section: SectionKey) => {
    setEditSection(section);
    setEditItem({ ...BLANK_TEMPLATES[section] } as Record<string, unknown>);
    setEditOpen(true);
  };

  const openEdit = (section: SectionKey, item: EditableItem) => {
    setEditSection(section);
    setEditItem({ ...item } as Record<string, unknown>);
    setEditOpen(true);
  };

  const closeEdit = () => {
    setEditOpen(false);
    setEditItem(null);
  };

  const handleSaveItem = async () => {
    if (!token || !editItem) return;
    setEditSaving(true);
    try {
      // Convert comma-separated text back to string[] for array fields
      const payload = { ...editItem };
      for (const f of SECTION_FIELDS[editSection]) {
        if (f.isArray && typeof payload[f.key] === 'string') {
          payload[f.key] = (payload[f.key] as string).split(',').map(s => s.trim()).filter(Boolean);
        }
      }

      const isUpdate = 'id' in payload && !!payload.id;
      const ops = {
        skills: { create: createSkill, update: updateSkill },
        experiences: { create: createExperience, update: updateExperience },
        education: { create: createEducation, update: updateEducation },
        certificates: { create: createCertificate, update: updateCertificate },
        contacts: { create: createContact, update: updateContact },
      } as const;
      const op = ops[editSection];
      if (isUpdate) {
        await (op.update as (t: string, id: string, data: unknown) => Promise<unknown>)(token, payload.id as string, payload);
      } else {
        await (op.create as (t: string, data: unknown) => Promise<unknown>)(token, payload);
      }
      setEditOpen(false);
      setEditItem(null);
      setToast(`${SECTION_LABELS[editSection]} ${isUpdate ? 'updated' : 'created'}`);
      refresh();
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : 'Save failed');
    }
    setEditSaving(false);
  };

  const confirmDelete = (id: string, section: SectionKey, label: string) => {
    setDeleteTarget({ id, section, label });
  };

  const cancelDelete = () => {
    setDeleteTarget(null);
  };

  const handleDelete = async () => {
    if (!token || !deleteTarget) return;
    const ops: Record<SectionKey, (t: string, id: string) => Promise<unknown>> = {
      skills: deleteSkill, experiences: deleteExperience, education: deleteEducation,
      certificates: deleteCertificate, contacts: deleteContact,
    };
    try {
      await ops[deleteTarget.section](token, deleteTarget.id);
      setToast(`${SECTION_LABELS[deleteTarget.section]} deleted`);
      refresh();
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : 'Delete failed');
    }
    setDeleteTarget(null);
  };

  return {
    loading,
    saving,
    error,
    setError,
    toast,
    setToast,
    profile,
    profileDraft,
    editingProfile,
    skills,
    experiences,
    education,
    certificates,
    contacts,
    refresh,
    startEditProfile,
    cancelEditProfile,
    handleSaveProfile,
    pf,
    setUser: setUserCtx,
    showImportModal,
    setShowImportModal,
    editOpen,
    editSection,
    editItem,
    editSaving,
    setEditItem,
    openCreate,
    openEdit,
    handleSaveItem,
    closeEdit,
    deleteTarget,
    confirmDelete,
    handleDelete,
    cancelDelete,
  };
}
