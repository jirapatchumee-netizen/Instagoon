import type { CreditProgress } from '../types';

export function CreditProgressCard({ progress, adultMode, onAdultMode, disabled = false }: {
  progress: CreditProgress; adultMode?: boolean; onAdultMode?: (value: boolean) => void; disabled?: boolean;
}) {
  const start = progress.costs.slice(0, progress.level - 1).reduce((sum, cost) => sum + cost, 0);
  const fraction = progress.nextLevelAt === null ? 1 : Math.max(0, Math.min(1,
    (progress.creditsSpent - start) / (progress.nextLevelAt - start)));
  return <section className="fs-credit-progress" aria-label="ระดับสำหรับปลดล็อกรางวัล">
    <div className="fs-credit-progress-title"><strong>รางวัล Lv.{progress.level}</strong><span>ใช้คุยแล้ว {progress.creditsSpent.toLocaleString()} เครดิต</span></div>
    <div className="fs-credit-progress-track" role="progressbar" aria-label="ความคืบหน้าระดับถัดไป" aria-valuemin={0} aria-valuemax={100} aria-valuenow={Math.round(fraction * 100)}><i style={{ width: `${fraction * 100}%` }}/></div>
    <small>{progress.nextLevelAt === null ? 'ถึงระดับสูงสุดแล้ว' : `อีก ${progress.creditsRemaining.toLocaleString()} เครดิต → Lv.${progress.level + 1}`}</small>
    {onAdultMode && <div className="fs-credit-adult-row"><div><strong>โหมดสนทนาผู้ใหญ่ 18+</strong><small>{progress.adultAllowed ? 'ครีเอเตอร์อนุญาต · เลือกเปิดเองได้' : 'ครีเอเตอร์ไม่ได้อนุญาตเนื้อหา 18+'}</small></div>
      <button type="button" role="switch" aria-label="โหมดสนทนาผู้ใหญ่ 18+" aria-checked={!!adultMode}
        disabled={disabled || !progress.adultAllowed} onClick={() => onAdultMode(!adultMode)}>{adultMode ? 'เปิดอยู่' : 'ปิดอยู่'}</button></div>}
  </section>;
}
