import { useNavigate } from 'react-router-dom';
import {
  Box, Grid, Paper, Typography, Button, Chip,
  LinearProgress, Skeleton, Avatar, IconButton,
} from '@mui/material';
import {
  Chat as ChatIcon,
  Description as DocIcon,
  AutoAwesome as AIIcon,
  TrendingUp as TrendIcon,
  ArrowForward as ArrowIcon,
  Psychology as BrainIcon,
  Visibility as VisionIcon,
  Search as RAGIcon,
  Memory as MemoryIcon,
  Add as AddIcon,
} from '@mui/icons-material';
import { motion } from 'framer-motion';
import { alpha } from '@mui/material/styles';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { sessionsApi, documentsApi, healthApi } from '../services/api';
import useAuthStore from '../store/authStore';
import { format } from 'date-fns';

const containerVariants = {
  hidden: {},
  show: { transition: { staggerChildren: 0.08 } },
};

const itemVariants = {
  hidden: { opacity: 0, y: 20 },
  show: { opacity: 1, y: 0, transition: { duration: 0.4, ease: [0.4, 0, 0.2, 1] } },
};

const AGENT_STATUS = [
  { name: 'Planner', icon: <BrainIcon />, color: '#6366f1', desc: 'Routes your requests' },
  { name: 'General', icon: <AIIcon />, color: '#22d3ee', desc: 'Chat & code' },
  { name: 'Vision', icon: <VisionIcon />, color: '#f59e0b', desc: 'Image analysis' },
  { name: 'RAG', icon: <RAGIcon />, color: '#10b981', desc: 'Document Q&A' },
  { name: 'Memory', icon: <MemoryIcon />, color: '#ec4899', desc: 'Conversation history' },
];

function StatCard({ icon, label, value, color, sub }) {
  return (
    <motion.div variants={itemVariants}>
      <Paper
        sx={{
          p: 3,
          height: '100%',
          background: (t) => `linear-gradient(135deg, ${alpha(color, 0.08)}, ${alpha(t.palette.background.paper, 0.5)})`,
          border: `1px solid ${alpha(color, 0.2)}`,
          position: 'relative',
          overflow: 'hidden',
          '&:hover': { transform: 'translateY(-2px)', boxShadow: `0 8px 24px ${alpha(color, 0.2)}` },
          transition: 'all 0.2s ease',
        }}
      >
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
          <Box>
            <Typography variant="body2" color="text.secondary" gutterBottom>{label}</Typography>
            <Typography variant="h3" fontWeight={800} sx={{ color }}>{value}</Typography>
            {sub && <Typography variant="caption" color="text.secondary">{sub}</Typography>}
          </Box>
          <Avatar sx={{ background: alpha(color, 0.15), color }}>{icon}</Avatar>
        </Box>
        <Box
          sx={{
            position: 'absolute', bottom: -20, right: -20,
            width: 80, height: 80, borderRadius: '50%',
            background: alpha(color, 0.06),
          }}
        />
      </Paper>
    </motion.div>
  );
}

