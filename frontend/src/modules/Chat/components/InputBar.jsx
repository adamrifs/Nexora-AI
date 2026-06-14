import React, { useState, useRef, useEffect } from 'react';
import { Plus, Mic, Send, Square, X, FileText, FileSpreadsheet, Presentation } from 'lucide-react';

// ─── File type → icon + color ─────────────────────────────────────────────────
const FILE_TYPE_CONFIG = {
  pdf:  { icon: FileText,         color: 'text-red-500',    bg: 'bg-red-50',    label: 'PDF' },
  docx: { icon: FileText,         color: 'text-blue-500',   bg: 'bg-blue-50',   label: 'DOCX' },
  doc:  { icon: FileText,         color: 'text-blue-500',   bg: 'bg-blue-50',   label: 'DOC' },
  pptx: { icon: Presentation,     color: 'text-orange-500', bg: 'bg-orange-50', label: 'PPTX' },
  ppt:  { icon: Presentation,     color: 'text-orange-500', bg: 'bg-orange-50', label: 'PPT' },
  xlsx: { icon: FileSpreadsheet,  color: 'text-green-600',  bg: 'bg-green-50',  label: 'XLSX' },
  xls:  { icon: FileSpreadsheet,  color: 'text-green-600',  bg: 'bg-green-50',  label: 'XLS' },
  csv:  { icon: FileSpreadsheet,  color: 'text-teal-600',   bg: 'bg-teal-50',   label: 'CSV' },
};

const ACCEPTED_EXTENSIONS = '.pdf,.docx,.doc,.pptx,.ppt,.xlsx,.xls,.csv';

const formatFileSize = (bytes) => {
  if (bytes < 1024)        return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
};

// ─── File Preview Pill ────────────────────────────────────────────────────────
const FilePreviewPill = ({ file, onRemove }) => {
  const ext    = file.name.split('.').pop().toLowerCase();
  const config = FILE_TYPE_CONFIG[ext] || { icon: FileText, color: 'text-gray-500', bg: 'bg-gray-50', label: ext.toUpperCase() };
  const Icon   = config.icon;

  return (
    <div className="flex items-center gap-2 bg-white/80 backdrop-blur-md border border-white/60 shadow-sm rounded-2xl px-3 py-2 mb-2 max-w-xs animate-slide-up">
      <div className={`w-8 h-8 rounded-xl ${config.bg} flex items-center justify-center shrink-0`}>
        <Icon className={`w-4 h-4 ${config.color}`} />
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-xs font-semibold text-gray-800 truncate leading-tight">{file.name}</p>
        <p className="text-[10px] text-gray-400 leading-tight">{config.label} · {formatFileSize(file.size)}</p>
      </div>
      <button
        onClick={onRemove}
        className="w-5 h-5 rounded-full bg-gray-100 hover:bg-red-100 flex items-center justify-center transition-colors shrink-0 text-gray-400 hover:text-red-500"
        title="Remove file"
      >
        <X className="w-3 h-3" />
      </button>
    </div>
  );
};

