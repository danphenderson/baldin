import React, { useState, useMemo } from 'react';
import { useNavigate, Link as RouterLink } from 'react-router-dom';
import {
  Box, Typography, TextField, Button, Link, CircularProgress,
  useTheme, alpha, InputAdornment, IconButton, LinearProgress, Stack,
} from '@mui/material';
import Grid from '@mui/material/Grid';
import {
  AutoAwesome as LogoIcon, Visibility, VisibilityOff, Email, Lock, Person,
  Check as CheckIcon, Close as CloseIcon,
} from '@mui/icons-material';
import { register, login } from '../service/auth';
import { UserContext } from '../context/user-context';
import { AuthPanel, InlineFeedback } from '../design-system';

// Must stay in sync with backend MIN_PASSWORD_LENGTH / _PASSWORD_RULES
const PASSWORD_RULES = [
  { label: 'At least 8 characters', test: (p: string) => p.length >= 8 },
  { label: 'One uppercase letter', test: (p: string) => /[A-Z]/.test(p) },
  { label: 'One lowercase letter', test: (p: string) => /[a-z]/.test(p) },
  { label: 'One digit', test: (p: string) => /\d/.test(p) },
];

const RegisterPage: React.FC = () => {
  const theme = useTheme();
  const navigate = useNavigate();
  const { setToken } = React.useContext(UserContext);
  const [form, setForm] = useState({ email: '', password: '', confirmPassword: '', first_name: '', last_name: '' });
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const set = (field: string) => (e: React.ChangeEvent<HTMLInputElement>) =>
    setForm((prev) => ({ ...prev, [field]: e.target.value }));

  const ruleResults = useMemo(
    () => PASSWORD_RULES.map((r) => ({ ...r, passed: r.test(form.password) })),
    [form.password],
  );
  const passedCount = ruleResults.filter((r) => r.passed).length;
  const allPassed = passedCount === PASSWORD_RULES.length;
  const strengthPercent = (passedCount / PASSWORD_RULES.length) * 100;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!allPassed) {
      setError('Password does not meet the requirements below.');
      return;
    }
    if (form.password !== form.confirmPassword) {
      setError('Passwords do not match');
      return;
    }
    setLoading(true);
    setError('');
    try {
      await register({ email: form.email, password: form.password, first_name: form.first_name, last_name: form.last_name } as any);
      // Auto-login after successful registration
      try {
        const result = await login(form.email, form.password);
        if (result.mfa_required) {
          // MFA is enabled — user must complete MFA on the login page
          navigate('/login');
        } else if (result.access_token) {
          setToken(result.access_token);
          navigate('/');
        } else {
          navigate('/login');
        }
      } catch {
        // Login failed for any reason — fall back to login page
        navigate('/login');
      }
    } catch (err: any) {
      setError(err.message || 'Registration failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <AuthPanel
      icon={<LogoIcon />}
      title="Get started"
      description="Create your account and automate your job search"
      footer={(
        <Box sx={{ color: 'text.secondary', typography: 'body2' }}>
          Already have an account?{' '}
          <Link component={RouterLink} to="/login" sx={{ fontWeight: 600, color: theme.palette.primary.main }}>
            Sign in
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
        <Grid container spacing={2}>
          <Grid size={6}>
            <TextField
              fullWidth
              label="First name"
              value={form.first_name}
              onChange={set('first_name')}
              required
              slotProps={{ input: { startAdornment: <InputAdornment position="start"><Person sx={{ color: 'text.secondary', fontSize: 20 }} /></InputAdornment> } }}
            />
          </Grid>
          <Grid size={6}>
            <TextField fullWidth label="Last name" value={form.last_name} onChange={set('last_name')} required />
          </Grid>
        </Grid>
        <TextField
          fullWidth
          label="Email"
          type="email"
          value={form.email}
          onChange={set('email')}
          required
          sx={{ mt: 2 }}
          slotProps={{ input: { startAdornment: <InputAdornment position="start"><Email sx={{ color: 'text.secondary', fontSize: 20 }} /></InputAdornment> } }}
        />
        <TextField
          fullWidth
          label="Password"
          type={showPassword ? 'text' : 'password'}
          value={form.password}
          onChange={set('password')}
          required
          sx={{ mt: 2 }}
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

        {form.password.length > 0 && (
          <Box sx={{ mt: 1.5 }}>
            <LinearProgress
              variant="determinate"
              value={strengthPercent}
              sx={{
                height: 6,
                borderRadius: '12px',
                backgroundColor: alpha(theme.palette.error.main, 0.15),
                '& .MuiLinearProgress-bar': {
                  borderRadius: '12px',
                  backgroundColor: allPassed
                    ? theme.palette.success.main
                    : passedCount >= 2
                      ? theme.palette.warning.main
                      : theme.palette.error.main,
                },
              }}
            />
            <Stack spacing={0.25} sx={{ mt: 1 }}>
              {ruleResults.map((r) => (
                <Typography
                  key={r.label}
                  variant="caption"
                  sx={{ display: 'flex', alignItems: 'center', gap: 0.5, color: r.passed ? 'success.main' : 'text.secondary' }}
                >
                  {r.passed ? <CheckIcon sx={{ fontSize: 14 }} /> : <CloseIcon sx={{ fontSize: 14 }} />}
                  {r.label}
                </Typography>
              ))}
            </Stack>
          </Box>
        )}

        <TextField
          fullWidth
          label="Confirm password"
          type="password"
          value={form.confirmPassword}
          onChange={set('confirmPassword')}
          required
          sx={{ mt: 2, mb: 3 }}
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
          {loading ? <CircularProgress size={24} sx={{ color: 'common.white' }} /> : 'Create Account'}
        </Button>
      </Box>
    </AuthPanel>
  );
};

export default RegisterPage;
