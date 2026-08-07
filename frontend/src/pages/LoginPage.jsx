import { useState } from 'react';
import { useNavigate, Link as RouterLink } from 'react-router-dom';

import {
  Box, Button, TextField, Typography, Paper,
  InputAdornment, IconButton, Alert, Link, CircularProgress, Collapse, Divider,
} from '@mui/material';
import Visibility from '@mui/icons-material/Visibility';
import VisibilityOff from '@mui/icons-material/VisibilityOff';
import AutoAwesome from '@mui/icons-material/AutoAwesome';
const AIIcon = AutoAwesome;
import Email from '@mui/icons-material/Email';
const EmailIcon = Email;
import Lock from '@mui/icons-material/Lock';
import MarkEmailRead from '@mui/icons-material/MarkEmailRead';
const EmailSentIcon = MarkEmailRead;
import ErrorOutlined from '@mui/icons-material/ErrorOutlined';
const ErrorOutline = ErrorOutlined;
import MailOutlined from '@mui/icons-material/MailOutlined';
const MailOutline = MailOutlined;
import ArrowBack from '@mui/icons-material/ArrowBack';

import { motion, AnimatePresence } from 'framer-motion';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { alpha } from '@mui/material/styles';
import useAuthStore from '../store/authStore';
import { authApi } from '../services/api';

const schema = z.object({
  email: z.string().email('Please enter a valid email'),
  password: z.string().min(1, 'Password is required'),
});

// ── Error state panels ────────────────────────────────────────────────────────

function InvalidCredentialsPanel() {
  return (
    <motion.div
      key="invalid"
      initial={{ opacity: 0, y: -8 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -8 }}
      transition={{ duration: 0.25 }}
    >
      <Alert
        severity="error"
        icon={<ErrorOutline fontSize="inherit" />}
        sx={{ mb: 2.5, borderRadius: 2, fontWeight: 500 }}
      >
        ❌ Invalid email or password.
      </Alert>
    </motion.div>
  );
}

function EmailNotVerifiedPanel({ email, onResend, isResending, resendSuccess }) {
  return (
    <motion.div
      key="unverified"
      initial={{ opacity: 0, scale: 0.97 }}
      animate={{ opacity: 1, scale: 1 }}
      exit={{ opacity: 0, scale: 0.97 }}
      transition={{ duration: 0.3 }}
    >
      <Box
        sx={{
          mb: 2.5,
          p: 2.5,
          borderRadius: 2.5,
          border: (t) => `1px solid ${alpha(t.palette.warning.main, 0.4)}`,
          background: (t) => alpha(t.palette.warning.main, 0.06),
        }}
      >
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, mb: 1.5 }}>
          <MailOutline sx={{ color: 'warning.main', fontSize: 28 }} />
          <Typography fontWeight={700} color="warning.light" variant="subtitle1">
            📧 Verify Your Email
          </Typography>
        </Box>
        <Typography variant="body2" color="text.secondary" sx={{ mb: 2, lineHeight: 1.7 }}>
          Your account has been created but your email address has not been verified.
          Please check your inbox and click the verification link.
        </Typography>
        {resendSuccess ? (
          <Alert severity="success" sx={{ borderRadius: 2, mb: 1 }}>{resendSuccess}</Alert>
        ) : (
          <Box sx={{ display: 'flex', gap: 1.5, flexWrap: 'wrap' }}>
            <Button
              size="small"
              variant="contained"
              color="warning"
              onClick={onResend}
              disabled={isResending}
              startIcon={
                isResending
                  ? <CircularProgress size={14} color="inherit" />
                  : <EmailSentIcon fontSize="small" />
              }
              sx={{ fontWeight: 700, borderRadius: 2 }}
            >
              {isResending ? 'Sending…' : 'Resend Verification Email'}
            </Button>
            <Button
              size="small"
              variant="outlined"
              color="warning"
              startIcon={<ArrowBack fontSize="small" />}
              component={RouterLink}
              to="/login"
              sx={{ fontWeight: 600, borderRadius: 2 }}
            >
              Back to Login
            </Button>
          </Box>
        )}
      </Box>
    </motion.div>
  );
}

