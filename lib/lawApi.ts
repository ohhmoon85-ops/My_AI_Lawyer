// =============================================
// 국가법령정보 공동활용 Open API 연동
// axios 대신 네이티브 fetch 사용 (Edge Runtime 호환)
// API 키 미설정 시 mock 데이터로 동작
// =============================================
import { ParsedLaw, LawSearchResult } from '@/types';
import { parseStatute, parseSearchResults } from './parseStatute';

const LAW_API_BASE = 'https://www.law.go.kr/DRF';

/**
 * 질문에서 법령 키워드 추출 (간단한 휴리스틱)
 */
export function extractLawKeywords(query: string): string[] {
  const keywords: string[] = [];

  // 명시적 법령명 패턴
  const lawNamePattern = /([가-힣\s]+법|[가-힣\s]+령|[가-힣\s]+규칙|[가-힣\s]+조례)/g;
  const lawMatches = query.match(lawNamePattern);
  if (lawMatches) {
    keywords.push(...lawMatches.map((k) => k.trim()));
  }

  // 핵심 법률 분야 키워드 매핑
  const keywordMap: Record<string, string[]> = {
    해고: ['근로기준법'],
    임금: ['근로기준법', '최저임금법'],
    퇴직금: ['근로자퇴직급여 보장법'],
    연차: ['근로기준법'],
    육아휴직: ['남녀고용평등법', '고용보험법'],
    전세: ['주택임대차보호법'],
    월세: ['주택임대차보호법'],
    임대차: ['주택임대차보호법', '상가건물 임대차보호법'],
    계약: ['민법'],
    이혼: ['민법', '가사소송법'],
    상속: ['민법'],
    교통사고: ['도로교통법', '교통사고처리 특례법'],
    명예훼손: ['형법'],
    사기: ['형법'],
    소비자: ['소비자기본법'],
    개인정보: ['개인정보 보호법'],
    저작권: ['저작권법'],
    산재: ['산업재해보상보험법'],
    세금: ['국세기본법'],
    부동산: ['부동산 거래신고 등에 관한 법률'],
  };

  for (const [key, laws] of Object.entries(keywordMap)) {
    if (query.includes(key)) {
      keywords.push(...laws);
    }
  }

  // 중복 제거, 최대 3개
  return [...new Set(keywords)].slice(0, 3);
}

/**
 * 법령명으로 검색하여 MST(법령일련번호) 목록 반환
 */
export async function searchLaws(keyword: string): Promise<LawSearchResult[]> {
  const OC = process.env.LAW_API_KEY;
  if (!OC) return getMockSearchResults(keyword);

  try {
    const params = new URLSearchParams({
      OC,
      target: 'law',
      type: 'XML',
      query: keyword,
      display: '5',
      page: '1',
      sort: 'lawNm',
    });

    const res = await fetch(`${LAW_API_BASE}/lawSearch.do?${params}`, {
      signal: AbortSignal.timeout(8000),
    });

    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const xml = await res.text();
    return parseSearchResults(xml);
  } catch {
    return getMockSearchResults(keyword);
  }
}

/**
 * MST로 법령 본문 조회
 */
export async function fetchLawContent(mstSeq: string): Promise<ParsedLaw | null> {
  const OC = process.env.LAW_API_KEY;
  // API 키 없거나 mock MST인 경우 mock 데이터 반환
  if (!OC || mstSeq.startsWith('mock-')) return getMockLawContent(mstSeq);

  try {
    const params = new URLSearchParams({
      OC,
      target: 'law',
      MST: mstSeq,
      type: 'XML',
    });

    const res = await fetch(`${LAW_API_BASE}/lawService.do?${params}`, {
      signal: AbortSignal.timeout(8000),
    });

    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const xml = await res.text();
    return parseStatute(xml);
  } catch {
    return null;
  }
}

/**
 * 질문에서 키워드 추출 후 관련 법령 데이터 수집
 * 최대 2개 법령, 각 10개 조항까지
 */
export async function fetchRelevantLaws(query: string): Promise<ParsedLaw[]> {
  const keywords = extractLawKeywords(query);

  if (keywords.length === 0) {
    const results = await searchLaws(query.slice(0, 20));
    if (results.length > 0) {
      const law = await fetchLawContent(results[0].mstSeq);
      return law ? [law] : [];
    }
    return [];
  }

  const laws: ParsedLaw[] = [];
  for (const keyword of keywords.slice(0, 2)) {
    const results = await searchLaws(keyword);
    if (results.length > 0) {
      const law = await fetchLawContent(results[0].mstSeq);
      if (law) laws.push(law);
    }
  }

  return laws;
}

// =============================================
// Mock 데이터 (API 키 미설정 시 개발/테스트용)
// =============================================

function getMockSearchResults(keyword: string): LawSearchResult[] {
  const mockData: Record<string, LawSearchResult[]> = {
    근로기준법: [{ lawName: '근로기준법', mstSeq: 'mock-001', enforcementDate: '20240101' }],
    주택임대차보호법: [{ lawName: '주택임대차보호법', mstSeq: 'mock-002', enforcementDate: '20230601' }],
    민법: [{ lawName: '민법', mstSeq: 'mock-003', enforcementDate: '20230601' }],
    형법: [{ lawName: '형법', mstSeq: 'mock-004', enforcementDate: '20230601' }],
    소비자기본법: [{ lawName: '소비자기본법', mstSeq: 'mock-005', enforcementDate: '20230601' }],
  };

  for (const [key, results] of Object.entries(mockData)) {
    if (keyword.includes(key) || key.includes(keyword)) {
      return results;
    }
  }

  return [{ lawName: keyword, mstSeq: 'mock-000', enforcementDate: '20240101' }];
}

