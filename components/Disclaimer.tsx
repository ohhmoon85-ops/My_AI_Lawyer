export default function Disclaimer() {
  return (
    <div className="border-t border-gold/10 bg-navy/95">
      <div className="max-w-4xl mx-auto px-4 py-3 flex items-start gap-2">
        <span className="text-gold/60 text-xs mt-0.5 flex-shrink-0">⚠️</span>
        <p className="text-[11px] sm:text-xs text-white/35 leading-relaxed">
          본 서비스의 답변은{' '}
          <strong className="text-white/50 font-semibold">참고용이며, 실제 법적 효력을 가지지 않습니다.</strong>{' '}
          중요한 법률 문제는 반드시 전문 변호사와 상담하시기 바랍니다. 법령 정보는 국가법령정보
          공동활용 서비스를 통해 제공됩니다.
        </p>
      </div>
    </div>
  );
}
