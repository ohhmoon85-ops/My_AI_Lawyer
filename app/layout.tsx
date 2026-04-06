import type { Metadata, Viewport } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: '나의 AI 변호사',
  description: '국가법령정보 API와 Claude AI를 결합한 지능형 법률 상담 서비스',
  keywords: ['법률상담', 'AI변호사', '법령검색', '근로기준법', '주택임대차보호법'],
  openGraph: {
    title: '나의 AI 변호사',
    description: '실제 법령 데이터 기반 AI 법률 상담',
    type: 'website',
  },
};

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  maximumScale: 1,
  themeColor: '#0b1c36',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="ko">
      <body className="font-sans bg-cream antialiased">
        {children}
      </body>
    </html>
  );
}
