import { useState, useRef, useCallback } from 'react';

import {
  Box, Paper, Typography, Button, Chip, CircularProgress, Alert,
  IconButton, Tooltip, TextField, Divider,
} from '@mui/material';
import AutoAwesome from '@mui/icons-material/AutoAwesome';
const AIIcon = AutoAwesome;
import Image from '@mui/icons-material/Image';
const ImageIcon = Image;
import Delete from '@mui/icons-material/Delete';
const DeleteIcon = Delete;
import Send from '@mui/icons-material/Send';
const SendIcon = Send;
import Lightbulb from '@mui/icons-material/Lightbulb';
const TipIcon = Lightbulb;
import CameraAlt from '@mui/icons-material/CameraAlt';
const CameraIcon = CameraAlt;
import ZoomIn from '@mui/icons-material/ZoomIn';
const ZoomIcon = ZoomIn;
import CloudUpload from '@mui/icons-material/CloudUpload';
const UploadIcon = CloudUpload;
import { motion, AnimatePresence } from 'framer-motion';
import { alpha } from '@mui/material/styles';
import { useDropzone } from 'react-dropzone';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { Prism as SyntaxHighlighter } from 'react-syntax-highlighter';
import { vscDarkPlus } from 'react-syntax-highlighter/dist/esm/styles/prism';
import { uploadApi, chatApi, sessionsApi } from '../services/api';
import useAuthStore from '../store/authStore';

