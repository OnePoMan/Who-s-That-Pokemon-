'use client';

import { useState, useRef, useEffect } from 'react';
import { ChatMessage } from '@/lib/game-state';

interface ChatPanelProps {
  messages: ChatMessage[];
  onSend: (text: string) => void;
  disabled?: boolean;
  placeholder?: string;
}

export default function ChatPanel({ messages, onSend, disabled = false, placeholder = 'Type your guess...' }: ChatPanelProps) {
  const [text, setText] = useState('');
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: 'smooth' });
  }, [messages]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const trimmed = text.trim();
    if (!trimmed || disabled) return;
    onSend(trimmed);
    setText('');
  };

  return (
    <div className="flex flex-col h-full bg-white rounded-lg border-2 border-pokemon-dark overflow-hidden">
      <div className="bg-pokemon-dark text-white px-3 py-1.5 text-sm font-bold">
        Guesses
      </div>
      <div ref={scrollRef} className="flex-1 overflow-y-auto p-2 space-y-1 min-h-[120px] max-h-[200px]">
        {messages.map((msg) => (
          <div
            key={msg.id}
            className={`text-sm px-2 py-1 rounded ${
              msg.isCorrect
                ? 'bg-green-100 text-green-800 font-bold animate-bounce-in'
                : 'bg-gray-50 text-gray-700'
            }`}
          >
            <span className="font-semibold">{msg.sender}: </span>
            {msg.isCorrect ? '🎉 Correct!' : msg.text}
          </div>
        ))}
        {messages.length === 0 && (
          <p className="text-gray-400 text-sm text-center py-4">No guesses yet...</p>
        )}
      </div>
      <form onSubmit={handleSubmit} className="flex border-t border-gray-200">
        <input
          type="text"
          value={text}
          onChange={(e) => setText(e.target.value)}
          disabled={disabled}
          placeholder={placeholder}
          className="flex-1 px-3 py-2 text-sm outline-none disabled:bg-gray-100 text-gray-800"
          autoComplete="off"
        />
        <button
          type="submit"
          disabled={disabled || !text.trim()}
          className="px-4 py-2 bg-pokemon-red text-white font-bold text-sm hover:bg-pokemon-red-dark disabled:opacity-50 transition-colors"
        >
          Send
        </button>
      </form>
    </div>
  );
}
