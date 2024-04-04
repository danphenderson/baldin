import React, { useState, useContext, useEffect } from 'react';
import { CircularProgress, Stack, IconButton, Typography, Dialog, DialogTitle, DialogContent, TextField, DialogActions, Button, Snackbar, Card, CardContent, Avatar, Grid, Accordion, AccordionSummary, AccordionDetails, CardActions } from '@mui/material';
import EditIcon from '@mui/icons-material/Edit';
import ExpandMoreIcon from '@mui/icons-material/ExpandMore';
import { UserContext } from '../context/user-context';
import { getUser, getUserProfile, updateUser, UserUpdate } from '../services/user';
import { getExperience, getExperiences, createExperience, updateExperience, ExperienceRead, ExperienceCreate, ExperienceUpdate } from '../services/experiences';
import { getSkill, getSkills, createSkill, updateSkill, SkillRead, SkillCreate, SkillUpdate } from '../services/skills';
import { getEducation, getEducations, createEducation, updateEducation, EducationRead, EducationCreate, EducationUpdate } from '../services/education';
import { getCertificate, getCertificates, createCertificate, updateCertificate, CertificateRead, CertificateCreate, CertificateUpdate } from '../services/certificate';
import { getContact, getContacts, createContact, updateContact, ContactRead, ContactCreate, ContactUpdate } from '../services/contacts';
import { DataGrid, GridColDef } from '@mui/x-data-grid';
import SkillsModal from '../component/skills-modal';
import ExperiencesModal from '../component/experiences-modal';
import CertificateModal from '../component/certificate-modal';
import EducationModal from '../component/education-modal';
import ContactModal from '../component/contacts-modal';


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
  const [selectedSkill, setSelectedSkill] = useState<SkillRead | undefined>(undefined);
  const [skills, setSkills] = useState<SkillRead[]>([]);

  const handleOpenSkillsModal = (skill?: SkillRead) => {
    setSelectedSkill(skill);
    setSkillsModalOpen(true);
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
      const { name, value } = e.target;
      setUserDetails(prevState => ({
          ...prevState,
          [name]: value
      }));
  };
  // Ensure that skillData is of a type that includes `id` as a string
  const handleSaveSkill = async (skillData: SkillCreate | SkillUpdate) => {
    if (!token) return;

    try {
        if ('id' in skillData && typeof skillData.id === 'string') {
            // Now TypeScript knows skillData.id is a string
            await updateSkill(token, skillData.id, skillData);
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
    { field: 'category', headerName: 'Category', width: 250 },
    { field: 'subskills', headerName: 'Subskills', width: 300 },
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
  const [selectedExperience, setSelectedExperience] = useState<ExperienceRead | undefined>(undefined);

  const handleOpenExperienceModal = (experience?: ExperienceRead) => {
    setSelectedExperience(experience);
    setExperienceModalOpen(true);
  }

  const handleSaveExperience = async (experienceData: ExperienceCreate | ExperienceUpdate) => {
    if (!token) return;

    try {
        // Check if experienceData has an id to determine if it's an update or create operation
        if ('id' in experienceData && typeof experienceData.id === 'string') {
            await updateExperience(token, experienceData.id, experienceData);
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
    { field: 'title', headerName: 'Title', width: 150},
    { field: 'company', headerName: 'Company', width: 150 },
    { field: 'position', headerName: 'Position', width: 150 },
    { field: 'start_date', headerName: 'Start Date', width: 150 },
    { field: 'end_date', headerName: 'End Date', width: 150 },
    { field: 'description', headerName: 'Description', width: 200 },
    { field: 'location', headerName: 'Location', width: 150},
    { field: 'projects', headerName: 'Projects', width: 200},
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
  const [selectedEducation, setSelectedEducation] = useState<EducationRead | undefined>(undefined);

  const handleOpenEducationModal = (education?: EducationRead) => {
    setSelectedEducation(education);
    setEducationModalOpen(true);
  }
  const handleSaveEducation = async (educationData: EducationCreate | EducationUpdate) => {
    if (!token) return;
    try {
        // Check if educationData has an id to determine if it's an update or create operation
        if ('id' in educationData && typeof educationData.id === 'string') {
            await updateEducation(token, educationData.id, educationData);
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
    { field: 'university', headerName: 'Institution', width: 250 },
    { field: 'degree', headerName: 'Degree', width: 300 },
    { field: 'activities', headerName: 'Involvement', width: 300 },
    { field: 'start_date', headerName: 'Start Date', width: 150 },
    { field: 'end_date', headerName: 'End Date', width: 150 },
    { field: 'gradePoint', headerName: 'Grade Point', width: 50},
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
  const [selectedCertificate, setSelectedCertificate] = useState<CertificateRead | undefined>(undefined);

  const handleOpenCertificateModal = (certificate?: CertificateRead) => {
    setSelectedCertificate(certificate);
    setCertificateModalOpen(true);
  }

  const handleSaveCertificate = async (certificateData: CertificateCreate | CertificateUpdate) => {
    if (!token) return;

    try {
      if ('id' in certificateData && typeof certificateData.id === 'string') {
          await updateCertificate(token, certificateData.id, certificateData);
      }
      else {
          await createCertificate(token, certificateData);
      }
      setCertificateModalOpen(false);
      fetchUserData();  // Refresh the list after saving
    } catch (error) {
        console.error('Failed to save certificate data', error);
    }
  };

  const certificateColumns: GridColDef[] = [
    { field: 'title', headerName: 'Title', width: 250 },
    { field: 'organization', headerName: 'Organization', width: 250 },
    { field: 'date', headerName: 'Date', width: 150 },
    { field: 'description', headerName: 'Description', width: 300 },
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

  // Contacs State
  const [contacts, setContacts] = useState<ContactRead[]>([]);
  const [selectedContact, setSelectedContact] = useState<ContactRead | undefined>(undefined);
  const [contactModalOpen, setContactModalOpen] = useState(false);

  const handleOpenContactModal = (contact?: ContactRead) => {
    setSelectedContact(contact);
    setContactModalOpen(true);
  };

  const handleSaveContact = async (contactData: ContactCreate | ContactUpdate) => {
    if (!token) return;

    try {
      if ('id' in contactData && typeof contactData.id === 'string') {
          await updateContact(token, contactData.id, contactData);
      } else {
          await createContact(token, contactData);
      }
    } catch (error) {
        console.error('Failed to save contact data', error);
    };
  };

  const contactsColumns: GridColDef[] = [
    { field: 'first_name', headerName: 'First Name', width: 150 },
    { field: 'last_name', headerName: 'Last Name', width: 150 },
    { field: 'email', headerName: 'Email', width: 200 },
    { field: 'phone_number', headerName: 'Phone Number', width: 150 },
    { field: 'time_zone', headerName: 'Time Zone', width: 150 },
    {
        field: 'actions',
        headerName: 'Actions',
        sortable: false,
        renderCell: (params) => (
            <Button color="primary" onClick={() => handleOpenContactModal(params.row)}>
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
          setContacts(await getContacts(token));
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

  const UserDetails = ({ userDetails, isLoading, setOpen }: { userDetails: any, isLoading: boolean, setOpen: React.Dispatch<React.SetStateAction<boolean>> }) => {
    const formatKey = (key: string) => key.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase());

    const nameFields = ['first_name', 'last_name'];
    const addressFields = ['address_line_1', 'address_line_2', 'city', 'state', 'zip_code', 'country'];
    const contactFields = ['phone_number', 'email', 'time_zone'];

    return (
      <Card>
        <CardContent>
          <Grid container spacing={2} alignItems="center">
            {isLoading ? (
              <Grid item xs={12}>
                <CircularProgress />
              </Grid>
            ) : (
              <>
                <Grid item xs={4}>
                  {Object.entries(userDetails).map(([key, value]) => {
                    if (nameFields.includes(key)) {
                      return <Typography key={key}>{`${formatKey(key)}: ${value}`}</Typography>;
                    }
                    return null;
                  })}
                </Grid>
                <Grid item xs={4}>
                  {Object.entries(userDetails).map(([key, value]) => {
                    if (addressFields.includes(key)) {
                      return <Typography key={key}>{`${formatKey(key)}: ${value}`}</Typography>;
                    }
                    return null;
                  })}
                </Grid>
                <Grid item xs={4}>
                  {Object.entries(userDetails).map(([key, value]) => {
                    if (contactFields.includes(key)) {
                      return <Typography key={key}>{`${formatKey(key)}: ${value}`}</Typography>;
                    }
                    return null;
                  })}
                </Grid>
              </>
            )}
          </Grid>
        </CardContent>
        <CardActions>
          <IconButton onClick={() => setOpen(true)} size="small">
            <EditIcon />
            <Typography>Edit User Info</Typography>
          </IconButton>
        </CardActions>
      </Card>
    );
  };

  return (
    <Stack spacing={10}>
      {/* Header: Base User */}
      {userDetails && <UserDetails userDetails={userDetails} isLoading={isLoading} setOpen={setOpen} />}
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

      {/* Skills */}
      <div>
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

        {/* Experiences */}
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

        {/* Education */}
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

        {/* Certificates */}
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

        {/* Contacts */}
        <Accordion>
          <AccordionSummary expandIcon={<ExpandMoreIcon />} aria-controls="panel-contacts-content" id="panel-contacts-header">
              <Typography variant="h6">Contacts</Typography>
          </AccordionSummary>
          <AccordionDetails>
              <Button onClick={() => handleOpenContactModal()} variant="contained" color="primary">
                  Add Contact
              </Button>
              <div style={{ height: 400, width: '100%' }}>
                  <DataGrid
                    rows={contacts}
                    columns={contactsColumns}
                    onRowDoubleClick={(params) => handleOpenContactModal(params.row)}
                  />
              </div>
              <ContactModal
                open={contactModalOpen}
                onClose={() => setContactModalOpen(false)}
                onSave={handleSaveContact}
                initialData={selectedContact}
              />
          </AccordionDetails>
        </Accordion>
      </div>


      {/* Error Handeling */}
      {error && <Typography color="error">{error}</Typography>}
      {message && <Snackbar open={Boolean(message)} autoHideDuration={6000} message={message} />}
    </Stack>
  );
};

export default UserProfilePage;
