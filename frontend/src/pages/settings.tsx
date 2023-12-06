import React, { useState, useContext, useEffect } from 'react';
import { CircularProgress, Stack, IconButton, Typography, Dialog, DialogTitle, DialogContent, TextField, DialogActions, Button, Snackbar } from '@mui/material';
import EditIcon from '@mui/icons-material/Edit';
import { UserContext } from '../context/user-context';
import { components } from '../schema.d';

type UserRead = components['schemas']['UserRead'];
type UserUpdate = components['schemas']['UserUpdate'];

const Settings = () => {
    const { user, token, setUser } = useContext(UserContext);
    const [open, setOpen] = useState(false);
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState('');
    const [message, setMessage] = useState('');
    const [userDetails, setUserDetails] = useState<UserUpdate>({
        // Initialize with user's current data or empty values
        // Replace these fields with actual ones from your UserUpdate type
        first_name: user?.first_name || '',
        last_name: user?.last_name || '',
        // ... other fields
    });

    const handleClickOpen = () => {
        setOpen(true);
    };

    const handleClose = () => {
        setOpen(false);
        setError('');
    };

    useEffect(() => {
        setIsLoading(true);
        const fetchUserData = async () => {
            if (!token) {
                console.error('No authentication token found');
                setIsLoading(false);
                return;
            }

            try {
                const response = await fetch('/users/me', {
                    headers: { 'Authorization': `Bearer ${token}` },
                });

                if (!response.ok) {
                    throw new Error(`HTTP error! status: ${response.status}`);
                }

                const data: UserRead = await response.json();
                setUserDetails(data); // Update with fetched data
            } catch (error) {
                console.error('Error fetching user data', error);
                setError('Failed to fetch user data');
            } finally {
                setIsLoading(false);
            }
        };

        fetchUserData();
    }, [token, user?.id]); // Re-fetch when token or user ID changes

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

        if (!token) {
            setMessage('No authentication token found');
            return;
        }

        try {
            const response = await fetch('/users/me', {
                method: 'PATCH',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`,
                },
                body: JSON.stringify(userDetails),
            });

            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }

            const updatedUserData: UserRead = await response.json();
            setUser(updatedUserData); // Update user context
            setMessage('Profile updated successfully');
        } catch (error) {
            setMessage('There was an error updating the profile');
            console.error('There was an error updating the profile', error);
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
                    {Object.keys(userDetails).map(key => (
                        <TextField
                            key={key}
                            margin="dense"
                            label={key.replace(/_/g, ' ')}
                            type="text"
                            fullWidth
                            variant="outlined"
                            name={key}
                            value={userDetails[key as keyof UserUpdate]}
                            onChange={handleChange}
                        />
                    ))}
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

export default Settings;