const EXAMPLE_QUESTIONS = [
  'What does this image show?',
  'Describe this diagram in detail',
  'Read and transcribe any text in this image',
  'Explain this chart — what are the trends?',
  'What code is shown in this screenshot?',
  'Identify the objects in this image',
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

export default function ImageUnderstandingPage() {
  const [selectedImage, setSelectedImage] = useState(null);
  const [imagePreview, setImagePreview] = useState(null);
  const [uploadedFileId, setUploadedFileId] = useState(null);
  const [question, setQuestion] = useState('');
  const [result, setResult] = useState(null);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [error, setError] = useState('');
  const [sessionId, setSessionId] = useState(null);
  const queryClient = useQueryClient();

  const handleImageDrop = async (files) => {
    const file = files[0];
    if (!file) return;
    setSelectedImage(file);
    setImagePreview(URL.createObjectURL(file));
    setResult(null);
    setError('');
    setUploadedFileId(null);
  };

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop: handleImageDrop,
    accept: { 'image/*': ['.jpg', '.jpeg', '.png', '.webp'] },
    maxFiles: 1,
  });

  const handleAnalyze = async () => {
    if (!selectedImage) return;
    setIsAnalyzing(true);
    setError('');
    setResult(null);
    try {
      // Create or reuse a session
      let sid = sessionId;
      if (!sid) {
        const { data } = await sessionsApi.create('Image Analysis');
        sid = data.id;
        setSessionId(sid);
        queryClient.invalidateQueries(['sessions']);
      }

      // Upload image
      const { data: uploadData } = await uploadApi.upload(selectedImage, sid);
      const fileId = uploadData.document.id;
      setUploadedFileId(fileId);

      // Send chat request
      const { data: chatData } = await chatApi.send({
        session_id: sid,
        message: question || 'Please analyze this image in detail.',
        file_ids: [fileId],
      });

      setResult(chatData.content);
    } catch (err) {
      setError(err.response?.data?.detail || 'Analysis failed. Please try again.');
    } finally {
      setIsAnalyzing(false);
    }
  };

  const handleReset = () => {
    setSelectedImage(null);
    setImagePreview(null);
    setUploadedFileId(null);
    setResult(null);
    setQuestion('');
    setError('');
  };

  return (
    <Box sx={{ maxWidth: 1100, mx: 'auto' }}>
      {/* Header */}
      <motion.div initial={{ opacity: 0, y: -15 }} animate={{ opacity: 1, y: 0 }}>
        <Box sx={{ mb: 4 }}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, mb: 1 }}>
            <Box sx={{ width: 44, height: 44, borderRadius: 2, background: 'linear-gradient(135deg, #22d3ee, #6366f1)', display: 'flex', alignItems: 'center', justifyContent: 'center', boxShadow: '0 4px 14px rgba(34,211,238,0.35)' }}>
              <CameraIcon sx={{ color: '#fff', fontSize: 22 }} />
            </Box>
            <Box>
              <Typography variant="h4" fontWeight={800}>Image Understanding</Typography>
              <Typography variant="body2" color="text.secondary">Upload any image and ask Gemini Vision to analyze it</Typography>
            </Box>
          </Box>
          <Box sx={{ display: 'flex', gap: 1, mt: 2, flexWrap: 'wrap' }}>
            {['Photos', 'Diagrams', 'Charts', 'Screenshots', 'Handwriting', 'Code'].map((tag) => (
              <Chip key={tag} label={tag} size="small" sx={{ bgcolor: (t) => alpha(t.palette.primary.main, 0.08), border: (t) => `1px solid ${alpha(t.palette.primary.main, 0.2)}`, fontSize: '0.72rem' }} />
            ))}
          </Box>
        </Box>
      </motion.div>

      <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', md: '1fr 1fr' }, gap: 3 }}>
        {/* Left — Upload + Question */}
        <Box>
          {/* Image drop zone */}
          <Paper
            {...getRootProps()}
            sx={{
              mb: 2.5, p: 2, minHeight: 300, borderRadius: 3,
              border: (t) => `2px dashed ${isDragActive ? t.palette.primary.main : imagePreview ? alpha(t.palette.primary.main, 0.4) : alpha(t.palette.primary.main, 0.2)}`,
              bgcolor: (t) => isDragActive ? alpha(t.palette.primary.main, 0.06) : 'background.paper',
              display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
              cursor: 'pointer', transition: 'all 0.2s ease',
              position: 'relative', overflow: 'hidden',
              '&:hover': { borderColor: 'primary.main', bgcolor: (t) => alpha(t.palette.primary.main, 0.04) },
            }}
          >
            <input {...getInputProps()} />
            <AnimatePresence mode="wait">
              {imagePreview ? (
                <motion.div
                  key="preview"
                  initial={{ opacity: 0, scale: 0.95 }}
                  animate={{ opacity: 1, scale: 1 }}
                  style={{ width: '100%', height: '100%', position: 'relative' }}
                >
                  <Box
                    component="img"
                    src={imagePreview}
                    alt="Uploaded"
                    sx={{ width: '100%', maxHeight: 300, objectFit: 'contain', borderRadius: 2 }}
                  />
                  <Box sx={{ position: 'absolute', top: 8, right: 8 }}>
                    <Tooltip title="Remove image">
                      <IconButton
                        size="small"
                        onClick={(e) => { e.stopPropagation(); handleReset(); }}
                        sx={{ bgcolor: 'rgba(0,0,0,0.6)', color: '#fff', '&:hover': { bgcolor: 'rgba(239,68,68,0.8)' } }}
                      >
                        <DeleteIcon fontSize="small" />
                      </IconButton>
                    </Tooltip>
                  </Box>
                  <Box sx={{ position: 'absolute', bottom: 8, left: 8 }}>
                    <Chip label={selectedImage?.name} size="small" sx={{ bgcolor: 'rgba(0,0,0,0.7)', color: '#fff', fontSize: '0.7rem', maxWidth: 200 }} />
                  </Box>
                </motion.div>
              ) : (
                <motion.div key="empty" initial={{ opacity: 0 }} animate={{ opacity: 1 }} style={{ textAlign: 'center' }}>
                  <ImageIcon sx={{ fontSize: 52, color: isDragActive ? 'primary.main' : 'text.disabled', mb: 2 }} />
                  <Typography variant="h6" fontWeight={600} gutterBottom>
                    {isDragActive ? 'Drop image here' : 'Upload an image'}
                  </Typography>
                  <Typography variant="body2" color="text.secondary">Drag & drop or click to browse</Typography>
                  <Typography variant="caption" color="text.disabled" sx={{ mt: 0.5, display: 'block' }}>
                    JPG · PNG · WebP · Max 50 MB
                  </Typography>
                </motion.div>
              )}
            </AnimatePresence>
          </Paper>

          {/* Question input */}
          <Paper sx={{ p: 2.5, mb: 2 }}>
            <Typography variant="subtitle2" fontWeight={700} sx={{ mb: 1.5 }}>Your question (optional)</Typography>
            <TextField
              value={question}
              onChange={(e) => setQuestion(e.target.value)}
              placeholder="What would you like to know about this image?"
              multiline rows={2}
              fullWidth
              variant="outlined"
              size="small"
              onKeyDown={(e) => { if (e.key === 'Enter' && !e.shiftKey && selectedImage) { e.preventDefault(); handleAnalyze(); } }}
            />
            <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.75, mt: 1.5 }}>
              {EXAMPLE_QUESTIONS.map((q) => (
                <Chip key={q} label={q} size="small" onClick={() => setQuestion(q)}
                  sx={{ fontSize: '0.7rem', cursor: 'pointer', bgcolor: (t) => alpha(t.palette.primary.main, 0.06), border: (t) => `1px solid ${alpha(t.palette.primary.main, 0.15)}`, '&:hover': { bgcolor: (t) => alpha(t.palette.primary.main, 0.15) } }}
                />
              ))}
            </Box>
          </Paper>

          <Button
            variant="contained" fullWidth size="large"
            onClick={handleAnalyze}
            disabled={!selectedImage || isAnalyzing}
            startIcon={isAnalyzing ? <CircularProgress size={18} color="inherit" /> : <AIIcon />}
            sx={{ py: 1.75, fontSize: '1rem', fontWeight: 700, borderRadius: 3 }}
          >
            {isAnalyzing ? 'Analyzing with Gemini Vision…' : 'Analyze Image'}
          </Button>
        </Box>

        {/* Right — Results */}
        <Box>
          <AnimatePresence mode="wait">
            {error && (
              <motion.div key="error" initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
                <Alert severity="error" sx={{ mb: 2, borderRadius: 2 }}>{error}</Alert>
              </motion.div>
            )}

            {isAnalyzing && !result && (
              <motion.div key="loading" initial={{ opacity: 0 }} animate={{ opacity: 1 }} style={{ height: '100%' }}>
                <Paper sx={{ p: 3, height: '100%', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', minHeight: 400 }}>
                  <Box sx={{ width: 56, height: 56, borderRadius: '16px', background: 'linear-gradient(135deg, #6366f1, #22d3ee)', display: 'flex', alignItems: 'center', justifyContent: 'center', mb: 3, boxShadow: '0 8px 20px rgba(99,102,241,0.35)' }}>
                    <motion.div animate={{ rotate: 360 }} transition={{ duration: 2, repeat: Infinity, ease: 'linear' }}>
                      <AIIcon sx={{ color: '#fff', fontSize: 28 }} />
                    </motion.div>
                  </Box>
                  <Typography variant="h6" fontWeight={700} gutterBottom>Gemini Vision is analyzing…</Typography>
                  <Typography variant="body2" color="text.secondary" sx={{ mb: 3, textAlign: 'center' }}>
                    Processing your image with multimodal understanding
                  </Typography>
                  <TypingIndicator />
                </Paper>
              </motion.div>
            )}

            {result && !isAnalyzing && (
              <motion.div key="result" initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}>
                <Paper sx={{ p: 3, border: (t) => `1px solid ${alpha(t.palette.primary.main, 0.15)}` }}>
                  <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                      <AIIcon sx={{ color: 'primary.main', fontSize: 20 }} />
                      <Typography variant="subtitle1" fontWeight={700}>Vision Analysis</Typography>
                    </Box>
                    <Chip label="Gemini 2.5 Pro Vision" size="small" sx={{ bgcolor: (t) => alpha(t.palette.primary.main, 0.1), color: 'primary.main', fontSize: '0.7rem' }} />
                  </Box>
                  <Box sx={{
                    maxHeight: 500, overflowY: 'auto', pr: 0.5,
                    '& p': { mb: 1, lineHeight: 1.7 },
                    '& h1, & h2, & h3': { mt: 1.5, mb: 0.5 },
                    '& pre': { borderRadius: 2 },
                    '& code': { fontFamily: '"JetBrains Mono", monospace', fontSize: '0.85em' },
                  }}>
                    <ReactMarkdown
                      remarkPlugins={[remarkGfm]}
                      components={{
                        code({ node, inline, className, children, ...props }) {
                          const match = /language-(\w+)/.exec(className || '');
                          return !inline && match ? (
                            <SyntaxHighlighter style={vscDarkPlus} language={match[1]} PreTag="div" {...props}>
                              {String(children).replace(/\n$/, '')}
                            </SyntaxHighlighter>
                          ) : <code className={className} {...props}>{children}</code>;
                        },
                      }}
                    >
                      {result}
                    </ReactMarkdown>
                  </Box>
                  <Divider sx={{ my: 2 }} />
                  <Button
                    variant="outlined" size="small" startIcon={<UploadIcon />}
                    onClick={handleReset}
                    sx={{ borderRadius: 2 }}
                  >
                    Analyze Another Image
                  </Button>
                </Paper>
              </motion.div>
            )}

            {!selectedImage && !result && !isAnalyzing && (
              <motion.div key="placeholder" initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
                <Paper sx={{ p: 4, textAlign: 'center', minHeight: 400, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', bgcolor: (t) => alpha(t.palette.background.paper, 0.5), border: '1px dashed', borderColor: (t) => alpha(t.palette.primary.main, 0.15) }}>
                  <ZoomIcon sx={{ fontSize: 52, color: 'text.disabled', mb: 2 }} />
                  <Typography variant="h6" fontWeight={600} gutterBottom>Vision analysis results</Typography>
                  <Typography variant="body2" color="text.secondary">Upload an image to get started</Typography>
                  <Box sx={{ mt: 3 }}>
                    <Typography variant="caption" color="text.disabled" sx={{ display: 'flex', alignItems: 'center', gap: 0.5, justifyContent: 'center' }}>
                      <TipIcon sx={{ fontSize: 14 }} />
                      Tip: Ask specific questions for better results
                    </Typography>
                  </Box>
                </Paper>
              </motion.div>
            )}
          </AnimatePresence>
        </Box>
      </Box>
    </Box>
  );
}
