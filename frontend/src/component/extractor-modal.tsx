import React, { useState, useEffect } from 'react';
import { TextField, Button, CircularProgress } from '@mui/material';
import { ExtractorRun, ExtractorCreate, ExtractorRead, ExtractorExampleRead, ExtractorExmpleCreate, ExtractorResponse, ExtractorUpdate, runExtractor, createExtractor, createExtractorExample, getExtractorExamples, deleteExtractorExample} from '../service/extractor';
import  FilePicker  from '../component/common/file-picker';
import { useContext } from 'react';
import { UserContext } from '../context/user-context';
import { UploadFileOutlined as UploadFileIcon } from '@mui/icons-material';
import {
  SurfaceDialog as Dialog,
  SurfaceDialogActions as DialogActions,
  SurfaceDialogContent as DialogContent,
  SurfaceDialogTitle as DialogTitle,
  ReadonlyField,
} from '../design-system';

interface ExtractRunModalProps {
  open: boolean;
  onSave: (data: ExtractorResponse) => void;
  onError: (message: string) => void;
  initialData?: ExtractorRun;
  extractorId: string;
  onClose: () => void;
}

interface ExtractorCreateModalProps {
  open: boolean;
  onSave: (data: ExtractorRead) => void;
  onError: (message: string) => void;
  onClose: () => void;
}

interface ExampleCreateModalProps {
  extractorId: string;
  open: boolean;
  onSave: (data: ExtractorExampleRead) => void;
  onError: (message: string) => void;
  onClose: () => void;
}

export const ExtractRunModal: React.FC<ExtractRunModalProps> = ({ open, onClose, onSave, onError, initialData, extractorId }) => {
  const defaultData: ExtractorRun = {
    mode: 'entire_document',
    text: null,
    url: null,
    llm: '',
  };
  const [data, setData] = useState<ExtractorRun>({ ...defaultData, ...initialData});
  const [saving, setSaving] = useState(false);
  const { token } = useContext(UserContext);

  useEffect(() => {
    setData({ ...defaultData, ...initialData });
  }, [initialData]);

  useEffect(() => {
    if (open) {
      setData({ ...defaultData, ...initialData });
      setSaving(false);
    }
  }, [open]);

  const handleSave = async () => {
    setSaving(true);
    try {
      const result = await runExtractor(token || '', extractorId, data as ExtractorRun);
      onSave(result);
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Failed to run extractor';
      onError(message);
    } finally {
      setSaving(false);
    }
  };

  const handleFileSelection = (files: FileList | null) => {
    if (files && files.length > 0) {
      setData({ ...data, file: files[0]});
      console.log("File selected")
      console.log(files[0]);
    }
  };

  return (
    <Dialog open={open} onClose={onClose}>
      <DialogTitle icon={<UploadFileIcon />} subtitle="Upload a file or supply raw text for extraction.">
        Run Extractor
      </DialogTitle>
      <DialogContent>
        <FilePicker
          value={data.file ? [data.file] : []}
          label="File"
          multiple={false}
          disabled={false}
          name="fileUpload"
          isRequired={true}
          onChange={handleFileSelection}
        />
        <ReadonlyField
          label="Selected file"
          value={data.file?.name ?? ''}
          fullWidth
        />
        <TextField
          label="Text"
          value={data.text ?? ''}
          onChange={(e) => setData({ ...data, text: e.target.value })}
          fullWidth
        />
        <TextField
          label="URL"
          value={data.url ?? ''}
          onChange={(e) => setData({ ...data, url: e.target.value })}
          fullWidth
        />
        <TextField
          label="LLM"
          value={data.llm ?? ''}
          onChange={(e) => setData({ ...data, llm: e.target.value })}
          fullWidth
        />
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose} disabled={saving}>Cancel</Button>
        <Button onClick={handleSave} disabled={saving}>
          {saving ? <CircularProgress size={20} /> : 'Run'}
        </Button>
      </DialogActions>
    </Dialog>
  );
};

export const ExtractorCreateModal: React.FC<ExtractorCreateModalProps> = ({ open, onClose, onSave, onError }) => {
  { /* Add support for suggesting extractors */}
  const defaultData: ExtractorCreate = {
    name: '',
    description: '',
    instruction: '',
    json_schema: {},
  };
  const [data, setData] = useState<ExtractorCreate>(defaultData);
  const [saving, setSaving] = useState(false);
  const { token } = useContext(UserContext);

  useEffect(() => {
    if (open) {
      setData(defaultData);
      setSaving(false);
    }
  }, [open]);

  const handleSave = async () => {
    setSaving(true);
    try {
      const result = await createExtractor(token || '', data);
      onSave(result);
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Failed to create extractor';
      onError(message);
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open={open} onClose={onClose}>
      <DialogTitle subtitle="Define the extractor name, instructions, and schema.">
        Create Extractor
      </DialogTitle>
      <DialogContent>
        <TextField
          label="Name"
          value={data.name}
          onChange={(e) => setData({ ...data, name: e.target.value })}
          fullWidth
        />
        <TextField
          label="Description"
          value={data.description}
          onChange={(e) => setData({ ...data, description: e.target.value })}
          fullWidth
        />
        <TextField
          label="Instruction"
          value={data.instruction}
          onChange={(e) => setData({ ...data, instruction: e.target.value })}
          fullWidth
        />
        <TextField
          label="JSON Schema"
          value={JSON.stringify(data.json_schema)}
          onChange={(e) => setData({ ...data, json_schema: JSON.parse(e.target.value) })}
          fullWidth
        />
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose} disabled={saving}>Cancel</Button>
        <Button onClick={handleSave} disabled={saving}>
          {saving ? <CircularProgress size={20} /> : 'Create'}
        </Button>
      </DialogActions>
    </Dialog>
  );
};


export const ExampleCreateModal: React.FC<ExampleCreateModalProps> = ({ open, extractorId, onClose, onSave, onError }) => {
  const defaultData: ExtractorExmpleCreate = {
    content: '', output: ''
  };
  const [data, setData] = useState<ExtractorExmpleCreate>(defaultData);
  const [saving, setSaving] = useState(false);
  const { token } = useContext(UserContext);

  useEffect(() => {
    if (open) {
      setData(defaultData);
      setSaving(false);
    }
  }, [open]);

  const handleSave = async () => {
    setSaving(true);
    try {
      const result = await createExtractorExample(token || '', extractorId, data);
      onSave(result);
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Failed to create example';
      onError(message);
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open={open} onClose={onClose}>
      <DialogTitle>Add Examples</DialogTitle>
      <DialogContent>
        <TextField
          label="Example Input"
          value={data.content}
          onChange={(e) => setData({ ...data, content: e.target.value })}
          fullWidth
        />
        <TextField
          label="Expected Output"
          value={data.output}
          onChange={(e) => setData({ ...data, output: e.target.value })}
          fullWidth
        />
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose} disabled={saving}>Cancel</Button>
        <Button onClick={handleSave} disabled={saving}>
          {saving ? <CircularProgress size={20} /> : 'Create'}
        </Button>
      </DialogActions>
    </Dialog>
  );
}


export default ExtractRunModal;
