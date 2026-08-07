import { useState } from 'react';
import { useNavigate, Link as RouterLink } from 'react-router-dom';
import {
  Box, Button, TextField, Typography, Paper,
  InputAdornment, IconButton, Alert, Link, CircularProgress, LinearProgress, Chip,
} from '@mui/material';
import {
  Visibility, VisibilityOff, AutoAwesome as AIIcon,
  Email, Lock, Person, AlternateEmail, CheckCircle as CheckIcon,
  Cancel as CancelIcon,
} from '@mui/icons-material';
import { motion } from 'framer-motion';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { alpha } from '@mui/material/styles';
import useAuthStore from '../store/authStore';

const schema = z.object({
  fullName: z.string().min(2, 'Name must be at least 2 characters'),
  username: z.string()
    .min(3, 'Username must be at least 3 characters')
    .max(30, 'Username too long')
    .regex(/^[a-zA-Z0-9_]+$/, 'Only letters, numbers, and underscores allowed'),
  email: z.string().email('Please enter a valid email'),
  password: z.string()
    .min(8, 'At least 8 characters')
    .regex(/[A-Z]/, 'Must contain an uppercase letter')
    .regex(/[a-z]/, 'Must contain a lowercase letter')
    .regex(/\d/, 'Must contain a number'),
  confirmPassword: z.string(),
}).refine((d) => d.password === d.confirmPassword, {
  message: 'Passwords do not match',
  path: ['confirmPassword'],
});

function PasswordStrength({ password }) {
  const checks = [
    { label: '8+ characters', ok: password.length >= 8 },
    { label: 'Uppercase', ok: /[A-Z]/.test(password) },
    { label: 'Lowercase', ok: /[a-z]/.test(password) },
    { label: 'Number', ok: /\d/.test(password) },
  ];
  const score = checks.filter((c) => c.ok).length;
  const colors = ['#ef4444', '#f59e0b', '#f59e0b', '#10b981', '#10b981'];
  const labels = ['', 'Weak', 'Fair', 'Good', 'Strong'];

  if (!password) return null;
  return (
    <Box sx={{ mt: 1, mb: 0.5 }}>
      <Box sx={{ display: 'flex', gap: 0.5, mb: 1 }}>
        {[0, 1, 2, 3].map((i) => (
          <Box key={i} sx={{ flex: 1, height: 3, borderRadius: 2, bgcolor: i < score ? colors[score] : 'rgba(255,255,255,0.1)', transition: 'background 0.3s' }} />
        ))}
        <Typography variant="caption" sx={{ color: colors[score], fontWeight: 600, minWidth: 40, textAlign: 'right' }}>
          {labels[score]}
        </Typography>
      </Box>
      <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.75 }}>
        {checks.map((c) => (
          <Box key={c.label} sx={{ display: 'flex', alignItems: 'center', gap: 0.4 }}>
            {c.ok
              ? <CheckIcon sx={{ fontSize: 12, color: '#10b981' }} />
              : <CancelIcon sx={{ fontSize: 12, color: 'rgba(255,255,255,0.2)' }} />}
            <Typography variant="caption" sx={{ color: c.ok ? '#10b981' : '#475569', fontSize: '0.7rem' }}>
              {c.label}
            </Typography>
          </Box>
        ))}
      </Box>
    </Box>
  );
}

