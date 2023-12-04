import React, { useState, useContext } from "react";
import Grid from '@mui/material/Grid';
import Box from '@mui/material/Box';
import Typography from '@mui/material/Typography';
import Container from '@mui/material/Container';
import ErrorMessage from "./error-message";
import { UserContext } from "../context/user-context";
import TextField from '@mui/material/TextField';
import Button from '@mui/material/Button';
import { useNavigate } from "react-router-dom";

const SignIn: React.FC = () => {
  const [email, setEmail] = useState<string>("");
  const [password, setPassword] = useState<string>("");
  const [errorMessage, setErrorMessage] = useState<string>("");
  const [, setToken] = useContext(UserContext);
  const navigate = useNavigate();

  const submitLogin = async () => {
    // Correctly encode the body for x-www-form-urlencoded
    const body = new URLSearchParams({
      username: email,
      password: password
    }).toString();

    const requestOptions = {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: body
    };

    try {
      const response = await fetch("/auth/jwt/login", requestOptions);
      const data = await response.json();

      if (!response.ok) {
        setErrorMessage(data.detail || "Login failed");
        return;
      }

      setToken(data.access_token);
      navigate('/'); // Navigate to home after successful login
    } catch (error) {
      setErrorMessage("Login request failed");
    }
  };

  const handleSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    submitLogin();
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
          Login
        </Typography>
        <Box component="form" noValidate onSubmit={handleSubmit} sx={{ mt: 3 }}>
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
                placeholder="Enter email"
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
                placeholder="Enter password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
              />
            </Grid>
          </Grid>
          <Button
            type="submit"
            fullWidth
            variant="contained"
            sx={{ mt: 3, mb: 2 }}
          >
            Sign In
          </Button>
          <ErrorMessage message={errorMessage} />
        </Box>
        <Button href={`/register`} variant="text">{"Don't have an account? Sign Up"}</Button>
      </Box>
    </Container>
  );
};

export default SignIn;
