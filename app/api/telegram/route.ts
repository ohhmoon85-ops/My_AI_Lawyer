// =============================================
// Telegram Webhook API Route (선택사항)
// Vercel 환경에서는 반드시 Webhook 방식 사용 (Polling 불가)
//
// 배포 후 아래 URL로 Webhook 등록:
// POST https://api.telegram.org/bot{TOKEN}/setWebhook
//   { "url": "https://your-domain.vercel.app/api/telegram" }
// =============================================
import { fetchRelevantLaws } from '@/lib/lawApi';
import { buildContextualPrompt, SYSTEM_PROMPT } from '@/lib/promptBuilder';
import Anthropic from '@anthropic-ai/sdk';
import { TelegramUpdate } from '@/types';

const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });
const TELEGRAM_TOKEN = process.env.TELEGRAM_BOT_TOKEN;

async function sendTelegramMessage(chatId: number, text: string) {
  if (!TELEGRAM_TOKEN) return;

  const url = `https://api.telegram.org/bot${TELEGRAM_TOKEN}/sendMessage`;
  await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      chat_id: chatId,
      text,
      parse_mode: 'Markdown',
    }),
  });
}

export async function POST(request: Request) {
  if (!TELEGRAM_TOKEN) {
    return new Response('Telegram bot token not configured', { status: 503 });
  }

  try {
    const update: TelegramUpdate = await request.json();
    const message = update.message;

    if (!message?.text || !message.chat?.id) {
      return new Response('OK');
    }

    const chatId = message.chat.id;
    const userText = message.text.trim();

    // /start 명령어 처리
    if (userText === '/start') {
      await sendTelegramMessage(
        chatId,
        '안녕하세요! 저는 *나의 AI 변호사*입니다. ⚖️\n\n법률 관련 궁금한 점을 일상 언어로 질문해 주세요.\n\n*주의*: 본 서비스는 참고용이며 실제 법적 효력이 없습니다. 중요한 법률 문제는 반드시 전문 변호사와 상담하세요.'
      );
      return new Response('OK');
    }

    // "입력 중..." 표시
    await fetch(
      `https://api.telegram.org/bot${TELEGRAM_TOKEN}/sendChatAction`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ chat_id: chatId, action: 'typing' }),
      }
    );

    // 법령 데이터 조회 + AI 응답 생성 (동일 파이프라인 재사용)
    const laws = await fetchRelevantLaws(userText);
    const contextualQuery = buildContextualPrompt(userText, laws);

    const response = await client.messages.create({
      model: 'claude-sonnet-4-6',
      max_tokens: 1024,
      system: SYSTEM_PROMPT,
      messages: [{ role: 'user', content: contextualQuery }],
    });

    const replyText =
      response.content[0].type === 'text'
        ? response.content[0].text
        : '답변을 생성할 수 없습니다.';

    // Telegram Markdown은 길이 제한(4096자) 있음
    const truncated =
      replyText.length > 4000 ? replyText.slice(0, 4000) + '\n\n...(웹에서 전체 답변 확인)' : replyText;

    await sendTelegramMessage(chatId, truncated);

    return new Response('OK');
  } catch (err) {
    console.error('Telegram webhook error:', err);
    return new Response('Internal Server Error', { status: 500 });
  }
}
