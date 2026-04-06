import React, { useState, useEffect, useContext, useCallback } from 'react';
import {
  Box, Card, CardContent, Typography, TextField, Button, Alert,
  CircularProgress, Stack, useTheme, alpha, Switch, Divider,
  InputAdornment, Dialog, DialogTitle, DialogContent, DialogActions,
} from '@mui/material';
import { Security as SecurityIcon, Lock } from '@mui/icons-material';
import { QRCodeSVG } from 'qrcode.react';
import { UserContext } from '../context/user-context';
import { mfaStatus, mfaSetup, mfaVerify, mfaDisable, MFASetup } from '../service/auth';

/** Sanitise user input to digits only, capped at 6 characters. */
const sanitizeTotpInput = (raw: string): string =>
  raw.replace(/\D/g, '').slice(0, 6);

const MFASetupCard: React.FC = () => {
  const theme = useTheme();
  const { token } = useContext(UserContext);
  const [enabled, setEnabled] = useState<boolean | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  // Setup flow state
  const [setupData, setSetupData] = useState<MFASetup | null>(null);
  const [verifyCode, setVerifyCode] = useState('');
  const [setupLoading, setSetupLoading] = useState(false);

  // Disable flow state
  const [showDisable, setShowDisable] = useState(false);
  const [disableCode, setDisableCode] = useState('');
  const [disableLoading, setDisableLoading] = useState(false);
  const [showRecoveryNotice, setShowRecoveryNotice] = useState(false);

  const fetchStatus = useCallback(async () => {
    if (!token) return;
    try {
      setLoading(true);
      const isEnabled = await mfaStatus(token);
      setEnabled(isEnabled);
    } catch {
      setError('Failed to load MFA status');
    } finally {
      setLoading(false);
    }
  }, [token]);

  useEffect(() => { fetchStatus(); }, [fetchStatus]);

  const handleSetup = async () => {
    if (!token) return;
    setSetupLoading(true);
    setError('');
    try {
      const data = await mfaSetup(token);
      setSetupData(data);
    } catch (err: any) {
      setError(err.message || 'Failed to start MFA setup');
    } finally {
      setSetupLoading(false);
    }
  };

  const handleVerify = async () => {
    if (!token) return;
    setSetupLoading(true);
    setError('');
    try {
      await mfaVerify(token, verifyCode);
      setEnabled(true);
      setSetupData(null);
      setVerifyCode('');
      setSuccess('Two-factor authentication is now enabled.');
    } catch (err: any) {
      setError(err.message || 'Invalid code, please try again');
    } finally {
      setSetupLoading(false);
    }
  };

  const handleDisable = async () => {
    if (!token) return;
    setDisableLoading(true);
    setError('');
    try {
      await mfaDisable(token, disableCode);
      setEnabled(false);
      setShowDisable(false);
      setDisableCode('');
      setSuccess('Two-factor authentication has been disabled.');
    } catch (err: any) {
      setError(err.message || 'Invalid code');
    } finally {
      setDisableLoading(false);
    }
  };

  if (loading || enabled === null) {
    return (
      <Card sx={{ boxShadow: `0 2px 12px ${alpha('#000', 0.08)}` }}>
        <CardContent sx={{ display: 'flex', justifyContent: 'center', py: 4 }}>
          <CircularProgress size={28} />
        </CardContent>
      </Card>
    );
  }

  return (
    <>
      <Card sx={{ boxShadow: `0 2px 12px ${alpha('#000', 0.08)}` }}>
        <CardContent sx={{ p: 3 }}>
          <Stack direction="row" alignItems="center" spacing={1.5} sx={{ mb: 2 }}>
            <SecurityIcon sx={{ color: 'primary.main' }} />
            <Typography variant="h6" fontWeight={700}>Two-Factor Authentication</Typography>
          </Stack>

          {error && <Alert severity="error" sx={{ mb: 2, borderRadius: 2 }} onClose={() => setError('')}>{error}</Alert>}
          {success && <Alert severity="success" sx={{ mb: 2, borderRadius: 2 }} onClose={() => setSuccess('')}>{success}</Alert>}

          <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
            Add an extra layer of security to your account by requiring a verification
            code from an authenticator app (e.g. Google Authenticator, Authy) when you
            sign in.
          </Typography>

          <Divider sx={{ my: 2 }} />

          <Stack direction="row" alignItems="center" justifyContent="space-between">
            <Box>
              <Typography variant="body1" fontWeight={600}>
                {enabled ? 'Enabled' : 'Disabled'}
              </Typography>
              <Typography variant="caption" color="text.secondary">
                {enabled
                  ? 'Your account is protected with two-factor authentication.'
                  : 'Enable two-factor authentication for better security.'}
              </Typography>
            </Box>
            <Switch
              checked={enabled}
              onChange={() => enabled ? setShowDisable(true) : setShowRecoveryNotice(true)}
              disabled={setupLoading}
              color="primary"
            />
          </Stack>

          {!enabled && (
            <Alert severity="warning" sx={{ mt: 2, borderRadius: 2 }}>
              If you lose access to your authenticator app, a Baldin superuser must reset MFA
              before you can sign in again.
            </Alert>
          )}

          {/* ── Setup flow ─────────────────────────────────────────── */}
          {setupData && !enabled && (
            <Box sx={{ mt: 3, p: 2, borderRadius: 2, bgcolor: alpha(theme.palette.primary.main, 0.04) }}>
              <Typography variant="subtitle2" fontWeight={700} sx={{ mb: 1 }}>
                Set up authenticator app
              </Typography>
              <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
                Scan the QR code or enter the secret key manually in your authenticator app,
                then enter the 6-digit code below to confirm.
              </Typography>

              {/* Client-side QR code generation – secret never leaves the browser */}
              <Box sx={{ textAlign: 'center', mb: 2 }}>
                <Box sx={{ display: 'inline-block', p: 1.5, borderRadius: 2, border: `1px solid ${alpha('#000', 0.08)}`, bgcolor: '#fff' }}>
                  <QRCodeSVG value={setupData.provisioning_uri} size={200} />
                </Box>
              </Box>

              <Typography variant="caption" color="text.secondary" sx={{ display: 'block', textAlign: 'center', mb: 2, wordBreak: 'break-all' }}>
                Secret: <strong>{setupData.secret}</strong>
              </Typography>

              <Stack direction="row" spacing={1}>
                <TextField
                  size="small" fullWidth label="6-digit code" value={verifyCode}
                  onChange={(e) => setVerifyCode(sanitizeTotpInput(e.target.value))}
                  inputProps={{ maxLength: 6, inputMode: 'numeric', pattern: '[0-9]*' }}
                  InputProps={{
                    startAdornment: <InputAdornment position="start"><Lock sx={{ fontSize: 18, color: 'text.secondary' }} /></InputAdornment>,
                  }}
                />
                <Button
                  variant="contained" disabled={verifyCode.length !== 6 || setupLoading}
                  onClick={handleVerify}
                  sx={{ minWidth: 100 }}
                >
                  {setupLoading ? <CircularProgress size={20} sx={{ color: '#fff' }} /> : 'Verify'}
                </Button>
              </Stack>
            </Box>
          )}
        </CardContent>
      </Card>

      <Dialog
        open={showRecoveryNotice}
        onClose={() => setShowRecoveryNotice(false)}
      >
        <DialogTitle>Before you enable two-factor authentication</DialogTitle>
        <DialogContent>
          <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
            Save your authenticator app before you verify setup. If you later lose access to
            that app, you cannot recover this account yourself.
          </Typography>
          <Alert severity="warning" sx={{ borderRadius: 2 }}>
            A Baldin superuser must reset MFA for your account before you can sign in again.
          </Alert>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setShowRecoveryNotice(false)}>Cancel</Button>
          <Button
            variant="contained"
            onClick={async () => {
              setShowRecoveryNotice(false);
              await handleSetup();
            }}
          >
            Continue
          </Button>
        </DialogActions>
      </Dialog>

      {/* ── Disable confirmation dialog ────────────────────────────── */}
      <Dialog open={showDisable} onClose={() => { setShowDisable(false); setDisableCode(''); setError(''); }}>
        <DialogTitle>Disable Two-Factor Authentication</DialogTitle>
        <DialogContent>
          <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
            Enter a code from your authenticator app to confirm.
          </Typography>
          {error && <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>}
          <TextField
            fullWidth label="6-digit code" value={disableCode}
            onChange={(e) => setDisableCode(sanitizeTotpInput(e.target.value))}
            inputProps={{ maxLength: 6, inputMode: 'numeric', pattern: '[0-9]*' }}
            autoFocus
          />
        </DialogContent>
        <DialogActions>
          <Button onClick={() => { setShowDisable(false); setDisableCode(''); setError(''); }}>Cancel</Button>
          <Button
            variant="contained" color="error"
            disabled={disableCode.length !== 6 || disableLoading}
            onClick={handleDisable}
          >
            {disableLoading ? <CircularProgress size={20} /> : 'Disable'}
          </Button>
        </DialogActions>
      </Dialog>
    </>
  );
};

export default MFASetupCard;
