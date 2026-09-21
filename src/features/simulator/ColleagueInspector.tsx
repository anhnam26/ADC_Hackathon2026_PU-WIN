import { useLocale } from '../../lib/i18n';
import Dialog from '../../components/Dialog';
import type { WorldObject } from '../../types/simulator';
import { useState } from 'react';
import { useDemoStore } from '../../store/useDemoStore';

export default function ColleagueInspector({ person, onClose }: { person: WorldObject; onClose: () => void }) {
  const { t, language } = useLocale();
  const info = person.colleague!;
  const [tab,setTab]=useState<'profile'|'letter'>('profile');
  const [body,setBody]=useState(''),[feedback,setFeedback]=useState('');
  const letters=useDemoStore(s=>s.session.letters),sendLetter=useDemoStore(s=>s.sendLetter),notice=useDemoStore(s=>s.notice);
  return <Dialog title={person.name} subtitle={`${t(info.role)} · ${info.team}`} onClose={onClose} wide>
    <nav className="journal-tabs" aria-label={t('Hồ sơ')}><button aria-pressed={tab==='profile'} onClick={()=>setTab('profile')}>{t('Hồ sơ')}</button><button aria-pressed={tab==='letter'} onClick={()=>setTab('letter')}>{t('Gửi thư')}</button></nav>
    {tab==='profile' ? <>
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
        <small>{t("Nhân vật và chân dung minh họa cho bản demo")}</small>
      </div>
      <div>
        <span className="eyebrow">{t("ĐỒNG NGHIỆP CỦA BẠN")}</span>
        <p className="colleague-greeting">“{t(info.greeting)}”</p>
        <h3>{t("Mình có thể giúp bạn")}</h3>
        <ul>{info.helpsWith.map(item => <li key={item}>{t(item)}</li>)}</ul>
        <div className="colleague-availability"><strong>{t("Gặp mình tại")}</strong><p>{t(info.available)}</p></div>
      </div>
    </div>
    </> : <section className="letter-panel">
      <p className="profile-disclaimer">{t('Thư trong bản demo được lưu trên trình duyệt này, chưa gửi email hay chuyển tới đồng nghiệp thật.')}</p>
      <form onSubmit={e=>{e.preventDefault();if(sendLetter(person.id,body)){setBody('');setFeedback('Đã lưu lời nhắn trong demo.');}else setFeedback('Vui lòng nhập lời nhắn từ 1 đến 1500 ký tự.');}}>
        <label>{t('Lời nhắn')}<textarea aria-label={t('Lời nhắn')} value={body} onChange={e=>{setBody(e.target.value);setFeedback('');}} maxLength={1500} rows={5} required /></label>
        <small>{body.length}/1500</small><button className="button primary" type="submit" disabled={!body.trim()}>{t('Gửi lời nhắn')}</button>
      </form>
      <p role="status">{t(feedback)}{notice ? ` ${notice}` : ''}</p>
      <h3>{t('Thư đã để lại')}</h3>
      {letters.filter(letter=>letter.recipientId===person.id).length===0 && <p>{t('Chưa có lời nhắn.')}</p>}
      <ul className="letter-history">{letters.filter(letter=>letter.recipientId===person.id).slice().reverse().map(letter=><li key={letter.id}><time dateTime={letter.createdAt}>{new Date(letter.createdAt).toLocaleString(language==='vi'?'vi-VN':'en-US')}</time><p>{letter.body}</p></li>)}</ul>
    </section>}
    <div className="dialog-actions"><button className="button primary" onClick={onClose}>{t("Tiếp tục di chuyển")}</button></div>
  </Dialog>;
}
