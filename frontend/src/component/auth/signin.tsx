import React, { useState, useContext } from "react";
import { Grid, Box, Typography, Container, TextField, Button } from '@mui/material';
import { useNavigate } from "react-router-dom";

import { login } from "../../service/auth";
import ErrorMessage from "../common/error-message";
import { UserContext } from "../../context/user-context";

const SignIn: React.FC = () => {
  const [email, setEmail] = useState<string>("");
  const [password, setPassword] = useState<string>("");
  const [errorMessage, setErrorMessage] = useState<string>("");
  const { setToken } = useContext(UserContext);
  const navigate = useNavigate();

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    try {
      const accessToken = await login(email, password);
      setToken(accessToken);
      navigate('/'); // Navigate to home after successful login
    } catch (error) {
      if (error instanceof Error) {
        setErrorMessage(error.message || "Login request failed");
      }
    }
  };

  return (
    <Container component="main" maxWidth="xs">
      <Box sx={{ marginTop: 8, display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
        <Typography component="h1" variant="h5">Login</Typography>
        <Box component="form" onSubmit={handleSubmit} sx={{ mt: 3 }}>
          <Grid container spacing={2}>
            <Grid item xs={12}>
              <TextField
                required
                fullWidth
                id="login_email"
                label="Email Address"
                name="email"
                autoComplete="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
              />
            </Grid>
            <Grid item xs={12}>
              <TextField
                required
                fullWidth
                name="password"
                label="Password"
                type="password"
                id="login_password"
                autoComplete="new-password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
              />
            </Grid>
          </Grid>
          <Button type="submit" fullWidth variant="contained" sx={{ mt: 3, mb: 2 }}>
            Sign In
          </Button>
          <ErrorMessage message={errorMessage} />
        </Box>
        <Button href="/register" variant="text">{"Don't have an account? Sign Up"}</Button>
      </Box>
    </Container>
  );
};

export default SignIn;
