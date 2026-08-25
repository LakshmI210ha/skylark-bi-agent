// components/ChatInterface.tsx
'use client';

import React, { useState, useRef, useEffect, useLayoutEffect } from 'react';
import {
  Send,
  Sparkles,
  Bot,
  Trash2,
  TrendingUp,
  AlertTriangle,
  FileSpreadsheet,
  ArrowUpRight,
  Zap,
  Briefcase,
  ChevronRight,
} from 'lucide-react';
import { MessageBubble } from './MessageBubble';
import { ChatMessage, PipelineAnalytics, FilterState } from '@/types';

interface ChatInterfaceProps {
  analytics: PipelineAnalytics | null;
  filters: FilterState;
  onRefreshData?: () => void;
}

const FOUNDER_PROMPTS = [
  {
    title: 'Pipeline Overview',
    desc: 'Understand current pipeline',
    prompt: 'How is our pipeline looking?',
    icon: Zap,
    badgeBg: 'bg-blue-600/10 border-blue-500/20 text-blue-400',
  },
  {
    title: 'Energy Sector',
    desc: 'Analyze energy performance',
    prompt: 'How is the Energy sector performing?',
    icon: TrendingUp,
    badgeBg: 'bg-teal-600/10 border-teal-500/20 text-teal-400',
  },
  {
    title: 'Delayed Projects',
    desc: 'Identify project delivery risks',
    prompt: 'Which projects are delayed?',
    icon: AlertTriangle,
    badgeBg: 'bg-rose-500/10 border-rose-500/20 text-rose-400',
  },
  {
    title: 'Sales vs Operations',
    desc: 'Compare deals with work orders',
    prompt: 'Compare Energy deals with Energy work orders.',
    icon: FileSpreadsheet,
    badgeBg: 'bg-indigo-600/10 border-indigo-500/20 text-indigo-400',
  },
  {
    title: 'Leadership Update',
    desc: 'Generate executive briefing',
    prompt: 'Prepare a leadership update.',
    icon: Sparkles,
    badgeBg: 'bg-blue-600/15 border-blue-500/30 text-blue-300',
  },
];

