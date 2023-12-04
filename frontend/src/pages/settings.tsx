import React, { useState, useContext, useEffect } from 'react';
import { Stack, IconButton, Typography, Dialog, DialogTitle, DialogContent, TextField, DialogActions, Button } from '@mui/material';
import EditIcon from '@mui/icons-material/Edit';
import { UserContext } from '../context/user-context';

type UserDetailsType = {
    first_name: string;
    last_name: string;
    phone_number: string;
    address_line_1: string;
    address_line_2: string;
    city: string;
    state: string;
    zip_code: string;
    country: string;
};

const Settings = () => {
    const [token] = useContext(UserContext);
    const [open, setOpen] = useState(false);
    const [userDetails, setUserDetails] = useState<UserDetailsType>({
        first_name: '',
        last_name: '',
        phone_number: '',
        address_line_1: '',
        address_line_2: '',
        city: '',
        state: '',
        zip_code: '',
        country: ''
      });
      const [message, setMessage] = useState('');

    const handleClickOpen = () => {
        setOpen(true);
    };

    const handleClose = () => {
        setOpen(false);
    };

    useEffect(() => {
        const fetchUserData = async () => {
          if (!token) {
            console.error('No authentication token found');
            return;
          }

          try {
            const response = await fetch('/users/me', {
              headers: {
                'Authorization': `Bearer ${token}`,
              },
            });

            if (!response.ok) {
              throw new Error(`HTTP error! status: ${response.status}`);
            }

            const data = await response.json();
            setUserDetails(data);
          } catch (error) {
            console.error('Error fetching user data', error);
          }
        };

        fetchUserData();
      }, [token]);

      const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const { name, value } = e.target;
        setUserDetails(prevState => ({
          ...prevState,
          [name]: value
        }));
      };

      const handleSubmit = async (e: React.MouseEvent<HTMLButtonElement>) => {
        setOpen(false);
        e.preventDefault();
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
            {Object.entries(userDetails).map(([key, value]) => (
                <Typography key={key}>{`${key}: ${value}`}</Typography>
            ))}

            <Dialog open={open} onClose={handleClose}>
                <DialogTitle>Edit User Information</DialogTitle>
                <DialogContent>{Object.keys(userDetails).map(key => (
                        <TextField
                            key={key}
                            margin="dense"
                            label={key.replace(/_/g, ' ')}
                            type="text"
                            fullWidth
                            variant="outlined"
                            name={key}
                            value={userDetails[key as keyof UserDetailsType]}
                            onChange={handleChange}
                        />
                    ))}
                </DialogContent>
                <DialogActions>
                    <Button onClick={handleClose}>Cancel</Button>
                    <Button onClick={handleSubmit}>Save</Button>
                </DialogActions>
            </Dialog>
        </Stack>
    );
};

export default Settings;
