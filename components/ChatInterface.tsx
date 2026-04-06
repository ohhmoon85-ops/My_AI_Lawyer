'use client';

import { useState, useRef, useEffect, useCallback } from 'react';
import { ChatMessage } from '@/types';
import MessageBubble from './MessageBubble';

const EXAMPLE_QUESTIONS = [
  '부당해고를 당했을 때 어떻게 해야 하나요?',
  '전세 계약 만료 후 보증금을 돌려받지 못하면?',
  '연차휴가를 사용 못 하면 수당으로 받을 수 있나요?',
  '온라인 쇼핑몰에서 환불을 거부당했어요',
];

function generateId() {
  return Math.random().toString(36).slice(2, 11);
}

export default function ChatInterface() {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  // 새 메시지 올 때 자동 스크롤
  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages]);

  // textarea 높이 자동 조절
  const adjustTextareaHeight = () => {
    const el = textareaRef.current;
    if (!el) return;
    el.style.height = 'auto';
    el.style.height = Math.min(el.scrollHeight, 120) + 'px';
  };

  const sendMessage = useCallback(
    async (query: string) => {
      if (!query.trim() || isLoading) return;

      const userMessage: ChatMessage = {
        id: generateId(),
        role: 'user',
        content: query,
        timestamp: new Date(),
      };

      const assistantId = generateId();
      const assistantMessage: ChatMessage = {
        id: assistantId,
        role: 'assistant',
        content: '',
        timestamp: new Date(),
        isStreaming: true,
      };

      setMessages((prev) => [...prev, userMessage, assistantMessage]);
      setInput('');
      setIsLoading(true);

      // textarea 높이 초기화
      if (textareaRef.current) {
        textareaRef.current.style.height = 'auto';
      }

      try {
        // 이전 대화 내역 구성 (최대 10턴)
        const history = [...messages, userMessage]
          .slice(-10)
          .map((m) => ({ role: m.role, content: m.content }));

        const response = await fetch('/api/chat', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ messages: history, query }),
        });

        if (!response.ok) {
          throw new Error(`서버 오류 (${response.status})`);
        }

        if (!response.body) throw new Error('응답 스트림이 없습니다.');

        const reader = response.body.getReader();
        const decoder = new TextDecoder();
        let accumulated = '';

        while (true) {
          const { done, value } = await reader.read();
          if (done) break;

          accumulated += decoder.decode(value, { stream: true });

          setMessages((prev) =>
            prev.map((m) =>
              m.id === assistantId
                ? { ...m, content: accumulated, isStreaming: true }
                : m
            )
          );
        }

        // 스트리밍 완료
        setMessages((prev) =>
          prev.map((m) =>
            m.id === assistantId ? { ...m, isStreaming: false } : m
          )
        );
      } catch (err) {
        const errorText =
          err instanceof Error ? err.message : '알 수 없는 오류가 발생했습니다.';
        setMessages((prev) =>
          prev.map((m) =>
            m.id === assistantId
              ? {
                  ...m,
                  content: `⚠️ 오류가 발생했습니다: ${errorText}\n\n잠시 후 다시 시도해주세요.`,
                  isStreaming: false,
                }
              : m
          )
        );
      } finally {
        setIsLoading(false);
      }
    },
    [isLoading, messages]
  );

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    sendMessage(input);
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      sendMessage(input);
    }
  };

  return (
    <div className="flex flex-col h-full">
      {/* 메시지 영역 */}
      <div
        ref={scrollRef}
        className="flex-1 overflow-y-auto px-3 sm:px-4 py-4 space-y-4 scroll-smooth"
      >
        {/* 빈 상태 - 예시 질문 */}
        {messages.length === 0 && (
          <div className="flex flex-col items-center justify-center h-full min-h-[40vh] gap-6 px-2">
            <div className="text-center">
              <div className="text-4xl sm:text-5xl mb-3">⚖️</div>
              <h2 className="font-serif text-navy text-lg sm:text-xl font-bold mb-1">
                무엇이든 물어보세요
              </h2>
              <p className="text-text-muted text-sm">
                법령 데이터를 기반으로 신뢰할 수 있는 답변을 드립니다
              </p>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 w-full max-w-lg">
              {EXAMPLE_QUESTIONS.map((q, i) => (
                <button
                  key={i}
                  onClick={() => sendMessage(q)}
                  className="text-left text-xs sm:text-sm text-text-mid bg-white border border-cream-dark rounded-xl px-3.5 py-2.5 hover:border-gold/40 hover:bg-gold-pale/30 transition-all duration-150 leading-relaxed shadow-sm"
                >
                  {q}
                </button>
              ))}
            </div>
          </div>
        )}

        {/* 메시지 목록 */}
        {messages.map((msg) => (
          <MessageBubble key={msg.id} message={msg} />
        ))}

        {/* 로딩 인디케이터 (법령 검색 중) */}
        {isLoading && messages[messages.length - 1]?.content === '' && (
          <div className="flex gap-2 sm:gap-3">
            <div className="w-7 h-7 sm:w-8 sm:h-8 rounded-full bg-navy border border-gold/20 flex-shrink-0 flex items-center justify-center text-sm">
              ⚖️
            </div>
            <div className="bg-white border border-cream-dark rounded-2xl rounded-tl-sm px-4 py-3 shadow-sm">
              <div className="flex items-center gap-2 text-text-muted text-xs">
                <span className="flex gap-1">
                  <span className="w-1.5 h-1.5 rounded-full bg-gold/60 animate-bounce [animation-delay:0ms]" />
                  <span className="w-1.5 h-1.5 rounded-full bg-gold/60 animate-bounce [animation-delay:150ms]" />
                  <span className="w-1.5 h-1.5 rounded-full bg-gold/60 animate-bounce [animation-delay:300ms]" />
                </span>
                법령 데이터 검색 중...
              </div>
            </div>
          </div>
        )}
      </div>

      {/* 입력 영역 */}
      <div className="border-t border-cream-dark bg-white px-3 sm:px-4 py-3">
        <form onSubmit={handleSubmit} className="flex gap-2 items-end max-w-4xl mx-auto">
          <textarea
            ref={textareaRef}
            value={input}
            onChange={(e) => {
              setInput(e.target.value);
              adjustTextareaHeight();
            }}
            onKeyDown={handleKeyDown}
            placeholder="법률 질문을 입력하세요... (Enter: 전송, Shift+Enter: 줄바꿈)"
            rows={1}
            disabled={isLoading}
            className="flex-1 resize-none rounded-xl border border-cream-dark bg-cream px-3.5 py-2.5 text-sm text-text-main placeholder:text-text-muted/60 focus:outline-none focus:border-gold/50 focus:ring-1 focus:ring-gold/20 disabled:opacity-60 transition-all leading-relaxed overflow-hidden"
            style={{ minHeight: '42px', maxHeight: '120px' }}
          />
          <button
            type="submit"
            disabled={!input.trim() || isLoading}
            className="flex-shrink-0 w-10 h-10 sm:w-11 sm:h-11 rounded-xl bg-navy hover:bg-navy-light disabled:bg-gray-200 disabled:cursor-not-allowed transition-colors flex items-center justify-center"
            aria-label="전송"
          >
            {isLoading ? (
              <svg className="w-4 h-4 text-gold animate-spin" fill="none" viewBox="0 0 24 24">
                <circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="3" strokeDasharray="30 70" />
              </svg>
            ) : (
              <svg className="w-4 h-4 text-gold" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M6 12 3.269 3.125A59.769 59.769 0 0 1 21.485 12 59.768 59.768 0 0 1 3.27 20.875L5.999 12zm0 0h7.5" />
              </svg>
            )}
          </button>
        </form>
        <p className="text-center text-[10px] text-text-muted/40 mt-1.5 hidden sm:block">
          Enter로 전송 · Shift+Enter로 줄바꿈
        </p>
      </div>
    </div>
  );
}