export default function RegisterPage() {
  const [showPassword, setShowPassword] = useState(false);
  const [apiError, setApiError] = useState('');
  const [success, setSuccess] = useState('');
  const navigate = useNavigate();
  const { register: registerUser, isLoading } = useAuthStore();

  const { register, handleSubmit, watch, formState: { errors } } = useForm({
    resolver: zodResolver(schema),
  });

  const password = watch('password', '');

  const onSubmit = async (data) => {
    setApiError('');
    const result = await registerUser(data.fullName, data.username, data.email, data.password);
    if (result.success) {
      setSuccess(result.message || 'Account created! Check your email to verify your address.');
    } else {
      setApiError(result.error);
    }
  };

  if (success) {
    return (
      <Box sx={{
        minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center',
        background: (t) => `radial-gradient(ellipse at 50% 20%, ${alpha(t.palette.primary.main, 0.12)} 0%, transparent 55%), ${t.palette.background.default}`,
        p: 3,
      }}>
        <motion.div initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }} style={{ maxWidth: 440, width: '100%' }}>
          <Paper sx={{ p: 5, textAlign: 'center', backdropFilter: 'blur(20px)', background: (t) => alpha(t.palette.background.paper, 0.8), border: (t) => `1px solid ${alpha(t.palette.success.main, 0.3)}` }}>
            <Box sx={{ fontSize: 56, mb: 2 }}>📧</Box>
            <Typography variant="h5" fontWeight={800} gutterBottom>Check your inbox!</Typography>
            <Typography variant="body1" color="text.secondary" sx={{ mb: 3, lineHeight: 1.7 }}>
              {success}
            </Typography>
            <Button variant="contained" onClick={() => navigate('/login')} sx={{ borderRadius: 2 }}>
              Go to Login
            </Button>
          </Paper>
        </motion.div>
      </Box>
    );
  }

  return (
    <Box sx={{
      minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center',
      background: (t) => `radial-gradient(ellipse at 40% 30%, ${alpha(t.palette.secondary.main, 0.1)} 0%, transparent 55%), radial-gradient(ellipse at 70% 70%, ${alpha(t.palette.primary.main, 0.08)} 0%, transparent 50%), ${t.palette.background.default}`,
      p: 3, overflow: 'auto',
    }}>
      <motion.div initial={{ opacity: 0, y: 30 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5 }} style={{ width: '100%', maxWidth: 460 }}>
        <Box sx={{ textAlign: 'center', mb: 4 }}>
          <Box sx={{ width: 64, height: 64, borderRadius: '18px', background: 'linear-gradient(135deg, #6366f1, #22d3ee)', display: 'flex', alignItems: 'center', justifyContent: 'center', mx: 'auto', mb: 2.5, boxShadow: '0 8px 24px rgba(99,102,241,0.5)' }}>
            <AIIcon sx={{ color: '#fff', fontSize: 32 }} />
          </Box>
          <Typography variant="h4" fontWeight={800} gutterBottom>Create account</Typography>
          <Typography variant="body1" color="text.secondary">Join <strong>Bhavvi AI Assistant</strong></Typography>
        </Box>

        <Paper sx={{ p: 4, backdropFilter: 'blur(20px)', background: (t) => alpha(t.palette.background.paper, 0.8), border: (t) => `1px solid ${alpha(t.palette.primary.main, 0.15)}` }}>
          {apiError && <Alert severity="error" sx={{ mb: 2.5, borderRadius: 2 }}>{apiError}</Alert>}

          <form onSubmit={handleSubmit(onSubmit)} noValidate>
            <TextField
              {...register('fullName')} label="Full name" fullWidth autoFocus
              error={!!errors.fullName} helperText={errors.fullName?.message}
              sx={{ mb: 2 }}
              InputProps={{ startAdornment: <InputAdornment position="start"><Person sx={{ color: 'text.disabled', fontSize: 20 }} /></InputAdornment> }}
            />
            <TextField
              {...register('username')} label="Username" fullWidth
              error={!!errors.username} helperText={errors.username?.message || 'Letters, numbers, underscores only'}
              sx={{ mb: 2 }}
              InputProps={{ startAdornment: <InputAdornment position="start"><AlternateEmail sx={{ color: 'text.disabled', fontSize: 20 }} /></InputAdornment> }}
            />
            <TextField
              {...register('email')} label="Email address" type="email" fullWidth
              error={!!errors.email} helperText={errors.email?.message}
              sx={{ mb: 2 }}
              InputProps={{ startAdornment: <InputAdornment position="start"><Email sx={{ color: 'text.disabled', fontSize: 20 }} /></InputAdornment> }}
            />
            <TextField
              {...register('password')} label="Password" type={showPassword ? 'text' : 'password'} fullWidth
              error={!!errors.password} helperText={errors.password?.message}
              sx={{ mb: 0.5 }}
              InputProps={{
                startAdornment: <InputAdornment position="start"><Lock sx={{ color: 'text.disabled', fontSize: 20 }} /></InputAdornment>,
                endAdornment: <InputAdornment position="end"><IconButton onClick={() => setShowPassword(s => !s)} size="small">{showPassword ? <VisibilityOff fontSize="small" /> : <Visibility fontSize="small" />}</IconButton></InputAdornment>,
              }}
            />
            <PasswordStrength password={password} />
            <TextField
              {...register('confirmPassword')} label="Confirm password" type={showPassword ? 'text' : 'password'} fullWidth
              error={!!errors.confirmPassword} helperText={errors.confirmPassword?.message}
              sx={{ mb: 3, mt: 1.5 }}
              InputProps={{ startAdornment: <InputAdornment position="start"><Lock sx={{ color: 'text.disabled', fontSize: 20 }} /></InputAdornment> }}
            />
            <Button type="submit" variant="contained" fullWidth size="large" disabled={isLoading} sx={{ py: 1.5, fontSize: '1rem' }}>
              {isLoading ? <CircularProgress size={22} color="inherit" /> : 'Create Account'}
            </Button>
          </form>

          <Box sx={{ textAlign: 'center', mt: 3 }}>
            <Typography variant="body2" color="text.secondary">
              Already have an account?{' '}
              <Link component={RouterLink} to="/login" fontWeight={600} color="primary">Sign in</Link>
            </Typography>
          </Box>
        </Paper>
      </motion.div>
    </Box>
  );
}
