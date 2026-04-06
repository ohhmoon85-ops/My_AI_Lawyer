import Header from '@/components/Header';
import ChatInterface from '@/components/ChatInterface';
import Disclaimer from '@/components/Disclaimer';

export default function HomePage() {
  return (
    <div className="flex flex-col h-screen bg-cream">
      {/* 상단 헤더 */}
      <Header />

      {/* 채팅 영역 - 남은 높이 전부 사용 */}
      <main className="flex-1 overflow-hidden max-w-4xl w-full mx-auto flex flex-col">
        <ChatInterface />
      </main>

      {/* 하단 면책 조항 */}
      <Disclaimer />
    </div>
  );
}
