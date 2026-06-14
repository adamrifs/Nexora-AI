import React, { useState, useRef, useEffect } from 'react';
import { Copy, Check, Download, ArrowDown } from 'lucide-react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import html2pdf from 'html2pdf.js';
import MessageBubble from './MessageBubble';
import GeneratedMediaCard from './GeneratedMediaCard';
import VoiceResponseCard from './VoiceResponseCard';
import ListeningIndicator from './ListeningIndicator';
import EnhancedMessageRenderer from './EnhancedCards/EnhancedMessageRenderer';
import sphere from '../../../assets/sphere.png';

const CopyButton = ({ text }) => {
  const [copied, setCopied] = useState(false);

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(text);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      console.error('Failed to copy: ', err);
    }
  };

  return (
    <button 
      onClick={handleCopy}
      className="text-gray-400 hover:text-[#8C52FF] transition-all p-1.5 rounded-full hover:bg-black/5 flex items-center justify-center shrink-0 opacity-0 group-hover:opacity-100 duration-200"
      title="Copy message"
    >
      {copied ? <Check className="w-4 h-4 text-emerald-600" /> : <Copy className="w-4 h-4" />}
    </button>
  );
};

const DownloadPdfButton = ({ contentRef }) => {
  const [downloading, setDownloading] = useState(false);

  const handleDownload = async () => {
    if (!contentRef.current) return;
    try {
      setDownloading(true);
      const opt = {
        margin:       15,
        filename:     'Business_Report.pdf',
        image:        { type: 'jpeg', quality: 0.98 },
        html2canvas:  { scale: 2, useCORS: true, logging: false },
        jsPDF:        { unit: 'mm', format: 'a4', orientation: 'portrait' }
      };
      await html2pdf().set(opt).from(contentRef.current).save();
    } catch (err) {
      console.error('Failed to generate PDF: ', err);
    } finally {
      setDownloading(false);
    }
  };

  return (
    <button 
      onClick={handleDownload}
      disabled={downloading}
      className="text-gray-400 hover:text-[#8C52FF] transition-all p-1.5 rounded-full hover:bg-black/5 flex items-center justify-center shrink-0 opacity-0 group-hover:opacity-100 duration-200 disabled:opacity-50"
      title="Download as PDF"
    >
      {downloading ? <Check className="w-4 h-4 text-emerald-600" /> : <Download className="w-4 h-4" />}
    </button>
  );
};

const AiMessageContainer = ({ msg, onSendMessage }) => {
  const contentRef = useRef(null);

  return (
    <div className="group flex justify-start w-full mb-6 gap-2 md:gap-3 items-start px-1 animate-slide-up">
      {/* Avatar */}
      <div className="w-7 h-7 md:w-14 md:h-14 rounded-full flex items-center justify-center shrink-0 overflow-hidden">
        <img src={sphere} alt="AI" className="w-full h-full object-cover" />
      </div>

      {/* Content area */}
      <div className="flex-1 grid grid-cols-1 lg:grid-cols-[1fr_320px] gap-3 md:gap-5 items-start max-w-[calc(100%-2.25rem)] md:max-w-[calc(100%-3.5rem)] w-full">
        <div className="flex flex-col items-start gap-1">
          <div ref={contentRef} className="w-full bg-white/40 p-4 rounded-[34px]">
            <EnhancedMessageRenderer content={msg.content} onSendMessage={onSendMessage} />
          </div>
          <div className="flex items-center gap-1 ml-2">
            <CopyButton text={msg.content} />
            <DownloadPdfButton contentRef={contentRef} />
          </div>
        </div>

        {/* Show media cards if the message contains generated images */}
        {msg.images && msg.images.length > 0 && (
          <div className="flex flex-col gap-3 w-full">
            {msg.images.map((img, i) => (
              <GeneratedMediaCard key={i} imageUrl={img} />
            ))}
          </div>
        )}
        {/* Show voice response if the message contains audio */}
        {msg.audioUrl && (
          <div className="flex flex-col gap-3 w-full mt-3">
            <VoiceResponseCard />
          </div>
        )}
      </div>
    </div>
  );
};

