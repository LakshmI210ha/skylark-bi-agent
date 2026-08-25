// components/MessageBubble.tsx
'use client';

import React, { useState } from 'react';
import {
  Bot,
  User,
  Copy,
  Check,
  AlertTriangle,
  FileSpreadsheet,
  Sparkles,
  ArrowRight,
} from 'lucide-react';
import { ChatMessage } from '@/types';

interface MessageBubbleProps {
  message: ChatMessage;
  onSelectPrompt?: (prompt: string) => void;
}

export const MessageBubble: React.FC<MessageBubbleProps> = ({
  message,
  onSelectPrompt,
}) => {
  const [copied, setCopied] = useState(false);
  const isUser = message.role === 'user';

  const handleCopy = () => {
    navigator.clipboard.writeText(message.content);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const timeFormatted = new Date(message.timestamp).toLocaleTimeString([], {
    hour: '2-digit',
    minute: '2-digit',
  });

  return (
    <div className={`flex gap-3 ${isUser ? 'flex-row-reverse' : 'flex-row'}`}>
      {/* Avatar */}
      <div
        className={`w-7 h-7 rounded-lg flex items-center justify-center shrink-0 shadow-sm ${
          isUser
            ? 'bg-blue-600 text-white'
            : 'bg-slate-800 text-blue-400 border border-slate-700'
        }`}
      >
        {isUser ? <User className="w-3.5 h-3.5" /> : <Bot className="w-3.5 h-3.5" />}
      </div>

      {/* Bubble Container */}
      <div className={`flex flex-col max-w-[92%] sm:max-w-[85%] ${isUser ? 'items-end' : 'items-start'}`}>
        {/* Meta Line */}
        <div className="flex items-center gap-2 mb-1 px-1 text-[11px] text-slate-400">
          <span className="font-semibold text-slate-300">
            {isUser ? 'Founder / Executive' : 'Skylark BI Agent'}
          </span>
          <span>•</span>
          <span>{timeFormatted}</span>
          {message.isLeadershipUpdate && (
            <span className="flex items-center gap-1 text-[10px] uppercase font-bold px-2 py-0.5 rounded-full bg-blue-500/15 text-blue-300 border border-blue-500/30">
              <Sparkles className="w-2.5 h-2.5" /> Leadership Briefing
            </span>
          )}
        </div>

        {/* Bubble Box */}
        <div
          className={`p-3.5 sm:p-4 rounded-2xl text-xs sm:text-sm leading-relaxed transition-all shadow-sm ${
            isUser
              ? 'bg-blue-600 text-white rounded-tr-none'
              : 'glass-card text-slate-200 rounded-tl-none border-slate-800 bg-[#0E1526]'
          }`}
        >
          {/* Main Markdown Content */}
          <div className="markdown-body whitespace-pre-wrap">{message.content}</div>

          {/* Transparent Data Quality Caveats */}
          {!isUser && message.dataQualityCaveats && message.dataQualityCaveats.length > 0 && (
            <div className="mt-3.5 pt-3 border-t border-slate-800 bg-amber-500/[0.04] rounded-xl p-3 border border-amber-500/20">
              <div className="flex items-center gap-1.5 text-xs font-semibold text-amber-400 mb-1.5">
                <AlertTriangle className="w-3.5 h-3.5" />
                <span>Data Transparency & Quality Notice</span>
              </div>
              <ul className="text-xs text-slate-300 space-y-1 list-disc pl-4">
                {message.dataQualityCaveats.map((c, i) => (
                  <li key={i}>{c}</li>
                ))}
              </ul>
            </div>
          )}

          {/* Action Footer */}
          {!isUser && (
            <div className="mt-3 pt-2.5 flex items-center justify-between text-xs text-slate-400 border-t border-slate-800">
              <span className="flex items-center gap-1.5 text-[11px] text-teal-400 font-medium">
                <FileSpreadsheet className="w-3 h-3 text-teal-400" />
                Live Monday.com Data Verified
              </span>
              <button
                onClick={handleCopy}
                className="flex items-center gap-1 px-2.5 py-1 rounded-md bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white transition-colors text-xs font-medium border border-slate-700/60 cursor-pointer"
                title="Copy response to clipboard"
              >
                {copied ? <Check className="w-3 h-3 text-teal-400" /> : <Copy className="w-3 h-3" />}
                <span>{copied ? 'Copied' : 'Copy'}</span>
              </button>
            </div>
          )}
        </div>

        {/* Suggested Follow-up Prompts */}
        {!isUser && message.suggestedFollowUps && message.suggestedFollowUps.length > 0 && onSelectPrompt && (
          <div className="mt-2.5 flex flex-wrap gap-1.5">
            <span className="text-[10px] uppercase font-bold tracking-wider text-slate-400 self-center mr-1">
              Suggested:
            </span>
            {message.suggestedFollowUps.map((prompt, i) => (
              <button
                key={i}
                onClick={() => onSelectPrompt(prompt)}
                className="flex items-center gap-1 px-3 py-1 rounded-full text-xs font-medium bg-slate-900 hover:bg-slate-800 text-slate-300 hover:text-blue-300 border border-slate-700/80 hover:border-blue-500/40 transition-all shadow-sm cursor-pointer"
              >
                <span>{prompt}</span>
                <ArrowRight className="w-2.5 h-2.5 opacity-70" />
              </button>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};
