import {
  Box, Paper, Typography, Button, Divider, Switch,
  FormControlLabel, Alert, Grid, Avatar, Chip,
} from '@mui/material';
import { motion } from 'framer-motion';
import { alpha } from '@mui/material/styles';
import { AutoAwesome as AIIcon, Logout as LogoutIcon } from '@mui/icons-material';
import useAuthStore from '../store/authStore';
import { useNavigate } from 'react-router-dom';
import { format } from 'date-fns';

const itemVariants = {
  hidden: { opacity: 0, y: 15 },
  show: { opacity: 1, y: 0, transition: { duration: 0.35 } },
};

export default function SettingsPage() {
  const user = useAuthStore((s) => s.user);
  const logout = useAuthStore((s) => s.logout);
  const navigate = useNavigate();

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  return (
    <Box sx={{ maxWidth: 720, mx: 'auto' }}>
      <Typography variant="h4" fontWeight={800} sx={{ mb: 1 }}>Settings</Typography>
      <Typography variant="body1" color="text.secondary" sx={{ mb: 4 }}>
        Manage your account and preferences
      </Typography>

      <motion.div
        variants={{ hidden: {}, show: { transition: { staggerChildren: 0.08 } } }}
        initial="hidden"
        animate="show"
      >
        {/* Profile */}
        <motion.div variants={itemVariants}>
          <Paper sx={{ p: 3, mb: 3 }}>
            <Typography variant="h6" fontWeight={700} sx={{ mb: 2.5 }}>Profile</Typography>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 2.5, mb: 3 }}>
              <Avatar
                sx={{
                  width: 64, height: 64,
                  background: 'linear-gradient(135deg, #6366f1, #22d3ee)',
                  fontSize: 24, fontWeight: 700,
                }}
              >
                {user?.full_name?.[0] || 'B'}
              </Avatar>
              <Box>
                <Typography variant="h6" fontWeight={700}>{user?.full_name}</Typography>
                <Typography variant="body2" color="text.secondary">{user?.email}</Typography>
                {user?.created_at && (
                  <Typography variant="caption" color="text.disabled">
                    Member since {format(new Date(user.created_at), 'MMMM yyyy')}
                  </Typography>
                )}
              </Box>
            </Box>
            <Divider sx={{ mb: 2 }} />
            <Box sx={{ display: 'flex', gap: 1.5, flexWrap: 'wrap' }}>
              <Chip
                label="Active account"
                size="small"
                sx={{ bgcolor: alpha('#10b981', 0.1), color: '#10b981', border: `1px solid ${alpha('#10b981', 0.2)}` }}
              />
            </Box>
          </Paper>
        </motion.div>

        {/* AI Configuration */}
        <motion.div variants={itemVariants}>
          <Paper sx={{ p: 3, mb: 3 }}>
            <Typography variant="h6" fontWeight={700} sx={{ mb: 2 }}>AI Configuration</Typography>
            <Grid container spacing={2}>
              {[
                { label: 'Primary Model', value: 'Gemini 2.5 Flash', desc: 'General conversations' },
                { label: 'Vision Model', value: 'Gemini 2.5 Pro', desc: 'Image analysis' },
                { label: 'RAG Model', value: 'Gemini 2.5 Pro', desc: 'Document Q&A' },
                { label: 'Embeddings', value: 'text-embedding-004', desc: 'Vector search' },
              ].map((item) => (
                <Grid item xs={12} sm={6} key={item.label}>
                  <Box
                    sx={{
                      p: 1.5, borderRadius: 2,
                      bgcolor: (t) => alpha(t.palette.primary.main, 0.04),
                      border: (t) => `1px solid ${alpha(t.palette.primary.main, 0.1)}`,
                    }}
                  >
                    <Typography variant="caption" color="text.secondary">{item.label}</Typography>
                    <Typography variant="body2" fontWeight={600}>{item.value}</Typography>
                    <Typography variant="caption" color="text.disabled">{item.desc}</Typography>
                  </Box>
                </Grid>
              ))}
            </Grid>
          </Paper>
        </motion.div>

        {/* About */}
        <motion.div variants={itemVariants}>
          <Paper
            sx={{
              p: 3, mb: 3,
              background: (t) => `linear-gradient(135deg, ${alpha(t.palette.primary.main, 0.05)}, transparent)`,
            }}
          >
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, mb: 2 }}>
              <Box
                sx={{
                  width: 40, height: 40, borderRadius: '12px',
                  background: 'linear-gradient(135deg, #6366f1, #22d3ee)',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                }}
              >
                <AIIcon sx={{ color: '#fff', fontSize: 20 }} />
              </Box>
              <Box>
                <Typography variant="h6" fontWeight={700}>Bhavvi AI Assistant</Typography>
                <Typography variant="caption" color="text.secondary">Version 1.0.0 · Final Year Capstone Project</Typography>
              </Box>
            </Box>
            <Typography variant="body2" color="text.secondary">
              A production-ready multi-agent multimodal AI assistant powered by Google Gemini 2.5,
              LangGraph, and Retrieval-Augmented Generation.
            </Typography>
          </Paper>
        </motion.div>

        {/* Sign out */}
        <motion.div variants={itemVariants}>
          <Paper sx={{ p: 3, border: (t) => `1px solid ${alpha('#ef4444', 0.2)}`, bgcolor: alpha('#ef4444', 0.02) }}>
            <Typography variant="h6" fontWeight={700} sx={{ mb: 1 }}>Danger Zone</Typography>
            <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
              Signing out will clear your local session. Your data is safely stored in the cloud.
            </Typography>
            <Button
              variant="outlined"
              color="error"
              startIcon={<LogoutIcon />}
              onClick={handleLogout}
              sx={{ borderRadius: 2 }}
            >
              Sign out
            </Button>
          </Paper>
        </motion.div>
      </motion.div>
    </Box>
  );
}
