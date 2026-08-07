import { useEffect, useRef, useState, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  Box, Paper, Typography, IconButton, Tooltip, Chip,
  CircularProgress, Button, Skeleton,
} from '@mui/material';
import {
  Send as SendIcon,
  AttachFile as AttachIcon,
  AutoAwesome as AIIcon,
  StopCircle as StopIcon,
  Refresh as RegenerateIcon,
  ContentCopy as CopyIcon,
  Check as CheckIcon,
} from '@mui/icons-material';
import { motion, AnimatePresence } from 'framer-motion';
import { alpha } from '@mui/material/styles';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { Prism as SyntaxHighlighter } from 'react-syntax-highlighter';
import { vscDarkPlus } from 'react-syntax-highlighter/dist/esm/styles/prism';
import { sessionsApi, uploadApi } from '../services/api';
import { useChat } from '../hooks/useChat';
import useAuthStore from '../store/authStore';
import { useDropzone } from 'react-dropzone';
import { format } from 'date-fns';

// ── Typing indicator ──────────────────────────────────────────────────────────
function TypingIndicator() {
  return (
    <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5, p: 1 }}>
      {[0, 1, 2].map((i) => (
        <motion.div
          key={i}
          style={{ width: 8, height: 8, borderRadius: '50%', background: '#6366f1' }}
          animate={{ y: [0, -6, 0], opacity: [0.4, 1, 0.4] }}
          transition={{ duration: 0.8, delay: i * 0.2, repeat: Infinity, ease: 'easeInOut' }}
        />
      ))}
    </Box>
  );
}

// ── Source citation chip ──────────────────────────────────────────────────────
function SourceChip({ source, index }) {
  const [expanded, setExpanded] = useState(false);
  return (
    <Box>
      <Chip
        label={`${index + 1}. ${source.filename} ${source.page_number ? `p.${source.page_number}` : ''} (${Math.round(source.relevance_score * 100)}%)`}
        size="small"
        onClick={() => setExpanded((e) => !e)}
        sx={{
          height: 22, fontSize: '0.7rem', cursor: 'pointer',
          bgcolor: (t) => alpha(t.palette.success.main, 0.1),
          color: 'success.main',
          border: (t) => `1px solid ${alpha(t.palette.success.main, 0.2)}`,
          '&:hover': { bgcolor: (t) => alpha(t.palette.success.main, 0.18) },
        }}
      />
      <AnimatePresence>
        {expanded && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.2 }}
            style={{ overflow: 'hidden' }}
          >
            <Paper
              sx={{
                mt: 0.5, p: 1.5, fontSize: '0.75rem',
                bgcolor: (t) => alpha(t.palette.success.main, 0.05),
                border: (t) => `1px solid ${alpha(t.palette.success.main, 0.15)}`,
                borderRadius: 1.5,
                maxHeight: 120, overflowY: 'auto',
                color: 'text.secondary',
              }}
            >
              {source.chunk_text}
            </Paper>
          </motion.div>
        )}
      </AnimatePresence>
    </Box>
  );
}

