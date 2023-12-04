import React, { useState } from 'react';
import { Box, Button, Dialog, DialogActions, DialogContent, DialogTitle, TextField, Paper, Typography } from '@mui/material';

interface CoverLetterTemplate {
  id: string;
  content: string;
}

const ApplicationsPage: React.FC = () => {
  const [templates, setTemplates] = useState<CoverLetterTemplate[]>([]);
  const [editingTemplate, setEditingTemplate] = useState<CoverLetterTemplate | null>(null);
  const [dialogOpen, setDialogOpen] = useState(false);

  const handleDialogOpen = (template?: CoverLetterTemplate) => {
    setEditingTemplate(template || { id: '', content: '' });
    setDialogOpen(true);
  };

  const handleDialogClose = () => {
    setDialogOpen(false);
    setEditingTemplate(null);
  };

  const handleSave = () => {
    if (editingTemplate) {
      // Logic to save or update the template
      // Add or update the template in the `templates` array
      handleDialogClose();
    }
  };

  return (
    <Box sx={{ p: 2 }}>
      <Button variant="contained" onClick={() => handleDialogOpen()}>
        Create New Template
      </Button>
      {templates.map((template) => (
        <Paper key={template.id} sx={{ p: 2, my: 2 }}>
          <Typography variant="h6">Template Preview:</Typography>
          <Typography variant="body1">{template.content}</Typography>
          <Button onClick={() => handleDialogOpen(template)}>Edit</Button>
          {/* Add Delete Button Logic */}
        </Paper>
      ))}

      <Dialog open={dialogOpen} onClose={handleDialogClose}>
        <DialogTitle>{editingTemplate?.id ? 'Edit Template' : 'New Template'}</DialogTitle>
        <DialogContent>
          <TextField
            label="Cover Letter Content"
            fullWidth
            multiline
            rows={4}
            margin="dense"
            value={editingTemplate?.content || ''}
            onChange={(e) => setEditingTemplate({ ...editingTemplate || {id : '', content: ''}, content: e.target.value })}
          />
        </DialogContent>
        <DialogActions>
          <Button onClick={handleDialogClose}>Cancel</Button>
          <Button onClick={handleSave}>Save</Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default ApplicationsPage;
