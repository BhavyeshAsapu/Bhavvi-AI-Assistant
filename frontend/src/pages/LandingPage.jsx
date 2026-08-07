import { useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Box, Button, Typography, Chip, Grid } from '@mui/material';
import { motion, useScroll, useTransform, AnimatePresence } from 'framer-motion';
import { alpha } from '@mui/material/styles';
import {
  AutoAwesome as AIIcon,
  Psychology as BrainIcon,
  Visibility as VisionIcon,
  Search as RAGIcon,
  Speed as SpeedIcon,
  Source as SourceIcon,
  Memory as MemoryIcon,
  ArrowForward as ArrowIcon,
  GitHub as GitHubIcon,
  Code as CodeIcon,
  KeyboardArrowDown as ScrollIcon,
} from '@mui/icons-material';
import useAuthStore from '../store/authStore';

// ── Animated Aurora Background ────────────────────────────────────────────────
function AuroraBackground() {
  return (
    <Box sx={{ position: 'fixed', inset: 0, overflow: 'hidden', zIndex: 0, pointerEvents: 'none' }}>
      {/* Base dark gradient */}
      <Box sx={{
        position: 'absolute', inset: 0,
        background: 'radial-gradient(ellipse at 50% 0%, #0d0c2c 0%, #0a0f1e 60%)',
      }} />
      {/* Aurora orbs */}
      {[
        { x: '15%', y: '20%', color: 'rgba(99,102,241,0.18)', size: 700, dur: 18 },
        { x: '80%', y: '15%', color: 'rgba(34,211,238,0.12)', size: 600, dur: 22 },
        { x: '60%', y: '60%', color: 'rgba(139,92,246,0.1)', size: 500, dur: 16 },
        { x: '20%', y: '70%', color: 'rgba(99,102,241,0.08)', size: 400, dur: 20 },
        { x: '90%', y: '80%', color: 'rgba(16,185,129,0.06)', size: 350, dur: 25 },
      ].map((orb, i) => (
        <motion.div
          key={i}
          style={{
            position: 'absolute',
            borderRadius: '50%',
            background: `radial-gradient(circle, ${orb.color} 0%, transparent 70%)`,
            width: orb.size,
            height: orb.size,
            left: orb.x,
            top: orb.y,
            transform: 'translate(-50%, -50%)',
            filter: 'blur(40px)',
          }}
          animate={{
            scale: [1, 1.2, 0.9, 1.1, 1],
            x: [0, 30, -20, 15, 0],
            y: [0, -20, 30, -10, 0],
          }}
          transition={{ duration: orb.dur, repeat: Infinity, ease: 'easeInOut' }}
        />
      ))}
      {/* Subtle grid overlay */}
      <Box sx={{
        position: 'absolute', inset: 0,
        backgroundImage: `
          linear-gradient(rgba(99,102,241,0.03) 1px, transparent 1px),
          linear-gradient(90deg, rgba(99,102,241,0.03) 1px, transparent 1px)
        `,
        backgroundSize: '60px 60px',
      }} />
    </Box>
  );
}

// ── Floating particles ────────────────────────────────────────────────────────
function FloatingParticles() {
  const particles = Array.from({ length: 20 }, (_, i) => ({
    id: i,
    x: Math.random() * 100,
    y: Math.random() * 100,
    size: Math.random() * 4 + 1,
    dur: Math.random() * 15 + 10,
    delay: Math.random() * 5,
  }));
  return (
    <Box sx={{ position: 'fixed', inset: 0, overflow: 'hidden', zIndex: 0, pointerEvents: 'none' }}>
      {particles.map((p) => (
        <motion.div
          key={p.id}
          style={{
            position: 'absolute',
            left: `${p.x}%`,
            top: `${p.y}%`,
            width: p.size,
            height: p.size,
            borderRadius: '50%',
            background: 'rgba(99,102,241,0.6)',
            boxShadow: '0 0 6px rgba(99,102,241,0.8)',
          }}
          animate={{ y: [-20, 20], opacity: [0, 0.8, 0] }}
          transition={{ duration: p.dur, delay: p.delay, repeat: Infinity, ease: 'easeInOut' }}
        />
      ))}
    </Box>
  );
}

