import React, { useState } from 'react';
import { useNavigate, Link as RouterLink } from 'react-router-dom';
import {
  Box, Card, CardContent, Typography, TextField, Button, Link, Alert, CircularProgress,
  useTheme, alpha, InputAdornment, IconButton,
} from '@mui/material';
import Grid from '@mui/material/GridLegacy';
import { AutoAwesome as LogoIcon, Visibility, VisibilityOff, Email, Lock, Person } from '@mui/icons-material';
import { register } from '../service/auth';

const RegisterPage: React.FC = () => {
  const theme = useTheme();
  const navigate = useNavigate();
  const [form, setForm] = useState({ email: '', password: '', confirmPassword: '', first_name: '', last_name: '' });
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const set = (field: string) => (e: React.ChangeEvent<HTMLInputElement>) =>
    setForm((prev) => ({ ...prev, [field]: e.target.value }));

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (form.password !== form.confirmPassword) {
      setError('Passwords do not match');
      return;
    }
    setLoading(true);
    setError('');
    try {
      await register({ email: form.email, password: form.password, first_name: form.first_name, last_name: form.last_name } as any);
      navigate('/login');
    } catch (err: any) {
      setError(err.message || 'Registration failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Box sx={{ width: '100%', maxWidth: 480, px: 2 }}>
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
        <Typography variant="h4" sx={{ fontWeight: 800, mb: 0.5 }}>Get started</Typography>
        <Typography variant="body2" color="text.secondary">Create your account and automate your job search</Typography>
      </Box>

      <Card sx={{ boxShadow: `0 8px 40px ${alpha('#000', 0.2)}` }}>
        <CardContent sx={{ p: 4 }}>
          {error && <Alert severity="error" sx={{ mb: 2, borderRadius: 2 }}>{error}</Alert>}
          <form onSubmit={handleSubmit}>
            <Grid container spacing={2}>
              <Grid item xs={6}>
                <TextField fullWidth label="First name" value={form.first_name} onChange={set('first_name')} required
                  InputProps={{ startAdornment: <InputAdornment position="start"><Person sx={{ color: 'text.secondary', fontSize: 20 }} /></InputAdornment> }}
                />
              </Grid>
              <Grid item xs={6}>
                <TextField fullWidth label="Last name" value={form.last_name} onChange={set('last_name')} required />
              </Grid>
            </Grid>
            <TextField fullWidth label="Email" type="email" value={form.email} onChange={set('email')} required sx={{ mt: 2 }}
              InputProps={{ startAdornment: <InputAdornment position="start"><Email sx={{ color: 'text.secondary', fontSize: 20 }} /></InputAdornment> }}
            />
            <TextField fullWidth label="Password" type={showPassword ? 'text' : 'password'} value={form.password} onChange={set('password')} required sx={{ mt: 2 }}
              InputProps={{
                startAdornment: <InputAdornment position="start"><Lock sx={{ color: 'text.secondary', fontSize: 20 }} /></InputAdornment>,
                endAdornment: <InputAdornment position="end"><IconButton size="small" onClick={() => setShowPassword(!showPassword)}>{showPassword ? <VisibilityOff fontSize="small" /> : <Visibility fontSize="small" />}</IconButton></InputAdornment>,
              }}
            />
            <TextField fullWidth label="Confirm password" type="password" value={form.confirmPassword} onChange={set('confirmPassword')} required sx={{ mt: 2, mb: 3 }} />
            <Button fullWidth type="submit" variant="contained" size="large" disabled={loading}
              sx={{
                py: 1.5, fontSize: '1rem',
                background: `linear-gradient(135deg, ${theme.palette.primary.main}, ${theme.palette.secondary.main})`,
                '&:hover': { background: `linear-gradient(135deg, ${theme.palette.primary.dark}, ${theme.palette.secondary.dark})`, boxShadow: `0 4px 20px ${alpha(theme.palette.primary.main, 0.4)}` },
              }}
            >
              {loading ? <CircularProgress size={24} sx={{ color: '#fff' }} /> : 'Create Account'}
            </Button>
          </form>
        </CardContent>
      </Card>

      <Typography variant="body2" color="text.secondary" sx={{ textAlign: 'center', mt: 3 }}>
        Already have an account?{' '}
        <Link component={RouterLink} to="/login" sx={{ fontWeight: 600, color: theme.palette.primary.main }}>Sign in</Link>
      </Typography>
    </Box>
  );
};

export default RegisterPage;
