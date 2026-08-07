import { useState, useCallback } from 'react';
import { chatApi, sessionsApi } from '../services/api';

export function useChat() {
  const [messages, setMessages] = useState([]);
  const [isStreaming, setIsStreaming] = useState(false);
  const [streamingContent, setStreamingContent] = useState('');
  const [error, setError] = useState(null);

  const sendMessage = useCallback(async (sessionId, message, fileIds = []) => {
    setError(null);

    // Add user message immediately for optimistic UI
    const userMsg = {
      id: `user-${Date.now()}`,
      role: 'user',
      content: message,
      created_at: new Date().toISOString(),
      sources: [],
      attached_files: [],
    };
    setMessages((prev) => [...prev, userMsg]);
    setIsStreaming(true);
    setStreamingContent('');

    // Add streaming placeholder
    const streamingId = `streaming-${Date.now()}`;
    setMessages((prev) => [
      ...prev,
      { id: streamingId, role: 'assistant', content: '', isStreaming: true },
    ]);

    try {
      const token = localStorage.getItem('bhavvi_access_token');
      const eventSource = new EventSource(
        `${chatApi.streamUrl}?session_id=${sessionId}&message=${encodeURIComponent(message)}&file_ids=${fileIds.join(',')}`,
        { withCredentials: false }
      );

      // Use fetch-based SSE for POST with body (EventSource only supports GET)
      const response = await fetch(
        `${import.meta.env.VITE_API_BASE_URL || 'http://localhost:8000/api/v1'}/chat/stream`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify({ session_id: sessionId, message, file_ids: fileIds }),
        }
      );

      eventSource.close();

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}`);
      }

      const reader = response.body.getReader();
      const decoder = new TextDecoder();
      let fullContent = '';
      let finalSources = [];
      let finalTrace = null;
      let finalMessageId = null;

      while (true) {
        const { value, done } = await reader.read();
        if (done) break;

        const text = decoder.decode(value, { stream: true });
        const lines = text.split('\n');

        for (const line of lines) {
          if (!line.startsWith('data: ')) continue;
          try {
            const chunk = JSON.parse(line.slice(6));

            if (chunk.type === 'token') {
              fullContent += chunk.content || '';
              setStreamingContent(fullContent);
              setMessages((prev) =>
                prev.map((m) =>
                  m.id === streamingId ? { ...m, content: fullContent } : m
                )
              );
            } else if (chunk.type === 'sources') {
              finalSources = chunk.sources || [];
              finalMessageId = chunk.message_id;
            } else if (chunk.type === 'trace') {
              finalTrace = chunk.agent_trace;
              finalMessageId = chunk.message_id;
            } else if (chunk.type === 'done') {
              finalMessageId = chunk.message_id || finalMessageId;
              // Replace streaming placeholder with final message
              setMessages((prev) =>
                prev.map((m) =>
                  m.id === streamingId
                    ? {
                        id: finalMessageId || streamingId,
                        role: 'assistant',
                        content: fullContent,
                        sources: finalSources,
                        agent_trace: finalTrace,
                        created_at: new Date().toISOString(),
                        isStreaming: false,
                      }
                    : m
                )
              );
            } else if (chunk.type === 'error') {
              throw new Error(chunk.content || 'Streaming error');
            }
          } catch (e) {
            if (e.message !== 'Streaming error') {
              // JSON parse error — ignore incomplete chunks
            } else {
              throw e;
            }
          }
        }
      }
    } catch (err) {
      setError(err.message || 'Failed to send message');
      // Remove the streaming placeholder on error
      setMessages((prev) => prev.filter((m) => m.id !== `streaming-${Date.now()}`));
    } finally {
      setIsStreaming(false);
      setStreamingContent('');
    }
  }, []);

  const loadMessages = useCallback(async (sessionId) => {
    try {
      const { data } = await sessionsApi.get(sessionId);
      setMessages(data.messages || []);
    } catch (err) {
      setError('Failed to load conversation');
    }
  }, []);

  const clearMessages = useCallback(() => {
    setMessages([]);
    setError(null);
  }, []);

  return {
    messages,
    isStreaming,
    streamingContent,
    error,
    sendMessage,
    loadMessages,
    clearMessages,
    setMessages,
  };
}
