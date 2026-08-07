import { useState } from 'react';
import { Outlet } from 'react-router-dom';
import { Box } from '@mui/material';
import { alpha } from '@mui/material/styles';
import Sidebar from './Sidebar';
import TopBar from './TopBar';

const SIDEBAR_WIDTH = 260;
const TOPBAR_HEIGHT = 64;

export default function AppShell({ darkMode, onThemeToggle }) {
  const [sidebarOpen, setSidebarOpen] = useState(true);

  return (
    <Box
      sx={{
        display: 'flex',
        height: '100vh',
        overflow: 'hidden',
        background: (t) => t.palette.background.default,
      }}
    >
      {/* Sidebar */}
      <Sidebar
        open={sidebarOpen}
        width={SIDEBAR_WIDTH}
        onToggle={() => setSidebarOpen((prev) => !prev)}
      />

      {/* Main content area */}
      <Box
        component="main"
        sx={{
          flex: 1,
          display: 'flex',
          flexDirection: 'column',
          overflow: 'hidden',
          minWidth: 0,
        }}
      >
        <TopBar
          sidebarOpen={sidebarOpen}
          onMenuToggle={() => setSidebarOpen((prev) => !prev)}
          height={TOPBAR_HEIGHT}
          darkMode={darkMode}
          onThemeToggle={onThemeToggle}
        />
        <Box
          sx={{
            flex: 1,
            overflow: 'auto',
            p: { xs: 2, md: 3 },
          }}
        >
          <Outlet />
        </Box>
      </Box>
    </Box>
  );
}
