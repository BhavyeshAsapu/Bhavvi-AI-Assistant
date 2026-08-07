import { useCallback, useState } from 'react';

import {
  Box, Paper, Typography, Grid, Chip, LinearProgress,
  IconButton, Tooltip, Button, Alert, Skeleton,
} from '@mui/material';
import Description from '@mui/icons-material/Description';
const FileIcon = Description;
import Error from '@mui/icons-material/Error';
const ErrorIcon = Error;
import CloudUpload from '@mui/icons-material/CloudUpload';
const UploadIcon = CloudUpload;
import Refresh from '@mui/icons-material/Refresh';
const RefreshIcon = Refresh;
import CheckCircle from '@mui/icons-material/CheckCircle';
const ReadyIcon = CheckCircle;
import Schedule from '@mui/icons-material/Schedule';
const PendingIcon = Schedule;
import PictureAsPdf from '@mui/icons-material/PictureAsPdf';
const PdfIcon = PictureAsPdf;
import Image from '@mui/icons-material/Image';
const ImageIcon = Image;
import { motion, AnimatePresence } from 'framer-motion';
import { alpha } from '@mui/material/styles';
import { useDropzone } from 'react-dropzone';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { documentsApi, uploadApi } from '../services/api';
import { format } from 'date-fns';

const STATUS_CONFIG = {
  ready: { color: '#10b981', icon: <ReadyIcon />, label: 'Ready' },
  processing: { color: '#f59e0b', icon: <PendingIcon />, label: 'Processing' },
  pending: { color: '#94a3b8', icon: <PendingIcon />, label: 'Pending' },
  failed: { color: '#ef4444', icon: <ErrorIcon />, label: 'Failed' },
};

function DocCard({ doc, onDelete }) {
  const status = STATUS_CONFIG[doc.status] || STATUS_CONFIG.pending;
  const isProcessing = doc.status === 'processing' || doc.status === 'pending';

  return (
    <motion.div
      layout
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      exit={{ opacity: 0, scale: 0.9 }}
      transition={{ duration: 0.25 }}
    >
      <Paper
        sx={{
          p: 2.5,
          height: '100%',
          border: (t) => `1px solid ${alpha(status.color, 0.2)}`,
          '&:hover': { transform: 'translateY(-2px)', boxShadow: `0 8px 20px ${alpha(status.color, 0.15)}` },
          transition: 'all 0.2s ease',
          position: 'relative',
          overflow: 'hidden',
        }}
      >
        {isProcessing && <LinearProgress sx={{ position: 'absolute', top: 0, left: 0, right: 0, height: 2 }} />}

        <Box sx={{ display: 'flex', alignItems: 'flex-start', gap: 1.5 }}>
          <Box
            sx={{
              width: 40, height: 40, borderRadius: 2, flexShrink: 0,
              bgcolor: alpha(status.color, 0.1),
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              color: status.color,
            }}
          >
            {doc.document_type === 'pdf' ? <PdfIcon /> : <ImageIcon />}
          </Box>
          <Box sx={{ flex: 1, minWidth: 0 }}>
            <Typography variant="body2" fontWeight={600} noWrap title={doc.original_filename}>
              {doc.original_filename}
            </Typography>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mt: 0.5, flexWrap: 'wrap' }}>
              <Chip
                label={status.label}
                size="small"
                sx={{ height: 18, fontSize: '0.65rem', bgcolor: alpha(status.color, 0.12), color: status.color }}
              />
              <Typography variant="caption" color="text.secondary">
                {(doc.file_size_bytes / 1024).toFixed(1)} KB
              </Typography>
              {doc.page_count && (
                <Typography variant="caption" color="text.secondary">
                  {doc.page_count} pages
                </Typography>
              )}
              {doc.chunk_count && (
                <Typography variant="caption" color="text.secondary">
                  {doc.chunk_count} chunks
                </Typography>
              )}
            </Box>
            <Typography variant="caption" color="text.disabled" sx={{ mt: 0.5, display: 'block' }}>
              Uploaded {format(new Date(doc.created_at), 'MMM d, h:mm a')}
            </Typography>
          </Box>
        </Box>
      </Paper>
    </motion.div>
  );
}