// ── Feature cards ─────────────────────────────────────────────────────────────
const FEATURES = [
  { icon: <BrainIcon />, label: 'Multi-Agent AI', desc: 'Planner, General, Vision, and RAG agents work in parallel to craft the perfect response.', color: '#6366f1' },
  { icon: <VisionIcon />, label: 'Image Understanding', desc: 'Upload photos, diagrams, charts, or screenshots. Gemini Vision analyzes them deeply.', color: '#22d3ee' },
  { icon: <RAGIcon />, label: 'PDF & Document RAG', desc: 'Upload PDFs, PPTX, DOCX and ask questions. Sources are cited with relevance scores.', color: '#10b981' },
  { icon: <MemoryIcon />, label: 'Long-Term Memory', desc: 'Conversations are remembered across sessions with indexed history.', color: '#f59e0b' },
  { icon: <SourceIcon />, label: 'Source Citations', desc: 'Every RAG answer shows exactly which document and page the answer came from.', color: '#ec4899' },
  { icon: <SpeedIcon />, label: 'Streaming Responses', desc: 'Token-by-token streaming for a fast, real-time feel. No waiting for full responses.', color: '#8b5cf6' },
  { icon: <AIIcon />, label: 'Gemini 2.5 Powered', desc: 'Backed by Google\'s most capable models — Flash for speed, Pro for complex tasks.', color: '#06b6d4' },
  { icon: <CodeIcon />, label: 'Code Intelligence', desc: 'Full syntax highlighting, code block detection, and programming assistance built in.', color: '#6366f1' },
];

const TECH_STACK = [
  { name: 'React', color: '#61dafb', desc: 'UI Framework' },
  { name: 'FastAPI', color: '#009688', desc: 'Backend API' },
  { name: 'Gemini 2.5', color: '#4285f4', desc: 'AI Model' },
  { name: 'LangGraph', color: '#ff6b6b', desc: 'Agent Orchestration' },
  { name: 'LangChain', color: '#1c9e51', desc: 'LLM Framework' },
  { name: 'MongoDB', color: '#4db33d', desc: 'Database' },
  { name: 'ChromaDB', color: '#f97316', desc: 'Vector Store' },
  { name: 'Material UI', color: '#007fff', desc: 'UI Library' },
];

const WORKFLOW_STEPS = [
  { label: 'User', sub: 'Sends message + files', color: '#6366f1', icon: '👤' },
  { label: 'Planner Agent', sub: 'Routes to specialists', color: '#8b5cf6', icon: '🧠' },
  { label: 'Specialist Agents', sub: 'General · Vision · RAG', color: '#22d3ee', icon: '⚡', parallel: true },
  { label: 'Response Agent', sub: 'Synthesizes & cites', color: '#10b981', icon: '✨' },
  { label: 'You', sub: 'Receives cited answer', color: '#6366f1', icon: '💬' },
];

// ── Section wrapper ───────────────────────────────────────────────────────────
function Section({ children, id, center = false }) {
  return (
    <Box
      id={id}
      component="section"
      sx={{
        position: 'relative', zIndex: 1,
        py: { xs: 10, md: 14 },
        px: { xs: 3, md: 6, lg: 10 },
        textAlign: center ? 'center' : 'left',
      }}
    >
      {children}
    </Box>
  );
}

function SectionLabel({ children }) {
  return (
    <Chip
      label={children}
      sx={{
        mb: 2.5, height: 28, fontSize: '0.75rem', fontWeight: 700,
        background: 'linear-gradient(135deg, rgba(99,102,241,0.2), rgba(34,211,238,0.15))',
        border: '1px solid rgba(99,102,241,0.3)',
        color: '#a5b4fc', letterSpacing: '0.08em', textTransform: 'uppercase',
      }}
    />
  );
}