// ── Message bubble ────────────────────────────────────────────────────────────
function MessageBubble({ message, isLast }) {
  const [copied, setCopied] = useState(false);
  const isUser = message.role === 'user';
  const isStreaming = message.isStreaming;

  const handleCopy = () => {
    navigator.clipboard.writeText(message.content);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3 }}
    >
      <Box
        sx={{
          display: 'flex',
          flexDirection: isUser ? 'row-reverse' : 'row',
          alignItems: 'flex-start',
          gap: 1.5,
          mb: 2.5,
          px: { xs: 0, md: 2 },
        }}
      >
        {/* Avatar */}
        {!isUser && (
          <Box
            sx={{
              width: 32, height: 32, flexShrink: 0, borderRadius: '10px',
              background: 'linear-gradient(135deg, #6366f1, #22d3ee)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              boxShadow: '0 2px 8px rgba(99,102,241,0.35)',
              mt: 0.5,
            }}
          >
            <AIIcon sx={{ color: '#fff', fontSize: 16 }} />
          </Box>
        )}

        <Box sx={{ flex: 1, maxWidth: isUser ? '75%' : '85%', ml: isUser ? 'auto' : 0 }}>
          {/* Message content */}
          <Paper
            elevation={0}
            sx={{
              p: isUser ? 1.5 : 2,
              borderRadius: isUser ? '18px 18px 4px 18px' : '4px 18px 18px 18px',
              background: isUser
                ? (t) => `linear-gradient(135deg, ${t.palette.primary.main}, ${t.palette.primary.dark})`
                : (t) => alpha(t.palette.background.paper, 0.8),
              border: isUser ? 'none' : (t) => `1px solid ${alpha(t.palette.primary.main, 0.1)}`,
              color: isUser ? '#fff' : 'text.primary',
              boxShadow: isUser
                ? '0 4px 12px rgba(99,102,241,0.3)'
                : '0 2px 8px rgba(0,0,0,0.15)',
              '& pre': { borderRadius: 2, overflow: 'auto', m: 0 },
              '& code': { fontFamily: '"JetBrains Mono", monospace', fontSize: '0.85em' },
              '& p': { m: 0, mb: 1, '&:last-child': { mb: 0 } },
              '& ul, & ol': { pl: 2, mb: 1 },
              '& h1, & h2, & h3': { mt: 1.5, mb: 0.5 },
              '& table': { borderCollapse: 'collapse', width: '100%' },
              '& th, & td': { border: '1px solid', borderColor: 'divider', p: 1 },
            }}
          >
            {isUser ? (
              <Typography variant="body1" sx={{ whiteSpace: 'pre-wrap' }}>{message.content}</Typography>
            ) : isStreaming ? (
              <Box>
                <ReactMarkdown remarkPlugins={[remarkGfm]}>{message.content || ''}</ReactMarkdown>
                <TypingIndicator />
              </Box>
            ) : (
              <ReactMarkdown
                remarkPlugins={[remarkGfm]}
                components={{
                  code({ node, inline, className, children, ...props }) {
                    const match = /language-(\w+)/.exec(className || '');
                    return !inline && match ? (
                      <SyntaxHighlighter style={vscDarkPlus} language={match[1]} PreTag="div" {...props}>
                        {String(children).replace(/\n$/, '')}
                      </SyntaxHighlighter>
                    ) : (
                      <code className={className} {...props}>{children}</code>
                    );
                  },
                }}
              >
                {message.content}
              </ReactMarkdown>
            )}
          </Paper>

          {/* Sources */}
          {!isStreaming && message.sources?.length > 0 && (
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.3 }}>
              <Box sx={{ mt: 1, display: 'flex', flexWrap: 'wrap', gap: 0.5 }}>
                {message.sources.map((s, i) => (
                  <SourceChip key={i} source={s} index={i} />
                ))}
              </Box>
            </motion.div>
          )}

          {/* Actions */}
          {!isUser && !isStreaming && (
            <Box sx={{ mt: 0.75, display: 'flex', alignItems: 'center', gap: 0.5, opacity: 0.6, '&:hover': { opacity: 1 }, transition: 'opacity 0.15s' }}>
              <Tooltip title={copied ? 'Copied!' : 'Copy'}>
                <IconButton size="small" onClick={handleCopy}>
                  {copied ? <CheckIcon sx={{ fontSize: 14, color: '#10b981' }} /> : <CopyIcon sx={{ fontSize: 14 }} />}
                </IconButton>
              </Tooltip>
              <Typography variant="caption" color="text.disabled">
                {message.created_at ? format(new Date(message.created_at), 'h:mm a') : ''}
              </Typography>
              {message.agent_trace && (
                <Chip
                  label={message.agent_trace.agents_used?.join(' + ')}
                  size="small"
                  sx={{ height: 18, fontSize: '0.6rem', bgcolor: (t) => alpha(t.palette.primary.main, 0.08) }}
                />
              )}
            </Box>
          )}
        </Box>
      </Box>
    </motion.div>
  );
}

// ── Suggested prompts ─────────────────────────────────────────────────────────
const SUGGESTED_PROMPTS = [
  { label: '🖼️ Analyze an image', prompt: 'I have an image I would like you to analyze.' },
  { label: '📄 Summarize a PDF', prompt: 'Please summarize the uploaded document.' },
  { label: '💡 Brainstorm ideas', prompt: 'Help me brainstorm creative ideas for a project.' },
  { label: '🧑‍💻 Help with code', prompt: 'Can you help me debug and improve my code?' },
];

