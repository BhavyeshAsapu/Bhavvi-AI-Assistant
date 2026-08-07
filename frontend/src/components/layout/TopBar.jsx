import { useState } from 'react';
import {
  AppBar, Toolbar, IconButton, Typography, Box,
  Tooltip, Switch, FormControlLabel, Avatar, Menu,
  MenuItem, Divider, Badge,
} from '@mui/material';
import {
  Menu as MenuIcon,
  DarkMode as DarkIcon,
  LightMode as LightIcon,
  Notifications as NotifyIcon,
  Logout as LogoutIcon,
  Person as PersonIcon,
  AutoAwesome as AIIcon,
} from '@mui/icons-material';
import { alpha } from '@mui/material/styles';
import { motion } from 'framer-motion';
import useAuthStore from '../../store/authStore';
import { useNavigate } from 'react-router-dom';

export default function TopBar({ onMenuToggle, height, darkMode, onThemeToggle }) {
  const [anchorEl, setAnchorEl] = useState(null);
  const logout = useAuthStore((s) => s.logout);
  const user = useAuthStore((s) => s.user);
  const navigate = useNavigate();

  const handleLogout = () => {
    setAnchorEl(null);
    logout();
    navigate('/login');
  };

  return (
    <AppBar
      position="static"
      elevation={0}
      sx={{
        height,
        background: (t) =>
          alpha(t.palette.background.paper, 0.7),
        backdropFilter: 'blur(20px)',
        borderBottom: (t) => `1px solid ${alpha(t.palette.primary.main, 0.08)}`,
        color: 'text.primary',
      }}
    >
      <Toolbar sx={{ height, minHeight: `${height}px !important`, gap: 1 }}>
        {/* Sidebar toggle */}
        <Tooltip title="Toggle sidebar">
          <IconButton
            onClick={onMenuToggle}
            size="small"
            sx={{
              color: 'text.secondary',
              '&:hover': { color: 'primary.main', background: (t) => alpha(t.palette.primary.main, 0.08) },
            }}
          >
            <MenuIcon />
          </IconButton>
        </Tooltip>

        {/* Breadcrumb / Title */}
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, flex: 1 }}>
          <Box
            sx={{
              display: 'flex',
              alignItems: 'center',
              gap: 0.75,
              px: 1.5,
              py: 0.5,
              borderRadius: 2,
              background: (t) => alpha(t.palette.primary.main, 0.06),
              border: (t) => `1px solid ${alpha(t.palette.primary.main, 0.12)}`,
            }}
          >
            <AIIcon sx={{ fontSize: 16, color: 'primary.main' }} />
            <Typography variant="body2" fontWeight={600} color="primary.main">
              Bhavvi AI Assistant
            </Typography>
          </Box>
        </Box>

        {/* Right actions */}
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
          {/* Theme toggle */}
          <Tooltip title={darkMode ? 'Light mode' : 'Dark mode'}>
            <IconButton
              size="small"
              onClick={onThemeToggle}
              sx={{ color: 'text.secondary', '&:hover': { color: 'primary.main' } }}
            >
              {darkMode ? <LightIcon fontSize="small" /> : <DarkIcon fontSize="small" />}
            </IconButton>
          </Tooltip>

          {/* User menu */}
          <Tooltip title="Account">
            <IconButton
              size="small"
              onClick={(e) => setAnchorEl(e.currentTarget)}
              sx={{ ml: 0.5 }}
            >
              <Avatar
                sx={{
                  width: 32,
                  height: 32,
                  background: 'linear-gradient(135deg, #6366f1, #22d3ee)',
                  fontSize: 13,
                  fontWeight: 700,
                }}
              >
                {user?.full_name?.[0] || 'B'}
              </Avatar>
            </IconButton>
          </Tooltip>

          <Menu
            anchorEl={anchorEl}
            open={Boolean(anchorEl)}
            onClose={() => setAnchorEl(null)}
            PaperProps={{
              sx: {
                mt: 1,
                minWidth: 200,
                backdropFilter: 'blur(20px)',
                background: (t) => alpha(t.palette.background.paper, 0.9),
              },
            }}
            transformOrigin={{ horizontal: 'right', vertical: 'top' }}
            anchorOrigin={{ horizontal: 'right', vertical: 'bottom' }}
          >
            <Box sx={{ px: 2, py: 1.5 }}>
              <Typography variant="subtitle2" fontWeight={700}>
                {user?.full_name}
              </Typography>
              <Typography variant="caption" color="text.secondary">
                {user?.email}
              </Typography>
            </Box>
            <Divider />
            <MenuItem onClick={() => { setAnchorEl(null); navigate('/settings'); }}>
              <PersonIcon fontSize="small" sx={{ mr: 1.5, color: 'text.secondary' }} />
              Settings
            </MenuItem>
            <Divider />
            <MenuItem onClick={handleLogout} sx={{ color: 'error.main' }}>
              <LogoutIcon fontSize="small" sx={{ mr: 1.5 }} />
              Sign out
            </MenuItem>
          </Menu>
        </Box>
      </Toolbar>
    </AppBar>
  );
}
