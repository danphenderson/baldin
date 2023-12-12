import React, { useState, useContext, useEffect } from 'react';
import { CircularProgress, Stack, IconButton, Typography, Dialog, DialogTitle, DialogContent, TextField, DialogActions, Button, Snackbar } from '@mui/material';
import EditIcon from '@mui/icons-material/Edit';
import { UserContext } from '../context/user-context';
import { getUser, updateUser, UserUpdate } from '../services/user'; // Import service functions

const UserProfile = () => {
    const { user, token, setUser } = useContext(UserContext);
    const [open, setOpen] = useState(false);
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState('');
    const [message, setMessage] = useState('');
    // Initialize userDetails with the user object or an empty object cast to UserUpdate
    const [userDetails, setUserDetails] = useState<UserUpdate>(user || {} as UserUpdate);


    const handleClickOpen = () => {
        setOpen(true);
    };

    const handleClose = () => {
        setOpen(false);
        setError('');
    };

    useEffect(() => {
        const fetchUserData = async () => {
            setIsLoading(true);
            const fetchedUser = await getUser(token || '');
            if (fetchedUser) {
                setUserDetails(fetchedUser);
            } else {
                setError('Failed to fetch user data');
            }
            setIsLoading(false);
        };

        if (token && !user) {
            fetchUserData();
        }
    }, [token]);

    const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const { name, value } = e.target;
        setUserDetails(prevState => ({
            ...prevState,
            [name]: value
        }));
    };

    const handleSubmit = async (e: React.MouseEvent<HTMLButtonElement>) => {
        e.preventDefault();
        setOpen(false);
        console.log(userDetails);
        const updatedUser = await updateUser(token || '', userDetails);
        if (updatedUser) {
            setUser(updatedUser);
            setMessage('Profile updated successfully');
        } else {
            setMessage('There was an error updating the profile');
        }
    };

    return (
        <Stack spacing={2} alignItems="center">
            <IconButton onClick={handleClickOpen}>
                <EditIcon />
            </IconButton>
            {isLoading ? (
                <CircularProgress />
            ) : (
                Object.entries(userDetails).map(([key, value]) => (
                    <Typography key={key}>{`${key}: ${value}`}</Typography>
                ))
            )}

            <Dialog open={open} onClose={handleClose}>
                <DialogTitle>Edit User Information</DialogTitle>
                <DialogContent>
                  {Object.keys(userDetails).map(key => {
                      const value = userDetails[key as keyof UserUpdate] || ''; // Safely access the value
                      return (
                          <TextField
                              key={key}
                              margin="dense"
                              label={key.replace(/_/g, ' ')}
                              type="text"
                              fullWidth
                              variant="outlined"
                              name={key}
                              value={value} // Use the safely accessed value
                              onChange={handleChange}
                          />
                      );
                  })}
                </DialogContent>
                <DialogActions>
                    <Button onClick={handleClose}>Cancel</Button>
                    <Button onClick={handleSubmit}>Save</Button>
                </DialogActions>
            </Dialog>

            {message && (
                <Snackbar
                    open={!!message}
                    autoHideDuration={6000}
                    onClose={() => setMessage('')}
                    message={message}
                />
            )}

            {error && (
                <Typography color="error">{error}</Typography>
            )}
        </Stack>
    );
};

export default UserProfile;
