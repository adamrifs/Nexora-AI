import React, { useState, useRef, useEffect, useCallback } from 'react';
import ChatHeader from './components/ChatHeader';
import ChatWindow from './components/ChatWindow';
import InputBar from './components/InputBar';
import { useFetch } from '../../hooks/useFetch';
import { baseURL } from '../../services/api';
import { FileText, X } from 'lucide-react';

// ─── Document Context Banner ──────────────────────────────────────────────────
const DocumentContextBanner = ({ documentTitle, onClear }) => (
  <div className="flex items-center gap-2 bg-purple-50/80 border border-purple-100 rounded-2xl px-3 py-2 mb-2 mx-1 animate-slide-up">
    <FileText className="w-4 h-4 text-[#8C52FF] shrink-0" />
    <p className="text-xs text-purple-800 font-medium truncate flex-1">
      Q&amp;A mode: <span className="font-bold">{documentTitle}</span>
    </p>
    <button
      onClick={onClear}
      className="w-5 h-5 rounded-full bg-purple-100 hover:bg-red-100 flex items-center justify-center transition-colors shrink-0 text-purple-400 hover:text-red-500"
      title="Exit document Q&A mode"
    >
      <X className="w-3 h-3" />
    </button>
  </div>
);

// ─── ChatPage ─────────────────────────────────────────────────────────────────
const Chat = ({ currentChatId, onChatCreated, onDocumentCreated, onMenuClick }) => {
  const [isListening, setIsListening]         = useState(false);
  const [messages, setMessages]               = useState([]);
  const [streamingMessage, setStreamingMessage] = useState('');
  const [agentStatus, setAgentStatus]         = useState(null);

  // Document Intelligence state
  const [attachedFile, setAttachedFile]       = useState(null);
  const [documentId, setDocumentId]           = useState(null);
  const [documentTitle, setDocumentTitle]     = useState('');

  const abortControllerRef  = useRef(null);
  const statusIntervalRef   = useRef(null);
  const creatingChatIdRef   = useRef(null);

  const clearStatusInterval = () => {
    if (statusIntervalRef.current) {
      clearInterval(statusIntervalRef.current);
      statusIntervalRef.current = null;
    }
  };

  useEffect(() => { return () => clearStatusInterval(); }, []);

  // ─── Load existing chat history ──────────────────────────────────────────
  const { data: chatData, error: chatError } = useFetch(
    currentChatId ? `/chat/${currentChatId}` : null,
    {},
    [currentChatId]
  );

  useEffect(() => {
    if (chatData && chatData._id === currentChatId) {
      if (creatingChatIdRef.current === chatData._id) {
        creatingChatIdRef.current = null;
      } else {
        setMessages(chatData.messages || []);
      }
    } else if (!currentChatId) {
      setMessages([]);
      setDocumentId(null);
      setDocumentTitle('');
    }
  }, [chatData, currentChatId]);

  useEffect(() => {
    if (chatError) {
      if (creatingChatIdRef.current === currentChatId) {
        creatingChatIdRef.current = null;
      } else {
        setMessages([{ role: 'ai', content: '⚠️ Failed to load chat history.', _id: 'error' }]);
      }
    }
  }, [chatError, currentChatId]);

  // ─── Stop generation ─────────────────────────────────────────────────────
  const handleStop = () => {
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
      abortControllerRef.current = null;
    }
    clearStatusInterval();
  };

  // ─── SSE stream reader (shared by chat and document flows) ───────────────
  const readSSEStream = useCallback(async (response, abortController, onDocumentSaved) => {
    const reader  = response.body.getReader();
    const decoder = new TextDecoder('utf-8');
    let done   = false;
    let buffer = '';
    let streamedContent = '';

    setIsListening(false);
    setStreamingMessage('');
    setAgentStatus('Analyzing...');

    while (!done) {
      const { value, done: readerDone } = await reader.read();
      done = readerDone;
      if (value) {
        buffer += decoder.decode(value, { stream: !done });
        const parts = buffer.split('\n\n');
        buffer = parts.pop() || '';

        for (const part of parts) {
          if (!part.startsWith('data: ')) continue;
          try {
            const dataStr = part.substring(6).trim();
            if (!dataStr) continue;
            const data = JSON.parse(dataStr);

            if (data.type === 'token') {
              clearStatusInterval();
              streamedContent += data.content;
              setStreamingMessage(streamedContent);
              setAgentStatus(null);

            } else if (data.type === 'tool_start') {
              if (data.content?.includes('tavily_search')) {
                const statuses = ['Searching the web...', 'Analyzing sources...', 'Extracting insights...', 'Synthesizing data...'];
                setAgentStatus(statuses[0]);
                let step = 1;
                clearStatusInterval();
                statusIntervalRef.current = setInterval(() => {
                  setAgentStatus(statuses[step % statuses.length]);
                  step++;
                }, 2000);
              } else {
                clearStatusInterval();
                setAgentStatus(data.content);
              }

            } else if (data.type === 'done') {
              clearStatusInterval();
              setAgentStatus(null);

            } else if (data.type === 'document_saved') {
              // Document was saved — switch to Q&A mode
              if (onDocumentSaved) {
                onDocumentSaved(data.documentId, data.title);
              }

            } else if (data.type === 'error') {
              clearStatusInterval();
              setAgentStatus(null);
              streamedContent = `⚠️ **Error:** ${data.content}`;
            }
          } catch (e) {
            console.error('SSE parse error:', e, part);
          }
        }
      }
    }

    return streamedContent;
  }, []);

  // ─── Send message (text or file) ─────────────────────────────────────────
  const handleSendMessage = async (text, file) => {
    const hasFile = !!file;
    const hasText = !!text?.trim();
    if (!hasText && !hasFile) return;

    // Optimistic user message
    const userMsgContent = hasFile
      ? (hasText ? `📎 **${file.name}**\n\n${text}` : `📎 **${file.name}**`)
      : text;

    setMessages(prev => [...prev, {
      role: 'user',
      content: userMsgContent,
      _id: Date.now().toString()
    }]);
    setIsListening(true);

    const abortController = new AbortController();
    abortControllerRef.current = abortController;
    const token = localStorage.getItem('token');

    try {
      let response;

      // ── Branch A: File attached → Document analysis ─────────────────────
      if (hasFile) {
        setAttachedFile(null); // clear preview immediately
        setAgentStatus('Extracting document text...');

        const formData = new FormData();
        formData.append('document', file);
        if (hasText) formData.append('message', text);

        response = await fetch(`${baseURL}/documents/analyze`, {
          method: 'POST',
          headers: { 'Authorization': `Bearer ${token}` },
          body: formData,
          signal: abortController.signal,
        });

      // ── Branch B: Document Q&A mode ─────────────────────────────────────
      } else if (documentId) {
        setAgentStatus('Querying document...');

        response = await fetch(`${baseURL}/documents/${documentId}/question`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`,
          },
          body: JSON.stringify({ question: text }),
          signal: abortController.signal,
        });

      // ── Branch C: Regular chat ───────────────────────────────────────────
      } else {
        let chatId = currentChatId;
        if (!chatId) {
          const createRes = await fetch(`${baseURL}/chat`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
            body: JSON.stringify({ title: text.substring(0, 30) }),
            signal: abortController.signal,
          });
          const created = await createRes.json();
          chatId = created._id;
          creatingChatIdRef.current = chatId;
          if (onChatCreated) onChatCreated(chatId);
        }

        response = await fetch(`${baseURL}/chat/${chatId}/message`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
          body: JSON.stringify({ content: text }),
          signal: abortController.signal,
        });
      }

      // ── Handle HTTP error ────────────────────────────────────────────────
      if (!response.ok) {
        const err = await response.json();
        throw new Error(err.message || 'Server error');
      }
      if (!response.body) throw new Error('Streaming not supported in this browser.');

      // ── Stream the response ──────────────────────────────────────────────
      const streamedContent = await readSSEStream(response, abortController, (docId, title) => {
        setDocumentId(docId);
        setDocumentTitle(title);
        if (onDocumentCreated) {
          onDocumentCreated();
        }
      });

      // Finalize
      clearStatusInterval();
      setMessages(prev => [...prev, {
        role: 'ai',
        content: streamedContent.trim() || '⚠️ No response received. Please try again.',
        _id: Date.now().toString(),
      }]);
      setStreamingMessage('');
      setAgentStatus(null);

    } catch (error) {
      clearStatusInterval();
      if (error.name === 'AbortError') {
        setMessages(prev => [...prev, { role: 'ai', content: '🛑 Generation stopped.', _id: Date.now().toString() }]);
        setIsListening(false);
        setStreamingMessage('');
        setAgentStatus(null);
        return;
      }
      console.error('Message send error:', error);
      setIsListening(false);
      setStreamingMessage('');
      setAgentStatus(null);
      setMessages(prev => [...prev, {
        role: 'ai',
        content: `⚠️ ${error.message || 'An error occurred. Please try again.'}`,
        _id: Date.now().toString(),
      }]);
    }
  };

  const isProcessing = isListening || !!agentStatus || streamingMessage.length > 0;

  return (
    <div className="flex-1 h-[calc(100vh-3rem)] my-6 mr-6 ml-3 flex flex-col p-4 md:p-5 lg:p-4 overflow-hidden relative bg-white/30 backdrop-blur-2xl border border-white/40 rounded-[2.5rem] shadow-[0_8px_32px_0_rgba(31,38,135,0.04)]">
      <ChatHeader onMenuClick={onMenuClick} />
      <ChatWindow
        isListening={isListening}
        messages={messages}
        streamingMessage={streamingMessage}
        agentStatus={agentStatus}
        onSendMessage={handleSendMessage}
      />

      {/* Document Q&A banner */}
      {documentId && !isProcessing && (
        <DocumentContextBanner
          documentTitle={documentTitle}
          onClear={() => { setDocumentId(null); setDocumentTitle(''); }}
        />
      )}

      <InputBar
        isListening={isListening}
        setIsListening={setIsListening}
        onSendMessage={handleSendMessage}
        disabled={isProcessing}
        onStop={handleStop}
        attachedFile={attachedFile}
        onFileSelect={setAttachedFile}
        onRemoveFile={() => setAttachedFile(null)}
        chatId={currentChatId}
      />

    </div>
  );
};

export default Chat;
