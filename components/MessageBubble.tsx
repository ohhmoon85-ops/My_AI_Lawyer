'use client';

import { useState } from 'react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { ChatMessage } from '@/types';
import {
  Document, Packer, Paragraph, TextRun, HeadingLevel,
  AlignmentType, BorderStyle, Table, TableRow, TableCell,
  WidthType, ShadingType,
} from 'docx';

interface Props {
  message: ChatMessage;
}

// 마크다운 텍스트를 docx Paragraph 배열로 변환
function markdownToDocx(text: string): Paragraph[] {
  const lines = text.split('\n');
  const paragraphs: Paragraph[] = [];

  for (const line of lines) {
    // 제목
    if (line.startsWith('### ')) {
      paragraphs.push(new Paragraph({
        text: line.slice(4).replace(/\*\*/g, ''),
        heading: HeadingLevel.HEADING_3,
        spacing: { before: 200, after: 80 },
      }));
    } else if (line.startsWith('## ')) {
      paragraphs.push(new Paragraph({
        text: line.slice(3).replace(/\*\*/g, ''),
        heading: HeadingLevel.HEADING_2,
        spacing: { before: 300, after: 100 },
      }));
    } else if (line.startsWith('# ')) {
      paragraphs.push(new Paragraph({
        text: line.slice(2).replace(/\*\*/g, ''),
        heading: HeadingLevel.HEADING_1,
        spacing: { before: 400, after: 200 },
      }));
    // 구분선
    } else if (line.startsWith('---') || line.startsWith('━')) {
      paragraphs.push(new Paragraph({
        border: { bottom: { color: 'C9A84C', size: 6, style: BorderStyle.SINGLE } },
        spacing: { before: 100, after: 100 },
        children: [new TextRun('')],
      }));
    // 인용구 (>)
    } else if (line.startsWith('> ')) {
      paragraphs.push(new Paragraph({
        children: [new TextRun({
          text: line.slice(2).replace(/\*\*/g, ''),
          italics: true,
          color: '6B6B8A',
        })],
        indent: { left: 400 },
        spacing: { before: 60, after: 60 },
      }));
    // 순서 없는 목록
    } else if (/^[-*•]\s/.test(line)) {
      paragraphs.push(new Paragraph({
        children: parseBoldRuns(line.slice(2)),
        bullet: { level: 0 },
        spacing: { before: 40, after: 40 },
      }));
    // 순서 있는 목록
    } else if (/^\d+[.。]\s/.test(line)) {
      const content = line.replace(/^\d+[.。]\s/, '');
      paragraphs.push(new Paragraph({
        children: parseBoldRuns(content),
        numbering: { reference: 'default-numbering', level: 0 },
        spacing: { before: 40, after: 40 },
      }));
    // 빈 줄
    } else if (line.trim() === '') {
      paragraphs.push(new Paragraph({ children: [new TextRun('')], spacing: { before: 60 } }));
    // 일반 텍스트 (굵게 처리 포함)
    } else {
      paragraphs.push(new Paragraph({
        children: parseBoldRuns(line),
        spacing: { before: 60, after: 60 },
      }));
    }
  }

  return paragraphs;
}

// **텍스트** 를 굵은 TextRun으로 파싱
function parseBoldRuns(text: string): TextRun[] {
  const parts = text.split(/(\*\*[^*]+\*\*)/g);
  return parts.map(part => {
    if (part.startsWith('**') && part.endsWith('**')) {
      return new TextRun({ text: part.slice(2, -2), bold: true });
    }
    return new TextRun({ text: part });
  });
}

export default function MessageBubble({ message }: Props) {
  const isUser = message.role === 'user';
  const isStreaming = message.isStreaming;
  const [copied, setCopied] = useState(false);
  const [downloading, setDownloading] = useState(false);

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(message.content);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
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

  const handleDownload = async () => {
    setDownloading(true);
    try {
      const dateStr = new Date(message.timestamp).toLocaleString('ko-KR');
      const fileStamp = dateStr
        .replace(/\. /g, '-').replace(/\./g, '')
        .replace(/ /g, '_').replace(/:/g, '');

      const doc = new Document({
        numbering: {
          config: [{
            reference: 'default-numbering',
            levels: [{ level: 0, format: 'decimal', text: '%1.', alignment: AlignmentType.LEFT }],
          }],
        },
        sections: [{
          properties: {},
          children: [
            // 표지 헤더
            new Paragraph({
              children: [new TextRun({ text: '⚖ AI 법률 상담 결과', bold: true, size: 36, color: '0B1C36' })],
              alignment: AlignmentType.CENTER,
              spacing: { after: 200 },
            }),
            new Paragraph({
              children: [new TextRun({ text: `생성일시: ${dateStr}`, size: 20, color: '6B6B8A' })],
              alignment: AlignmentType.CENTER,
              spacing: { after: 100 },
            }),
            new Paragraph({
              children: [new TextRun({ text: '본 문서는 참고용이며 실제 법적 효력이 없습니다. 중요한 법률 문제는 전문 변호사와 상담하세요.', size: 18, color: 'FF6B6B', italics: true })],
              alignment: AlignmentType.CENTER,
              spacing: { after: 400 },
            }),
            // 구분선
            new Paragraph({
              border: { bottom: { color: 'C9A84C', size: 12, style: BorderStyle.SINGLE } },
              spacing: { after: 400 },
              children: [new TextRun('')],
            }),
            // 본문 (마크다운 → docx)
            ...markdownToDocx(message.content),
          ],
        }],
      });

      const blob = await Packer.toBlob(doc);
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `AI법률상담_${fileStamp}.docx`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    } finally {
      setDownloading(false);
    }
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

          {/* AI 응답에만 복사/저장 버튼 표시 (스트리밍 완료 후) */}
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

              {/* Word 저장 버튼 */}
              <button
                onClick={handleDownload}
                disabled={downloading}
                title="Word 문서(.docx)로 저장"
                className="flex items-center gap-1 px-2 py-0.5 rounded-lg text-[10px] text-gray-400 hover:text-navy hover:bg-cream border border-transparent hover:border-cream-dark transition-all duration-150 disabled:opacity-50"
              >
                {downloading ? (
                  <>
                    <svg className="w-3 h-3 animate-spin" fill="none" viewBox="0 0 24 24">
                      <circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="3" strokeDasharray="30 70" />
                    </svg>
                    저장 중
                  </>
                ) : (
                  <>
                    <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M3 16.5v2.25A2.25 2.25 0 0 0 5.25 21h13.5A2.25 2.25 0 0 0 21 18.75V16.5M16.5 12 12 16.5m0 0L7.5 12m4.5 4.5V3" />
                    </svg>
                    Word
                  </>
                )}
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