// ── Navbar ────────────────────────────────────────────────────────────────────
function Navbar({ onLogin, onRegister }) {
  const [scrolled, setScrolled] = useState(false);
  useEffect(() => {
    const h = () => setScrolled(window.scrollY > 20);
    window.addEventListener('scroll', h);
    return () => window.removeEventListener('scroll', h);
  }, []);
  return (
    <Box
      component="nav"
      sx={{
        position: 'fixed', top: 0, left: 0, right: 0, zIndex: 100,
        px: { xs: 3, md: 6 }, py: 2,
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        background: scrolled ? 'rgba(10,15,30,0.85)' : 'transparent',
        backdropFilter: scrolled ? 'blur(20px)' : 'none',
        borderBottom: scrolled ? '1px solid rgba(99,102,241,0.1)' : 'none',
        transition: 'all 0.3s ease',
      }}
    >
      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
        <Box sx={{
          width: 36, height: 36, borderRadius: '10px',
          background: 'linear-gradient(135deg, #6366f1, #22d3ee)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          boxShadow: '0 4px 12px rgba(99,102,241,0.4)',
        }}>
          <AIIcon sx={{ color: '#fff', fontSize: 20 }} />
        </Box>
        <Typography fontWeight={800} fontSize="1.1rem" sx={{ color: '#f1f5f9', letterSpacing: '-0.01em' }}>
          Bhavvi AI
        </Typography>
      </Box>
      <Box sx={{ display: 'flex', gap: 1.5, alignItems: 'center' }}>
        <Button onClick={onLogin} variant="text" sx={{ color: '#94a3b8', fontWeight: 600, '&:hover': { color: '#f1f5f9' } }}>
          Sign in
        </Button>
        <Button onClick={onRegister} variant="contained" size="small" sx={{ borderRadius: 2, fontWeight: 700 }}>
          Get Started →
        </Button>
      </Box>
    </Box>
  );
}

