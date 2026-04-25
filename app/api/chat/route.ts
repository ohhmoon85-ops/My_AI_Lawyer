// =============================================
// 채팅 API Route - 단일 스트리밍 호출
// 법령 데이터 조회 → Claude가 친절한 답변으로 직접 변환
// =============================================
import Anthropic from '@anthropic-ai/sdk';
import { fetchRelevantLaws } from '@/lib/lawApi';
import { buildContextualPrompt, SYSTEM_PROMPT, getMockModeNotice } from '@/lib/promptBuilder';

// Vercel Hobby: 최대 60초 / Pro: 최대 300초
export const maxDuration = 60;

const client = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY,
});

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { messages, query } = body as {
      messages: Array<{ role: 'user' | 'assistant'; content: string }>;
      query: string;
    };

    if (!query?.trim()) {
      return new Response(JSON.stringify({ error: '질문을 입력해주세요.' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    // 국가법령정보 API에서 관련 법령 조회 (최대 6초 대기)
    const isMockMode = !process.env.LAW_API_KEY;
    const relevantLaws = await Promise.race([
      fetchRelevantLaws(query),
      new Promise<[]>((resolve) => setTimeout(() => resolve([]), 6000)),
    ]);

    // 법령 원문을 포함한 프롬프트 구성
    const contextualQuery = buildContextualPrompt(query, relevantLaws);

    // 대화 내역 구성 (최대 6턴 — 컨텍스트 절약)
    const apiMessages: Array<{ role: 'user' | 'assistant'; content: string }> = [
      ...messages.slice(0, -1).slice(-6),
      { role: 'user', content: contextualQuery },
    ];

    // Claude 스트리밍 — max_tokens 4096으로 충분한 응답 길이 확보
    const stream = new ReadableStream({
      async start(controller) {
        const encoder = new TextEncoder();

        try {
          const streamResponse = client.messages.stream({
            model: 'claude-sonnet-4-6',
            max_tokens: 4096,
            system: SYSTEM_PROMPT,
            messages: apiMessages,
          });

          for await (const event of streamResponse) {
            if (
              event.type === 'content_block_delta' &&
              event.delta.type === 'text_delta'
            ) {
              controller.enqueue(encoder.encode(event.delta.text));
            }
          }

          if (isMockMode) {
            controller.enqueue(encoder.encode(getMockModeNotice()));
          }
        } catch (err) {
          const errorMsg = err instanceof Error ? err.message : '오류가 발생했습니다.';
          controller.enqueue(encoder.encode(`\n\n⚠️ 오류: ${errorMsg}`));
        } finally {
          controller.close();
        }
      },
    });

    return new Response(stream, {
      headers: {
        'Content-Type': 'text/plain; charset=utf-8',
        'Transfer-Encoding': 'chunked',
        'X-Content-Type-Options': 'nosniff',
        'Cache-Control': 'no-cache, no-store',
      },
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : '서버 오류가 발생했습니다.';
    return new Response(JSON.stringify({ error: message }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    });
  }
}