function getMockLawContent(mstSeq: string): ParsedLaw {
  const mockLaws: Record<string, ParsedLaw> = {
    'mock-001': {
      lawName: '근로기준법',
      mstSeq: 'mock-001',
      articles: [
        {
          articleNumber: '제2조',
          articleTitle: '정의',
          content:
            '이 법에서 사용하는 용어의 뜻은 다음과 같다.\n1. "근로자"란 직업의 종류와 관계없이 임금을 목적으로 사업이나 사업장에 근로를 제공하는 사람을 말한다.\n2. "사용자"란 사업주 또는 사업 경영 담당자, 그 밖에 근로자에 관한 사항에 대하여 사업주를 위하여 행위하는 자를 말한다.',
        },
        {
          articleNumber: '제23조',
          articleTitle: '해고 등의 제한',
          content:
            '① 사용자는 근로자에게 정당한 이유 없이 해고, 휴직, 정직, 전직, 감봉, 그 밖의 징벌을 하지 못한다.\n② 사용자는 근로자가 업무상 부상 또는 질병의 요양을 위하여 휴업한 기간과 그 후 30일 동안 또는 산전(産前)·산후(産後)의 여성이 이 법에 따라 휴업한 기간과 그 후 30일 동안은 해고하지 못한다.',
        },
        {
          articleNumber: '제26조',
          articleTitle: '해고의 예고',
          content:
            '사용자는 근로자를 해고(경영상 이유에 의한 해고를 포함한다)하려면 적어도 30일 전에 예고를 하여야 하고, 30일 전에 예고를 하지 아니하였을 때에는 30일분 이상의 통상임금을 지급하여야 한다.',
        },
        {
          articleNumber: '제56조',
          articleTitle: '연장·야간 및 휴일 근로',
          content:
            '① 사용자는 연장근로(제53조·제59조 및 제69조 단서에 따라 연장된 시간의 근로를 말한다)에 대하여는 통상임금의 100분의 50 이상을 가산하여 근로자에게 지급하여야 한다.\n② 제1항에도 불구하고 사용자는 휴일근로에 대하여는 다음 각 호의 기준에 따른 금액 이상을 가산하여 근로자에게 지급하여야 한다.',
        },
        {
          articleNumber: '제60조',
          articleTitle: '연차 유급휴가',
          content:
            '① 사용자는 1년간 80퍼센트 이상 출근한 근로자에게 15일의 유급휴가를 주어야 한다.\n② 사용자는 계속하여 근로한 기간이 1년 미만인 근로자 또는 1년간 80퍼센트 미만 출근한 근로자에게 1개월 개근 시 1일의 유급휴가를 주어야 한다.',
        },
      ],
    },
    'mock-002': {
      lawName: '주택임대차보호법',
      mstSeq: 'mock-002',
      articles: [
        {
          articleNumber: '제3조',
          articleTitle: '대항력 등',
          content:
            '① 임대차는 그 등기가 없는 경우에도 임차인이 주택의 인도와 주민등록을 마친 때에는 그 다음 날부터 제삼자에 대하여 효력이 생긴다. 이 경우 전입신고를 한 때에 주민등록이 된 것으로 본다.\n② 임차주택의 양수인(그 밖에 임대할 권리를 승계한 자를 포함한다)은 임대인의 지위를 승계한 것으로 본다.',
        },
        {
          articleNumber: '제3조의2',
          articleTitle: '보증금의 회수',
          content:
            '임차인은 임차주택에 대하여 민사집행법에 따른 경매가 신청된 경우에는 법원에 그 임차권 등기를 신청할 수 있다.',
        },
        {
          articleNumber: '제6조',
          articleTitle: '계약의 갱신',
          content:
            '① 임대인이 임대차기간이 끝나기 6개월 전부터 2개월 전까지의 기간에 임차인에게 갱신거절의 통지를 하지 아니하거나 계약조건을 변경하지 아니하면 갱신하지 아니한다는 뜻의 통지를 하지 아니한 경우에는 그 기간이 끝난 때에 전 임대차와 동일한 조건으로 다시 임대차한 것으로 본다.',
        },
        {
          articleNumber: '제7조',
          articleTitle: '차임 등의 증감청구권',
          content:
            '당사자는 약정한 차임이나 보증금이 임차주택에 관한 조세, 공과금, 그 밖의 부담의 증감이나 경제사정의 변동으로 인하여 적절하지 아니하게 된 때에는 장래에 대하여 그 증감을 청구할 수 있다.',
        },
      ],
    },
    'mock-003': {
      lawName: '민법',
      mstSeq: 'mock-003',
      articles: [
        {
          articleNumber: '제103조',
          articleTitle: '반사회질서의 법률행위',
          content: '선량한 풍속 기타 사회질서에 위반한 사항을 내용으로 하는 법률행위는 무효로 한다.',
        },
        {
          articleNumber: '제390조',
          articleTitle: '채무불이행과 손해배상',
          content:
            '채무자가 채무의 내용에 좇은 이행을 하지 아니한 때에는 채권자는 손해배상을 청구할 수 있다. 그러나 채무자의 고의나 과실 없이 이행할 수 없게 된 때에는 그러하지 아니하다.',
        },
        {
          articleNumber: '제750조',
          articleTitle: '불법행위의 내용',
          content:
            '고의 또는 과실로 인한 위법행위로 타인에게 손해를 가한 자는 그 손해를 배상할 책임이 있다.',
        },
      ],
    },
  };

  return (
    mockLaws[mstSeq] ?? {
      lawName: '관련 법령',
      mstSeq,
      articles: [
        {
          articleNumber: '제1조',
          content: '(API 키 승인 후 실제 법령 데이터가 제공됩니다. 현재는 예시 데이터로 동작 중입니다.)',
        },
      ],
    }
  );
}
