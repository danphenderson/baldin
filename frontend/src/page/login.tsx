import React, { useState, useContext } from 'react';
import { useNavigate, Link as RouterLink } from 'react-router-dom';
import {
  Box, TextField, Button, Link, CircularProgress,
  useTheme, InputAdornment, IconButton,
} from '@mui/material';
import { AutoAwesome as LogoIcon, Visibility, VisibilityOff, Email, Lock } from '@mui/icons-material';
import { login, mfaLoginVerify } from '../service/auth';
import { UserContext } from '../context/user-context';
import { AuthPanel, InlineFeedback } from '../design-system';

interface LoginPageProps {
  description?: string;
  footer?: React.ReactNode;
  icon?: React.ReactNode;
  postLoginPath?: string;
  title?: string;
}

const LoginPage: React.FC<LoginPageProps> = ({
  description = 'Sign in to your employment autopilot',
  footer,
  icon = <LogoIcon />,
  postLoginPath = '/',
  title = 'Welcome back',
}) => {
  const theme = useTheme();
  const navigate = useNavigate();
  const { setToken } = useContext(UserContext);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  // MFA challenge state
  const [mfaToken, setMfaToken] = useState<string | null>(null);
  const [mfaCode, setMfaCode] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    try {
      const result = await login(email, password);
      if (result.mfa_required && result.mfa_token) {
        setMfaToken(result.mfa_token);
      } else if (result.access_token) {
        setToken(result.access_token);
        navigate(postLoginPath);
      }
    } catch (err: any) {
      setError(err.message || 'Invalid credentials');
    } finally {
      setLoading(false);
    }
  };

  const handleMfaSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!mfaToken) return;
    setLoading(true);
    setError('');
    try {
      const accessToken = await mfaLoginVerify(mfaToken, mfaCode);
      setToken(accessToken);
      navigate(postLoginPath);
    } catch (err: any) {
      setError(err.message || 'Invalid verification code');
    } finally {
      setLoading(false);
    }
  };

  // MFA verification step
  if (mfaToken) {
    return (
      <AuthPanel
        icon={<Lock />}
        title="Two-Factor Authentication"
        description="Enter the 6-digit code from your authenticator app"
        maxWidth={420}
        footer={(
          <Link
            component="button"
            onClick={() => { setMfaToken(null); setMfaCode(''); setError(''); }}
            sx={{ fontWeight: 600, color: theme.palette.primary.main, cursor: 'pointer', border: 'none', background: 'none' }}
          >
            Back to login
          </Link>
        )}
      >
        {error && (
          <InlineFeedback tone="error" sx={{ mb: 2 }}>
            {error}
          </InlineFeedback>
        )}
        <Box component="form" onSubmit={handleMfaSubmit}>
          <TextField
            fullWidth
            label="Verification code"
            value={mfaCode}
            onChange={(e) => setMfaCode(e.target.value.replace(/\D/g, '').slice(0, 6))}
            required
            autoFocus
            slotProps={{
              htmlInput: { maxLength: 6, inputMode: 'numeric', pattern: '[0-9]*' },
              input: {
                startAdornment: <InputAdornment position="start"><Lock sx={{ color: 'text.secondary', fontSize: 20 }} /></InputAdornment>,
              },
            }}
            sx={{ mb: 3 }}
          />
          <Button
            fullWidth
            type="submit"
            variant="brand"
            size="large"
            disabled={loading || mfaCode.length !== 6}
            sx={{
              py: 1.5,
              fontSize: '1rem',
            }}
          >
            {loading ? <CircularProgress size={24} sx={{ color: 'common.white' }} /> : 'Verify'}
          </Button>
        </Box>
      </AuthPanel>
    );
  }

  return (
    <AuthPanel
      icon={icon}
      title={title}
      description={description}
      maxWidth={420}
      footer={footer ?? (
        <Box sx={{ color: 'text.secondary', typography: 'body2' }}>
          Don't have an account?{' '}
          <Link component={RouterLink} to="/register" sx={{ fontWeight: 600, color: theme.palette.primary.main }}>
            Create one
          </Link>
        </Box>
      )}
    >
      {error && (
        <InlineFeedback tone="error" sx={{ mb: 2 }}>
          {error}
        </InlineFeedback>
      )}

      <Box component="form" onSubmit={handleSubmit}>
        <TextField
          fullWidth
          label="Email"
          type="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          required
          sx={{ mb: 2.5 }}
          slotProps={{ input: { startAdornment: <InputAdornment position="start"><Email sx={{ color: 'text.secondary', fontSize: 20 }} /></InputAdornment> } }}
        />
        <TextField
          fullWidth
          label="Password"
          type={showPassword ? 'text' : 'password'}
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          required
          sx={{ mb: 3 }}
          slotProps={{
            input: {
              startAdornment: <InputAdornment position="start"><Lock sx={{ color: 'text.secondary', fontSize: 20 }} /></InputAdornment>,
              endAdornment: (
                <InputAdornment position="end">
                  <IconButton
                    size="small"
                    onClick={() => setShowPassword(!showPassword)}
                    aria-label={showPassword ? 'Hide password' : 'Show password'}
                  >
                    {showPassword ? <VisibilityOff fontSize="small" /> : <Visibility fontSize="small" />}
                  </IconButton>
                </InputAdornment>
              ),
            },
          }}
        />
        <Button
          fullWidth
          type="submit"
          variant="brand"
          size="large"
          disabled={loading}
          sx={{
            py: 1.5,
            fontSize: '1rem',
          }}
        >
          {loading ? <CircularProgress size={24} sx={{ color: 'common.white' }} /> : 'Sign In'}
        </Button>
      </Box>
    </AuthPanel>
  );
};

export default LoginPage;