const ChatWindow = ({ isListening, messages = [], streamingMessage = '', agentStatus = null, onSendMessage }) => {
  const bottomRef = useRef(null);
  const [showScrollButton, setShowScrollButton] = useState(false);

  useEffect(() => {
    if (bottomRef.current && !showScrollButton) {
      const timer = setTimeout(() => {
        bottomRef.current.scrollIntoView({ behavior: 'smooth' });
      }, 100);
      return () => clearTimeout(timer);
    }
  }, [messages, streamingMessage, isListening]);

  const handleScroll = (e) => {
    const { scrollTop, scrollHeight, clientHeight } = e.target;
    const isScrolledUp = scrollHeight - scrollTop - clientHeight > 150;
    setShowScrollButton(isScrolledUp);
  };

  const scrollToBottom = () => {
    if (bottomRef.current) {
      bottomRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  };

  return (
    <div className="flex-1 overflow-y-auto no-scrollbar py-6 flex flex-col scroll-smooth relative" onScroll={handleScroll}>
      
      {messages.length === 0 && !isListening && (
        <div className="flex-1 flex items-center justify-center">
          <div className="text-center px-4">
            <div className="w-36 h-36 rounded-full flex items-center justify-center mx-auto mb-4 animate-[float_4s_ease-in-out_infinite]">
              <img src={sphere} alt="Nexora" className="w-48 h-48 object-cover rounded-full animate-[spin_25s_linear_infinite]" />
            </div>
            <h3 className="text-[#1a1a1a] text-xl font-semibold mb-2 animate-typewriter">How can I help you today?</h3>
            <p className="text-gray-500 text-sm max-w-md mx-auto animate-typewriter-sub">Ask me to analyze data, schedule meetings, or draft emails.</p>
          </div>
        </div>
      )}

      {messages.map((msg, index) => {
        if (msg.role === 'user') {
          return <MessageBubble key={msg._id || index} role="user" text={msg.content} />;
        }
        
        return <AiMessageContainer key={msg._id || index} msg={msg} onSendMessage={onSendMessage} />;
      })}

      {/* Streaming Message Indicator */}
      {streamingMessage && (
        <div className="flex justify-start w-full mb-6 gap-2 md:gap-3 items-start px-4 animate-slide-up">
          <div className="w-7 h-7 md:w-10 md:h-10 rounded-full flex items-center justify-center shrink-0 overflow-hidden">
            <img src={sphere} alt="AI" className="w-full h-full object-cover" />
          </div>
          <div className="flex-1 grid grid-cols-1 lg:grid-cols-[1fr_320px] gap-3 md:gap-5 items-start max-w-[calc(100%-2.25rem)] md:max-w-[calc(100%-3.5rem)] w-full">
            <EnhancedMessageRenderer content={streamingMessage} isStreaming={true} onSendMessage={onSendMessage} />
          </div>
        </div>
      )}

      {/* Agent Status Indicator */}
      {agentStatus && !streamingMessage && (
        <div className="flex justify-start w-full mb-6 gap-3 items-center px-4 animate-fade-in">
          <div className="w-8 h-8 rounded-full flex items-center justify-center shrink-0 overflow-hidden">
            <img src={sphere} alt="Thinking..." className="w-8 h-8 object-cover opacity-90 animate-[spin_3s_linear_infinite]" />
          </div>
          <div className="bg-white/60 backdrop-blur-md px-4 py-2 rounded-full border border-white/50 text-sm text-gray-700 font-medium shadow-sm flex items-center gap-2 overflow-hidden">
            <span className="w-1.5 h-1.5 rounded-full bg-purple-500 animate-pulse shrink-0"></span>
            <span key={agentStatus} className="animate-status-fade inline-block">
              {agentStatus}
            </span>
          </div>
        </div>
      )}

      <div className={`grid transition-all duration-500 ease-out ${isListening ? 'grid-rows-1fr opacity-100 scale-100 my-8' : 'grid-rows-0fr opacity-0 scale-95 pointer-events-none my-0'}`}>
        <div className="overflow-hidden">
          <ListeningIndicator />
        </div>
      </div>
      <div ref={bottomRef} />

      {/* Scroll to Bottom Button */}
      <div className={`sticky bottom-4 w-full flex justify-center pointer-events-none transition-all duration-300 z-50 ${showScrollButton ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-4'}`}>
        <button 
          onClick={scrollToBottom}
          className="pointer-events-auto bg-white/80 backdrop-blur-md border border-white/50 text-gray-600 hover:text-[#8C52FF] p-2.5 rounded-full shadow-[0_4px_20px_rgba(0,0,0,0.08)] hover:shadow-[0_4px_25px_rgba(140,82,255,0.2)] transition-all hover:-translate-y-0.5 group"
        >
          <ArrowDown className="w-5 h-5 group-hover:text-[#8C52FF] transition-colors" />
        </button>
      </div>

    </div>
  );
};

export default ChatWindow;
