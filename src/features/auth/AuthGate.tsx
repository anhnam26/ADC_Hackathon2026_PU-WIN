import {useEffect,useState,type FormEvent} from 'react';
import {api,type Account} from '../../lib/api';
import {AccountContext} from './AccountContext';
import App from '../../app/App';
import Admin from '../notes/Admin';
import LanguageSwitch from '../../components/LanguageSwitch';
import {useLocale} from '../../lib/i18n';

export default function AuthGate(){
  const {language}=useLocale(),vi=language==='vi';
  const [user,setUser]=useState<Account|null>(null),[loading,setLoading]=useState(true),[error,setError]=useState(''),[busy,setBusy]=useState(false),[email,setEmail]=useState(''),[password,setPassword]=useState('');
  const [admin,setAdmin]=useState(!new URLSearchParams(location.search).has('experience'));
  useEffect(()=>{api<{user:Account|null}>('/auth/me').then(r=>setUser(r.user)).catch(e=>setError(e.message)).finally(()=>setLoading(false));const expired=()=>{setUser(null);setError('Phiên đã hết hạn. Hãy đăng nhập lại.');};window.addEventListener('dayzero-auth-expired',expired);return()=>window.removeEventListener('dayzero-auth-expired',expired);},[]);
  async function login(e:FormEvent){e.preventDefault();setBusy(true);setError('');try{const result=await api<{user:Account}>('/auth/login',{method:'POST',body:JSON.stringify({email,password})});setUser(result.user);setPassword('');setAdmin(true);}catch(e){setError((e as Error).message);}finally{setBusy(false);}}
  async function logout(){try{await api('/auth/logout',{method:'POST'});setUser(null);setPassword('');}catch(e){setError((e as Error).message);}}
  if(loading)return <main className="auth-page"><p role="status">{vi?'Đang kiểm tra phiên đăng nhập…':'Checking your session…'}</p></main>;
  if(!user)return <main className="auth-page"><section className="auth-story"><span>DAY ZERO / OFFICE SIMULATOR</span><h1>{vi?'Làm quen hôm nay.\nTự tin ngày đầu tiên.':'Explore today.\nFeel ready on day one.'}</h1><p>{vi?'Khám phá văn phòng theo nhịp của bạn. Đánh dấu bất cập ngay tại nơi bạn gặp và chia sẻ thay đổi bạn mong muốn.':'Explore at your own pace. Mark barriers where you encounter them and share the changes you need.'}</p><div className="auth-plan" aria-hidden="true"><i/><i/><i/><b>01</b><b>02</b><b>03</b></div></section><section className="auth-card"><LanguageSwitch/><h2>{vi?'Đăng nhập':'Sign in'}</h2><p>{vi?'Tài khoản xác định quyền trải nghiệm hoặc quản lý.':'Your account determines employee or manager access.'}</p><form onSubmit={login}><label>Email<input type="email" autoComplete="username" required maxLength={254} value={email} onChange={e=>setEmail(e.target.value)}/></label><label>{vi?'Mật khẩu':'Password'}<input type="password" autoComplete="current-password" required maxLength={256} value={password} onChange={e=>setPassword(e.target.value)}/></label>{error&&<p role="alert">{error}</p>}<button className="button primary" disabled={busy}>{busy?(vi?'Đang đăng nhập…':'Signing in…'):(vi?'Đăng nhập':'Sign in')}</button></form><details><summary>{vi?'Tài khoản dùng thử':'Demo accounts'}</summary><p>employee@dayzero.local<br/>manager@dayzero.local</p><p>{vi?'Mật khẩu mặc định cho cả hai:':'Default password for both:'} <code>DayZero2026!</code></p><small>{vi?'Thông tin mặc định của demo; có thể được thay đổi bởi người vận hành.':'Demo defaults may be changed by the operator.'}</small></details></section></main>;
  return <AccountContext.Provider value={{user,logout,openAdmin:()=>setAdmin(true)}}>{user.role==='manager'&&admin?<Admin onExperience={()=>setAdmin(false)}/>:<App key={user.id}/>}</AccountContext.Provider>;
}
