import React, { useState } from "react";
import Grid from '@mui/material/Grid';
import Box from '@mui/material/Box';
import Typography from '@mui/material/Typography';
import Container from '@mui/material/Container';
import ErrorMessage from "../common/error-message";
import TextField from '@mui/material/TextField';
import Button from '@mui/material/Button';
import { useNavigate } from "react-router-dom";
import { components } from '../../schema.d';

const SignUp: React.FC = () => {
    const [email, setEmail] = useState<string>("");
    const [password, setPassword] = useState<string>("");
    const [confirmationPassword, setConfirmationPassword] = useState<string>("");
    const [first_name, setFirstName] = useState<string>("");
    const [last_name, setLastName] = useState<string>("");
    const [phone_number, setPhoneNumber] = useState<string>("");
    const [address_line_1, setAddressLine1] = useState<string>("");
    const [address_line_2, setAddressLine2] = useState<string>("");
    const [city, setCity] = useState<string>("");
    const [zip_code, setZipCode] = useState<string>("");
    const [state, setState] = useState<string>("");
    const [country, setCountry] = useState<string>("");
    const [errorMessage, setErrorMessage] = useState<string>("");
    const navigate = useNavigate();

    const submitRegistration = async () => {
      if (password !== confirmationPassword) {
        setErrorMessage("Passwords do not match.");
        return;
      }

      const user: components['schemas']['UserCreate'] = {
        email,
        password,
        first_name,
        last_name,
        phone_number,
        address_line_1,
        address_line_2,
        city,
        zip_code,
        state,
        country,
        // Add other fields as required by your UserCreate schema
        // is_active, is_superuser, is_verified, etc.
      };

      try {
        const response = await fetch("/auth/register", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(user),
        });

        if (!response.ok) {
          const data = await response.json();
          setErrorMessage(data.detail || "Registration failed");
          return;
        }

        navigate('/login'); // Navigate to login after successful registration
      } catch (error) {
        setErrorMessage("Registration request failed");
      }
    };

    const handleSubmit = (e: React.FormEvent<HTMLFormElement>) => {
      e.preventDefault();
      submitRegistration();
    };

    return (
        <Container component="main" maxWidth="xs">
            <Box
                sx={{
                    marginTop: 8,
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'center',
                }}
            >
                <Typography component="h1" variant="h5">
                    Sign Up
                </Typography>
                <Box component="form" noValidate onSubmit={handleSubmit} sx={{ mt: 3 }}>
                    <Grid container spacing={2}>
                        <Grid item xs={12}>
                            <TextField
                                required
                                fullWidth
                                id="email"
                                label="Email Address"
                                name="email"
                                autoComplete="email"
                                value={email}
                                onChange={(e) => setEmail(e.target.value)}
                                placeholder="Enter email"
                            />
                        </Grid>
                        <Grid item xs={12}>
                            <TextField
                                required
                                fullWidth
                                id="first_name"
                                label="First Name"
                                name="name"
                                autoComplete="first_name"
                                value={first_name}
                                onChange={(e) => setFirstName(e.target.value)}
                                placeholder="Enter first name"
                            />
                        </Grid>
                        <Grid item xs={12}>
                            <TextField
                                required
                                fullWidth
                                id="last_name"
                                label="Last Name"
                                name="last_name"
                                autoComplete="first_name"
                                value={last_name}
                                onChange={(e) => setLastName(e.target.value)}
                                placeholder="Enter last name"
                            />
                        </Grid>
                        <Grid item xs={12}>
                            <TextField
                                required
                                fullWidth
                                id="phone_number"
                                label="Phone Number"
                                name="phone_number"
                                type="tel"
                                autoComplete="tel"
                                value={phone_number}
                                onChange={(e) => setPhoneNumber(e.target.value)}
                                placeholder="Enter phone number"
                            />
                        </Grid>
                        <Grid item xs={12}>
                          <TextField
                            required
                            fullWidth
                            id="address_line_1"
                            label="Address Line 1"
                            name="address_line_1"
                            type="text"
                            autoComplete="address-line1"
                            value={address_line_1}
                            onChange={(e) => setAddressLine1(e.target.value)}
                            placeholder="Enter address line 1"
                          />
                        </Grid>
                        <Grid item xs={12}>
                          <TextField
                            fullWidth
                            id="address_line_2"
                            label="Address Line 2"
                            name="address_line_2"
                            type="text"
                            autoComplete="address-line2"
                            value={address_line_2}
                            onChange={(e) => setAddressLine2(e.target.value)}
                            placeholder="Enter address line 2"
                          />
                        </Grid>
                        <Grid item xs={12}>
                          <TextField
                            required
                            fullWidth
                            id="city"
                            label="City"
                            name="city"
                            type="text"
                            autoComplete="city"
                            value={city}
                            onChange={(e) => setCity(e.target.value)}
                            placeholder="Enter city"
                          />
                        </Grid>
                        <Grid item xs={12}>
                          <TextField
                            required
                            fullWidth
                            id="state"
                            label="State"
                            name="state"
                            type="text"
                            autoComplete="state"
                            value={state}
                            onChange={(e) => setState(e.target.value)}
                            placeholder="Enter state"
                          />
                        </Grid>
                        <Grid item xs={12}>
                          <TextField
                            required
                            fullWidth
                            id="zip_code"
                            label="Zip Code"
                            name="zip_code"
                            type="text"
                            autoComplete="zip-code"
                            value={zip_code}
                            onChange={(e) => setZipCode(e.target.value)}
                            placeholder="Enter zip code"
                          />
                        </Grid>
                        <Grid item xs={12}>
                          <TextField
                            required
                            fullWidth
                            id="country"
                            label="Country"
                            name="country"
                            type="text"
                            autoComplete="country"
                            value={country}
                            onChange={(e) => setCountry(e.target.value)}
                            placeholder="Enter country"
                          />
                        </Grid>
                        <Grid item xs={12}>
                            <TextField
                                required
                                fullWidth
                                name="password"
                                label="Password"
                                type="password"
                                id="password"
                                autoComplete="new-password"
                                value={password}
                                onChange={(e) => setPassword(e.target.value)}
                                placeholder="Enter password"
                            />
                        </Grid>
                        <Grid item xs={12}>
                            <TextField
                                required
                                fullWidth
                                name="confirm-password"
                                label="Confirm Password"
                                type="password"
                                id="confirmation-password"
                                autoComplete="new-password"
                                value={confirmationPassword}
                                onChange={(e) => setConfirmationPassword(e.target.value)}
                                placeholder="Confirm password"
                            />
                        </Grid>
                    </Grid>
                    <Button
                        type="submit"
                        fullWidth
                        variant="contained"
                        sx={{ mt: 3, mb: 2 }}
                    >
                        Sign Up
                    </Button>
                    <ErrorMessage message={errorMessage} />
                </Box>
                <Button href={`/login`} variant="text">{"Already Have An Account? Sign In."}</Button>
            </Box>
        </Container>
    );
};

export default SignUp;
