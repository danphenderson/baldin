import React from 'react';
import { Box, Button } from '@mui/material';
import CloudUploadIcon from '@mui/icons-material/CloudUpload';
import { styled } from '@mui/material/styles';

const Input = styled('input')({
  display: 'none',
});

interface FilePickerProps {
  value: File | File[]; // the file(s) selected
  label: string;
  multiple: boolean;
  disabled: boolean;
  name: string;
  isRequired: boolean;
  sx?: object; // optional sx prop for styling
  onChange: (files: FileList | null) => void; // callback when file is selected
}

const FilePicker: React.FC<FilePickerProps> = ({
  value,
  label,
  multiple = true,
  disabled = false,
  name,
  isRequired = false,
  sx,
  onChange
}) => {
  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    onChange(event.target.files);
  };

  return (
    <Box style={sx}>
      <label htmlFor={name}>
        <Input
          accept="*"
          id={name}
          name={name}
          multiple={multiple}
          type="file"
          disabled={disabled}
          required={isRequired}
          onChange={handleFileChange}
        />
        <Button variant="contained" component="span" startIcon={<CloudUploadIcon />} disabled={disabled}>
          {label}
        </Button>
      </label>
    </Box>
  );
};

export default FilePicker;
