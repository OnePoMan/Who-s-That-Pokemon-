'use client';

import { useEffect, useRef } from 'react';
import type { ChatMessage } from '@/lib/game-state';

interface ChatPanelProps {
  messages: ChatMessage[];
  title?: string;
}

/** Read-only list of guesses; the input lives in GuessInput. */
export default function ChatPanel({ messages, title = 'Guesses' }: ChatPanelProps) {
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: 'smooth' });
  }, [messages]);

  return (
    <section className="flex flex-col bg-white rounded-xl border-3 border-pokemon-dark overflow-hidden" aria-label={title}>
      <div className="bg-pokemon-dark text-white px-3 py-1 text-xs font-bold font-body">{title}</div>
      <div ref={scrollRef} className="overflow-y-auto p-2 space-y-1 h-24" aria-live="polite">
        {messages.map((msg) => (
          <div
            key={msg.id}
            className={`text-xs px-2 py-1 rounded font-body ${
              msg.isCorrect ? 'bg-green-100 text-green-800 font-bold animate-bounce-in' : 'bg-gray-50 text-gray-700'
            }`}
          >
            <span className="font-semibold">{msg.sender}: </span>
            {msg.isCorrect ? 'got it!' : msg.text}
          </div>
        ))}
        {messages.length === 0 && <p className="text-gray-500 text-xs text-center py-3 font-body">No guesses yet…</p>}
      </div>
    </section>
  );
}
