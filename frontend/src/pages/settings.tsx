import React, { useState, useContext } from 'react';
import { Box, TextField, Button, Grid, Stack, Typography } from '@mui/material';
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
    password: string;
    email: string;
  };

const UserSettings: React.FC = () => {
  const [token] = useContext(UserContext);
  const [userDetails, setUserDetails] = useState({
    first_name: '',
    last_name: '',
    phone_number: '',
    address_line_1: '',
    address_line_2: '',
    city: '',
    state: '',
    zip_code: '',
    country: '',
    password: '',
    email: '',
  });

  // Ensure that the 'key' is a valid key of UserDetailsType
  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    if (name in userDetails) {
      setUserDetails(prevState => ({
        ...prevState,
        [name]: value
      }));
    }
  };
  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!token) {
      console.error('No authentication token found');
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

      console.log('Profile updated successfully');
    } catch (error) {
      console.error('There was an error updating the profile', error);
    }
  };

  return (
    <Box sx={{ p: 2, maxWidth: 600, margin: 'auto' }}>
      <Typography variant="h6" gutterBottom>
        User Settings
      </Typography>
      <form onSubmit={handleSubmit}>
        <Stack spacing={2}>
          <Grid container spacing={2}>
              {Object.keys(userDetails).map((key) => (
                <Grid item xs={12} sm={6} key={key}>
                  <TextField
                    required
                    fullWidth
                    id={key}
                    label={key.replace(/_/g, ' ')}
                    name={key}
                    value={(userDetails as UserDetailsType)[key as keyof UserDetailsType]}
                    onChange={handleInputChange}
                  />
            </Grid>
          ))}
          </Grid>
          <Button
            type="submit"
            fullWidth
            variant="contained"
          >
            Save Changes
          </Button>
        </Stack>
      </form>
    </Box>
  );
};

export default UserSettings;
