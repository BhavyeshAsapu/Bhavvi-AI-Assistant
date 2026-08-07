import { useState } from 'react';
import {
  Box, Paper, Typography, Button, Chip, CircularProgress, Alert,
  LinearProgress, Divider, List, ListItem, ListItemIcon, ListItemText, Tab, Tabs,
} from '@mui/material';
import {
  Description as DocIcon, AutoAwesome as AIIcon,
  CloudUpload as UploadIcon, CheckCircle as CheckIcon,
  Summarize as SummarizeIcon, Psychology as AnalyzeIcon,
  QuestionAnswer as QAIcon, FactCheck as KeyPointsIcon,
} from '@mui/icons-material';
import { motion, AnimatePresence } from 'framer-motion';
import { alpha } from '@mui/material/styles';
import { useDropzone } from 'react-dropzone';
import { useQueryClient } from '@tanstack/react-query';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { Prism as SyntaxHighlighter } from 'react-syntax-highlighter';
import { vscDarkPlus } from 'react-syntax-highlighter/dist/esm/styles/prism';
import { uploadApi, chatApi, sessionsApi } from '../services/api';

const ACCEPTED_TYPES = {
  'application/pdf': ['.pdf'],
  'application/vnd.ms-powerpoint': ['.ppt'],
  'application/vnd.openxmlformats-officedocument.presentationml.presentation': ['.pptx'],
  'application/msword': ['.doc'],
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document': ['.docx'],
};

const ANALYSIS_MODES = [
  { id: 'summary', label: 'Summary', icon: <SummarizeIcon />, color: '#6366f1', prompt: 'Provide a comprehensive summary of this document.' },
  { id: 'keypoints', label: 'Key Points', icon: <KeyPointsIcon />, color: '#10b981', prompt: 'Extract and list the most important key points from this document.' },
  { id: 'chapters', label: 'Chapter-wise', icon: <AnalyzeIcon />, color: '#f59e0b', prompt: 'Provide a chapter-by-chapter or section-by-section summary of this document.' },
  { id: 'qa', label: 'Ask a Question', icon: <QAIcon />, color: '#22d3ee', prompt: null },
];

function TypingIndicator() {
  return (
    <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5, p: 1 }}>
      {[0, 1, 2].map((i) => (
        <motion.div
          key={i}
          style={{ width: 8, height: 8, borderRadius: '50%', background: '#6366f1' }}
          animate={{ y: [0, -6, 0], opacity: [0.4, 1, 0.4] }}
          transition={{ duration: 0.8, delay: i * 0.2, repeat: Infinity }}
        />
      ))}
    </Box>
  );
}

