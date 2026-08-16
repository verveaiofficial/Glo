'use client';
import {createContext,useContext,useState,useCallback,useEffect,ReactNode} from 'react';
import {usePathname,useRouter} from 'next/navigation';
import {sb,Profile} from '@/lib/supabase';

const AuthCtx=createContext<{userId:string|null;profile:Profile|null}>({userId:null,profile:null});
export function AuthProvider({userId,profile,children}:{userId:string|null;profile:Profile|null;children:ReactNode}){return <AuthCtx.Provider value={{userId,profile}}>{children}</AuthCtx.Provider>;}
export const useAuth=()=>useContext(AuthCtx);

const ToastCtx=createContext<(m:string)=>void>(()=>{});
export function ToastProvider({children}:{children:ReactNode}){const[m,setM]=useState<string|null>(null);const t=useCallback((x:string)=>{setM(x);setTimeout(()=>setM(null),2000);},[]);return <ToastCtx.Provider value={t}>{children}{m&&<div id="toast" className="show">{m}</div>}</ToastCtx.Provider>;}
export const useToast=()=>useContext(ToastCtx);

const NavCtx=createContext<{screen:string;go:(s:string)=>void}>({screen:'home',go:()=>{}});
export function NavProvider({children}:{children:ReactNode}){const[screen,set]=useState('home');const go=useCallback((s:string)=>set(s),[]);return <NavCtx.Provider value={{screen,go}}>{children}</NavCtx.Provider>;}
export const useNav=()=>useContext(NavCtx);

export function Loader(){const[s,setS]=useState(true);useEffect(()=>{const t=setTimeout(()=>setS(false),1100);return()=>clearTimeout(t);},[]);if(!s)return null;return <div id="loader"><div className="loader-logo">Glo</div><div className="from-verve">From Verve</div></div>;}

export function Realtime(){useEffect(()=>{const s=sb();const ch=s.channel('rt').on('postgres_changes',{event:'INSERT',schema:'public',table:'posts'},()=>window.dispatchEvent(new Event('glo-refresh'))).on('postgres_changes',{event:'INSERT',schema:'public',table:'notifications'},()=>window.dispatchEvent(new Event('glo-refresh'))).on('postgres_changes',{event:'INSERT',schema:'public',table:'messages'},()=>window.dispatchEvent(new Event('glo-refresh'))).subscribe();return()=>{s.removeChannel(ch);};},[]);return null;}

export function VerifiedBadge({type}:{type:'blue'|'gold'|null}){
  if(!type)return null;
  const g=type==='gold';
  return <span className={`tick ${g?'gold':''}`}>
    <svg width="15" height="15" viewBox="0 0 24 24">
      {g&&<defs><linearGradient id="qg" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stopColor="#ffe08a"/><stop offset=".5" stopColor="#fcca3d"/><stop offset="1" stopColor="#d99b26"/></linearGradient></defs>}
      <path fill={g?'url(#qg)':'#f4f4f5'} d="M12 2l2.4 2.4 3.3-.5 1 3.2 3 1.5-1.2 3.1L22 14l-2.2 2.6.3 3.3-3.3.8-1.8 2.9-3-1.4-3 1.4-1.8-2.9-3.3-.8.3-3.3L2 14l1.5-2.3L2.3 8.6l3-1.5 1-3.2 3.3.5z"/>
      <path d="m9 12 2 2 4-4" stroke={g?'#241a06':'#0a0a0a'} strokeWidth="2" fill="none"/>
    </svg>
  </span>;
}

const I=(d:string)=><svg width="21" height="21" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d={d}/></svg>;
const AUTH_SCREENS=['notifications','messages','bookmarks','settings','profile'];

