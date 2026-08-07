import { createTheme, alpha } from '@mui/material/styles';

// ── Color Palette ─────────────────────────────────────────────────────────────
const colors = {
  // Primary: Electric Indigo
  primary: {
    50: '#eef2ff',
    100: '#e0e7ff',
    200: '#c7d2fe',
    300: '#a5b4fc',
    400: '#818cf8',
    500: '#6366f1',
    600: '#4f46e5',
    700: '#4338ca',
    800: '#3730a3',
    900: '#312e81',
  },
  // Accent: Cyan
  cyan: {
    400: '#22d3ee',
    500: '#06b6d4',
    600: '#0891b2',
  },
  // Neutrals
  dark: {
    50: '#f8fafc',
    100: '#f1f5f9',
    200: '#e2e8f0',
    300: '#cbd5e1',
    400: '#94a3b8',
    500: '#64748b',
    600: '#475569',
    700: '#334155',
    800: '#1e293b',
    850: '#131c2e',
    900: '#0f172a',
    950: '#0a0f1e',
  },
  success: '#10b981',
  warning: '#f59e0b',
  error: '#ef4444',
};

// ── Dark Theme ────────────────────────────────────────────────────────────────
export const darkTheme = createTheme({
  palette: {
    mode: 'dark',
    primary: {
      main: colors.primary[500],
      light: colors.primary[400],
      dark: colors.primary[700],
      contrastText: '#ffffff',
    },
    secondary: {
      main: colors.cyan[400],
      light: '#67e8f9',
      dark: colors.cyan[600],
    },
    background: {
      default: colors.dark[950],
      paper: colors.dark[900],
    },
    surface: colors.dark[850],
    text: {
      primary: '#f1f5f9',
      secondary: colors.dark[400],
      disabled: colors.dark[600],
    },
    divider: alpha('#6366f1', 0.12),
    error: { main: colors.error },
    warning: { main: colors.warning },
    success: { main: colors.success },
  },
  typography: {
    fontFamily: '"Inter", "Roboto", system-ui, sans-serif',
    h1: { fontWeight: 800, letterSpacing: '-0.025em' },
    h2: { fontWeight: 700, letterSpacing: '-0.02em' },
    h3: { fontWeight: 700, letterSpacing: '-0.015em' },
    h4: { fontWeight: 600, letterSpacing: '-0.01em' },
    h5: { fontWeight: 600 },
    h6: { fontWeight: 600 },
    body1: { lineHeight: 1.7 },
    body2: { lineHeight: 1.6 },
    code: {
      fontFamily: '"JetBrains Mono", "Fira Code", monospace',
      fontSize: '0.875em',
    },
  },
  shape: {
    borderRadius: 12,
  },
  components: {
    MuiCssBaseline: {
      styleOverrides: `
        * { box-sizing: border-box; }
        
        :root {
          --scrollbar-width: 6px;
          --scrollbar-track: ${colors.dark[900]};
          --scrollbar-thumb: ${colors.dark[700]};
          --scrollbar-thumb-hover: ${colors.primary[600]};
        }

        ::-webkit-scrollbar { width: var(--scrollbar-width); height: var(--scrollbar-width); }
        ::-webkit-scrollbar-track { background: var(--scrollbar-track); }
        ::-webkit-scrollbar-thumb { background: var(--scrollbar-thumb); border-radius: 4px; }
        ::-webkit-scrollbar-thumb:hover { background: var(--scrollbar-thumb-hover); }

        html { scroll-behavior: smooth; }
        body { overflow: hidden; }
        
        ::selection { background: ${alpha(colors.primary[500], 0.35)}; }
      `,
    },
    MuiButton: {
      styleOverrides: {
        root: {
          textTransform: 'none',
          fontWeight: 600,
          borderRadius: 10,
          letterSpacing: '0.01em',
          transition: 'all 0.2s cubic-bezier(0.4, 0, 0.2, 1)',
        },
        containedPrimary: {
          background: `linear-gradient(135deg, ${colors.primary[500]}, ${colors.primary[600]})`,
          boxShadow: `0 4px 14px ${alpha(colors.primary[500], 0.4)}`,
          '&:hover': {
            background: `linear-gradient(135deg, ${colors.primary[400]}, ${colors.primary[500]})`,
            boxShadow: `0 6px 20px ${alpha(colors.primary[500], 0.5)}`,
            transform: 'translateY(-1px)',
          },
        },
      },
    },
    MuiPaper: {
      styleOverrides: {
        root: {
          backgroundImage: 'none',
          border: `1px solid ${alpha('#6366f1', 0.08)}`,
        },
      },
    },
    MuiTextField: {
      styleOverrides: {
        root: {
          '& .MuiOutlinedInput-root': {
            borderRadius: 12,
            '&:hover .MuiOutlinedInput-notchedOutline': {
              borderColor: colors.primary[500],
            },
            '&.Mui-focused .MuiOutlinedInput-notchedOutline': {
              borderColor: colors.primary[400],
              borderWidth: '2px',
            },
          },
        },
      },
    },
    MuiChip: {
      styleOverrides: {
        root: { borderRadius: 8, fontWeight: 500 },
      },
    },
    MuiTooltip: {
      styleOverrides: {
        tooltip: {
          backgroundColor: colors.dark[800],
          border: `1px solid ${alpha('#6366f1', 0.2)}`,
          borderRadius: 8,
          fontSize: '0.75rem',
        },
      },
    },
    MuiListItemButton: {
      styleOverrides: {
        root: {
          borderRadius: 10,
          transition: 'all 0.15s ease',
          '&:hover': {
            backgroundColor: alpha(colors.primary[500], 0.08),
          },
          '&.Mui-selected': {
            backgroundColor: alpha(colors.primary[500], 0.15),
            '&:hover': { backgroundColor: alpha(colors.primary[500], 0.2) },
          },
        },
      },
    },
  },
});

// ── Light Theme ───────────────────────────────────────────────────────────────
export const lightTheme = createTheme({
  ...darkTheme,
  palette: {
    mode: 'light',
    primary: darkTheme.palette.primary,
    secondary: darkTheme.palette.secondary,
    background: {
      default: '#f8fafc',
      paper: '#ffffff',
    },
    text: {
      primary: '#0f172a',
      secondary: '#64748b',
    },
    divider: alpha('#6366f1', 0.1),
    error: { main: colors.error },
    warning: { main: colors.warning },
    success: { main: colors.success },
  },
  components: {
    ...darkTheme.components,
    MuiCssBaseline: {
      styleOverrides: `
        @import url('https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700;800&family=JetBrains+Mono:wght@400;500&display=swap');
        * { box-sizing: border-box; }
        :root { --scrollbar-track: #f1f5f9; --scrollbar-thumb: #cbd5e1; }
        ::-webkit-scrollbar { width: 6px; }
        ::-webkit-scrollbar-track { background: var(--scrollbar-track); }
        ::-webkit-scrollbar-thumb { background: var(--scrollbar-thumb); border-radius: 4px; }
        html { scroll-behavior: smooth; }
        body { overflow: hidden; }
      `,
    },
  },
});
