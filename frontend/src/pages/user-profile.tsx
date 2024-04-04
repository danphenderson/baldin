import React, { useState, useContext, useEffect } from 'react';
import { CircularProgress, Stack, IconButton, Typography, Dialog, DialogTitle, DialogContent, TextField, DialogActions, Button, Snackbar, Card, CardContent, Avatar, Grid, Accordion, AccordionSummary, AccordionDetails } from '@mui/material';
import EditIcon from '@mui/icons-material/Edit';
import ExpandMoreIcon from '@mui/icons-material/ExpandMore';
import { UserContext } from '../context/user-context';
import { getUser, getUserProfile, updateUser, UserUpdate } from '../services/user';
import { getExperience, getExperiences, ExperienceRead, createExperience, updateExperience } from '../services/experiences';
import { getSkill, getSkills, SkillRead, createSkill, updateSkill } from '../services/skills';
import { getEducation, getEducations, createEducation, updateEducation, EducationRead } from '../services/education';
import { getCertificate, getCertificates, CertificateRead, createCertificate, updateCertificate } from '../services/certificate';
import { DataGrid, GridColDef } from '@mui/x-data-grid';
import SkillsModal from '../component/skills-modal';
import ExperiencesModal from '../component/experiences-modal';
import CertificateModal from '../component/certificate-modal';
import EducationModal from '../component/education-modal';