export default function DocumentSummarizerPage() {
  const [file, setFile] = useState(null);
  const [uploadedFileId, setUploadedFileId] = useState(null);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [isUploading, setIsUploading] = useState(false);
  const [mode, setMode] = useState('summary');
  const [customQuestion, setCustomQuestion] = useState('');
  const [result, setResult] = useState(null);
  const [sources, setSources] = useState([]);
  const [isProcessing, setIsProcessing] = useState(false);
  const [error, setError] = useState('');
  const [sessionId, setSessionId] = useState(null);
  const queryClient = useQueryClient();

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop: async (files) => {
      const f = files[0];
      if (!f) return;
      setFile(f);
      setResult(null);
      setError('');
      setUploadedFileId(null);
    },
    accept: ACCEPTED_TYPES,
    maxFiles: 1,
  });

  const handleUploadAndProcess = async () => {
    if (!file) return;
    setError('');
    setIsUploading(true);
    setUploadProgress(0);

    try {
      let sid = sessionId;
      if (!sid) {
        const { data } = await sessionsApi.create(`Doc: ${file.name}`);
        sid = data.id;
        setSessionId(sid);
        queryClient.invalidateQueries(['sessions']);
      }

      const { data: uploadData } = await uploadApi.upload(file, sid, setUploadProgress);
      const fileId = uploadData.document.id;
      setUploadedFileId(fileId);
      setIsUploading(false);
      setIsProcessing(true);

      const activeMode = ANALYSIS_MODES.find((m) => m.id === mode);
      const prompt = mode === 'qa' ? (customQuestion || 'What is this document about?') : activeMode.prompt;

      const { data: chatData } = await chatApi.send({
        session_id: sid,
        message: prompt,
        file_ids: [fileId],
      });

      setResult(chatData.content);
      setSources(chatData.sources || []);
    } catch (err) {
      setError(err.response?.data?.detail || 'Processing failed. Please try again.');
    } finally {
      setIsUploading(false);
      setIsProcessing(false);
    }
  };

  const handleReanalyze = async () => {
    if (!uploadedFileId || !sessionId) return;
    setIsProcessing(true);
    setError('');
    try {
      const activeMode = ANALYSIS_MODES.find((m) => m.id === mode);
      const prompt = mode === 'qa' ? (customQuestion || 'What is this document about?') : activeMode.prompt;
      const { data } = await chatApi.send({ session_id: sessionId, message: prompt, file_ids: [uploadedFileId] });
      setResult(data.content);
      setSources(data.sources || []);
    } catch (err) {
      setError(err.response?.data?.detail || 'Analysis failed.');
    } finally {
      setIsProcessing(false);
    }
  };

  const EXT_MAP = { 'application/pdf': 'PDF', 'application/vnd.ms-powerpoint': 'PPT', 'application/vnd.openxmlformats-officedocument.presentationml.presentation': 'PPTX', 'application/msword': 'DOC', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document': 'DOCX' };

  return (
    <Box sx={{ maxWidth: 1100, mx: 'auto' }}>
      <motion.div initial={{ opacity: 0, y: -15 }} animate={{ opacity: 1, y: 0 }}>
        <Box sx={{ mb: 4 }}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, mb: 1 }}>
            <Box sx={{ width: 44, height: 44, borderRadius: 2, background: 'linear-gradient(135deg, #10b981, #6366f1)', display: 'flex', alignItems: 'center', justifyContent: 'center', boxShadow: '0 4px 14px rgba(16,185,129,0.35)' }}>
              <DocIcon sx={{ color: '#fff', fontSize: 22 }} />
            </Box>
            <Box>
              <Typography variant="h4" fontWeight={800}>Document Summarizer</Typography>
              <Typography variant="body2" color="text.secondary">Upload PDF, PPT, PPTX, DOC or DOCX — powered by RAG</Typography>
            </Box>
          </Box>
          <Box sx={{ display: 'flex', gap: 1, mt: 2, flexWrap: 'wrap' }}>
            {['PDF', 'PPT', 'PPTX', 'DOC', 'DOCX'].map((tag) => (
              <Chip key={tag} label={tag} size="small" sx={{ bgcolor: (t) => alpha(t.palette.success.main, 0.08), border: (t) => `1px solid ${alpha(t.palette.success.main, 0.2)}`, color: 'success.main', fontSize: '0.72rem', fontWeight: 700 }} />
            ))}
          </Box>
        </Box>
      </motion.div>

      <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', md: '5fr 7fr' }, gap: 3 }}>
        {/* Left panel */}
        <Box>
          {/* File drop */}
          <Paper
            {...getRootProps()}
            sx={{
              mb: 2.5, p: 3, borderRadius: 3, minHeight: 200,
              border: (t) => `2px dashed ${isDragActive ? t.palette.primary.main : file ? alpha(t.palette.success.main, 0.5) : alpha(t.palette.primary.main, 0.2)}`,
              bgcolor: (t) => file ? alpha(t.palette.success.main, 0.03) : isDragActive ? alpha(t.palette.primary.main, 0.05) : 'background.paper',
              display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
              cursor: 'pointer', transition: 'all 0.2s ease',
              '&:hover': { borderColor: 'primary.main' },
            }}
          >
            <input {...getInputProps()} />
            {file ? (
              <Box sx={{ textAlign: 'center' }}>
                <CheckIcon sx={{ fontSize: 36, color: '#10b981', mb: 1 }} />
                <Typography variant="subtitle1" fontWeight={700} noWrap>{file.name}</Typography>
                <Chip label={EXT_MAP[file.type] || 'Document'} size="small" sx={{ mt: 1, bgcolor: alpha('#10b981', 0.1), color: '#10b981' }} />
                <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mt: 0.5 }}>
                  {(file.size / 1024 / 1024).toFixed(2)} MB · Click to change
                </Typography>
              </Box>
            ) : (
              <Box sx={{ textAlign: 'center' }}>
                <UploadIcon sx={{ fontSize: 40, color: isDragActive ? 'primary.main' : 'text.disabled', mb: 1.5 }} />
                <Typography variant="subtitle1" fontWeight={600} gutterBottom>
                  {isDragActive ? 'Drop file here' : 'Upload document'}
                </Typography>
                <Typography variant="caption" color="text.disabled">PDF · PPT · PPTX · DOC · DOCX</Typography>
              </Box>
            )}
          </Paper>

          {/* Upload progress */}
          <AnimatePresence>
            {isUploading && (
              <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }} exit={{ height: 0, opacity: 0 }}>
                <Box sx={{ mb: 2 }}>
                  <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 0.5 }}>
                    <Typography variant="caption" color="text.secondary">Uploading…</Typography>
                    <Typography variant="caption" color="primary">{uploadProgress}%</Typography>
                  </Box>
                  <LinearProgress variant="determinate" value={uploadProgress} sx={{ borderRadius: 2, height: 6 }} />
                </Box>
              </motion.div>
            )}
          </AnimatePresence>

          {/* Analysis mode */}
          <Paper sx={{ p: 2.5, mb: 2 }}>
            <Typography variant="subtitle2" fontWeight={700} sx={{ mb: 1.5 }}>Analysis Mode</Typography>
            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
              {ANALYSIS_MODES.map((m) => (
                <Box
                  key={m.id}
                  onClick={() => setMode(m.id)}
                  sx={{
                    p: 1.5, borderRadius: 2, cursor: 'pointer',
                    border: (t) => `1px solid ${mode === m.id ? alpha(m.color, 0.5) : alpha(t.palette.divider, 1)}`,
                    bgcolor: mode === m.id ? alpha(m.color, 0.08) : 'transparent',
                    display: 'flex', alignItems: 'center', gap: 1.5,
                    transition: 'all 0.15s ease',
                    '&:hover': { bgcolor: alpha(m.color, 0.05), borderColor: alpha(m.color, 0.3) },
                  }}
                >
                  <Box sx={{ color: m.color }}>{m.icon}</Box>
                  <Typography variant="body2" fontWeight={mode === m.id ? 700 : 500}>{m.label}</Typography>
                  {mode === m.id && <CheckIcon sx={{ ml: 'auto', color: m.color, fontSize: 16 }} />}
                </Box>
              ))}
            </Box>
            {mode === 'qa' && (
              <Box
                component="textarea"
                value={customQuestion}
                onChange={(e) => setCustomQuestion(e.target.value)}
                placeholder="Type your question about the document…"
                rows={3}
                sx={{
                  mt: 1.5, width: '100%', background: (t) => alpha(t.palette.background.default, 0.5),
                  border: (t) => `1px solid ${alpha(t.palette.primary.main, 0.2)}`,
                  borderRadius: 2, p: 1.5, color: 'text.primary',
                  fontFamily: 'Inter, sans-serif', fontSize: '0.875rem', resize: 'none',
                  outline: 'none', '&:focus': { borderColor: 'primary.main' },
                }}
              />
            )}
          </Paper>

          <Button
            variant="contained" fullWidth size="large"
            onClick={uploadedFileId ? handleReanalyze : handleUploadAndProcess}
            disabled={!file || isUploading || isProcessing}
            startIcon={isUploading || isProcessing ? <CircularProgress size={18} color="inherit" /> : <AIIcon />}
            sx={{ py: 1.75, fontWeight: 700, borderRadius: 3, fontSize: '1rem' }}
          >
            {isUploading ? 'Uploading…' : isProcessing ? 'Processing with RAG…' : uploadedFileId ? 'Re-Analyze' : 'Upload & Analyze'}
          </Button>
        </Box>

        {/* Right panel — Results */}
        <Box>
          <AnimatePresence mode="wait">
            {error && (
              <motion.div key="error" initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
                <Alert severity="error" sx={{ mb: 2, borderRadius: 2 }}>{error}</Alert>
              </motion.div>
            )}

            {(isUploading || isProcessing) && !result && (
              <motion.div key="loading" initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
                <Paper sx={{ p: 4, textAlign: 'center', minHeight: 400, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center' }}>
                  <Box sx={{ width: 56, height: 56, borderRadius: '16px', background: 'linear-gradient(135deg, #10b981, #6366f1)', display: 'flex', alignItems: 'center', justifyContent: 'center', mb: 3, boxShadow: '0 8px 20px rgba(16,185,129,0.3)' }}>
                    <motion.div animate={{ rotate: 360 }} transition={{ duration: 2, repeat: Infinity, ease: 'linear' }}>
                      <AIIcon sx={{ color: '#fff', fontSize: 28 }} />
                    </motion.div>
                  </Box>
                  <Typography variant="h6" fontWeight={700} gutterBottom>
                    {isUploading ? 'Uploading & Indexing…' : 'Running RAG Pipeline…'}
                  </Typography>
                  <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
                    {isUploading ? 'Splitting and embedding document chunks' : 'Retrieving relevant context and generating response'}
                  </Typography>
                  <TypingIndicator />
                </Paper>
              </motion.div>
            )}

            {result && !isProcessing && (
              <motion.div key="result" initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}>
                <Paper sx={{ p: 3 }}>
                  <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                      <AIIcon sx={{ color: 'primary.main', fontSize: 20 }} />
                      <Typography variant="subtitle1" fontWeight={700}>
                        {ANALYSIS_MODES.find((m) => m.id === mode)?.label} Result
                      </Typography>
                    </Box>
                    <Chip label="RAG · Gemini 2.5 Pro" size="small" sx={{ bgcolor: (t) => alpha(t.palette.primary.main, 0.1), color: 'primary.main', fontSize: '0.7rem' }} />
                  </Box>
                  <Box sx={{ maxHeight: 450, overflowY: 'auto', mb: 2, '& p': { mb: 1, lineHeight: 1.7 }, '& h1, & h2, & h3': { mt: 1.5, mb: 0.5 }, '& pre': { borderRadius: 2 } }}>
                    <ReactMarkdown remarkPlugins={[remarkGfm]} components={{ code({ node, inline, className, children, ...props }) { const match = /language-(\w+)/.exec(className || ''); return !inline && match ? <SyntaxHighlighter style={vscDarkPlus} language={match[1]} PreTag="div" {...props}>{String(children).replace(/\n$/, '')}</SyntaxHighlighter> : <code className={className} {...props}>{children}</code>; } }}>
                      {result}
                    </ReactMarkdown>
                  </Box>
                  {sources.length > 0 && (
                    <>
                      <Divider sx={{ mb: 2 }} />
                      <Typography variant="caption" fontWeight={700} color="text.secondary" sx={{ textTransform: 'uppercase', letterSpacing: '0.08em' }}>
                        📚 Sources
                      </Typography>
                      <List dense sx={{ mt: 0.5 }}>
                        {sources.slice(0, 5).map((s, i) => (
                          <ListItem key={i} sx={{ px: 0, py: 0.25 }}>
                            <ListItemIcon sx={{ minWidth: 28 }}>
                              <DocIcon sx={{ fontSize: 14, color: 'text.disabled' }} />
                            </ListItemIcon>
                            <ListItemText
                              primary={`${s.filename}${s.page_number ? ` (p.${s.page_number})` : ''} — ${Math.round(s.relevance_score * 100)}% relevant`}
                              primaryTypographyProps={{ variant: 'caption', color: 'text.secondary' }}
                            />
                          </ListItem>
                        ))}
                      </List>
                    </>
                  )}
                </Paper>
              </motion.div>
            )}

            {!file && !result && !isProcessing && (
              <motion.div key="placeholder" initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
                <Paper sx={{ p: 4, textAlign: 'center', minHeight: 400, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', bgcolor: (t) => alpha(t.palette.background.paper, 0.5), border: '1px dashed', borderColor: (t) => alpha(t.palette.primary.main, 0.15) }}>
                  <SummarizeIcon sx={{ fontSize: 52, color: 'text.disabled', mb: 2 }} />
                  <Typography variant="h6" fontWeight={600} gutterBottom>Document analysis results</Typography>
                  <Typography variant="body2" color="text.secondary">Upload a document to get AI-powered analysis</Typography>
                </Paper>
              </motion.div>
            )}
          </AnimatePresence>
        </Box>
      </Box>
    </Box>
  );
}
