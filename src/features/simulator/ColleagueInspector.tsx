import Dialog from '../../components/Dialog';
import type { WorldObject } from '../../types/simulator';

export default function ColleagueInspector({ person, onClose }: { person: WorldObject; onClose: () => void }) {
  const info = person.colleague!;
  return <Dialog title={person.name} subtitle={`${info.role} · ${info.team}`} onClose={onClose} wide>
    <div className="colleague-profile">
      <div className="colleague-portrait">
        <svg viewBox="0 0 320 360" role="img" aria-label={`Chân dung minh họa ${person.name}`}>
          <rect width="320" height="360" rx="20" fill="#e1e8da" />
          <circle cx="160" cy="146" r="110" fill="#f3f0df" />
          <path d="M51 360V295Q55 229 160 226Q266 229 270 295V360" fill={person.color} />
          <path d="M140 199H180V247Q160 266 140 247Z" fill={info.skin} />
          <ellipse cx="160" cy="146" rx="59" ry="77" fill={info.skin} />
          <path d="M100 145Q84 63 153 58Q230 57 222 146L205 107Q153 132 119 99L112 152Z" fill={info.hair} />
          <circle cx="138" cy="148" r="4" fill="#263731" /><circle cx="184" cy="148" r="4" fill="#263731" />
          <path d="M145 183Q160 193 177 183" fill="none" stroke="#764b3e" strokeWidth="3" strokeLinecap="round" />
          <path d="M126 249L155 290L139 360M194 249L165 290L184 360" fill="none" stroke="#f1eadb" strokeWidth="3" />
          <rect x="194" y="292" width="32" height="43" rx="4" fill="#f5efdf" />
        </svg>
        <small>Nhân vật và chân dung minh họa cho bản demo</small>
      </div>
      <div>
        <span className="eyebrow">ĐỒNG NGHIỆP CỦA BẠN</span>
        <p className="colleague-greeting">“{info.greeting}”</p>
        <h3>Mình có thể giúp bạn</h3>
        <ul>{info.helpsWith.map(item => <li key={item}>{item}</li>)}</ul>
        <div className="colleague-availability"><strong>Gặp mình tại</strong><p>{info.available}</p></div>
      </div>
    </div>
    <div className="dialog-actions"><button className="button primary" onClick={onClose}>Tiếp tục di chuyển</button></div>
  </Dialog>;
}
