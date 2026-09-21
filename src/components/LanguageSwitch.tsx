import { useDemoStore } from '../store/useDemoStore';
export default function LanguageSwitch(){
  const language=useDemoStore(s=>s.session.language),setLanguage=useDemoStore(s=>s.setLanguage);
  return <label className="language-switch"><span className="sr-only">Ngôn ngữ / Language</span><select aria-label="Ngôn ngữ / Language" value={language} onChange={e=>setLanguage(e.target.value as 'vi'|'en')}><option value="vi">Tiếng Việt</option><option value="en">English</option></select></label>;
}
