import React, { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { MessageSquare, X, Send, Sparkles, User, Brain } from 'lucide-react';
import { getChatResponse, Message } from '../lib/chatEngine';

interface ChatPanelProps {
  isOpen: boolean;
  onClose: () => void;
  dataContext: { columns: any[], rows: any[], domain: string, summary: string };
}

export function ChatPanel({ isOpen, onClose, dataContext }: ChatPanelProps) {
  const [messages, setMessages] = useState<Message[]>([
    {
      role: 'assistant',
      content: `Hello! I'm InsightIQ. I've analyzed your ${dataContext.domain} dataset. What would you like to know?`,
      timestamp: new Date()
    }
  ]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleEsc = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose(); };
    window.addEventListener('keydown', handleEsc);
    return () => window.removeEventListener('keydown', handleEsc);
  }, [onClose]);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages]);

  const handleSend = async () => {
    if (!input.trim() || isLoading) return;

    const userMsg: Message = { role: 'user', content: input, timestamp: new Date() };
    setMessages(prev => [...prev, userMsg]);
    setInput('');
    setIsLoading(true);

    try {
      const response = await getChatResponse(input, messages, dataContext);
      const assistantMsg: Message = { role: 'assistant', content: response, timestamp: new Date() };
      setMessages(prev => [...prev, assistantMsg]);
    } catch (error) {
      setMessages(prev => [...prev, {
        role: 'assistant',
        content: "I encountered an error processing that request. Please try again.",
        timestamp: new Date()
      }]);
    } finally {
      setIsLoading(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div style={{
      position: 'fixed', bottom: '90px', right: '24px',
      width: '380px', height: '600px', zIndex: 1000,
      background: 'rgba(15,22,41,0.95)',
      backdropFilter: 'blur(20px)',
      border: '1px solid rgba(255,255,255,0.1)',
      borderRadius: '20px',
      display: 'flex', flexDirection: 'column',
      boxShadow: '0 25px 50px rgba(0,0,0,0.5)',
      overflow: 'hidden'
    }} className="no-print">
      {/* Header */}
      <div style={{
        padding: '16px 20px',
        borderBottom: '1px solid rgba(255,255,255,0.08)',
        display: 'flex', alignItems: 'center',
        justifyContent: 'space-between'
      }}>
        <div style={{display:'flex', alignItems:'center', gap:'8px'}}>
          <span style={{fontSize:'20px'}}>✨</span>
          <span style={{color:'white', fontWeight:'600'}}>Ask InsightIQ</span>
        </div>
        <button
          onClick={onClose}
          style={{
            width:'32px', height:'32px',
            borderRadius:'50%', border:'none',
            background:'rgba(255,255,255,0.1)',
            color:'white', cursor:'pointer',
            display:'flex', alignItems:'center',
            justifyContent:'center', fontSize:'16px',
            transition: 'background 0.2s'
          }}
          onMouseEnter={e => (e.currentTarget.style.background='rgba(255,255,255,0.2)')}
          onMouseLeave={e => (e.currentTarget.style.background='rgba(255,255,255,0.1)')}
        >✕</button>
      </div>

      {/* Messages */}
      <div ref={scrollRef} className="flex-1 overflow-y-auto p-6 space-y-6 scrollbar-hide">
        {messages.map((msg, i) => (
          <motion.div
            key={i}
            initial={{ opacity: 0, x: msg.role === 'user' ? 20 : -20 }}
            animate={{ opacity: 1, x: 0 }}
            className={`flex gap-3 ${msg.role === 'user' ? 'flex-row-reverse' : ''}`}
          >
            <div className={`w-8 h-8 rounded-lg flex items-center justify-center shrink-0 ${
              msg.role === 'user' ? 'bg-brand-secondary/20 text-brand-secondary' : 'bg-brand-accent/20 text-brand-accent'
            }`}>
              {msg.role === 'user' ? <User size={14} /> : <Sparkles size={14} />}
            </div>
            <div className={`max-w-[80%] p-4 rounded-2xl text-xs leading-relaxed ${
              msg.role === 'user' 
                ? 'bg-brand-accent text-brand-bg font-bold shadow-lg' 
                : 'bg-white/5 text-gray-300 border border-white/5'
            }`}>
              {msg.content}
            </div>
          </motion.div>
        ))}
        {isLoading && (
          <div className="flex gap-3">
            <div className="w-8 h-8 rounded-lg bg-brand-accent/20 text-brand-accent flex items-center justify-center">
              <Brain size={14} className="animate-spin" />
            </div>
            <div className="bg-white/5 p-4 rounded-2xl border border-white/5">
              <div className="flex gap-1">
                {[1,2,3].map(n => <div key={n} className="w-1.5 h-1.5 bg-brand-accent/40 rounded-full animate-bounce" style={{ animationDelay: `${n*0.2}s` }} />)}
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Input */}
      <div className="p-6 border-t border-white/5 bg-white/[0.02]">
        <div className="relative group">
          <input
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && handleSend()}
            placeholder="Ask about trends, summaries..."
            className="w-full bg-white/5 border border-white/10 rounded-2xl pl-12 pr-12 py-4 text-xs text-white placeholder-gray-600 focus:outline-none focus:ring-2 focus:ring-brand-accent/20 transition-all font-mono"
          />
          <button
            onClick={handleSend}
            disabled={isLoading}
            className="absolute right-2 top-1/2 -translate-y-1/2 p-2.5 bg-brand-accent text-brand-bg rounded-xl hover:scale-105 active:scale-95 transition-all shadow-lg"
          >
            <Send size={16} />
          </button>
        </div>
      </div>
    </div>
  );
}