export default function DocumentsPage() {
  const [uploadProgress, setUploadProgress] = useState(0);
  const [uploadError, setUploadError] = useState('');
  const [isUploading, setIsUploading] = useState(false);
  const queryClient = useQueryClient();

  const { data: docsData, isLoading, refetch } = useQuery({
    queryKey: ['documents'],
    queryFn: () => documentsApi.list().then((r) => r.data.documents),
    refetchInterval: 10000,
  });

  const docs = docsData || [];

  const handleUpload = async (files) => {
    setUploadError('');
    setIsUploading(true);
    for (const file of files) {
      try {
        await uploadApi.upload(file, null, setUploadProgress);
        queryClient.invalidateQueries(['documents']);
      } catch (err) {
        setUploadError(err.response?.data?.error?.message || 'Upload failed');
      }
    }
    setIsUploading(false);
    setUploadProgress(0);
  };

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop: handleUpload,
    accept: {
      'application/pdf': ['.pdf'],
      'image/*': ['.jpg', '.jpeg', '.png', '.webp'],
    },
  });

  const readyDocs = docs.filter((d) => d.status === 'ready');
  const processingDocs = docs.filter((d) => ['pending', 'processing'].includes(d.status));

  return (
    <Box sx={{ maxWidth: 1200, mx: 'auto' }}>
      <Box sx={{ mb: 4, display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 2 }}>
        <Box>
          <Typography variant="h4" fontWeight={800}>Document Library</Typography>
          <Typography variant="body1" color="text.secondary" sx={{ mt: 0.5 }}>
            Upload PDFs and images for the RAG and Vision agents to analyze
          </Typography>
        </Box>
        <Button startIcon={<RefreshIcon />} onClick={() => refetch()} variant="outlined" size="small">
          Refresh
        </Button>
      </Box>

      {/* Stats */}
      <Box sx={{ display: 'flex', gap: 2, mb: 4, flexWrap: 'wrap' }}>
        {[
          { label: 'Total', value: docs.length, color: '#6366f1' },
          { label: 'Indexed', value: readyDocs.length, color: '#10b981' },
          { label: 'Processing', value: processingDocs.length, color: '#f59e0b' },
        ].map((s) => (
          <Box
            key={s.label}
            sx={{
              px: 2, py: 1, borderRadius: 2,
              bgcolor: alpha(s.color, 0.1),
              border: `1px solid ${alpha(s.color, 0.2)}`,
            }}
          >
            <Typography variant="h5" fontWeight={800} sx={{ color: s.color }}>{s.value}</Typography>
            <Typography variant="caption" color="text.secondary">{s.label}</Typography>
          </Box>
        ))}
      </Box>

      {/* Upload zone */}
      <Box
        {...getRootProps()}
        sx={{
          mb: 4, p: 4, borderRadius: 3, textAlign: 'center',
          border: (t) => `2px dashed ${isDragActive ? t.palette.primary.main : alpha(t.palette.primary.main, 0.25)}`,
          bgcolor: (t) => isDragActive ? alpha(t.palette.primary.main, 0.08) : alpha(t.palette.primary.main, 0.02),
          cursor: 'pointer',
          transition: 'all 0.2s ease',
          '&:hover': { bgcolor: (t) => alpha(t.palette.primary.main, 0.06), borderColor: 'primary.main' },
        }}
      >
        <input {...getInputProps()} />
        <UploadIcon sx={{ fontSize: 40, color: isDragActive ? 'primary.main' : 'text.disabled', mb: 1 }} />
        <Typography variant="h6" fontWeight={600} gutterBottom>
          {isDragActive ? 'Drop files here' : 'Upload Documents'}
        </Typography>
        <Typography variant="body2" color="text.secondary">
          Drag & drop PDFs or images, or click to browse
        </Typography>
        <Typography variant="caption" color="text.disabled" sx={{ mt: 0.5, display: 'block' }}>
          PDF · JPEG · PNG · WebP · Max 50 MB
        </Typography>
        {isUploading && (
          <Box sx={{ mt: 2, maxWidth: 300, mx: 'auto' }}>
            <LinearProgress variant="determinate" value={uploadProgress} sx={{ borderRadius: 2 }} />
            <Typography variant="caption" color="text.secondary">{uploadProgress}%</Typography>
          </Box>
        )}
      </Box>

      {uploadError && <Alert severity="error" sx={{ mb: 3, borderRadius: 2 }}>{uploadError}</Alert>}

      {/* Document grid */}
      {isLoading ? (
        <Grid container spacing={2}>
          {[...Array(6)].map((_, i) => <Grid key={i} item xs={12} sm={6} md={4}><Skeleton height={110} sx={{ borderRadius: 2 }} /></Grid>)}
        </Grid>
      ) : docs.length === 0 ? (
        <Box sx={{ textAlign: 'center', py: 8 }}>
          <PdfIcon sx={{ fontSize: 56, color: 'text.disabled', mb: 1 }} />
          <Typography variant="h6" fontWeight={600} gutterBottom>No documents yet</Typography>
          <Typography variant="body2" color="text.secondary">Upload a PDF or image to get started</Typography>
        </Box>
      ) : (
        <Grid container spacing={2}>
          <AnimatePresence>
            {docs.map((doc) => (
              <Grid key={doc.id} item xs={12} sm={6} md={4}>
                <DocCard doc={doc} />
              </Grid>
            ))}
          </AnimatePresence>
        </Grid>
      )}
    </Box>
  );
}
