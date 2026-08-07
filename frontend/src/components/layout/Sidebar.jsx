import { useEffect, useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';

import {
  Box, List, ListItem, ListItemButton, ListItemIcon,
  ListItemText, Typography, Divider, IconButton, Tooltip,
  Skeleton, Avatar, Chip,
} from '@mui/material';
import Dashboard from '@mui/icons-material/Dashboard';
const DashboardIcon = Dashboard;
import Chat from '@mui/icons-material/Chat';

const ChatIcon = Chat;
import Description from '@mui/icons-material/Description';
const DocumentsIcon = Description;
import Settings from '@mui/icons-material/Settings';
const SettingsIcon = Settings;
import Add from '@mui/icons-material/Add';
const AddIcon = Add;
import ChevronLeft from '@mui/icons-material/ChevronLeft';
const CollapseIcon = ChevronLeft;
import AutoAwesome from '@mui/icons-material/AutoAwesome';
const AIIcon = AutoAwesome;
import CameraAlt from '@mui/icons-material/CameraAlt';
const VisionIcon = CameraAlt;
import Summarize from '@mui/icons-material/Summarize';
const SummarizeIcon = Summarize;
import Logout from '@mui/icons-material/Logout';
const LogoutIcon = Logout;
import { motion, AnimatePresence } from 'framer-motion';
import { alpha } from '@mui/material/styles';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { sessionsApi } from '../../services/api';
import useAuthStore from '../../store/authStore';
import { useNavigate as useNav } from 'react-router-dom';
import { format, isToday, isYesterday, subDays } from 'date-fns';

// ── Navigation items ──────────────────────────────────────────────────────────
const NAV_MAIN = [
  { label: 'Dashboard', icon: <DashboardIcon />, path: '/dashboard', color: '#6366f1' },
];

const NAV_TOOLS = [
  { label: 'Chat', icon: <ChatIcon />, path: '/chat', color: '#22d3ee' },
  { label: 'Image Understanding', icon: <VisionIcon />, path: '/image-understanding', color: '#f59e0b' },
  { label: 'Document Summarizer', icon: <SummarizeIcon />, path: '/document-summarizer', color: '#10b981' },
  { label: 'Documents', icon: <DocumentsIcon />, path: '/documents', color: '#8b5cf6' },
];

const NAV_BOTTOM = [
  { label: 'Settings', icon: <SettingsIcon />, path: '/settings', color: '#64748b' },
];

function groupSessionsByDate(sessions) {
  const today = [], yesterday = [], older = [];
  sessions.forEach((s) => {
    const date = s.last_message_at ? new Date(s.last_message_at) : new Date(s.created_at);
    if (isToday(date)) today.push(s);
    else if (isYesterday(date)) yesterday.push(s);
    else older.push(s);
  });
  return { today, yesterday, older };
}

function NavItem({ item, active }) {
  const navigate = useNavigate();
  return (
    <ListItem disablePadding sx={{ mb: 0.25 }}>
      <ListItemButton
        selected={active}
        onClick={() => navigate(item.path)}
        sx={{
          borderRadius: 2,
          py: 0.9,
          '&.Mui-selected': {
            bgcolor: (t) => alpha(item.color, 0.12),
            '&:hover': { bgcolor: (t) => alpha(item.color, 0.18) },
          },
          '&:hover': { bgcolor: (t) => alpha(item.color, 0.06) },
        }}
      >
        <ListItemIcon
          sx={{
            minWidth: 34,
            color: active ? item.color : 'text.secondary',
            transition: 'color 0.15s',
          }}
        >
          {item.icon}
        </ListItemIcon>
        <ListItemText
          primary={item.label}
          primaryTypographyProps={{
            variant: 'body2',
            fontWeight: active ? 700 : 500,
            color: active ? item.color : 'text.primary',
            noWrap: true,
          }}
        />
        {active && (
          <Box
            sx={{
              width: 3, height: 20, borderRadius: 2,
              bgcolor: item.color,
              boxShadow: `0 0 8px ${item.color}`,
            }}
          />
        )}
      </ListItemButton>
    </ListItem>
  );
}

export default function Sidebar({ open, width, onToggle }) {
  const navigate = useNavigate();
  const location = useLocation();
  const user = useAuthStore((s) => s.user);
  const logout = useAuthStore((s) => s.logout);
  const queryClient = useQueryClient();

  const { data: sessionsData, isLoading } = useQuery({
    queryKey: ['sessions'],
    queryFn: () => sessionsApi.list().then((r) => r.data.sessions),
    refetchInterval: 30000,
  });

  const createSession = useMutation({
    mutationFn: () => sessionsApi.create(),
    onSuccess: (data) => {
      queryClient.invalidateQueries(['sessions']);
      navigate(`/chat/${data.data.id}`);
    },
  });

  const sessions = sessionsData || [];
  const { today, yesterday, older } = groupSessionsByDate(sessions);

  const isActive = (path) => location.pathname === path || location.pathname.startsWith(path + '/');

  const handleLogout = () => { logout(); navigate('/'); };

  return (
    <motion.div
      animate={{ width: open ? width : 0 }}
      transition={{ duration: 0.28, ease: [0.4, 0, 0.2, 1] }}
      style={{ overflow: 'hidden', flexShrink: 0 }}
    >
      <Box
        sx={{
          width,
          height: '100vh',
          display: 'flex',
          flexDirection: 'column',
          background: (t) => alpha(t.palette.background.paper, 0.75),
          backdropFilter: 'blur(24px)',
          borderRight: (t) => `1px solid ${alpha(t.palette.primary.main, 0.1)}`,
          overflow: 'hidden',
        }}
      >
        {/* ── Logo & collapse ─────────────────────────────────────────────── */}
        <Box sx={{ px: 2, py: 1.75, display: 'flex', alignItems: 'center', justifyContent: 'space-between', minHeight: 64 }}>
          <Box
            sx={{ display: 'flex', alignItems: 'center', gap: 1.25, cursor: 'pointer' }}
            onClick={() => navigate('/dashboard')}
          >
            <Box
              sx={{
                width: 34, height: 34, borderRadius: '10px',
                background: 'linear-gradient(135deg, #6366f1, #22d3ee)',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                boxShadow: '0 3px 10px rgba(99,102,241,0.4)',
                flexShrink: 0,
              }}
            >
              <AIIcon sx={{ color: '#fff', fontSize: 18 }} />
            </Box>
            <Box>
              <Typography variant="subtitle2" fontWeight={800} lineHeight={1.1} sx={{ letterSpacing: '-0.01em' }}>
                Bhavvi AI
              </Typography>
              <Typography variant="caption" sx={{ color: 'text.disabled', fontSize: '0.65rem' }}>
                Assistant
              </Typography>
            </Box>
          </Box>
          <Tooltip title="Collapse sidebar" placement="right">
            <IconButton size="small" onClick={onToggle} sx={{ color: 'text.disabled', '&:hover': { color: 'text.primary' } }}>
              <CollapseIcon fontSize="small" />
            </IconButton>
          </Tooltip>
        </Box>

        {/* ── New Chat button ──────────────────────────────────────────────── */}
        <Box sx={{ px: 1.5, pb: 1 }}>
          <ListItemButton
            onClick={() => createSession.mutate()}
            disabled={createSession.isPending}
            sx={{
              borderRadius: 2.5,
              background: (t) => `linear-gradient(135deg, ${alpha(t.palette.primary.main, 0.13)}, ${alpha(t.palette.primary.main, 0.06)})`,
              border: (t) => `1px solid ${alpha(t.palette.primary.main, 0.2)}`,
              '&:hover': {
                background: (t) => `linear-gradient(135deg, ${alpha(t.palette.primary.main, 0.2)}, ${alpha(t.palette.primary.main, 0.1)})`,
                transform: 'translateY(-1px)',
                boxShadow: (t) => `0 4px 12px ${alpha(t.palette.primary.main, 0.2)}`,
              },
              transition: 'all 0.2s ease',
            }}
          >
            <AddIcon sx={{ color: 'primary.main', mr: 1, fontSize: 18 }} />
            <Typography fontWeight={700} color="primary.main" variant="body2">
              New Chat
            </Typography>
          </ListItemButton>
        </Box>

        {/* ── Main nav ────────────────────────────────────────────────────── */}
        <List dense sx={{ px: 1, pb: 0 }}>
          {NAV_MAIN.map((item) => <NavItem key={item.path} item={item} active={isActive(item.path)} />)}
        </List>

        <Divider sx={{ mx: 2, my: 1, borderColor: (t) => alpha(t.palette.primary.main, 0.08) }} />

        {/* ── Tools ───────────────────────────────────────────────────────── */}
        <Typography variant="caption" sx={{ px: 2.5, pb: 0.75, color: 'text.disabled', fontWeight: 700, letterSpacing: '0.08em', textTransform: 'uppercase', fontSize: '0.65rem' }}>
          AI Tools
        </Typography>
        <List dense sx={{ px: 1, pb: 0 }}>
          {NAV_TOOLS.map((item) => <NavItem key={item.path} item={item} active={isActive(item.path)} />)}
        </List>

        <Divider sx={{ mx: 2, my: 1, borderColor: (t) => alpha(t.palette.primary.main, 0.08) }} />

        {/* ── Recent conversations ─────────────────────────────────────────── */}
        <Typography variant="caption" sx={{ px: 2.5, pb: 0.75, color: 'text.disabled', fontWeight: 700, letterSpacing: '0.08em', textTransform: 'uppercase', fontSize: '0.65rem' }}>
          Recent
        </Typography>

        <Box sx={{ flex: 1, overflowY: 'auto', px: 1 }}>
          {isLoading ? (
            [...Array(4)].map((_, i) => (
              <Skeleton key={i} height={38} sx={{ borderRadius: 2, mb: 0.5, mx: 0.5 }} animation="wave" />
            ))
          ) : sessions.length === 0 ? (
            <Box sx={{ px: 1.5, py: 2 }}>
              <Typography variant="caption" color="text.disabled" sx={{ lineHeight: 1.6 }}>
                No conversations yet.
                <br />Start a new chat above!
              </Typography>
            </Box>
          ) : (
            <AnimatePresence>
              {[
                { label: 'Today', items: today },
                { label: 'Yesterday', items: yesterday },
                { label: 'Older', items: older },
              ].map(({ label, items }) =>
                items.length > 0 ? (
                  <Box key={label}>
                    <Typography variant="caption" sx={{ px: 1.5, py: 0.5, display: 'block', color: 'text.disabled', fontSize: '0.65rem', fontWeight: 600 }}>
                      {label}
                    </Typography>
                    {items.slice(0, label === 'Older' ? 10 : 20).map((session, i) => (
                      <motion.div
                        key={session.id}
                        initial={{ opacity: 0, x: -8 }}
                        animate={{ opacity: 1, x: 0 }}
                        transition={{ delay: i * 0.03 }}
                      >
                        <ListItemButton
                          selected={location.pathname === `/chat/${session.id}`}
                          onClick={() => navigate(`/chat/${session.id}`)}
                          sx={{
                            borderRadius: 2, mb: 0.25, py: 0.7,
                            '&.Mui-selected': { bgcolor: (t) => alpha(t.palette.primary.main, 0.1) },
                          }}
                        >
                          <ListItemText
                            primary={session.title}
                            secondary={`${session.message_count} msg`}
                            primaryTypographyProps={{ variant: 'body2', noWrap: true, fontWeight: 500, fontSize: '0.82rem' }}
                            secondaryTypographyProps={{ variant: 'caption', sx: { fontSize: '0.68rem' } }}
                          />
                        </ListItemButton>
                      </motion.div>
                    ))}
                  </Box>
                ) : null
              )}
            </AnimatePresence>
          )}
        </Box>

        {/* ── Settings ────────────────────────────────────────────────────── */}
        <List dense sx={{ px: 1, pt: 0 }}>
          {NAV_BOTTOM.map((item) => <NavItem key={item.path} item={item} active={isActive(item.path)} />)}
        </List>

        <Divider sx={{ mx: 2, borderColor: (t) => alpha(t.palette.primary.main, 0.08) }} />

        {/* ── User profile card ────────────────────────────────────────────── */}
        <Box
          sx={{
            p: 1.5,
            display: 'flex', alignItems: 'center', gap: 1.25,
            mx: 0.5, my: 0.5,
            borderRadius: 2.5,
            cursor: 'pointer',
            '&:hover': { bgcolor: (t) => alpha(t.palette.primary.main, 0.06) },
            transition: 'background 0.15s',
          }}
        >
          <Avatar
            onClick={() => navigate('/settings')}
            sx={{
              width: 34, height: 34, flexShrink: 0,
              background: 'linear-gradient(135deg, #6366f1, #22d3ee)',
              fontSize: 14, fontWeight: 800, cursor: 'pointer',
            }}
          >
            {user?.full_name?.[0]?.toUpperCase() || 'B'}
          </Avatar>
          <Box sx={{ flex: 1, minWidth: 0 }} onClick={() => navigate('/settings')}>
            <Typography variant="body2" fontWeight={700} noWrap sx={{ lineHeight: 1.2 }}>
              {user?.full_name || 'User'}
            </Typography>
            <Typography variant="caption" color="text.secondary" noWrap sx={{ fontSize: '0.7rem' }}>
              @{user?.username || user?.email?.split('@')[0] || 'user'}
            </Typography>
          </Box>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
            {/* Online dot */}
            <Box sx={{ width: 7, height: 7, borderRadius: '50%', bgcolor: '#10b981', boxShadow: '0 0 6px #10b981' }} />
            <Tooltip title="Sign out" placement="top">
              <IconButton
                size="small"
                onClick={handleLogout}
                sx={{ color: 'text.disabled', '&:hover': { color: '#ef4444' }, p: 0.5 }}
              >
                <LogoutIcon sx={{ fontSize: 16 }} />
              </IconButton>
            </Tooltip>
          </Box>
        </Box>
      </Box>
    </motion.div>
  );
}
