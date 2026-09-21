import { useState } from 'react';
import { ArrowRight, Check, Compass, Footprints, MessageSquareText, Sparkles } from 'lucide-react';
import Dialog from '../../components/Dialog';
import { categories, categoryLabels, type Category } from '../../types/domain';
import { useDemoStore } from '../../store/useDemoStore';

export default function Welcome({ onClose }: { onClose: () => void }) {
  const { session, start } = useDemoStore();
  const [needs, setNeeds] = useState<Category[]>(session.selectedNeeds);
  return <Dialog title={session.started ? 'Điều gì giúp bạn tự tin hơn?' : 'Ngày đầu tiên, theo cách của bạn.'} subtitle="Chọn điều bạn muốn kiểm tra. Bạn có thể thay đổi bất kỳ lúc nào." onClose={onClose} wide>
    {!session.started && <div className="welcome-story"><div className="welcome-icon"><Compass size={32} /></div><div><span className="eyebrow">CHÀO MỪNG ĐẾN DAY ZERO</span><h3>Một chút làm quen.<br />Một khởi đầu tự tin hơn.</h3><p>Khám phá văn phòng, thử lịch trình và cùng HR chuẩn bị những điều bạn cần — trước ngày đi làm.</p></div><Sparkles className="welcome-spark" size={40} /></div>}
    <div className="needs-grid">{categories.map(category => <button key={category} className={`need-option ${needs.includes(category) ? 'selected' : ''}`} aria-pressed={needs.includes(category)} onClick={() => setNeeds(v => v.includes(category) ? v.filter(x => x !== category) : [...v, category])}><span className="need-check">{needs.includes(category) && <Check size={14} />}</span>{categoryLabels[category]}</button>)}</div>
    <p className="muted small">Không cần cung cấp thông tin sức khỏe. Bạn cũng có thể bắt đầu và chọn theo từng hoạt động.</p>
    <div className="welcome-facts"><span><Footprints size={17} /> 7 chặng · 5–8 phút</span><span><MessageSquareText size={17} /> Chuẩn bị cùng HR</span></div>
    <div className="dialog-actions"><button className="button primary" onClick={() => { start(needs); onClose(); }}>{session.started ? 'Lưu lựa chọn' : 'Bắt đầu trải nghiệm'}<ArrowRight size={17} /></button></div>
  </Dialog>;
}
