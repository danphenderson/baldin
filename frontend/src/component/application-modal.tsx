// import React, { useState, useEffect } from 'react';
// import { Dialog, DialogTitle, DialogContent, TextField, DialogActions, Button } from '@mui/material';
// import { components } from '../schema.d';

// // Assuming the structure of ApplicationCreate and ApplicationUpdate are similar
// type ApplicationCreate = components['schemas']['ApplicationCreate'];
// type ApplicationUpdate = components['schemas']['ApplicationUpdate'];
// type ApplicationRead = components['schemas']['ApplicationRead'];

// interface ApplicationModalProps {
//   open: boolean;
//   onClose: () => void;
//   onSave: (applicationData: ApplicationRead) => Promise<void>;
//   initialData?: ApplicationRead;
// }

// const ApplicationModal: React.FC<ApplicationModalProps> = ({ open, onClose, onSave, initialData }) => {
//   const defaultApplicationData: ApplicationCreate = {
//     // Initialize with default values, assuming all fields are optional
//     cover_letter: '',
//     resume: '',
//     notes: '',
//     status: '',
//     lead_id: '', // Make sure to handle this appropriately based on your application logic
//   };

//   const [applicationData, setApplicationData] = useState<ApplicationCreate | ApplicationUpdate>(defaultApplicationData);
//   const [isEdited, setIsEdited] = useState(false);

//   useEffect(() => {
//     if (initialData) {
//       setApplicationData(initialData);
//       setIsEdited(true);
//     } else {
//       setApplicationData(defaultApplicationData);
//       setIsEdited(false);
//     }
//   }, [initialData, open]);

//   const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
//     const { name, value } = e.target;
//     setApplicationData({ ...applicationData, [name]: value });
//   };

//   const handleSave = () => {
//     onSave(applicationData);
//     onClose();
//     setApplicationData(defaultApplicationData);
//   };

//   return (
//     <Dialog open={open} onClose={onClose}>
//       <DialogTitle>{isEdited ? 'Edit Application' : 'New Application'}</DialogTitle>
//       <DialogContent>
//         {/* Render input fields based on the ApplicationCreate type */}
//         <TextField
//           name="cover_letter"
//           label="Cover Letter"
//           type="text"
//           fullWidth
//           multiline
//           value={applicationData.cover_letter}
//           onChange={handleChange}
//         />
//         <TextField
//           name="resume"
//           label="Resume"
//           type="text"
//           fullWidth
//           multiline
//           value={applicationData.resume}
//           onChange={handleChange}
//         />
//         <TextField
//           name="notes"
//           label="Notes"
//           type="text"
//           fullWidth
//           multiline
//           value={applicationData.notes}
//           onChange={handleChange}
//         />
//         <TextField
//           name="status"
//           label="Status"
//           type="text"
//           fullWidth
//           value={applicationData.status}
//           onChange={handleChange}
//         />
//         {/* If lead_id is something that the user should select, consider using a dropdown or an auto-complete field */}
//         {/* If lead_id is set automatically, you might not need to display it */}
//       </DialogContent>
//       <DialogActions>
//         <Button onClick={onClose}>Cancel</Button>
//         <Button onClick={handleSave} color="primary">Save</Button>
//       </DialogActions>
//     </Dialog>
//   );
// };

// export default ApplicationModal;
export {};