// ─── InputBar ─────────────────────────────────────────────────────────────────
const InputBar = ({ isListening, setIsListening, onSendMessage, disabled, onStop, attachedFile, onFileSelect, onRemoveFile, chatId }) => {
  const [text, setText]       = useState('');
  const [isFocused, setIsFocused] = useState(false);
  const textareaRef           = useRef(null);
  const fileInputRef          = useRef(null);

  useEffect(() => {
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto';
      textareaRef.current.style.height = `${Math.min(textareaRef.current.scrollHeight, 150)}px`;
    }
  }, [text]);

  // Automatically focus the input field when it becomes enabled, or when a file is attached/removed/chat switches
  useEffect(() => {
    if (!disabled && !isListening) {
      const timer = setTimeout(() => {
        textareaRef.current?.focus();
      }, 50);
      return () => clearTimeout(timer);
    }
  }, [disabled, isListening, attachedFile, chatId]);


  const handleKeyDown = (e) => {
    if (disabled) return;
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const handleSend = () => {
    if (disabled) return;
    // Allow send if there's text OR an attached file
    if ((text.trim() || attachedFile) && onSendMessage) {
      onSendMessage(text, attachedFile || null);
      setText('');
    }
  };

  const handleFileChange = (e) => {
    const file = e.target.files?.[0];
    if (file && onFileSelect) {
      onFileSelect(file);
    }
    // Reset input so same file can be re-selected
    e.target.value = '';
  };

  const canSend = (text.trim() || attachedFile) && !disabled;

  return (
    <div className="w-full shrink-0 mt-2 transition-opacity duration-300 z-10 flex flex-col">

      {/* Hidden file input */}
      <input
        ref={fileInputRef}
        type="file"
        accept={ACCEPTED_EXTENSIONS}
        className="hidden"
        onChange={handleFileChange}
      />

      {/* File preview above the bar */}
      {attachedFile && (
        <div className="px-4 mb-2 z-20">
          <FilePreviewPill file={attachedFile} onRemove={onRemoveFile} />
        </div>
      )}

      {/* Input container with relative positioning for its own glow */}
      <div className="relative w-full">
        {/* Animated Feathered Glow Layer */}
        <div className="absolute -inset-[2px] bg-[linear-gradient(90deg,#8C52FF,#3B82F6,#A573FF,#8B5CF6,#8C52FF)] bg-[length:200%_auto] animate-gradient opacity-60 blur-md rounded-[2.5rem]" />

        {/* Inner Content (Glassmorphism) */}
        <div className="relative w-full bg-white/80 backdrop-blur-2xl border border-white/40 shadow-[0_8px_32px_0_rgba(31,38,135,0.05)] rounded-[2.5rem] py-1.5 px-2 flex items-end justify-between">

        {/* + Button — opens file picker */}
        <button
          onClick={() => !disabled && fileInputRef.current?.click()}
          className={`w-10 h-10 rounded-full hover:bg-white/50 flex items-center justify-center transition-colors shrink-0 disabled:opacity-50 disabled:cursor-not-allowed ${attachedFile ? 'text-[#8C52FF]' : 'text-gray-500'}`}
          disabled={disabled}
          title="Attach document (PDF, DOCX, PPTX, XLSX, CSV)"
        >
          <Plus className="w-5 h-5" />
        </button>

        {/* Textarea */}
        <div className="relative flex-1 flex items-center">
          {!text && (disabled || !isFocused) && (
            <div className="absolute inset-y-0 left-0 px-4 py-2 pointer-events-none flex items-center">
              {disabled ? (
                <span className="text-[#8C52FF] font-medium text-[15px] animate-typing-loop">
                  {attachedFile ? 'Analyzing document...' : 'Waiting for response...'}
                </span>
              ) : (
                <>
                  <div className="hidden md:block">
                    <span className="text-gray-400 text-[15px] animate-typing-loop">
                      {attachedFile
                        ? 'Add a specific question or focus area (optional)...'
                        : 'Research a company, analyze a market, compare competitors, or generate insights...'}
                    </span>
                  </div>
                  <div className="block md:hidden">
                    <span className="text-gray-400 text-[15px] animate-typing-loop">
                      {attachedFile ? 'Add a question (optional)...' : 'Research a company or market...'}
                    </span>
                  </div>
                </>
              )}
            </div>
          )}
          <textarea
            ref={textareaRef}
            value={text}
            onChange={(e) => setText(e.target.value)}
            onKeyDown={handleKeyDown}
            onFocus={() => setIsFocused(true)}
            onBlur={() => setIsFocused(false)}
            placeholder=""
            rows={1}
            className="w-full relative z-10 bg-transparent border-none focus:outline-none focus:ring-0 text-gray-800 px-4 py-2 text-[15px] disabled:bg-transparent disabled:cursor-not-allowed resize-none overflow-y-auto no-scrollbar"
            disabled={disabled || isListening}
          />
        </div>

        {/* Action Button */}
        <div className="relative">
          {disabled ? (
            <button
              onClick={onStop}
              title="Stop generation"
              className="w-10 h-10 rounded-full bg-gradient-to-br from-red-400 to-red-500 hover:opacity-90 flex items-center justify-center transition-all shadow-md shrink-0"
            >
              <Square className="w-3.5 h-3.5 text-white fill-current" />
            </button>
          ) : canSend ? (
            <button
              onClick={handleSend}
              className="w-10 h-10 rounded-full bg-gradient-to-br from-[#A573FF] to-[#8C52FF] hover:opacity-90 flex items-center justify-center transition-all shadow-md shrink-0"
            >
              <Send className="w-4 h-4 text-white" />
            </button>
          ) : (
            <button
              onClick={() => !disabled && setIsListening(!isListening)}
              className={`w-10 h-10 rounded-full bg-gradient-to-br from-[#A573FF] to-[#8C52FF] hover:opacity-90 flex items-center justify-center transition-all shadow-md shrink-0 ${isListening ? 'ring-4 ring-[#A573FF]/40 shadow-[0_0_15px_rgba(165,115,255,0.8)] animate-pulse' : ''}`}
            >
              <Mic className="w-4 h-4 text-white" />
            </button>
          )}
        </div>
      </div>
      </div>
    </div>
  );
};

export default InputBar;
