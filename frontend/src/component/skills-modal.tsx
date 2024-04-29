import React, { useState, useEffect } from 'react';
import { Dialog, DialogTitle, DialogContent, TextField, DialogActions, Button } from '@mui/material';
import { SkillRead, SkillCreate, SkillUpdate, extractSkill  } from '../service/skills';  // Adjust the import path as necessary
import { ExtractorRun } from '../service/extractor';  // Adjust the import path as necessary
import  FilePicker  from '../component/common/file-picker';
import { useContext } from 'react';
import { UserContext } from '../context/user-context';

interface SkillsModalProps {
  open: boolean;
  onClose: () => void;
  onSave: (skill: SkillCreate | SkillUpdate) => void;
  initialData?: SkillRead;
}

interface SkillsExtractModalProps {
  open: boolean;
  onClose: () => void;
  onSave: (data: ExtractorRun) => void;
  initialData?: ExtractorRun;
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


const SkillsExtractModal: React.FC<SkillsExtractModalProps> = ({ open, onClose, onSave, initialData }) => {
  const defaultData: ExtractorRun = {
    mode: 'entire_document',
    file: null,
    text: null,
    url: null,
    llm: '',
  };
  const [data, setData] = useState<ExtractorRun>({ ...defaultData, ...initialData});
  const { token } = useContext(UserContext);

  useEffect(() => {
    setData({ ...defaultData, ...initialData });
  }, [initialData]);

  const handleSave = async () => {
    try {
      const result = await extractSkill(token || '', data as ExtractorRun);
      onSave(result);
    } catch (error) {
      console.error(error);
    }
  };

  const handleFileSelection = (files: FileList | null) => {
    if (files && files.length > 0) {
      setData({ ...data, file: files[0].name });
      console.log("File selected")
      console.log(files[0]);
    }
  };

  return (
    <Dialog open={open} onClose={onClose}>
      <DialogTitle>Run Extractor</DialogTitle>
      <DialogContent>
        <FilePicker
          value={data.file ? [new File([], data.file)] : []}
          label="File"
          multiple={false}
          disabled={false}
          name="fileUpload"
          isRequired={true}
          onChange={handleFileSelection}
        />
        <TextField
          label="File"
          value={data.file}
          onChange={(e) => setData({ ...data, file: e.target.value })}
          fullWidth
        />
        <TextField
          label="Text"
          value={data.text}
          onChange={(e) => setData({ ...data, text: e.target.value })}
          fullWidth
        />
        <TextField
          label="URL"
          value={data.url}
          onChange={(e) => setData({ ...data, url: e.target.value })}
          fullWidth
        />
        <TextField
          label="LLM"
          value={data.llm}
          onChange={(e) => setData({ ...data, llm: e.target.value })}
          fullWidth
        />
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose}>Cancel</Button>
        <Button onClick={handleSave} color="primary">Save</Button>
      </DialogActions>
    </Dialog>
  );
};

export { SkillsExtractModal };

export default SkillsModal;
