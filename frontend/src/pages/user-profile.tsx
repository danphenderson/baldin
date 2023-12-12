import React, { useState, useContext, useEffect } from 'react';
import { CircularProgress, Stack, IconButton, Typography, Dialog, DialogTitle, DialogContent, TextField, DialogActions, Button, Snackbar, Card, CardContent, Avatar, Grid } from '@mui/material';
import EditIcon from '@mui/icons-material/Edit';
import { UserContext } from '../context/user-context';
import { getUser, updateUser, UserUpdate } from '../services/user';


const UserProfilePage = () => {
    const { user, token, setUser } = useContext(UserContext);
    const [open, setOpen] = useState(false);
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState('');
    const [message, setMessage] = useState('');
    const [userDetails, setUserDetails] = useState<UserUpdate>(user || {} as UserUpdate);

    const fetchUserData = async () => {
        if (!token) return;

        try {
            setIsLoading(true);
            const fetchedUser = await getUser(token);
            setUserDetails(fetchedUser);
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

    const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const { name, value } = e.target;
        setUserDetails(prevState => ({
            ...prevState,
            [name]: value
        }));
    };

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
      <Card sx={{ minWidth: 275, maxWidth: 500, width: '100%', m: 2 }}>
          <CardContent>
              <Stack spacing={2} alignItems="center">
                  <Typography variant="h4"> User Profile </Typography>
                  <IconButton onClick={() => setOpen(true)} size="large">
                      <EditIcon />
                  </IconButton>
                  {isLoading ? <CircularProgress /> : Object.entries(userDetails).map(([key, value]) => {
                      if (!['id', 'is_active', 'is_superuser', 'is_verified'].includes(key)) {
                          return <Typography variant="body1" key={key}>{`${key}: ${value}`}</Typography>;
                      }
                      return null;
                  })}
              </Stack>
          </CardContent>
      </Card>

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