// ── MAIN LANDING PAGE ─────────────────────────────────────────────────────────
export default function LandingPage() {
  const navigate = useNavigate();
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated);

  useEffect(() => {
    if (isAuthenticated) navigate('/chat');
  }, [isAuthenticated]);

  return (
    <Box sx={{ minHeight: '100vh', background: '#0a0f1e', color: '#f1f5f9', overflow: 'auto', height: '100vh' }}>
      <AuroraBackground />
      <FloatingParticles />
      <Navbar onLogin={() => navigate('/login')} onRegister={() => navigate('/register')} />

      {/* ── HERO ────────────────────────────────────────────────────────────── */}
      <Box
        sx={{
          position: 'relative', zIndex: 1,
          minHeight: '100vh',
          display: 'flex', flexDirection: 'column',
          alignItems: 'center', justifyContent: 'center',
          textAlign: 'center', px: 3,
          pt: 8,
        }}
      >
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2, duration: 0.7 }}>
          <Chip
            label="✨ Powered by Google Gemini 2.5"
            sx={{
              mb: 4, height: 32, fontSize: '0.8rem', fontWeight: 700,
              background: 'linear-gradient(135deg, rgba(99,102,241,0.25), rgba(34,211,238,0.2))',
              border: '1px solid rgba(99,102,241,0.4)',
              color: '#a5b4fc',
            }}
          />
        </motion.div>

        <motion.div initial={{ opacity: 0, y: 30 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.35, duration: 0.8 }}>
          <Typography
            variant="h1"
            sx={{
              fontSize: { xs: '2.8rem', md: '4.5rem', lg: '5.5rem' },
              fontWeight: 900,
              letterSpacing: '-0.04em',
              lineHeight: 1.05,
              mb: 3,
              background: 'linear-gradient(135deg, #ffffff 0%, #a5b4fc 50%, #22d3ee 100%)',
              WebkitBackgroundClip: 'text',
              WebkitTextFillColor: 'transparent',
              backgroundClip: 'text',
            }}
          >
            Bhavvi AI Assistant
          </Typography>
        </motion.div>

        <motion.div initial={{ opacity: 0, y: 30 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.5, duration: 0.7 }}>
          <Typography
            variant="h6"
            sx={{
              maxWidth: 640,
              mx: 'auto',
              color: '#94a3b8',
              fontWeight: 400,
              lineHeight: 1.7,
              fontSize: { xs: '1rem', md: '1.2rem' },
              mb: 5,
            }}
          >
            A Multi-Agent Multimodal AI Assistant powered by{' '}
            <Box component="span" sx={{ color: '#a5b4fc', fontWeight: 600 }}>Google Gemini</Box>,{' '}
            <Box component="span" sx={{ color: '#22d3ee', fontWeight: 600 }}>Vision AI</Box>, and{' '}
            <Box component="span" sx={{ color: '#10b981', fontWeight: 600 }}>Retrieval-Augmented Generation</Box>.
          </Typography>
        </motion.div>

        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.65, duration: 0.6 }}>
          <Box sx={{ display: 'flex', gap: 2, justifyContent: 'center', flexWrap: 'wrap' }}>
            <Button
              variant="contained"
              size="large"
              onClick={() => navigate('/register')}
              endIcon={<ArrowIcon />}
              sx={{
                px: 4, py: 1.75, fontSize: '1rem', fontWeight: 700, borderRadius: 3,
                background: 'linear-gradient(135deg, #6366f1, #4f46e5)',
                boxShadow: '0 8px 24px rgba(99,102,241,0.45)',
                '&:hover': { boxShadow: '0 12px 32px rgba(99,102,241,0.6)', transform: 'translateY(-2px)' },
                transition: 'all 0.2s ease',
              }}
            >
              Get Started Free
            </Button>
            <Button
              variant="outlined"
              size="large"
              onClick={() => navigate('/login')}
              sx={{
                px: 4, py: 1.75, fontSize: '1rem', fontWeight: 700, borderRadius: 3,
                borderColor: 'rgba(99,102,241,0.4)',
                color: '#a5b4fc',
                '&:hover': { borderColor: '#6366f1', background: 'rgba(99,102,241,0.08)' },
              }}
            >
              Sign In
            </Button>
          </Box>
        </motion.div>

        {/* Scroll hint */}
        <motion.div
          style={{ position: 'absolute', bottom: 40 }}
          animate={{ y: [0, 8, 0] }}
          transition={{ duration: 2, repeat: Infinity, ease: 'easeInOut' }}
        >
          <ScrollIcon sx={{ color: 'rgba(99,102,241,0.5)', fontSize: 32 }} />
        </motion.div>
      </Box>

      {/* ── FEATURES ─────────────────────────────────────────────────────────── */}
      <Section id="features" center>
        <SectionLabel>Capabilities</SectionLabel>
        <Typography variant="h2" fontWeight={800} sx={{ mb: 1.5, fontSize: { xs: '2rem', md: '3rem' }, letterSpacing: '-0.03em' }}>
          Everything you need in one AI
        </Typography>
        <Typography variant="body1" color="#64748b" sx={{ mb: 7, maxWidth: 520, mx: 'auto', lineHeight: 1.7 }}>
          Eight powerful agents working together to handle any task — from casual chat to complex document analysis.
        </Typography>
        <Grid container spacing={2.5} sx={{ maxWidth: 1100, mx: 'auto', textAlign: 'left' }}>
          {FEATURES.map((f, i) => (
            <Grid key={f.label} item xs={12} sm={6} md={3}>
              <motion.div
                initial={{ opacity: 0, y: 30 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: i * 0.07, duration: 0.5 }}
              >
                <Box
                  sx={{
                    p: 2.5, height: '100%', borderRadius: 3,
                    background: `linear-gradient(135deg, ${alpha(f.color, 0.07)}, rgba(10,15,30,0.5))`,
                    border: `1px solid ${alpha(f.color, 0.2)}`,
                    backdropFilter: 'blur(10px)',
                    '&:hover': {
                      transform: 'translateY(-4px)',
                      boxShadow: `0 12px 28px ${alpha(f.color, 0.2)}`,
                      borderColor: alpha(f.color, 0.4),
                    },
                    transition: 'all 0.25s cubic-bezier(0.4,0,0.2,1)',
                  }}
                >
                  <Box sx={{ width: 44, height: 44, borderRadius: 2, bgcolor: alpha(f.color, 0.15), display: 'flex', alignItems: 'center', justifyContent: 'center', color: f.color, mb: 2 }}>
                    {f.icon}
                  </Box>
                  <Typography variant="subtitle1" fontWeight={700} sx={{ mb: 1, color: '#f1f5f9' }}>{f.label}</Typography>
                  <Typography variant="body2" sx={{ color: '#64748b', lineHeight: 1.6 }}>{f.desc}</Typography>
                </Box>
              </motion.div>
            </Grid>
          ))}
        </Grid>
      </Section>

      {/* ── WORKFLOW ──────────────────────────────────────────────────────────── */}
      <Section id="workflow" center>
        <SectionLabel>Architecture</SectionLabel>
        <Typography variant="h2" fontWeight={800} sx={{ mb: 1.5, fontSize: { xs: '2rem', md: '3rem' }, letterSpacing: '-0.03em' }}>
          Multi-agent workflow
        </Typography>
        <Typography variant="body1" color="#64748b" sx={{ mb: 8, maxWidth: 480, mx: 'auto', lineHeight: 1.7 }}>
          Intelligent request routing — the Planner decides which agents to invoke, then synthesizes everything into a single coherent response.
        </Typography>
        <Box sx={{ maxWidth: 500, mx: 'auto', position: 'relative' }}>
          {WORKFLOW_STEPS.map((step, i) => (
            <motion.div
              key={step.label}
              initial={{ opacity: 0, x: i % 2 === 0 ? -20 : 20 }}
              whileInView={{ opacity: 1, x: 0 }}
              viewport={{ once: true }}
              transition={{ delay: i * 0.12, duration: 0.5 }}
            >
              <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center', mb: 0 }}>
                <Box
                  sx={{
                    px: 3, py: 2, borderRadius: 3,
                    background: step.parallel
                      ? `linear-gradient(135deg, rgba(34,211,238,0.1), rgba(99,102,241,0.1))`
                      : `linear-gradient(135deg, ${alpha(step.color, 0.1)}, ${alpha(step.color, 0.05)})`,
                    border: `1px solid ${alpha(step.color, step.parallel ? 0.4 : 0.25)}`,
                    backdropFilter: 'blur(8px)',
                    width: step.parallel ? '95%' : '80%',
                    textAlign: 'center',
                    position: 'relative',
                  }}
                >
                  <Typography variant="h5" sx={{ mb: 0.5 }}>{step.icon}</Typography>
                  <Typography variant="subtitle1" fontWeight={700} sx={{ color: step.parallel ? '#22d3ee' : '#f1f5f9' }}>
                    {step.label}
                  </Typography>
                  <Typography variant="caption" sx={{ color: '#64748b' }}>{step.sub}</Typography>
                  {step.parallel && (
                    <Chip label="Parallel Execution" size="small" sx={{ mt: 1, height: 18, fontSize: '0.65rem', bgcolor: alpha('#22d3ee', 0.15), color: '#22d3ee' }} />
                  )}
                </Box>
                {i < WORKFLOW_STEPS.length - 1 && (
                  <Box sx={{ height: 32, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    <motion.div
                      animate={{ scaleY: [0, 1, 0], opacity: [0, 1, 0] }}
                      transition={{ duration: 2, delay: i * 0.3, repeat: Infinity, ease: 'easeInOut' }}
                    >
                      <Box sx={{ width: 2, height: 28, background: `linear-gradient(to bottom, ${alpha(step.color, 0.6)}, ${alpha(WORKFLOW_STEPS[i + 1].color, 0.4)})`, borderRadius: 1 }} />
                    </motion.div>
                  </Box>
                )}
              </Box>
            </motion.div>
          ))}
        </Box>
      </Section>

      {/* ── TECH STACK ───────────────────────────────────────────────────────── */}
      <Section id="tech" center>
        <SectionLabel>Built With</SectionLabel>
        <Typography variant="h2" fontWeight={800} sx={{ mb: 1.5, fontSize: { xs: '2rem', md: '3rem' }, letterSpacing: '-0.03em' }}>
          Production-grade stack
        </Typography>
        <Typography variant="body1" color="#64748b" sx={{ mb: 7, maxWidth: 480, mx: 'auto' }}>
          Industry-standard tools and frameworks, assembled for a real-world AI product.
        </Typography>
        <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 2, justifyContent: 'center', maxWidth: 900, mx: 'auto' }}>
          {TECH_STACK.map((tech, i) => (
            <motion.div
              key={tech.name}
              initial={{ opacity: 0, scale: 0.8 }}
              whileInView={{ opacity: 1, scale: 1 }}
              viewport={{ once: true }}
              transition={{ delay: i * 0.06 }}
              whileHover={{ y: -4, scale: 1.05 }}
            >
              <Box
                sx={{
                  px: 2.5, py: 1.75, borderRadius: 2.5,
                  background: alpha(tech.color, 0.08),
                  border: `1px solid ${alpha(tech.color, 0.25)}`,
                  backdropFilter: 'blur(10px)',
                  minWidth: 120, textAlign: 'center',
                  cursor: 'default',
                }}
              >
                <Box sx={{ width: 10, height: 10, borderRadius: '50%', bgcolor: tech.color, mx: 'auto', mb: 1, boxShadow: `0 0 8px ${tech.color}` }} />
                <Typography variant="body2" fontWeight={700} sx={{ color: '#f1f5f9', mb: 0.25 }}>{tech.name}</Typography>
                <Typography variant="caption" sx={{ color: '#475569' }}>{tech.desc}</Typography>
              </Box>
            </motion.div>
          ))}
        </Box>
      </Section>

      {/* ── CTA ──────────────────────────────────────────────────────────────── */}
      <Section center>
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
        >
          <Box
            sx={{
              maxWidth: 700, mx: 'auto', p: { xs: 4, md: 7 },
              borderRadius: 5,
              background: 'linear-gradient(135deg, rgba(99,102,241,0.12), rgba(34,211,238,0.06))',
              border: '1px solid rgba(99,102,241,0.25)',
              backdropFilter: 'blur(20px)',
              position: 'relative', overflow: 'hidden',
            }}
          >
            <Box sx={{ position: 'absolute', top: -60, right: -60, width: 200, height: 200, borderRadius: '50%', background: 'radial-gradient(circle, rgba(99,102,241,0.15), transparent)', pointerEvents: 'none' }} />
            <Box sx={{ position: 'absolute', bottom: -40, left: -40, width: 160, height: 160, borderRadius: '50%', background: 'radial-gradient(circle, rgba(34,211,238,0.1), transparent)', pointerEvents: 'none' }} />
            <Typography variant="h3" fontWeight={800} sx={{ mb: 2, fontSize: { xs: '1.8rem', md: '2.5rem' }, letterSpacing: '-0.03em' }}>
              Start using Bhavvi AI today
            </Typography>
            <Typography variant="body1" sx={{ color: '#64748b', mb: 4, lineHeight: 1.7 }}>
              Free to use. No credit card required. Powered by the latest Gemini models.
            </Typography>
            <Box sx={{ display: 'flex', gap: 2, justifyContent: 'center', flexWrap: 'wrap' }}>
              <Button
                variant="contained" size="large"
                onClick={() => navigate('/register')}
                sx={{ px: 5, py: 1.75, fontSize: '1rem', fontWeight: 700, borderRadius: 3, boxShadow: '0 8px 24px rgba(99,102,241,0.4)' }}
              >
                Create Free Account
              </Button>
              <Button
                variant="text" size="large"
                onClick={() => navigate('/login')}
                sx={{ px: 4, py: 1.75, fontSize: '1rem', color: '#94a3b8', fontWeight: 600, '&:hover': { color: '#f1f5f9' } }}
              >
                Already have an account? →
              </Button>
            </Box>
          </Box>
        </motion.div>
      </Section>

      {/* ── FOOTER ───────────────────────────────────────────────────────────── */}
      <Box
        component="footer"
        sx={{
          position: 'relative', zIndex: 1,
          borderTop: '1px solid rgba(99,102,241,0.1)',
          py: 5, px: { xs: 3, md: 6 },
        }}
      >
        <Box sx={{ maxWidth: 1100, mx: 'auto', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 3 }}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
            <Box sx={{ width: 30, height: 30, borderRadius: '8px', background: 'linear-gradient(135deg, #6366f1, #22d3ee)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <AIIcon sx={{ color: '#fff', fontSize: 16 }} />
            </Box>
            <Box>
              <Typography variant="body2" fontWeight={700} sx={{ color: '#f1f5f9' }}>Bhavvi AI Assistant</Typography>
              <Typography variant="caption" sx={{ color: '#475569' }}>Final Year Capstone Project · 2026</Typography>
            </Box>
          </Box>
          <Box sx={{ display: 'flex', gap: 3 }}>
            {['About', 'Documentation', 'Contact'].map((item) => (
              <Typography
                key={item}
                variant="body2"
                sx={{ color: '#475569', cursor: 'pointer', fontWeight: 500, '&:hover': { color: '#a5b4fc' }, transition: 'color 0.15s' }}
              >
                {item}
              </Typography>
            ))}
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5, color: '#475569', cursor: 'pointer', '&:hover': { color: '#a5b4fc' }, transition: 'color 0.15s' }}>
              <GitHubIcon fontSize="small" />
              <Typography variant="body2" fontWeight={500}>GitHub</Typography>
            </Box>
          </Box>
          <Typography variant="caption" sx={{ color: '#334155' }}>
            Built with ❤️ using React, FastAPI & Gemini
          </Typography>
        </Box>
      </Box>
    </Box>
  );
}
