'use client';

export default function Header() {
  return (
    <header className="bg-navy text-white sticky top-0 z-50 shadow-lg">
      <div className="max-w-4xl mx-auto px-4 py-3 flex items-center justify-between">
        {/* 로고 & 타이틀 */}
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-full bg-gold/20 border border-gold/40 flex items-center justify-center text-lg flex-shrink-0">
            ⚖️
          </div>
          <div>
            <h1 className="font-serif text-base sm:text-lg font-bold leading-tight">
              나의 <span className="text-gold-light">AI 변호사</span>
            </h1>
            <p className="text-[10px] sm:text-xs text-white/40 font-mono tracking-wider hidden sm:block">
              국가법령정보 API · Claude AI
            </p>
          </div>
        </div>

        {/* 상태 배지 */}
        <div className="flex items-center gap-1.5 bg-white/5 border border-gold/20 rounded-full px-3 py-1">
          <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
          <span className="text-[11px] text-white/50 font-mono hidden sm:inline">ONLINE</span>
          <span className="text-[11px] text-white/50 font-mono sm:hidden">ON</span>
        </div>
      </div>
    </header>
  );
}
