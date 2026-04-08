import React, { useState, useContext } from 'react';
import { useNavigate, Link as RouterLink } from 'react-router-dom';
import {
  Box, Card, CardContent, Typography, TextField, Button, Link, Alert, CircularProgress,
  useTheme, alpha, InputAdornment, IconButton,
} from '@mui/material';
import { AutoAwesome as LogoIcon, Visibility, VisibilityOff, Email, Lock } from '@mui/icons-material';
import { login, mfaLoginVerify } from '../service/auth';
import { UserContext } from '../context/user-context';

const LoginPage: React.FC = () => {
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
        navigate('/');
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
      navigate('/');
    } catch (err: any) {
      setError(err.message || 'Invalid verification code');
    } finally {
      setLoading(false);
    }
  };

  // MFA verification step
  if (mfaToken) {
    return (
      <Box sx={{ width: '100%', maxWidth: 420, px: 2 }}>
        <Box sx={{ textAlign: 'center', mb: 4 }}>
          <Box
            sx={{
              width: 56, height: 56, borderRadius: '16px', mx: 'auto', mb: 2,
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              background: `linear-gradient(135deg, ${theme.palette.primary.main}, ${theme.palette.secondary.main})`,
              boxShadow: `0 8px 32px ${alpha(theme.palette.primary.main, 0.3)}`,
            }}
          >
            <Lock sx={{ color: '#fff', fontSize: 28 }} />
          </Box>
          <Typography variant="h4" sx={{ fontWeight: 800, mb: 0.5 }}>Two-Factor Authentication</Typography>
          <Typography variant="body2" color="text.secondary">
            Enter the 6-digit code from your authenticator app
          </Typography>
        </Box>

        <Card sx={{ boxShadow: `0 8px 40px ${alpha('#000', 0.2)}` }}>
          <CardContent sx={{ p: 4 }}>
            {error && <Alert severity="error" sx={{ mb: 2, borderRadius: 2 }}>{error}</Alert>}

            <form onSubmit={handleMfaSubmit}>
              <TextField
                fullWidth label="Verification code" value={mfaCode}
                onChange={(e) => setMfaCode(e.target.value.replace(/\D/g, '').slice(0, 6))}
                required autoFocus
                inputProps={{ maxLength: 6, inputMode: 'numeric', pattern: '[0-9]*' }}
                sx={{ mb: 3 }}
                InputProps={{
                  startAdornment: <InputAdornment position="start"><Lock sx={{ color: 'text.secondary', fontSize: 20 }} /></InputAdornment>,
                }}
              />
              <Button
                fullWidth type="submit" variant="contained" size="large"
                disabled={loading || mfaCode.length !== 6}
                sx={{
                  py: 1.5, fontSize: '1rem',
                  background: `linear-gradient(135deg, ${theme.palette.primary.main}, ${theme.palette.secondary.main})`,
                  '&:hover': {
                    background: `linear-gradient(135deg, ${theme.palette.primary.dark}, ${theme.palette.secondary.dark})`,
                    boxShadow: `0 4px 20px ${alpha(theme.palette.primary.main, 0.4)}`,
                  },
                }}
              >
                {loading ? <CircularProgress size={24} sx={{ color: '#fff' }} /> : 'Verify'}
              </Button>
            </form>
          </CardContent>
        </Card>

        <Typography variant="body2" color="text.secondary" sx={{ textAlign: 'center', mt: 3 }}>
          <Link
            component="button" onClick={() => { setMfaToken(null); setMfaCode(''); setError(''); }}
            sx={{ fontWeight: 600, color: theme.palette.primary.main, cursor: 'pointer', border: 'none', background: 'none' }}
          >
            Back to login
          </Link>
        </Typography>
      </Box>
    );
  }

  return (
    <Box sx={{ width: '100%', maxWidth: 420, px: 2 }}>
      {/* Logo */}
      <Box sx={{ textAlign: 'center', mb: 4 }}>
        <Box
          sx={{
            width: 56, height: 56, borderRadius: '16px', mx: 'auto', mb: 2,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            background: `linear-gradient(135deg, ${theme.palette.primary.main}, ${theme.palette.secondary.main})`,
            boxShadow: `0 8px 32px ${alpha(theme.palette.primary.main, 0.3)}`,
          }}
        >
          <LogoIcon sx={{ color: '#fff', fontSize: 28 }} />
        </Box>
        <Typography variant="h4" sx={{ fontWeight: 800, mb: 0.5 }}>Welcome back</Typography>
        <Typography variant="body2" color="text.secondary">Sign in to your employment autopilot</Typography>
      </Box>

      <Card sx={{ boxShadow: `0 8px 40px ${alpha('#000', 0.2)}` }}>
        <CardContent sx={{ p: 4 }}>
          {error && <Alert severity="error" sx={{ mb: 2, borderRadius: 2 }}>{error}</Alert>}

          <form onSubmit={handleSubmit}>
            <TextField
              fullWidth label="Email" type="email" value={email}
              onChange={(e) => setEmail(e.target.value)} required
              sx={{ mb: 2.5 }}
              InputProps={{
                startAdornment: <InputAdornment position="start"><Email sx={{ color: 'text.secondary', fontSize: 20 }} /></InputAdornment>,
              }}
            />
            <TextField
              fullWidth label="Password" type={showPassword ? 'text' : 'password'} value={password}
              onChange={(e) => setPassword(e.target.value)} required
              sx={{ mb: 3 }}
              InputProps={{
                startAdornment: <InputAdornment position="start"><Lock sx={{ color: 'text.secondary', fontSize: 20 }} /></InputAdornment>,
                endAdornment: (
                  <InputAdornment position="end">
                    <IconButton size="small" onClick={() => setShowPassword(!showPassword)}>
                      {showPassword ? <VisibilityOff fontSize="small" /> : <Visibility fontSize="small" />}
                    </IconButton>
                  </InputAdornment>
                ),
              }}
            />
            <Button
              fullWidth type="submit" variant="contained" size="large" disabled={loading}
              sx={{
                py: 1.5, fontSize: '1rem',
                background: `linear-gradient(135deg, ${theme.palette.primary.main}, ${theme.palette.secondary.main})`,
                '&:hover': {
                  background: `linear-gradient(135deg, ${theme.palette.primary.dark}, ${theme.palette.secondary.dark})`,
                  boxShadow: `0 4px 20px ${alpha(theme.palette.primary.main, 0.4)}`,
                },
              }}
            >
              {loading ? <CircularProgress size={24} sx={{ color: '#fff' }} /> : 'Sign In'}
            </Button>
          </form>
        </CardContent>
      </Card>

      <Typography variant="body2" color="text.secondary" sx={{ textAlign: 'center', mt: 3 }}>
        Don't have an account?{' '}
        <Link component={RouterLink} to="/register" sx={{ fontWeight: 600, color: theme.palette.primary.main }}>
          Create one
        </Link>
      </Typography>
    </Box>
  );
};

export default LoginPage;
