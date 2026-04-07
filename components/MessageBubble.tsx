'use client';

import { useState } from 'react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { ChatMessage } from '@/types';

interface Props {
  message: ChatMessage;
}

export default function MessageBubble({ message }: Props) {
  const isUser = message.role === 'user';
  const isStreaming = message.isStreaming;
  const [copied, setCopied] = useState(false);

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(message.content);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // 구형 브라우저 fallback
      const el = document.createElement('textarea');
      el.value = message.content;
      document.body.appendChild(el);
      el.select();
      document.execCommand('copy');
      document.body.removeChild(el);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  const handleDownload = () => {
    const timestamp = new Date(message.timestamp).toLocaleString('ko-KR', {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
    }).replace(/\. /g, '-').replace(/\./g, '').replace(/ /g, '_').replace(/:/g, '');

    const filename = `AI법률상담_${timestamp}.txt`;
    const content = `[AI 법률 상담 결과]\n생성일시: ${new Date(message.timestamp).toLocaleString('ko-KR')}\n\n${message.content}`;
    const blob = new Blob([content], { type: 'text/plain;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  return (
    <div className={`flex gap-2 sm:gap-3 ${isUser ? 'flex-row-reverse' : 'flex-row'}`}>
      {/* 아바타 */}
      <div
        className={`w-7 h-7 sm:w-8 sm:h-8 rounded-full flex-shrink-0 flex items-center justify-center text-sm mt-0.5 border ${
          isUser
            ? 'bg-gold/15 border-gold/30 text-gold'
            : 'bg-navy border-gold/20 text-base'
        }`}
      >
        {isUser ? '👤' : '⚖️'}
      </div>

      {/* 말풍선 */}
      <div className={`max-w-[85%] sm:max-w-[80%] ${isUser ? 'items-end' : 'items-start'} flex flex-col gap-1`}>
        <div
          className={`rounded-2xl px-3.5 py-2.5 sm:px-4 sm:py-3 text-sm leading-relaxed ${
            isUser
              ? 'bg-navy text-white rounded-tr-sm'
              : 'bg-white border border-cream-dark text-text-main rounded-tl-sm shadow-sm'
          }`}
        >
          {isUser ? (
            <p className="whitespace-pre-wrap">{message.content}</p>
          ) : (
            <div className="prose prose-sm max-w-none prose-headings:text-navy prose-headings:font-serif prose-strong:text-navy prose-code:text-gold prose-a:text-gold">
              <ReactMarkdown remarkPlugins={[remarkGfm]}>
                {message.content}
              </ReactMarkdown>
              {isStreaming && (
                <span className="inline-block w-1 h-4 bg-gold/70 ml-0.5 animate-pulse rounded-sm align-middle" />
              )}
            </div>
          )}
        </div>

        {/* 타임스탬프 + 복사/다운로드 버튼 */}
        <div className={`flex items-center gap-2 px-1 ${isUser ? 'flex-row-reverse' : 'flex-row'}`}>
          <span className="text-[10px] text-gray-400">
            {new Date(message.timestamp).toLocaleTimeString('ko-KR', {
              hour: '2-digit',
              minute: '2-digit',
            })}
          </span>

          {/* AI 응답에만 복사/다운로드 버튼 표시 (스트리밍 완료 후) */}
          {!isUser && !isStreaming && message.content && (
            <div className="flex items-center gap-1">
              {/* 복사 버튼 */}
              <button
                onClick={handleCopy}
                title="답변 복사"
                className="flex items-center gap-1 px-2 py-0.5 rounded-lg text-[10px] text-gray-400 hover:text-navy hover:bg-cream border border-transparent hover:border-cream-dark transition-all duration-150"
              >
                {copied ? (
                  <>
                    <svg className="w-3 h-3 text-green-500" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2.5}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="m4.5 12.75 6 6 9-13.5" />
                    </svg>
                    <span className="text-green-500">복사됨</span>
                  </>
                ) : (
                  <>
                    <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M15.666 3.888A2.25 2.25 0 0 0 13.5 2.25h-3c-1.03 0-1.9.693-2.166 1.638m7.332 0c.055.194.084.4.084.612v0a.75.75 0 0 1-.75.75H9a.75.75 0 0 1-.75-.75v0c0-.212.03-.418.084-.612m7.332 0c.646.049 1.288.11 1.927.184 1.1.128 1.907 1.077 1.907 2.185V19.5a2.25 2.25 0 0 1-2.25 2.25H6.75A2.25 2.25 0 0 1 4.5 19.5V6.257c0-1.108.806-2.057 1.907-2.185a48.208 48.208 0 0 1 1.927-.184" />
                    </svg>
                    복사
                  </>
                )}
              </button>

              {/* 다운로드 버튼 */}
              <button
                onClick={handleDownload}
                title="텍스트 파일로 저장"
                className="flex items-center gap-1 px-2 py-0.5 rounded-lg text-[10px] text-gray-400 hover:text-navy hover:bg-cream border border-transparent hover:border-cream-dark transition-all duration-150"
              >
                <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M3 16.5v2.25A2.25 2.25 0 0 0 5.25 21h13.5A2.25 2.25 0 0 0 21 18.75V16.5M16.5 12 12 16.5m0 0L7.5 12m4.5 4.5V3" />
                </svg>
                저장
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