const UserProfilePage = () => {
  const { user, token, setUser } = useContext(UserContext);
  const [open, setOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');


  // User State
  const [userDetails, setUserDetails] = useState<UserUpdate>(user || {} as UserUpdate);


  // Skills State
  const [skillsModalOpen, setSkillsModalOpen] = useState(false);
  const [selectedSkill, setSelectedSkill] = useState<SkillRead | null>(null);
  const [skills, setSkills] = useState<SkillRead[]>([]);

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


  // Experiences State
  const [experienceModalOpen, setExperienceModalOpen] = useState(false);
  const [experiences, setExperiences] = useState<ExperienceRead[]>([]);
  const [selectedExperience, setSelectedExperience] = useState<ExperienceRead | null>(null);

  const handleOpenExperienceModal = (experience?: ExperienceRead) => {
    setSelectedExperience(experience || null);
    setExperienceModalOpen(true);
  }

  const handleSaveExperience = async (experienceData: ExperienceRead) => {
    if (!token) return;

    try {
        if (selectedExperience) {
            await updateExperience(token, selectedExperience.id, experienceData);
        } else {
            await createExperience(token, experienceData);
        }
        setExperienceModalOpen(false);
        fetchUserData();  // Refresh the list after saving
    } catch (error) {
        console.error('Failed to save experience data', error);
    }
  };

  const experienceColumns: GridColDef[] = [
    { field: 'company', headerName: 'Company', width: 150 },
    { field: 'position', headerName: 'Position', width: 150 },
    { field: 'start_date', headerName: 'Start Date', width: 150 },
    { field: 'end_date', headerName: 'End Date', width: 150 },
    { field: 'description', headerName: 'Description', width: 200 },
    {
        field: 'actions',
        headerName: 'Actions',
        sortable: false,
        renderCell: (params) => (
            <Button color="primary" onClick={() => handleOpenExperienceModal(params.row)}>
                Edit
            </Button>
        ),
        width: 100,
    },
  ];


  // Education State
  const [educationModalOpen, setEducationModalOpen] = useState(false);
  const [educations, setEducations] = useState<EducationRead[]>([]);
  const [selectedEducation, setSelectedEducation] = useState<EducationRead | null>(null);

  const handleOpenEducationModal = (education?: EducationRead) => {
    setSelectedEducation(education || null);
    setEducationModalOpen(true);
  }

  const handleSaveEducation = async (educationData: EducationRead) => {
    if (!token) return;

    try {
        if (selectedEducation) {
            await updateEducation(token, selectedEducation.id, educationData);
        } else {
            await createEducation(token, educationData);
        }
        setEducationModalOpen(false);
        fetchUserData();  // Refresh the list after saving
    } catch (error) {
        console.error('Failed to save education data', error);
    }
  };

  const educationColumns: GridColDef[] = [
    { field: 'institution', headerName: 'Institution', width: 150 },
    { field: 'degree', headerName: 'Degree', width: 150 },
    { field: 'field_of_study', headerName: 'Field of Study', width: 150 },
    { field: 'start_date', headerName: 'Start Date', width: 150 },
    { field: 'end_date', headerName: 'End Date', width: 150 },
    {
        field: 'actions',
        headerName: 'Actions',
        sortable: false,
        renderCell: (params) => (
            <Button color="primary" onClick={() => handleOpenEducationModal(params.row)}>
                Edit
            </Button>
        ),
        width: 100,
    },
  ];

  // Certificate State
  const [certificateModalOpen, setCertificateModalOpen] = useState(false);
  const [certificates, setCertificates] = useState<CertificateRead[]>([]);
  const [selectedCertificate, setSelectedCertificate] = useState<CertificateRead | null>(null);

  const handleOpenCertificateModal = (certificate?: CertificateRead) => {
    setSelectedCertificate(certificate || null);
    setCertificateModalOpen(true);
  }

  const handleSaveCertificate = async (certificateData: CertificateRead) => {
    if (!token) return;

    try {
        if (selectedCertificate) {
            await updateCertificate(token, selectedCertificate.id, certificateData);
        } else {
            await createCertificate(token, certificateData);
        }
        setCertificateModalOpen(false);
        fetchUserData();  // Refresh the list after saving
    } catch (error) {
        console.error('Failed to save certificate data', error);
    }
  };

  const certificateColumns: GridColDef[] = [
    { field: 'title', headerName: 'Title', width: 150 },
    { field: 'organization', headerName: 'Organization', width: 150 },
    { field: 'date', headerName: 'Date', width: 150 },
    { field: 'description', headerName: 'Description', width: 200 },
    {
        field: 'actions',
        headerName: 'Actions',
        sortable: false,
        renderCell: (params) => (
            <Button color="primary" onClick={() => handleOpenCertificateModal(params.row)}>
                Edit
            </Button>
        ),
        width: 100,
    },
  ];


  /// Load Data
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
      {/* Header: Base User */}
      <Typography variant="h1">Profile</Typography>
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

      {/* User Details */ }
      <Accordion>
          <AccordionSummary expandIcon={<ExpandMoreIcon />} aria-controls="panel-skills-content" id="panel-skills-header">
              <Typography variant="h6">Skills</Typography>
          </AccordionSummary>
          <AccordionDetails>
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
          </AccordionDetails>
      </Accordion>

      <Accordion>
          <AccordionSummary expandIcon={<ExpandMoreIcon />} aria-controls="panel-experiences-content" id="panel-experiences-header">
              <Typography variant="h6">Experiences</Typography>
          </AccordionSummary>
          <AccordionDetails>
              <Button onClick={() => handleOpenExperienceModal()} variant="contained" color="primary">
                  Add Experience
              </Button>
              <div style={{ height: 400, width: '100%' }}>
                  <DataGrid
                    rows={experiences}
                    columns={experienceColumns}
                    pageSize={5}
                    rowsPerPageOptions={[5]}
                    onRowDoubleClick={(params) => handleOpenExperienceModal(params.row)}
                  />
              </div>
              <ExperiencesModal
                open={experienceModalOpen}
                onClose={() => setExperienceModalOpen(false)}
                onSave={handleSaveExperience}
                initialData={selectedExperience}
              />
          </AccordionDetails>
      </Accordion>

      <Accordion>
          <AccordionSummary expandIcon={<ExpandMoreIcon />} aria-controls="panel-education-content" id="panel-education-header">
              <Typography variant="h6">Education</Typography>
          </AccordionSummary>
          <AccordionDetails>
              <Button onClick={() => handleOpenEducationModal()} variant="contained" color="primary">
                  Add Education
              </Button>
              <div style={{ height: 400, width: '100%' }}>
                  <DataGrid
                    rows={educations}
                    columns={educationColumns}
                    pageSize={5}
                    rowsPerPageOptions={[5]}
                    onRowDoubleClick={(params) => handleOpenEducationModal(params.row)}
                  />
              </div>
              <EducationModal
                open={educationModalOpen}
                onClose={() => setEducationModalOpen(false)}
                onSave={handleSaveEducation}
                initialData={selectedEducation}
              />
          </AccordionDetails>
      </Accordion>

      <Accordion>
          <AccordionSummary expandIcon={<ExpandMoreIcon />} aria-controls="panel-certificates-content" id="panel-certificates-header">
              <Typography variant="h6">Certificates</Typography>
          </AccordionSummary>
          <AccordionDetails>
              <Button onClick={() => handleOpenCertificateModal()} variant="contained" color="primary">
                  Add Certificate
              </Button>
              <div style={{ height: 400, width: '100%' }}>
                  <DataGrid
                    rows={certificates}
                    columns={certificateColumns}
                    pageSize={5}
                    rowsPerPageOptions={[5]}
                    onRowDoubleClick={(params) => handleOpenCertificateModal(params.row)}
                  />
              </div>
              <CertificateModal
                open={certificateModalOpen}
                onClose={() => setCertificateModalOpen(false)}
                onSave={handleSaveCertificate}
                initialData={selectedCertificate}
              />
          </AccordionDetails>
      </Accordion>

      {/* Error Handeling */}
      {error && <Typography color="error">{error}</Typography>}
      {message && <Snackbar open={Boolean(message)} autoHideDuration={6000} message={message} />}
    </Stack>
  );
};

export default UserProfilePage;