export function Shell({children}:{children:ReactNode}){
  const path=usePathname();
  const router=useRouter();
  const[open,setOpen]=useState(false);
  const{screen,go}=useNav();
  const{userId,profile}=useAuth();

  if(path==='/login'||path.startsWith('/sign')){
    return <><div className="orbs"><i className="o1"/><i className="o2"/><i className="o3"/></div>{children}</>;
  }

  const T:Record<string,string>={home:'Glo',explore:'Explore',profile:'Profile',notifications:'Notifications',messages:'Messages',bookmarks:'Bookmarks',settings:'Settings'};
  const nav=(s:string)=>{ if(AUTH_SCREENS.includes(s)&&!userId){router.push('/login');return;} go(s);setOpen(false); };
  const item=(s:string,label:string,icon:ReactNode)=>(<button className={`nav-item ${screen===s?'active':''}`} onClick={()=>nav(s)}>{icon}{label}</button>);

  return <>
    <div className="orbs"><i className="o1"/><i className="o2"/><i className="o3"/></div>
    <div id="backdrop" className={open?'show':''} onClick={()=>setOpen(false)}/>
    <nav id="drawer" className={open?'open':''}>
      <div className="drawer-head">
        <div className={`avatar ${profile?.avatar_grad||'av-me'}`}>{userId?(profile?.display_name||'A')[0]:'?'}</div>
        {userId&&profile?(
          <div className="drawer-id">
            <div className="drawer-id-left"><b>{profile.display_name} <VerifiedBadge type={profile.verified}/></b><span className="handle">@{profile.username}</span></div>
            <div className="drawer-stats"><div><b>{profile.following_count??0}</b><span>Following</span></div><div><b>{profile.followers_count??0}</b><span>Followers</span></div></div>
          </div>
        ):(
          <div className="drawer-id">
            <div className="drawer-id-left"><b>Guest</b><span className="handle">lurking mode</span></div>
            <div style={{display:'flex',gap:8}}>
              <button className="follow-btn on" onClick={()=>router.push('/login')}>Log in</button>
              <button className="follow-btn" onClick={()=>router.push('/sign-up')}>Sign up</button>
            </div>
          </div>
        )}
      </div>
      <div className="nav">
        {item('home','Home',I("m3 10 9-7 9 7v10a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"))}
        {item('profile','Profile',<svg width="21" height="21" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="8" r="4"/><path d="M4 21c0-4 3.6-6 8-6s8 2 8 6"/></svg>)}
        {item('explore','Explore',<svg width="21" height="21" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="11" cy="11" r="7"/><path d="m21 21-4.3-4.3"/></svg>)}
        {item('notifications','Notifications',I("M18 8a6 6 0 0 0-12 0c0 7-3 8-3 8h18s-3-1-3-8"))}
        {item('messages','Messages',<svg width="21" height="21" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect x="3" y="5" width="18" height="14" rx="2"/><path d="m3 7 9 6 9-6"/></svg>)}
        {item('bookmarks','Bookmarks',I("M19 21l-7-5-7 5V5a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2z"))}
        {item('settings','Settings',<svg width="21" height="21" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="12" r="3"/><path d="M12 8v8M8 12h8"/></svg>)}
        <a className="nav-item" href="https://quixaii.netlify.app/" target="_blank" rel="noopener"><svg className="q-ic" width="21" height="21" viewBox="0 0 24 24" fill="currentColor"><path d="M12 2l2.1 5.6L20 9.7l-5.9 2.1L12 17.5l-2.1-5.7L4 9.7l5.9-2.1z"/></svg>Try Quix<svg className="ext" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M7 17 17 7M7 7h10v10"/></svg></a>
      </div>
      <div className="drawer-foot">Glo © 2026</div>
    </nav>
    <div className="wrap">
      <header>
        <button className={`icon-btn burger ${open?'open':''}`} onClick={()=>setOpen(!open)}><span/><span/><span/></button>
        <div className={screen==='home'?'wordmark':'page-title'}>{screen==='home'?<>Glo<i>.</i></>:T[screen]}</div>
        <button className="compose-btn" onClick={()=>{userId?go('home'):router.push('/login');}}><svg width="19" height="19" viewBox="0 0 24 24" fill="none" stroke="#0a0a0a" strokeWidth="2.4"><path d="M12 5v14M5 12h14"/></svg></button>
      </header>
      {children}
    </div>
  </>;
}