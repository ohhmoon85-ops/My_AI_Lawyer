// =============================================
// 나의 AI 변호사 - 타입 정의
// =============================================

export type MessageRole = 'user' | 'assistant';

export interface ChatMessage {
  id: string;
  role: MessageRole;
  content: string;
  timestamp: Date;
  citations?: LawCitation[];
  isStreaming?: boolean;
}

export interface LawCitation {
  lawName: string;
  articleNumber: string;
  articleTitle?: string;
  content: string;
  mstSeq?: string;
}

export interface ParsedLaw {
  lawName: string;
  mstSeq: string;
  articles: ParsedArticle[];
}

export interface ParsedArticle {
  articleNumber: string;
  articleTitle?: string;
  content: string;
}

export interface LawSearchResult {
  lawName: string;
  mstSeq: string;
  proclamationDate?: string;
  enforcementDate?: string;
}

export interface ChatApiRequest {
  messages: Array<{ role: MessageRole; content: string }>;
  query: string;
}

export interface TelegramUpdate {
  update_id: number;
  message?: {
    message_id: number;
    from: { id: number; first_name: string; username?: string };
    chat: { id: number; type: string };
    text?: string;
    date: number;
  };
}
