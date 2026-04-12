import React from 'react';
import { Box, Typography, Button } from '@mui/material';
import { ErrorOutline as ErrorIcon } from '@mui/icons-material';
import { monoFontFamily } from '../../design-system/tokens/typography';
import { brandGradient } from '../../theme/effects';

interface ErrorBoundaryProps {
  children: React.ReactNode;
}

interface ErrorBoundaryState {
  hasError: boolean;
  error: Error | null;
}

class ErrorBoundary extends React.Component<ErrorBoundaryProps, ErrorBoundaryState> {
  constructor(props: ErrorBoundaryProps) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error: Error): ErrorBoundaryState {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo): void {
    console.error('ErrorBoundary caught an error:', error, errorInfo);
  }

  handleReload = (): void => {
    window.location.reload();
  };

  render(): React.ReactNode {
    if (!this.state.hasError) {
      return this.props.children;
    }

    const isDev = import.meta.env.DEV;

    return (
      <Box
        sx={{
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          minHeight: '60vh',
          textAlign: 'center',
          px: 3,
        }}
      >
        <ErrorIcon
          sx={{
            fontSize: 64,
            color: 'error.main',
            mb: 2,
            opacity: 0.7,
          }}
        />
        <Typography
          variant="h4"
          sx={{
            fontWeight: 800,
            mb: 1,
            background: (theme) => brandGradient(theme),
            WebkitBackgroundClip: 'text',
            WebkitTextFillColor: 'transparent',
          }}
        >
          Baldin
        </Typography>
        <Typography variant="h6" color="text.secondary" sx={{ fontWeight: 600, mb: 1 }}>
          Something went wrong
        </Typography>
        <Typography
          variant="body2"
          color="text.secondary"
          sx={{ mb: 3, maxWidth: 400 }}
        >
          An unexpected error occurred. Please reload the page to continue.
        </Typography>
        {isDev && this.state.error && (
          <Typography
            variant="caption"
            component="pre"
            sx={{
              mb: 3,
              p: 2,
              maxWidth: 600,
              overflow: 'auto',
              borderRadius: 1,
              bgcolor: 'action.hover',
              color: 'error.main',
              fontFamily: monoFontFamily,
              textAlign: 'left',
              whiteSpace: 'pre-wrap',
              wordBreak: 'break-word',
            }}
          >
            {this.state.error.message}
          </Typography>
        )}
        <Button variant="contained" onClick={this.handleReload}>
          Reload
        </Button>
      </Box>
    );
  }
}

export default ErrorBoundary;
