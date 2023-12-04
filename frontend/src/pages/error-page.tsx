import React from "react";
import { useRouteError } from "react-router-dom";
import ErrorMessage from "../component/common/error-message";
import { Typography, Container, Box } from '@mui/material';

export default function ErrorPage() {
  const error = useRouteError() as Error | undefined;

  console.error(error);

  return (
    <Container maxWidth="sm" style={{ marginTop: '20vh' }}>
      <Box textAlign="center">
        <Typography variant="h3" color="error" gutterBottom>
          Oops!
        </Typography>
        <Typography variant="h5" gutterBottom>
          Something went wrong.
        </Typography>
        {error && (
          <ErrorMessage message={error.message || "An unknown error occurred"} />
        )}
      </Box>
    </Container>
  );
}
