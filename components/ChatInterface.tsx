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
  const [isListening, setIsListening] = useState(false);
  const [speechSupported, setSpeechSupported] = useState(false);
  const [interimText, setInterimText] = useState('');

  const scrollRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const recognitionRef = useRef<any>(null);

  // 브라우저 음성인식 지원 여부 확인
  useEffect(() => {
    const supported =
      typeof window !== 'undefined' &&
      ('SpeechRecognition' in window || 'webkitSpeechRecognition' in window);
    setSpeechSupported(supported);
  }, []);

  // 새 메시지 올 때 자동 스크롤
  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages]);

  // textarea 높이 자동 조절
  const adjustTextareaHeight = (value?: string) => {
    const el = textareaRef.current;
    if (!el) return;
    el.style.height = 'auto';
    el.style.height = Math.min(el.scrollHeight, 120) + 'px';
    if (value !== undefined) setInput(value);
  };

  // 음성 인식 시작/중지
  const toggleListening = useCallback(() => {
    if (isListening) {
      recognitionRef.current?.stop();
      return;
    }

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const SpeechRecognitionAPI = (window as any).SpeechRecognition ?? (window as any).webkitSpeechRecognition;

    const recognition = new SpeechRecognitionAPI();
    recognition.lang = 'ko-KR';
    recognition.continuous = false;       // 발화 끝나면 자동 종료
    recognition.interimResults = true;    // 중간 결과 실시간 표시
    recognition.maxAlternatives = 1;

    recognition.onstart = () => {
      setIsListening(true);
      setInterimText('');
    };

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    recognition.onresult = (event: any) => {
      let interim = '';
      let final = '';

      for (let i = event.resultIndex; i < event.results.length; i++) {
        const transcript = event.results[i][0].transcript;
        if (event.results[i].isFinal) {
          final += transcript;
        } else {
          interim += transcript;
        }
      }

      if (final) {
        // 기존 텍스트에 이어붙임 (이미 타이핑한 내용 보존)
        const newValue = (input + (input ? ' ' : '') + final).trim();
        setInput(newValue);
        setInterimText('');
        setTimeout(adjustTextareaHeight, 0);
      } else {
        setInterimText(interim);
      }
    };

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    recognition.onerror = (event: any) => {
      console.error('음성 인식 오류:', event.error);
      setIsListening(false);
      setInterimText('');
    };

    recognition.onend = () => {
      setIsListening(false);
      setInterimText('');
    };

    recognitionRef.current = recognition;
    recognition.start();
  }, [isListening, input]);

  const sendMessage = useCallback(
    async (query: string) => {
      if (!query.trim() || isLoading) return;

      // 음성 인식 중이면 먼저 중지
      if (isListening) {
        recognitionRef.current?.stop();
      }

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

      if (textareaRef.current) {
        textareaRef.current.style.height = 'auto';
      }

      try {
        const history = [...messages, userMessage]
          .slice(-10)
          .map((m) => ({ role: m.role, content: m.content }));

        const response = await fetch('/api/chat', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ messages: history, query }),
        });

        if (!response.ok) throw new Error(`서버 오류 (${response.status})`);
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
              m.id === assistantId ? { ...m, content: accumulated, isStreaming: true } : m
            )
          );
        }

        setMessages((prev) =>
          prev.map((m) => (m.id === assistantId ? { ...m, isStreaming: false } : m))
        );
      } catch (err) {
        const errorText = err instanceof Error ? err.message : '알 수 없는 오류가 발생했습니다.';
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
    [isLoading, isListening, messages]
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

  // textarea에 표시할 placeholder
  const placeholder = isListening
    ? interimText || '말씀하세요...'
    : '법률 질문을 입력하세요... (Enter: 전송, Shift+Enter: 줄바꿈)';

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
              {speechSupported && (
                <p className="text-text-muted/60 text-xs mt-1">
                  🎙️ 마이크 버튼으로 음성 입력도 가능합니다
                </p>
              )}
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

        {/* 로딩 인디케이터 */}
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

      {/* 음성 인식 중 시각 피드백 */}
      {isListening && (
        <div className="mx-3 sm:mx-4 mb-2 flex items-center gap-2 bg-red-50 border border-red-200 rounded-xl px-3.5 py-2">
          <span className="w-2 h-2 rounded-full bg-red-500 animate-pulse flex-shrink-0" />
          <span className="text-xs text-red-600 font-medium flex-1 truncate">
            {interimText || '듣고 있습니다... (말씀을 마치면 자동으로 입력됩니다)'}
          </span>
          <button
            onClick={toggleListening}
            className="text-xs text-red-500 underline flex-shrink-0"
          >
            취소
          </button>
        </div>
      )}

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
            placeholder={placeholder}
            rows={1}
            disabled={isLoading}
            className={`flex-1 resize-none rounded-xl border px-3.5 py-2.5 text-sm text-text-main placeholder:text-text-muted/60 focus:outline-none focus:ring-1 disabled:opacity-60 transition-all leading-relaxed overflow-hidden ${
              isListening
                ? 'border-red-300 bg-red-50 focus:border-red-400 focus:ring-red-100 placeholder:text-red-400'
                : 'border-cream-dark bg-cream focus:border-gold/50 focus:ring-gold/20'
            }`}
            style={{ minHeight: '42px', maxHeight: '120px' }}
          />

          {/* 마이크 버튼 (음성 지원 브라우저에서만 표시) */}
          {speechSupported && (
            <button
              type="button"
              onClick={toggleListening}
              disabled={isLoading}
              className={`flex-shrink-0 w-10 h-10 sm:w-11 sm:h-11 rounded-xl flex items-center justify-center transition-all disabled:opacity-40 disabled:cursor-not-allowed ${
                isListening
                  ? 'bg-red-500 hover:bg-red-600 shadow-lg shadow-red-200'
                  : 'bg-cream border border-cream-dark hover:border-gold/40 hover:bg-gold-pale/30'
              }`}
              aria-label={isListening ? '음성 입력 중지' : '음성 입력 시작'}
            >
              {isListening ? (
                // 녹음 중: 정지 아이콘
                <svg className="w-4 h-4 text-white" fill="currentColor" viewBox="0 0 24 24">
                  <rect x="6" y="6" width="12" height="12" rx="2" />
                </svg>
              ) : (
                // 대기 중: 마이크 아이콘
                <svg className="w-4 h-4 text-text-muted" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={1.8}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M12 18.75a6 6 0 0 0 6-6v-1.5m-6 7.5a6 6 0 0 1-6-6v-1.5m6 7.5v3.75m-3.75 0h7.5M12 15.75a3 3 0 0 1-3-3V4.5a3 3 0 1 1 6 0v8.25a3 3 0 0 1-3 3Z" />
                </svg>
              )}
            </button>
          )}

          {/* 전송 버튼 */}
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
          {speechSupported && ' · 🎙️ 마이크로 음성 입력'}
        </p>
      </div>
    </div>
  );
}