export const ChatInterface: React.FC<ChatInterfaceProps> = ({
  analytics,
  filters,
  onRefreshData,
}) => {
  const [messages, setMessages] = useState<ChatMessage[]>([
    {
      id: 'msg_welcome',
      role: 'assistant',
      content: `### ✈️ Welcome to the Skylark Executive BI Agent

I provide **founder-level intelligence directly grounded in your live Monday.com boards** (Sales Pipeline Deals & Operational Work Orders) using quantitative analytics and Google Gemini.

**Ask me questions like:**
* *"How is our overall pipeline looking?"*
* *"Which sectors have the strongest pipeline?"*
* *"Which projects are delayed?"*
* *"Compare Energy deals with Energy work orders."*
* *"Prepare a leadership update."*

All figures are strictly computed from live data with zero hallucination. Click a prompt below or type any question to begin.`,
      timestamp: new Date().toISOString(),
      suggestedFollowUps: [
        'How is our pipeline looking?',
        'How is the Energy sector performing?',
        'Which projects are delayed?',
        'Prepare a leadership update.',
      ],
    },
  ]);

  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const messagesContainerRef = useRef<HTMLDivElement>(null);

  useLayoutEffect(() => {
    const container = messagesContainerRef.current;
    if (!container) return;

    container.scrollTo({
      top: container.scrollHeight,
      behavior: 'auto',
    });
  }, [messages, loading]);
  const handleSendMessage = async (textToSend?: string) => {
    const query = (textToSend || input).trim();
    if (!query || loading) return;

    setInput('');

    const userMessage: ChatMessage = {
      id: `msg_user_${Date.now()}`,
      role: 'user',
      content: query,
      timestamp: new Date().toISOString(),
    };

    setMessages((prev) => [...prev, userMessage]);
    setLoading(true);

    try {
      const historyPayload = messages
        .filter((m) => m.role === 'user' || m.role === 'assistant')
        .slice(-6)
        .map((m) => ({
          role: m.role,
          content: m.content,
        }));

      const res = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          message: query,
          history: historyPayload,
          filters,
        }),
      });

      const data = await res.json();

      if (!res.ok || data.error) {
        throw new Error(data.error || 'Failed to generate response.');
      }

      if (data.message) {
        setMessages((prev) => [...prev, data.message]);
      }
    } catch (err: any) {
      console.error('Chat error:', err);
      const errorMessage: ChatMessage = {
        id: `msg_err_${Date.now()}`,
        role: 'assistant',
        content: `⚠️ **Error Processing Query:**\n\n${err?.message || 'Could not fetch live Monday.com insights.'
          }\n\n*Please ensure \`MONDAY_API_TOKEN\` and board IDs are set in \`.env.local\`.*`,
        timestamp: new Date().toISOString(),
      };
      setMessages((prev) => [...prev, errorMessage]);
    } finally {
      setLoading(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    }
  };

  const handleClearChat = () => {
    setMessages([
      {
        id: `msg_welcome_${Date.now()}`,
        role: 'assistant',
        content: 'Chat history cleared. How can I assist with your pipeline or operations?',
        timestamp: new Date().toISOString(),
        suggestedFollowUps: [
          'How is our pipeline looking?',
          'Which projects are delayed?',
          'Prepare a leadership update.',
        ],
      },
    ]);
  };

  return (
    <div className="flex flex-col h-[calc(100vh-220px)] min-h-[600px] max-h-[750px] glass-card overflow-hidden border border-slate-800 bg-[#0E1526]/95 shadow-xl rounded-2xl">
      {/* AI Assistant Header */}
      <div className="p-3.5 px-4 border-b border-slate-800 bg-[#0A0F1E] flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-lg bg-blue-600/20 border border-blue-500/30 flex items-center justify-center text-blue-400 shadow-sm">
            <Bot className="w-4 h-4" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-xs font-bold text-white tracking-wide uppercase">
                Skylark AI Assistant
              </h2>
              <span className="flex items-center gap-1 text-[10px] text-teal-400 font-semibold bg-teal-500/10 px-2 py-0.5 rounded-full border border-teal-500/20">
                <span className="w-1.5 h-1.5 rounded-full bg-teal-400 pulse-dot" />
                Live Data Connected
              </span>
            </div>
            <p className="text-[11px] text-slate-400">
              Executive Business Intelligence Agent
            </p>
          </div>
        </div>

        <button
          onClick={handleClearChat}
          className="p-1.5 rounded-lg bg-slate-900 hover:bg-slate-800 text-slate-400 hover:text-slate-200 text-xs border border-slate-800 transition-colors cursor-pointer"
          title="Clear Conversation"
        >
          <Trash2 className="w-3.5 h-3.5" />
        </button>
      </div>

      {/* Quick Founder Prompt Cards */}
      <div className="p-3 border-b border-slate-800/80 bg-[#0B1020]/70 overflow-x-auto">
        <div className="flex items-stretch gap-2.5 min-w-max">
          {FOUNDER_PROMPTS.map((item, idx) => {
            const Icon = item.icon;
            return (
              <button
                key={idx}
                onClick={() => handleSendMessage(item.prompt)}
                disabled={loading}
                className={`p-2.5 rounded-xl border ${item.badgeBg} hover:bg-slate-800/60 transition-all text-left flex flex-col justify-between w-44 group cursor-pointer bg-slate-900/60`}
              >
                <div className="flex items-center justify-between mb-1">
                  <span className="text-[11px] font-bold text-slate-200 group-hover:text-white flex items-center gap-1.5">
                    <Icon className="w-3.5 h-3.5 shrink-0" />
                    {item.title}
                  </span>
                  <ChevronRight className="w-3 h-3 text-slate-500 group-hover:text-white transition-transform group-hover:translate-x-0.5" />
                </div>
                <div className="text-[10px] text-slate-400 line-clamp-1">
                  {item.desc}
                </div>
              </button>
            );
          })}
        </div>
      </div>

      {/* Message Stream */}
      <div
        ref={messagesContainerRef}
        className="flex-1 min-h-0 overflow-y-auto overscroll-contain overflow-anchor-none p-4 md:p-5 space-y-4"
      >
        {messages.map((msg) => (
          <MessageBubble
            key={msg.id}
            message={msg}
            onSelectPrompt={(p) => handleSendMessage(p)}
          />
        ))}

        {/* Thinking Spinner */}
        {loading && (
          <div className="flex items-center gap-3 my-3">
            <div className="w-8 h-8 rounded-xl bg-blue-600/20 borde border-blue-500/30 flex items-center justify-center text-blue-400">
              <Bot className="w-4 h-4 animate-pulse" />
            </div>
            <div className="glass-card px-4 py-3 rounded-2xl rounded-tl-none border-slate-700/60 bg-[#0E1628]/95 text-xs text-slate-300 flex items-center gap-3 shadow-sm">
              <div className="flex gap-1">
                <span className="w-1.5 h-1.5 rounded-full bg-blue-400 animate-bounce" style={{ animationDelay: '0ms' }} />
                <span className="w-1.5 h-1.5 rounded-full bg-blue-400 animate-bounce" style={{ animationDelay: '150ms' }} />
                <span className="w-1.5 h-1.5 rounded-full bg-blue-400 animate-bounce" style={{ animationDelay: '300ms' }} />
              </div>
              <span className="text-slate-400 font-medium">
                Analyzing live Monday.com pipeline & generating executive brief...
              </span>
            </div>
          </div>
        )}

      </div>

      {/* Input Composer */}
      <div className="p-3.5 border-t border-slate-800 bg-[#080C16]">
        <form
          onSubmit={(e) => {
            e.preventDefault();
            handleSendMessage();
          }}
          className="flex items-center gap-2"
        >
          <div className="relative flex-1">
            <textarea
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="Ask Skylark AI anything about your business..."
              rows={1}
              className="w-full bg-slate-900 border border-slate-700/80 rounded-xl px-4 py-2.5 text-xs sm:text-sm text-slate-100 placeholder-slate-500 focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 resize-none transition-all"
            />
          </div>

          <button
            type="submit"
            disabled={loading || !input.trim()}
            className="w-10 h-10 rounded-xl bg-blue-600 hover:bg-blue-500 text-white flex items-center justify-center shadow-md shadow-blue-600/20 disabled:opacity-40 disabled:cursor-not-allowed transition-all shrink-0 cursor-pointer"
            title="Send prompt"
          >
            <Send className="w-4 h-4" />
          </button>
        </form>
      </div>
    </div>
  );
};