// ── Main Chat Page ────────────────────────────────────────────────────────────
export default function ChatPage() {
  const { sessionId } = useParams();
  const navigate = useNavigate();
  const user = useAuthStore((s) => s.user);
  const queryClient = useQueryClient();
  const messagesEndRef = useRef(null);
  const inputRef = useRef(null);
  const fileInputRef = useRef(null);
  const [input, setInput] = useState('');
  const [attachedFiles, setAttachedFiles] = useState([]);
  const [uploadingFile, setUploadingFile] = useState(false);

  const { messages, isStreaming, error, sendMessage, loadMessages, clearMessages } = useChat();

  // Load messages when session changes
  useEffect(() => {
    if (sessionId) {
      loadMessages(sessionId);
    } else {
      clearMessages();
    }
  }, [sessionId]);

  // Auto-scroll to bottom
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, isStreaming]);

  const handleSend = async () => {
    if (!input.trim() || isStreaming || !sessionId) return;
    const msg = input.trim();
    const fileIds = attachedFiles.map((f) => f.id);
    setInput('');
    setAttachedFiles([]);
    await sendMessage(sessionId, msg, fileIds);
  };

  const handleKeyDown = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const handleFileUpload = async (file) => {
    if (!sessionId) return;
    setUploadingFile(true);
    try {
      const { data } = await uploadApi.upload(file, sessionId);
      setAttachedFiles((prev) => [...prev, {
        id: data.document.id,
        name: data.document.original_filename,
        type: data.document.document_type,
      }]);
    } catch (err) {
      console.error('Upload failed:', err);
    } finally {
      setUploadingFile(false);
    }
  };

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop: (files) => files.forEach(handleFileUpload),
    accept: {
      'application/pdf': ['.pdf'],
      'image/*': ['.jpg', '.jpeg', '.png', '.webp'],
    },
    noClick: true,
  });

  const isEmpty = messages.length === 0 && !isStreaming;

  return (
    <Box
      {...getRootProps()}
      sx={{
        height: '100%',
        display: 'flex',
        flexDirection: 'column',
        position: 'relative',
        maxWidth: 900,
        mx: 'auto',
        outline: 'none',
      }}
    >
      <input {...getInputProps()} />

      {/* Drag overlay */}
      <AnimatePresence>
        {isDragActive && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            style={{
              position: 'absolute',
              inset: 0,
              zIndex: 100,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              background: 'rgba(99,102,241,0.15)',
              backdropFilter: 'blur(4px)',
              border: '2px dashed #6366f1',
              borderRadius: 16,
            }}
          >
            <Box sx={{ textAlign: 'center' }}>
              <AttachIcon sx={{ fontSize: 48, color: 'primary.main', mb: 1 }} />
              <Typography variant="h6" color="primary">Drop files here</Typography>
            </Box>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Messages area */}
      <Box sx={{ flex: 1, overflowY: 'auto', pb: 2 }}>
        {!sessionId ? (
          /* No session selected */
          <Box
            sx={{
              height: '100%',
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              justifyContent: 'center',
              gap: 3,
              py: 8,
            }}
          >
            <Box
              sx={{
                width: 72, height: 72, borderRadius: '20px',
                background: 'linear-gradient(135deg, #6366f1, #22d3ee)',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                boxShadow: '0 8px 24px rgba(99,102,241,0.4)',
              }}
            >
              <AIIcon sx={{ color: '#fff', fontSize: 36 }} />
            </Box>
            <Box sx={{ textAlign: 'center' }}>
              <Typography variant="h5" fontWeight={700} gutterBottom>How can I help you?</Typography>
              <Typography variant="body1" color="text.secondary" sx={{ maxWidth: 400 }}>
                Select a conversation from the sidebar or start a new one to begin chatting with Bhavvi AI.
              </Typography>
            </Box>
            <Button variant="contained" size="large" onClick={() => navigate('/chat')}>
              Start New Conversation
            </Button>
          </Box>
        ) : isEmpty ? (
          /* Session selected but no messages */
          <Box
            sx={{
              height: '100%', display: 'flex', flexDirection: 'column',
              alignItems: 'center', justifyContent: 'center', gap: 4, py: 8,
            }}
          >
            <Box
              sx={{
                width: 64, height: 64, borderRadius: '18px',
                background: 'linear-gradient(135deg, #6366f1, #22d3ee)',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                boxShadow: '0 8px 24px rgba(99,102,241,0.4)',
              }}
            >
              <AIIcon sx={{ color: '#fff', fontSize: 30 }} />
            </Box>
            <Box sx={{ textAlign: 'center' }}>
              <Typography variant="h5" fontWeight={700} gutterBottom>Ready to assist</Typography>
              <Typography variant="body1" color="text.secondary">
                Ask me anything, upload a PDF, or share an image to get started.
              </Typography>
            </Box>
            <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1, justifyContent: 'center', maxWidth: 500 }}>
              {SUGGESTED_PROMPTS.map((p) => (
                <Chip
                  key={p.label}
                  label={p.label}
                  onClick={() => setInput(p.prompt)}
                  sx={{
                    cursor: 'pointer',
                    border: (t) => `1px solid ${alpha(t.palette.primary.main, 0.2)}`,
                    bgcolor: (t) => alpha(t.palette.primary.main, 0.05),
                    '&:hover': { bgcolor: (t) => alpha(t.palette.primary.main, 0.12) },
                    transition: 'all 0.15s',
                  }}
                />
              ))}
            </Box>
          </Box>
        ) : (
          /* Messages */
          <Box sx={{ py: 2 }}>
            {messages.map((msg, i) => (
              <MessageBubble key={msg.id || i} message={msg} isLast={i === messages.length - 1} />
            ))}
            <div ref={messagesEndRef} />
          </Box>
        )}
      </Box>

      {/* Input area */}
      {sessionId && (
        <Box sx={{ flexShrink: 0 }}>
          {/* Attached files */}
          <AnimatePresence>
            {attachedFiles.length > 0 && (
              <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }} exit={{ height: 0, opacity: 0 }}>
                <Box sx={{ display: 'flex', gap: 1, mb: 1, flexWrap: 'wrap' }}>
                  {attachedFiles.map((f) => (
                    <Chip
                      key={f.id}
                      label={f.name}
                      size="small"
                      onDelete={() => setAttachedFiles((prev) => prev.filter((x) => x.id !== f.id))}
                      icon={f.type === 'pdf' ? <span>📄</span> : <span>🖼️</span>}
                      sx={{ bgcolor: (t) => alpha(t.palette.primary.main, 0.1), border: (t) => `1px solid ${alpha(t.palette.primary.main, 0.2)}` }}
                    />
                  ))}
                  {uploadingFile && <CircularProgress size={20} sx={{ alignSelf: 'center' }} />}
                </Box>
              </motion.div>
            )}
          </AnimatePresence>

          <Paper
            sx={{
              p: 1.5,
              backdropFilter: 'blur(20px)',
              background: (t) => alpha(t.palette.background.paper, 0.8),
              border: (t) => `1px solid ${isStreaming ? t.palette.primary.main : alpha(t.palette.primary.main, 0.15)}`,
              borderRadius: 3,
              transition: 'border-color 0.2s',
            }}
          >
            <Box sx={{ display: 'flex', alignItems: 'flex-end', gap: 1 }}>
              <Box
                component="textarea"
                ref={inputRef}
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={handleKeyDown}
                placeholder={isStreaming ? 'Bhavvi AI is thinking...' : 'Ask Bhavvi AI anything...'}
                disabled={isStreaming}
                rows={1}
                sx={{
                  flex: 1,
                  background: 'transparent',
                  border: 'none',
                  outline: 'none',
                  resize: 'none',
                  fontFamily: 'Inter, sans-serif',
                  fontSize: '0.95rem',
                  color: 'text.primary',
                  lineHeight: 1.6,
                  py: 0.5,
                  px: 0.5,
                  maxHeight: 180,
                  overflowY: 'auto',
                  '&::placeholder': { color: 'text.disabled' },
                  '&:disabled': { opacity: 0.6 },
                }}
                style={{
                  height: 'auto',
                  minHeight: 36,
                }}
                onInput={(e) => {
                  e.target.style.height = 'auto';
                  e.target.style.height = `${Math.min(e.target.scrollHeight, 180)}px`;
                }}
              />

              {/* Upload button */}
              <Tooltip title="Attach file (PDF, image)">
                <IconButton
                  size="small"
                  component="label"
                  disabled={isStreaming || uploadingFile}
                  sx={{ color: 'text.secondary', '&:hover': { color: 'primary.main' } }}
                >
                  {uploadingFile ? <CircularProgress size={18} /> : <AttachIcon fontSize="small" />}
                  <input
                    type="file"
                    hidden
                    accept=".pdf,.jpg,.jpeg,.png,.webp"
                    onChange={(e) => e.target.files[0] && handleFileUpload(e.target.files[0])}
                  />
                </IconButton>
              </Tooltip>

              {/* Send button */}
              <Tooltip title={isStreaming ? 'Generating...' : 'Send (Enter)'}>
                <span>
                  <IconButton
                    onClick={handleSend}
                    disabled={(!input.trim() && attachedFiles.length === 0) || isStreaming}
                    sx={{
                      background: (t) =>
                        input.trim() || attachedFiles.length > 0
                          ? `linear-gradient(135deg, ${t.palette.primary.main}, ${t.palette.primary.dark})`
                          : undefined,
                      color: input.trim() || attachedFiles.length > 0 ? '#fff' : 'text.disabled',
                      '&:hover': {
                        background: (t) => `linear-gradient(135deg, ${t.palette.primary.light}, ${t.palette.primary.main})`,
                        transform: 'scale(1.05)',
                      },
                      transition: 'all 0.15s ease',
                      width: 36, height: 36,
                    }}
                  >
                    {isStreaming ? <CircularProgress size={18} color="inherit" /> : <SendIcon sx={{ fontSize: 18 }} />}
                  </IconButton>
                </span>
              </Tooltip>
            </Box>

            <Typography variant="caption" color="text.disabled" sx={{ display: 'block', textAlign: 'center', mt: 0.75 }}>
              Shift+Enter for new line · Supports PDF and image attachments
            </Typography>
          </Paper>
        </Box>
      )}
    </Box>
  );
}
