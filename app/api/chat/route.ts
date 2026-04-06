// =============================================
// 채팅 API Route - Streaming 방식 (Vercel 타임아웃 방지)
// ReadableStream + Anthropic SDK 스트리밍
// =============================================
import Anthropic from '@anthropic-ai/sdk';
import { fetchRelevantLaws } from '@/lib/lawApi';
import { buildContextualPrompt, SYSTEM_PROMPT, getMockModeNotice } from '@/lib/promptBuilder';

export const runtime = 'edge'; // Edge Runtime: 스트리밍 최적화

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

    // 법령 데이터 병렬 조회
    const isMockMode = !process.env.LAW_API_KEY;
    const relevantLaws = await fetchRelevantLaws(query);

    // 마지막 사용자 메시지를 법령 컨텍스트로 강화
    const contextualQuery = buildContextualPrompt(query, relevantLaws);

    // 이전 대화 내역 + 현재 컨텍스트 메시지 구성
    const apiMessages: Array<{ role: 'user' | 'assistant'; content: string }> = [
      ...messages.slice(0, -1), // 마지막 메시지 제외 (컨텍스트 버전으로 교체)
      { role: 'user', content: contextualQuery },
    ];

    // ReadableStream으로 Streaming 응답 생성
    const stream = new ReadableStream({
      async start(controller) {
        const encoder = new TextEncoder();

        try {
          const streamResponse = client.messages.stream({
            model: 'claude-sonnet-4-6',
            max_tokens: 2048,
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

          // Mock 모드 알림 추가
          if (isMockMode) {
            controller.enqueue(encoder.encode(getMockModeNotice()));
          }
        } catch (err) {
          const errorMsg = err instanceof Error ? err.message : '오류가 발생했습니다.';
          controller.enqueue(
            encoder.encode(`\n\n⚠️ 오류: ${errorMsg}`)
          );
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
