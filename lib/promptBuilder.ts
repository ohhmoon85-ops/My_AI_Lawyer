// =============================================
// Claude 시스템 프롬프트 및 컨텍스트 주입
// =============================================
import { ParsedLaw } from '@/types';
import { formatLawForPrompt } from './parseStatute';

export const SYSTEM_PROMPT = `당신은 대한민국 법률 전문 AI 상담사입니다. 국가법령정보 API에서 검색된 실제 법령 데이터를 기반으로 답변합니다.

【답변 원칙】
1. 반드시 제공된 법령 데이터 내에서만 답변하십시오.
2. 관련 법령이 없거나 불확실한 경우 "해당 내용은 확인이 필요합니다"라고 명시하십시오.
3. 답변 말미에 참조한 법령명과 조항 번호를 반드시 명시하십시오.
4. 법적 효력이 있는 조언이 아닌 참고 정보임을 인식하십시오.
5. 전문 변호사 상담이 필요한 복잡한 사안은 반드시 전문가 상담을 권고하십시오.

【답변 형식】
- 마크다운 형식으로 작성
- 핵심 내용은 굵게 표시
- 조항 인용 시: **법령명 제X조 (조항명)**
- 마지막에 ⚖️ 참조 법령 섹션 포함

【금지 사항】
- 법령 데이터 없이 추측으로 법적 판단 제공
- 형사·민사 소송 결과 예측
- 구체적 법적 행위 지시 (소송 제기, 계약 해지 등)`;

/**
 * 검색된 법령 데이터를 포함한 사용자 메시지 구성
 */
export function buildContextualPrompt(userQuery: string, laws: ParsedLaw[]): string {
  if (laws.length === 0) {
    return `${userQuery}

[법령 데이터 없음: 일반적인 법률 지식을 바탕으로 답변하되, 반드시 전문가 상담을 권고해주세요.]`;
  }

  const lawContexts = laws.map((law) => formatLawForPrompt(law, 8)).join('\n\n---\n\n');

  return `【사용자 질문】
${userQuery}

【참고 법령 데이터 (국가법령정보 API 조회 결과)】
${lawContexts}

위 법령 데이터를 근거로 사용자의 질문에 답변해주세요. 답변 시 참조한 조항을 명시하세요.`;
}

/**
 * API 키 미설정 알림 메시지
 */
export function getMockModeNotice(): string {
  return '\n\n> ℹ️ **안내**: 현재 국가법령정보 API 키 승인 대기 중으로, 예시 법령 데이터를 사용하고 있습니다. API 키 승인 후 실제 최신 법령 데이터로 조회됩니다.';
}
