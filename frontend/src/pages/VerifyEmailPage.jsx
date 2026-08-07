import { useEffect, useState, useRef } from 'react';
import { useNavigate, useSearchParams, Link as RouterLink } from 'react-router-dom';

import {
  Box, Paper, Typography, CircularProgress, Button, Divider,
} from '@mui/material';
import CheckCircle from '@mui/icons-material/CheckCircle';
const SuccessIcon = CheckCircle;
import Error from '@mui/icons-material/Error';
const ErrorIcon = Error;
import WarningAmber from '@mui/icons-material/WarningAmber';
const WarningIcon = WarningAmber;
import CheckCircleOutlined from '@mui/icons-material/CheckCircleOutlined';
const AlreadyDoneIcon = CheckCircleOutlined;
import AutoAwesome from '@mui/icons-material/AutoAwesome';
const AIIcon = AutoAwesome;
import MarkEmailRead from '@mui/icons-material/MarkEmailRead';
const ResendIcon = MarkEmailRead;
import ArrowBack from '@mui/icons-material/ArrowBack';


import { motion, AnimatePresence } from 'framer-motion';
import { alpha } from '@mui/material/styles';
import { authApi } from '../services/api';

// ── State definitions ─────────────────────────────────────────────────────────

const STATES = {
  loading: {
    icon: null,
    color: 'primary',
  },
  SUCCESS: {
    icon: SuccessIcon,
    color: '#10b981',
    title: '✅ Email Verified Successfully',
    subtitle: 'Your account is now active. You can sign in to Bhavvi AI.',
  },
  TOKEN_ALREADY_USED: {
    icon: AlreadyDoneIcon,
    color: '#6366f1',
    title: '✅ Email Already Verified',
    subtitle: 'Your account has already been verified. You can go ahead and log in.',
  },
  TOKEN_EXPIRED: {
    icon: WarningIcon,
    color: '#f59e0b',
    title: '⚠ Verification Link Expired',
    subtitle: 'This link has expired. Request a fresh verification email below.',
  },
  INVALID_TOKEN: {
    icon: ErrorIcon,
    color: '#ef4444',
    title: '❌ Invalid Verification Link',
    subtitle: 'This verification link is invalid. Please register again or request a new email.',
  },
  NO_TOKEN: {
    icon: ErrorIcon,
    color: '#ef4444',
    title: '❌ Missing Verification Token',
    subtitle: 'No token was found in the URL. Please use the link from your verification email.',
  },
};

// ── Icon with animated entrance ───────────────────────────────────────────────

function StatusIcon({ state }) {
  const cfg = STATES[state];
  if (!cfg || !cfg.icon) return null;
  const Icon = cfg.icon;
  return (
    <motion.div
      initial={{ scale: 0, opacity: 0 }}
      animate={{ scale: 1, opacity: 1 }}
      transition={{ type: 'spring', stiffness: 260, damping: 20, delay: 0.1 }}
    >
      <Icon sx={{ fontSize: 64, color: cfg.color, mb: 2, filter: `drop-shadow(0 4px 12px ${cfg.color}55)` }} />
    </motion.div>
  );
}

// ── Main component ────────────────────────────────────────────────────────────

