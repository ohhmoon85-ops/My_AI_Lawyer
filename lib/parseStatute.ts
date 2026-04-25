// =============================================
// 국가법령정보 API XML 응답 파싱 & 정규화
// 실제 API 태그명 기준으로 작성
// =============================================
import { ParsedLaw, ParsedArticle, LawSearchResult } from '@/types';

/**
 * 법령 본문 XML → { lawName, mstSeq, articles[] }
 * lawService.do 응답 파싱
 */
export function parseStatute(xmlText: string): ParsedLaw | null {
  try {
    // 실제 API 태그: <법령명한글>, <법령일련번호>
    const lawNameMatch =
      xmlText.match(/<법령명한글>([\s\S]*?)<\/법령명한글>/) ||
      xmlText.match(/<법령명>([\s\S]*?)<\/법령명>/);
    const mstSeqMatch =
      xmlText.match(/<법령일련번호>([\s\S]*?)<\/법령일련번호>/) ||
      xmlText.match(/<MST>([\s\S]*?)<\/MST>/);

    const lawName = lawNameMatch ? cleanText(lawNameMatch[1]) : '알 수 없는 법령';
    const mstSeq = mstSeqMatch ? cleanText(mstSeqMatch[1]) : '';

    const articles: ParsedArticle[] = [];

    // <조문단위> 블록 파싱
    const articleUnitRegex = /<조문단위>([\s\S]*?)<\/조문단위>/g;
    let match;
    while ((match = articleUnitRegex.exec(xmlText)) !== null) {
      const article = parseArticleBlock(match[1]);
      if (article) articles.push(article);
    }

    // <조문단위> 없으면 <조> 태그 시도
    if (articles.length === 0) {
      const articleRegex = /<조>([\s\S]*?)<\/조>/g;
      while ((match = articleRegex.exec(xmlText)) !== null) {
        const article = parseArticleBlock(match[1]);
        if (article) articles.push(article);
      }
    }

    return { lawName, mstSeq, articles };
  } catch {
    return null;
  }
}

/**
 * 조문 블록에서 조번호·제목·내용 추출
 */
function parseArticleBlock(block: string): ParsedArticle | null {
  // 실제 API 태그: <조문번호>, <조문제목>, <조문내용>
  const numberMatch =
    block.match(/<조문번호>([\s\S]*?)<\/조문번호>/) ||
    block.match(/<조번호>([\s\S]*?)<\/조번호>/);
  const titleMatch =
    block.match(/<조문제목>([\s\S]*?)<\/조문제목>/) ||
    block.match(/<조제목>([\s\S]*?)<\/조제목>/);
  const contentMatch =
    block.match(/<조문내용>([\s\S]*?)<\/조문내용>/) ||
    block.match(/<조내용>([\s\S]*?)<\/조내용>/);

  if (!numberMatch && !contentMatch) return null;

  const articleNumber = numberMatch ? cleanText(numberMatch[1]) : '';
  const articleTitle = titleMatch ? cleanText(titleMatch[1]) : undefined;

  const paragraphs: string[] = [];
  if (contentMatch) {
    paragraphs.push(cleanText(contentMatch[1]));
  }

  // <항> 태그 수집
  const paraRegex = /<항>([\s\S]*?)<\/항>/g;
  let paraMatch;
  while ((paraMatch = paraRegex.exec(block)) !== null) {
    const paraContent =
      paraMatch[1].match(/<항내용>([\s\S]*?)<\/항내용>/) ||
      paraMatch[1].match(/<호내용>([\s\S]*?)<\/호내용>/);
    if (paraContent) paragraphs.push(cleanText(paraContent[1]));
  }

  const content = paragraphs.join('\n');
  if (!content && !articleTitle) return null;

  return { articleNumber, articleTitle, content };
}

/**
 * 법령 검색 결과 XML 파싱
 * lawSearch.do 응답 → LawSearchResult[]
 * 실제 API 태그: <법령명한글>, <법령일련번호>
 */
export function parseSearchResults(xmlText: string): LawSearchResult[] {
  const results: LawSearchResult[] = [];

  try {
    const itemRegex = /<법령>([\s\S]*?)<\/법령>/g;
    let match;

    while ((match = itemRegex.exec(xmlText)) !== null) {
      const block = match[1];

      const nameMatch =
        block.match(/<법령명한글>([\s\S]*?)<\/법령명한글>/) ||
        block.match(/<법령명>([\s\S]*?)<\/법령명>/);
      const mstMatch =
        block.match(/<법령일련번호>([\s\S]*?)<\/법령일련번호>/) ||
        block.match(/<법령MST>([\s\S]*?)<\/법령MST>/) ||
        block.match(/<MST>([\s\S]*?)<\/MST>/);
      const procMatch = block.match(/<공포일자>([\s\S]*?)<\/공포일자>/);
      const enfMatch = block.match(/<시행일자>([\s\S]*?)<\/시행일자>/);

      if (nameMatch) {
        results.push({
          lawName: cleanText(nameMatch[1]),
          mstSeq: mstMatch ? cleanText(mstMatch[1]) : '',
          proclamationDate: procMatch ? cleanText(procMatch[1]) : undefined,
          enforcementDate: enfMatch ? cleanText(enfMatch[1]) : undefined,
        });
      }
    }
  } catch {
    // 파싱 실패 시 빈 배열 반환
  }

  return results;
}

/**
 * Claude에게 전달할 형태로 법령 데이터 정규화
 */
export function formatLawForPrompt(law: ParsedLaw, maxArticles = 15): string {
  const lines: string[] = [];
  lines.push(`【법령명】 ${law.lawName}`);
  lines.push('');

  const articles = law.articles.slice(0, maxArticles);
  for (const article of articles) {
    const titlePart = article.articleTitle ? ` (${article.articleTitle})` : '';
    lines.push(`▶ ${article.articleNumber}${titlePart}`);
    if (article.content) {
      lines.push(article.content);
    }
    lines.push('');
  }

  if (law.articles.length > maxArticles) {
    lines.push(`... 외 ${law.articles.length - maxArticles}개 조항`);
  }

  return lines.join('\n');
}

/**
 * XML 특수문자 및 불필요한 공백 제거
 */
function cleanText(text: string): string {
  return text
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&apos;/g, "'")
    .replace(/\s+/g, ' ')
    .trim();
}
