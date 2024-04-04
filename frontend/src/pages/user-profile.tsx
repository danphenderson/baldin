import React, { useState, useContext, useEffect } from 'react';
import { CircularProgress, Stack, IconButton, Typography, Dialog, DialogTitle, DialogContent, TextField, DialogActions, Button, Snackbar, Card, CardContent, Avatar, Grid } from '@mui/material';
import EditIcon from '@mui/icons-material/Edit';
import { UserContext } from '../context/user-context';
import { getUser, getUserProfile, updateUser, UserUpdate } from '../services/user';
import { getExperience, getExperiences, ExperienceRead } from '../services/experiences';
import { getSkill, getSkills, SkillRead, createSkill, updateSkill } from '../services/skills';
import { getEducation, getEducations, EducationRead } from '../services/education';
import { getCertificate, getCertificates, CertificateRead } from '../services/certificate';
import { DataGrid, GridColDef } from '@mui/x-data-grid';
import  SkillsModal from '../component/skills-modal';


const UserProfilePage = () => {
  const { user, token, setUser } = useContext(UserContext);
  const [open, setOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');

  // User Details State
  const [userDetails, setUserDetails] = useState<UserUpdate>(user || {} as UserUpdate);

  // User Skills State
  const [skillsModalOpen, setSkillsModalOpen] = useState(false);
  const [selectedSkill, setSelectedSkill] = useState<SkillRead | null>(null);
  const [skills, setSkills] = useState<SkillRead[]>([]);

  // User Experiences State
  const [experiences, setExperiences] = useState<ExperienceRead[]>([]);

  // User Education State
  const [educations, setEducations] = useState<EducationRead[]>([]);

  // User Certificates State
  const [certificates, setCertificates] = useState<CertificateRead[]>([]);

  const fetchUserData = async () => {
      if (!token) return;

      try {
          setIsLoading(true);
          setUserDetails(await getUser(token));
          setExperiences(await getExperiences(token));
          setSkills(await getSkills(token));
          setEducations(await getEducations(token));
          setCertificates(await getCertificates(token));
      } catch (error) {
          setError('Failed to fetch user data');
      } finally {
          setIsLoading(false);
      }
  };

  useEffect(() => {
      if (token && !user) {
          fetchUserData();
      }
  }, [token, user]);

  const handleOpenSkillsModal = (skill?: SkillRead) => {
    setSelectedSkill(skill || null);
    setSkillsModalOpen(true);
  };


  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
      const { name, value } = e.target;
      setUserDetails(prevState => ({
          ...prevState,
          [name]: value
      }));
  };

  const handleSaveSkill = async (skillData: SkillRead) => {
    if (!token) return;

    try {
        if (selectedSkill) {
            await updateSkill(token, selectedSkill.id, skillData);
        } else {
            await createSkill(token, skillData);
        }
        setSkillsModalOpen(false);
        fetchUserData();  // Refresh the list after saving
    } catch (error) {
        console.error('Failed to save skill data', error);
    }
  };

  const skillsColumns: GridColDef[] = [
    { field: 'name', headerName: 'Name', width: 150 },
    { field: 'category', headerName: 'Category', width: 150 },
    { field: 'subskills', headerName: 'Subskills', width: 200 },
    { field: 'yoe', headerName: 'Years of Experience', type: 'number', width: 180 },
    {
        field: 'actions',
        headerName: 'Actions',
        sortable: false,
        renderCell: (params) => (
            <Button color="primary" onClick={() => handleOpenSkillsModal(params.row)}>
                Edit
            </Button>
        ),
        width: 100,
    },
  ];

  const handleClose = () => {
      setOpen(false);
      setMessage('');
      setError('');
  };

  const handleSubmit = async (e: React.MouseEvent<HTMLButtonElement>) => {
      e.preventDefault();
      if (!token) {
          setError('Authorization token is missing');
          return;
      }

      try {
          setOpen(false);
          const updatedUser = await updateUser(token, userDetails);
          setUser(updatedUser);
          setMessage('Profile updated successfully');
      } catch (error) {
          setError('There was an error updating the profile');
      }
  };

  return (
    <Stack spacing={2} alignItems="center">
      <Stack spacing={2} alignItems="center">
        <Typography variant="h4">User Profile</Typography>
        {/* Other user details and edit logic */}

        <Typography variant="h6">Skills</Typography>
        <Button onClick={() => handleOpenSkillsModal()} variant="contained" color="primary">
            Add Skill
        </Button>
        <div style={{ height: 400, width: '100%' }}>
            <DataGrid
                rows={skills}
                columns={skillsColumns}
                pageSize={5}
                rowsPerPageOptions={[5]}
                onRowDoubleClick={(params) => handleOpenSkillsModal(params.row)}
            />
        </div>

        <SkillsModal
            open={skillsModalOpen}
            onClose={() => setSkillsModalOpen(false)}
            onSave={handleSaveSkill}
            initialData={selectedSkill}
        />

        {/* Snackbar and error handling components */}
      </Stack>
        <Typography variant="h4">User Profile</Typography>
        <IconButton onClick={() => setOpen(true)} size="large">
            <EditIcon />
        </IconButton>
        {isLoading ? <CircularProgress /> : (
            <>
                <Stack spacing={1}>
                    {Object.entries(userDetails).map(([key, value]) => {
                        if (!['id', 'is_active', 'is_superuser', 'is_verified'].includes(key)) {
                            return <Typography variant="body1" key={key}>{`${key}: ${value}`}</Typography>;
                        }
                        return null;
                    })}
                </Stack>
            </>
        )}
        <Dialog open={open} onClose={handleClose} fullWidth>
            <DialogTitle>Edit User Information</DialogTitle>
            <DialogContent>
                <Grid container spacing={2}>
                    {Object.keys(userDetails).map(key => {
                        const value = userDetails[key as keyof UserUpdate] || '';
                        return (
                            <Grid item xs={12} key={key}>
                                <TextField
                                    margin="dense"
                                    label={key.replace(/_/g, ' ')}
                                    type="text"
                                    fullWidth
                                    variant="outlined"
                                    name={key}
                                    value={value}
                                    onChange={handleChange}
                                />
                            </Grid>
                        );
                    })}
                </Grid>
            </DialogContent>
            <DialogActions>
                <Button onClick={handleClose}>Cancel</Button>
                <Button onClick={handleSubmit}>Save</Button>
            </DialogActions>
        </Dialog>

        {/* Snackbar component remains the same */}

        {error && <Typography color="error">{error}</Typography>}
    </Stack>
  );
};

export default UserProfilePage;
