import React, { useState, useEffect } from 'react';
import { Dialog, DialogTitle, DialogContent, TextField, DialogActions, Button } from '@mui/material';
import { SkillRead, SkillCreate, SkillUpdate } from '../services/skills';  // Adjust the import path as necessary

interface SkillsModalProps {
  open: boolean;
  onClose: () => void;
  onSave: (skill: SkillCreate | SkillUpdate) => void;
  initialData?: SkillRead;
}

const SkillsModal: React.FC<SkillsModalProps> = ({ open, onClose, onSave, initialData }) => {
  const defaultSkillData: SkillCreate | SkillUpdate = {
    category: '',
    name: '',
    subskills: '',
    yoe: null  // Assuming 'yoe' can be null for SkillCreate and SkillUpdate
  };

  const [skillData, setSkillData] = useState<SkillCreate | SkillUpdate>(defaultSkillData);
  const [isEdited, setIsEdited] = useState(false);

  useEffect(() => {
    if (initialData) {
      // Map SkillRead to SkillUpdate since we are editing the skill
      const updateData: SkillUpdate = {
        category: initialData.category || '',
        name: initialData.name || '',
        subskills: initialData.subskills || '',
        yoe: initialData.yoe || null
      };
      setSkillData(updateData);
      setIsEdited(true);
    } else {
      setSkillData(defaultSkillData);
      setIsEdited(false);
    }
  }, [initialData, open]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setSkillData((prevState: any) => ({
      ...prevState,
      [name]: value
    }));
  };

  const handleSave = () => {
    onSave(skillData);
    onClose();
    setSkillData(defaultSkillData);
  };

  const formatLabel = (key: string) => key.charAt(0).toUpperCase() + key.slice(1).replace(/_/g, ' ');

  return (
    <Dialog open={open} onClose={onClose} aria-labelledby="form-dialog-title">
      <DialogTitle id="form-dialog-title">{isEdited ? 'Edit Skill' : 'New Skill'}</DialogTitle>
      <DialogContent>
        {Object.entries(skillData).map(([key, value]) => (
          <TextField
            key={key}
            margin="dense"
            name={key}
            label={formatLabel(key)}
            type={typeof value === 'number' ? 'number' : 'text'}
            fullWidth
            value={value || ''}  // Handle null and undefined values
            onChange={handleChange}
          />
        ))}
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose}>Cancel</Button>
        <Button onClick={handleSave} color="primary">Save</Button>
      </DialogActions>
    </Dialog>
  );
};

export default SkillsModal;
