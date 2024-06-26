import React, { useState, useEffect } from 'react';
import { Dialog, DialogTitle, DialogContent, TextField, DialogActions, Button } from '@mui/material';
import { ExtractorRun, ExtractorCreate, ExtractorExampleRead, ExtractorExmpleCreate, ExtractorResponse, ExtractorUpdate, runExtractor, createExtractor, createExtractorExample, getExtractorExamples, deleteExtractorExample} from '../service/extractor';  // Adjust import path as necessary
import  FilePicker  from '../component/common/file-picker';
import { useContext } from 'react';
import { UserContext } from '../context/user-context';

interface ExtractRunModalProps {
  open: boolean;
  onSave: (data: any) => void;
  initialData?: ExtractorRun;
  extractorId: string;
  onClose: () => void;
}

interface ExtractorCreateModalProps {
  open: boolean;
  onSave: (data: ExtractorCreate) => void;
  onClose: () => void;
}

interface ExampleCreateModalProps {
  extractorId: string;
  open: boolean;
  onSave: (data: ExtractorExmpleCreate) => void;
  onClose: () => void;
}

export const ExtractRunModal: React.FC<ExtractRunModalProps> = ({ open, onClose, onSave, initialData, extractorId }) => {
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
      const result = await runExtractor(token || '', extractorId, data as ExtractorRun);
      onSave(result);
    } catch (error) {
      console.error(error);
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
      <DialogTitle>Run Extractor</DialogTitle>
      <DialogContent>
        <FilePicker
          value={data.file ? [new File([], data.file.name)] : []}
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
          onChange={(e) => setData({ ...data, file: (e.target as HTMLInputElement).files?.[0] || null })}
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
        <Button onClick={handleSave}>Run</Button>
      </DialogActions>
    </Dialog>
  );
};

export const ExtractorCreateModal: React.FC<ExtractorCreateModalProps> = ({ open, onClose, onSave }) => {
  { /* Add support for suggesting extractors */}
  const defaultData: ExtractorCreate = {
    name: '',
    description: '',
    instruction: '',
    json_schema: {},
  };
  const [data, setData] = useState<ExtractorCreate>(defaultData);
  const { token } = useContext(UserContext);

  const handleSave = async () => {
    try {
      const result = await createExtractor(token || '', data);
      onSave(result);
    } catch (error) {
      console.error(error);
    }
  };

  return (
    <Dialog open={open} onClose={onClose}>
      <DialogTitle>Create Extractor</DialogTitle>
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
        <Button onClick={handleSave}>Create</Button>
      </DialogActions>
    </Dialog>
  );
}


export const ExampleCreateModal: React.FC<ExampleCreateModalProps> = ({ open, extractorId, onClose, onSave }) => {
  const defaultData: ExtractorExmpleCreate = {
    content: '', output: ''
  };
  const [data, setData] = useState<ExtractorExmpleCreate>(defaultData);
  const { token } = useContext(UserContext);

  const handleSave = async () => {
    try {
      const result = await createExtractorExample(token || '', extractorId, data);
      onSave(result);
      onClose();
    } catch (error) {
      console.error(error);
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
        <Button onClick={handleSave}>Create</Button>
      </DialogActions>
    </Dialog>
  );
}


export default ExtractRunModal;