export default function VerifyEmailPage() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const [uiState, setUiState] = useState('loading');
  const [userEmail, setUserEmail] = useState('');
  const [resendState, setResendState] = useState('idle'); // idle | sending | sent
  const hasRun = useRef(false); // prevent double-fire in StrictMode

  const token = searchParams.get('token');

  useEffect(() => {
    // Guard: only run once, and only when token is available
    if (hasRun.current) return;
    if (!token) {
      setUiState('NO_TOKEN');
      return;
    }
    hasRun.current = true;

    authApi.verifyEmail(token)
      .then(({ data }) => {
        const code = data.code || 'SUCCESS';
        setUiState(code);
        if (code === 'SUCCESS') {
          setTimeout(() => navigate('/login'), 3000);
        }
      })
      .catch((err) => {
        const code = err.response?.data?.code;
        if (code === 'TOKEN_EXPIRED') {
          setUiState('TOKEN_EXPIRED');
        } else if (code === 'TOKEN_ALREADY_USED') {
          setUiState('TOKEN_ALREADY_USED');
        } else {
          setUiState('INVALID_TOKEN');
        }
      });
  }, [token, navigate]);

  const handleResend = async () => {
    if (!userEmail) {
      // Navigate to login with resend panel open
      navigate('/login');
      return;
    }
    setResendState('sending');
    try {
      await authApi.resendVerification(userEmail);
      setResendState('sent');
    } catch {
      setResendState('sent'); // Always show success for security
    }
  };

  const cfg = STATES[uiState] || STATES.INVALID_TOKEN;

  return (
    <Box
      sx={{
        minHeight: '100vh',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        background: (t) =>
          `radial-gradient(ellipse at 50% 30%, ${alpha(t.palette.primary.main, 0.12)} 0%, transparent 60%), ${t.palette.background.default}`,
        p: 3,
      }}
    >
      {/* Background orbs */}
      <Box sx={{ position: 'fixed', inset: 0, overflow: 'hidden', pointerEvents: 'none', zIndex: 0 }}>
        {[0, 1].map((i) => (
          <motion.div
            key={i}
            style={{
              position: 'absolute',
              borderRadius: '50%',
              background: `radial-gradient(circle, rgba(99,102,241,${0.06 - i * 0.02}) 0%, transparent 70%)`,
              width: 500 + i * 200,
              height: 500 + i * 200,
              top: `${30 + i * 20}%`,
              left: `${50 + i * 10}%`,
              transform: 'translate(-50%, -50%)',
            }}
            animate={{ scale: [1, 1.08, 1] }}
            transition={{ duration: 6 + i, repeat: Infinity, ease: 'easeInOut' }}
          />
        ))}
      </Box>

      <motion.div
        initial={{ opacity: 0, y: 30 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        style={{ width: '100%', maxWidth: 440, zIndex: 1 }}
      >
        <Paper
          sx={{
            p: 5,
            textAlign: 'center',
            backdropFilter: 'blur(20px)',
            background: (t) => alpha(t.palette.background.paper, 0.85),
            border: (t) => `1px solid ${alpha(t.palette.primary.main, 0.15)}`,
            borderRadius: 3,
          }}
        >
          {/* Logo */}
          <Box
            sx={{
              width: 52, height: 52, borderRadius: '14px',
              background: 'linear-gradient(135deg, #6366f1, #22d3ee)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              mx: 'auto', mb: 3, boxShadow: '0 6px 20px rgba(99,102,241,0.4)',
            }}
          >
            <AIIcon sx={{ color: '#fff', fontSize: 26 }} />
          </Box>

          <AnimatePresence mode="wait">
            {uiState === 'loading' ? (
              <motion.div
                key="loading"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
              >
                <CircularProgress size={52} sx={{ mb: 3 }} />
                <Typography variant="h6" fontWeight={700}>Verifying your email…</Typography>
                <Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>
                  Please wait while we validate your link.
                </Typography>
              </motion.div>
            ) : (
              <motion.div
                key={uiState}
                initial={{ opacity: 0, scale: 0.93 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.93 }}
                transition={{ duration: 0.3 }}
              >
                <StatusIcon state={uiState} />

                <Typography variant="h5" fontWeight={800} gutterBottom sx={{ lineHeight: 1.3 }}>
                  {cfg.title}
                </Typography>
                <Typography variant="body1" color="text.secondary" sx={{ mb: 3.5, lineHeight: 1.7 }}>
                  {cfg.subtitle}
                </Typography>

                {/* ── SUCCESS ── */}
                {uiState === 'SUCCESS' && (
                  <Box>
                    <motion.div
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      transition={{ delay: 0.4 }}
                    >
                      <Typography variant="caption" color="text.disabled" display="block" sx={{ mb: 2 }}>
                        Redirecting to login in 3 seconds…
                      </Typography>
                    </motion.div>
                    <Button
                      variant="contained"
                      fullWidth
                      size="large"
                      onClick={() => navigate('/login')}
                      sx={{ borderRadius: 2, py: 1.4, fontSize: '0.95rem' }}
                    >
                      Go to Login
                    </Button>
                  </Box>
                )}

                {/* ── ALREADY VERIFIED ── */}
                {uiState === 'TOKEN_ALREADY_USED' && (
                  <Button
                    variant="contained"
                    fullWidth
                    size="large"
                    onClick={() => navigate('/login')}
                    sx={{ borderRadius: 2, py: 1.4, fontSize: '0.95rem' }}
                  >
                    Login
                  </Button>
                )}

                {/* ── EXPIRED ── */}
                {uiState === 'TOKEN_EXPIRED' && (
                  <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1.5 }}>
                    {resendState === 'sent' ? (
                      <motion.div initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }}>
                        <Typography
                          variant="body2"
                          sx={{
                            p: 1.5, borderRadius: 2, mb: 1,
                            background: (t) => alpha(t.palette.success.main, 0.1),
                            color: 'success.light', fontWeight: 600,
                          }}
                        >
                          ✅ Verification email sent! Check your inbox.
                        </Typography>
                      </motion.div>
                    ) : (
                      <Button
                        variant="contained"
                        fullWidth
                        size="large"
                        color="warning"
                        disabled={resendState === 'sending'}
                        startIcon={resendState === 'sending'
                          ? <CircularProgress size={16} color="inherit" />
                          : <ResendIcon />}
                        onClick={handleResend}
                        sx={{ borderRadius: 2, py: 1.4, fontSize: '0.95rem' }}
                      >
                        {resendState === 'sending' ? 'Sending…' : 'Resend Verification Email'}
                      </Button>
                    )}
                    <Divider sx={{ my: 0.5 }}>
                      <Typography variant="caption" color="text.disabled">or</Typography>
                    </Divider>
                    <Button
                      variant="outlined"
                      fullWidth
                      startIcon={<ArrowBack />}
                      component={RouterLink}
                      to="/login"
                      sx={{ borderRadius: 2 }}
                    >
                      Back to Login
                    </Button>
                  </Box>
                )}

                {/* ── INVALID / MISSING ── */}
                {(uiState === 'INVALID_TOKEN' || uiState === 'NO_TOKEN') && (
                  <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1.5 }}>
                    <Button
                      variant="contained"
                      fullWidth
                      size="large"
                      onClick={() => navigate('/register')}
                      sx={{ borderRadius: 2, py: 1.4 }}
                    >
                      Register Again
                    </Button>
                    <Button
                      variant="outlined"
                      fullWidth
                      startIcon={<ResendIcon />}
                      onClick={() => navigate('/login')}
                      sx={{ borderRadius: 2 }}
                    >
                      Request New Verification Email
                    </Button>
                    <Button
                      variant="text"
                      fullWidth
                      startIcon={<ArrowBack />}
                      component={RouterLink}
                      to="/login"
                      sx={{ borderRadius: 2, color: 'text.secondary' }}
                    >
                      Back to Login
                    </Button>
                  </Box>
                )}
              </motion.div>
            )}
          </AnimatePresence>
        </Paper>

        <Box sx={{ textAlign: 'center', mt: 2.5 }}>
          <RouterLink to="/" style={{ textDecoration: 'none' }}>
            <Typography variant="caption" color="text.disabled" sx={{ '&:hover': { color: 'primary.main' } }}>
              ← Back to home
            </Typography>
          </RouterLink>
        </Box>
      </motion.div>
    </Box>
  );
}