// ── Main component ────────────────────────────────────────────────────────────

export default function LoginPage() {
  const [showPassword, setShowPassword] = useState(false);
  const [errorCode, setErrorCode] = useState(null);   // 'INVALID_CREDENTIALS' | 'EMAIL_NOT_VERIFIED' | null
  const [errorMsg, setErrorMsg]   = useState('');
  const [resendEmail, setResendEmail] = useState('');
  const [resendSuccess, setResendSuccess] = useState('');
  const [isResending, setIsResending] = useState(false);
  const navigate = useNavigate();
  const { login, isLoading } = useAuthStore();

  const { register, handleSubmit, watch, formState: { errors } } = useForm({
    resolver: zodResolver(schema),
  });

  const emailValue = watch('email', '');

  const onSubmit = async (data) => {
    setErrorCode(null);
    setErrorMsg('');
    setResendSuccess('');
    const result = await login(data.email, data.password);
    if (result.success) {
      navigate('/chat');
    } else {
      setErrorCode(result.code);
      setErrorMsg(result.error);
      if (result.code === 'EMAIL_NOT_VERIFIED') {
        setResendEmail(data.email);
      }
    }
  };

  const handleResend = async () => {
    setIsResending(true);
    try {
      const { data } = await authApi.resendVerification(resendEmail || emailValue);
      setResendSuccess(data.message || 'Verification email sent! Check your inbox.');
    } catch {
      setResendSuccess('If that email is registered, a link has been sent.');
    } finally {
      setIsResending(false);
    }
  };

  return (
    <Box
      sx={{
        minHeight: '100vh',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        background: (t) =>
          `radial-gradient(ellipse at 60% 20%, ${alpha(t.palette.primary.main, 0.15)} 0%, transparent 60%), ${t.palette.background.default}`,
        p: 3,
        overflow: 'auto',
      }}
    >
      {/* Animated background orbs */}
      <Box sx={{ position: 'fixed', inset: 0, overflow: 'hidden', pointerEvents: 'none', zIndex: 0 }}>
        {[0, 1, 2].map((i) => (
          <motion.div
            key={i}
            style={{
              position: 'absolute',
              borderRadius: '50%',
              background: `radial-gradient(circle, rgba(99,102,241,${0.07 - i * 0.02}) 0%, transparent 70%)`,
              width: 400 + i * 200,
              height: 400 + i * 200,
              top: `${20 + i * 15}%`,
              left: `${55 + i * 12}%`,
              transform: 'translate(-50%, -50%)',
            }}
            animate={{ scale: [1, 1.1, 1], opacity: [0.5, 1, 0.5] }}
            transition={{ duration: 5 + i, repeat: Infinity, ease: 'easeInOut' }}
          />
        ))}
      </Box>

      <motion.div
        initial={{ opacity: 0, y: 30 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, ease: [0.4, 0, 0.2, 1] }}
        style={{ width: '100%', maxWidth: 420, zIndex: 1 }}
      >
        {/* Logo */}
        <Box sx={{ textAlign: 'center', mb: 4 }}>
          <motion.div
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            transition={{ delay: 0.2, type: 'spring', stiffness: 200 }}
          >
            <Box
              sx={{
                width: 64, height: 64, borderRadius: '18px',
                background: 'linear-gradient(135deg, #6366f1, #22d3ee)',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                mx: 'auto', mb: 2.5, boxShadow: '0 8px 24px rgba(99,102,241,0.5)',
              }}
            >
              <AIIcon sx={{ color: '#fff', fontSize: 32 }} />
            </Box>
          </motion.div>
          <Typography variant="h4" fontWeight={800} gutterBottom>Welcome back</Typography>
          <Typography variant="body1" color="text.secondary">
            Sign in to <strong>Bhavvi AI Assistant</strong>
          </Typography>
        </Box>

        <Paper
          sx={{
            p: 4,
            backdropFilter: 'blur(20px)',
            background: (t) => alpha(t.palette.background.paper, 0.8),
            border: (t) => `1px solid ${alpha(t.palette.primary.main, 0.15)}`,
          }}
        >
          {/* Error panels — animated swap between states */}
          <AnimatePresence mode="wait">
            {errorCode === 'EMAIL_NOT_VERIFIED' && (
              <EmailNotVerifiedPanel
                key="email-not-verified"
                email={resendEmail}
                onResend={handleResend}
                isResending={isResending}
                resendSuccess={resendSuccess}
              />
            )}
            {(errorCode === 'INVALID_CREDENTIALS' || (errorCode && errorCode !== 'EMAIL_NOT_VERIFIED')) && (
              <InvalidCredentialsPanel key="invalid-creds" />
            )}
          </AnimatePresence>

          {resendSuccess && errorCode !== 'EMAIL_NOT_VERIFIED' && (
            <Alert severity="success" sx={{ mb: 2, borderRadius: 2 }}>{resendSuccess}</Alert>
          )}

          <form onSubmit={handleSubmit(onSubmit)} noValidate>
            <TextField
              {...register('email')}
              label="Email address"
              type="email"
              fullWidth
              autoComplete="email"
              autoFocus
              error={!!errors.email}
              helperText={errors.email?.message}
              sx={{ mb: 2.5 }}
              InputProps={{
                startAdornment: (
                  <InputAdornment position="start">
                    <EmailIcon sx={{ color: 'text.disabled', fontSize: 20 }} />
                  </InputAdornment>
                ),
              }}
            />
            <TextField
              {...register('password')}
              label="Password"
              type={showPassword ? 'text' : 'password'}
              fullWidth
              autoComplete="current-password"
              error={!!errors.password}
              helperText={errors.password?.message}
              sx={{ mb: 3 }}
              InputProps={{
                startAdornment: (
                  <InputAdornment position="start">
                    <Lock sx={{ color: 'text.disabled', fontSize: 20 }} />
                  </InputAdornment>
                ),
                endAdornment: (
                  <InputAdornment position="end">
                    <IconButton onClick={() => setShowPassword((s) => !s)} edge="end" size="small">
                      {showPassword ? <VisibilityOff fontSize="small" /> : <Visibility fontSize="small" />}
                    </IconButton>
                  </InputAdornment>
                ),
              }}
            />

            <Button
              type="submit"
              variant="contained"
              fullWidth
              size="large"
              disabled={isLoading}
              sx={{ py: 1.5, fontSize: '1rem' }}
            >
              {isLoading ? <CircularProgress size={22} color="inherit" /> : 'Sign in'}
            </Button>
          </form>

          <Divider sx={{ my: 3 }} />

          <Box sx={{ textAlign: 'center', display: 'flex', flexDirection: 'column', gap: 1 }}>
            <Typography variant="body2" color="text.secondary">
              Don't have an account?{' '}
              <Link component={RouterLink} to="/register" fontWeight={600} color="primary">
                Create one
              </Link>
            </Typography>
            <Typography variant="caption" color="text.disabled">
              Need a verification email?{' '}
              <Box
                component="span"
                sx={{ color: 'primary.main', cursor: 'pointer', fontWeight: 600, '&:hover': { textDecoration: 'underline' } }}
                onClick={() => { setResendEmail(emailValue); setErrorCode('EMAIL_NOT_VERIFIED'); }}
              >
                Resend it
              </Box>
            </Typography>
          </Box>
        </Paper>

        {/* Back to home */}
        <Box sx={{ textAlign: 'center', mt: 2.5 }}>
          <Link component={RouterLink} to="/" color="text.secondary" variant="body2" sx={{ '&:hover': { color: 'primary.main' } }}>
            ← Back to home
          </Link>
        </Box>
      </motion.div>
    </Box>
  );
}