export default function DashboardPage() {
  const navigate = useNavigate();
  const user = useAuthStore((s) => s.user);
  const queryClient = useQueryClient();

  const { data: sessionsData, isLoading: sessionsLoading } = useQuery({
    queryKey: ['sessions'],
    queryFn: () => sessionsApi.list().then((r) => r.data.sessions),
  });

  const { data: docsData, isLoading: docsLoading } = useQuery({
    queryKey: ['documents'],
    queryFn: () => documentsApi.list().then((r) => r.data.documents),
  });

  const { data: healthData } = useQuery({
    queryKey: ['health'],
    queryFn: () => healthApi.check().then((r) => r.data),
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
  const docs = docsData || [];
  const totalMessages = sessions.reduce((acc, s) => acc + s.message_count, 0);
  const readyDocs = docs.filter((d) => d.status === 'ready').length;
  const isBackendUp = healthData?.status === 'healthy';

  const greeting = () => {
    const h = new Date().getHours();
    if (h < 12) return 'Good morning';
    if (h < 17) return 'Good afternoon';
    return 'Good evening';
  };

  return (
    <Box sx={{ maxWidth: 1200, mx: 'auto' }}>
      <motion.div variants={containerVariants} initial="hidden" animate="show">
        {/* Header */}
        <motion.div variants={itemVariants}>
          <Box sx={{ mb: 4, display: 'flex', alignItems: 'flex-end', justifyContent: 'space-between', flexWrap: 'wrap', gap: 2 }}>
            <Box>
              <Typography variant="h4" fontWeight={800}>
                {greeting()}, {user?.full_name?.split(' ')[0] || 'there'} 👋
              </Typography>
              <Typography variant="body1" color="text.secondary" sx={{ mt: 0.5 }}>
                Your multi-agent AI assistant is ready.
              </Typography>
            </Box>
            <Button
              variant="contained"
              startIcon={<AddIcon />}
              size="large"
              onClick={() => createSession.mutate()}
              disabled={createSession.isPending}
              sx={{ borderRadius: 3 }}
            >
              New Conversation
            </Button>
          </Box>
        </motion.div>

        {/* Stats */}
        <Grid container spacing={2.5} sx={{ mb: 4 }}>
          <Grid item xs={6} md={3}>
            <StatCard icon={<ChatIcon />} label="Conversations" value={sessions.length} color="#6366f1" sub="all time" />
          </Grid>
          <Grid item xs={6} md={3}>
            <StatCard icon={<TrendIcon />} label="Messages sent" value={totalMessages} color="#22d3ee" sub="all time" />
          </Grid>
          <Grid item xs={6} md={3}>
            <StatCard icon={<DocIcon />} label="Documents" value={docs.length} color="#10b981" sub={`${readyDocs} indexed`} />
          </Grid>
          <Grid item xs={6} md={3}>
            <StatCard
              icon={<AIIcon />}
              label="AI Status"
              value={isBackendUp ? 'Online' : 'Offline'}
              color={isBackendUp ? '#10b981' : '#ef4444'}
              sub={healthData?.version ? `v${healthData.version}` : ''}
            />
          </Grid>
        </Grid>

        <Grid container spacing={3}>
          {/* Recent Conversations */}
          <Grid item xs={12} md={7}>
            <motion.div variants={itemVariants}>
              <Paper sx={{ p: 3, height: '100%' }}>
                <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2.5 }}>
                  <Typography variant="h6" fontWeight={700}>Recent Conversations</Typography>
                  <Button size="small" endIcon={<ArrowIcon />} onClick={() => navigate('/chat')}>
                    View all
                  </Button>
                </Box>
                {sessionsLoading ? (
                  [...Array(4)].map((_, i) => <Skeleton key={i} height={60} sx={{ mb: 1, borderRadius: 2 }} />)
                ) : sessions.length === 0 ? (
                  <Box sx={{ textAlign: 'center', py: 6 }}>
                    <ChatIcon sx={{ fontSize: 48, color: 'text.disabled', mb: 1 }} />
                    <Typography color="text.secondary">No conversations yet</Typography>
                    <Button variant="outlined" sx={{ mt: 2 }} onClick={() => createSession.mutate()}>
                      Start your first chat
                    </Button>
                  </Box>
                ) : (
                  sessions.slice(0, 6).map((session, i) => (
                    <motion.div
                      key={session.id}
                      initial={{ opacity: 0, x: -10 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: i * 0.06 }}
                    >
                      <Box
                        onClick={() => navigate(`/chat/${session.id}`)}
                        sx={{
                          p: 1.5,
                          borderRadius: 2,
                          cursor: 'pointer',
                          display: 'flex',
                          alignItems: 'center',
                          gap: 2,
                          mb: 0.5,
                          '&:hover': { background: (t) => alpha(t.palette.primary.main, 0.06) },
                          transition: 'background 0.15s ease',
                        }}
                      >
                        <Avatar sx={{ bgcolor: alpha('#6366f1', 0.12), color: 'primary.main', width: 38, height: 38 }}>
                          <ChatIcon fontSize="small" />
                        </Avatar>
                        <Box sx={{ flex: 1, minWidth: 0 }}>
                          <Typography variant="body2" fontWeight={600} noWrap>{session.title}</Typography>
                          <Typography variant="caption" color="text.secondary">
                            {session.message_count} messages · {session.last_message_at ? format(new Date(session.last_message_at), 'MMM d, h:mm a') : 'No messages yet'}
                          </Typography>
                        </Box>
                        <ArrowIcon sx={{ color: 'text.disabled', fontSize: 18 }} />
                      </Box>
                    </motion.div>
                  ))
                )}
              </Paper>
            </motion.div>
          </Grid>

          {/* Agent Status */}
          <Grid item xs={12} md={5}>
            <motion.div variants={itemVariants}>
              <Paper sx={{ p: 3, mb: 3 }}>
                <Typography variant="h6" fontWeight={700} sx={{ mb: 2 }}>AI Agents</Typography>
                {AGENT_STATUS.map((agent) => (
                  <Box key={agent.name} sx={{ display: 'flex', alignItems: 'center', gap: 2, mb: 1.5 }}>
                    <Avatar sx={{ width: 36, height: 36, bgcolor: alpha(agent.color, 0.12), color: agent.color }}>
                      {agent.icon}
                    </Avatar>
                    <Box sx={{ flex: 1 }}>
                      <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 0.25 }}>
                        <Typography variant="body2" fontWeight={600}>{agent.name}</Typography>
                        <Chip label="Ready" size="small" sx={{ height: 18, fontSize: '0.65rem', bgcolor: alpha('#10b981', 0.12), color: '#10b981' }} />
                      </Box>
                      <Typography variant="caption" color="text.secondary">{agent.desc}</Typography>
                    </Box>
                  </Box>
                ))}
              </Paper>
            </motion.div>

            {/* Document library snippet */}
            <motion.div variants={itemVariants}>
              <Paper sx={{ p: 3 }}>
                <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
                  <Typography variant="h6" fontWeight={700}>Documents</Typography>
                  <Button size="small" endIcon={<ArrowIcon />} onClick={() => navigate('/documents')}>
                    Manage
                  </Button>
                </Box>
                {docsLoading ? (
                  <Skeleton height={80} />
                ) : docs.length === 0 ? (
                  <Box sx={{ textAlign: 'center', py: 3 }}>
                    <DocIcon sx={{ fontSize: 36, color: 'text.disabled', mb: 1 }} />
                    <Typography variant="body2" color="text.secondary">No documents uploaded</Typography>
                  </Box>
                ) : (
                  docs.slice(0, 3).map((doc) => (
                    <Box key={doc.id} sx={{ display: 'flex', alignItems: 'center', gap: 1.5, mb: 1 }}>
                      <DocIcon sx={{ color: '#10b981', fontSize: 20 }} />
                      <Box sx={{ flex: 1, minWidth: 0 }}>
                        <Typography variant="body2" fontWeight={500} noWrap>{doc.original_filename}</Typography>
                        <Chip
                          label={doc.status}
                          size="small"
                          sx={{
                            height: 16, fontSize: '0.6rem',
                            bgcolor: doc.status === 'ready' ? alpha('#10b981', 0.12) : alpha('#f59e0b', 0.12),
                            color: doc.status === 'ready' ? '#10b981' : '#f59e0b',
                          }}
                        />
                      </Box>
                    </Box>
                  ))
                )}
              </Paper>
            </motion.div>
          </Grid>
        </Grid>
      </motion.div>
    </Box>
  );
}
