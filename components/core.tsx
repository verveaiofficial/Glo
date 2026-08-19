'use client';
import { createContext, useContext, useState, useCallback, useEffect, ReactNode } from 'react';
import { usePathname, useRouter } from 'next/navigation';
import { sb, Profile, Notif, timeAgo } from '@/lib/supabase';

export function RippleManager(){
  useEffect(()=>{
    const h=(e:MouseEvent)=>{
      const btn=(e.target as HTMLElement).closest('button');
      if(!btn||btn.disabled)return;
      btn.classList.remove('do-ripple');void btn.offsetWidth;btn.classList.add('do-ripple');
      setTimeout(()=>btn.classList.remove('do-ripple'),400);
    };
    document.addEventListener('click',h,true);
    return()=>document.removeEventListener('click',h,true);
  },[]);
  return null;
}

const AuthCtx=createContext<{userId:string|null;profile:Profile|null}>({userId:null,profile:null});
export function AuthProvider({userId,profile,children}:{userId:string|null;profile:Profile|null;children:ReactNode}){return <AuthCtx.Provider value={{userId,profile}}>{children}</AuthCtx.Provider>}
export const useAuth=()=>useContext(AuthCtx);

const ToastCtx=createContext<(m:string)=>void>(()=>{});
export function ToastProvider({children}:{children:ReactNode}){
  const[m,setM]=useState<string|null>(null);
  const t=useCallback((x:string)=>{setM(x);setTimeout(()=>setM(null),4000)},[]);
  return <ToastCtx.Provider value={t}>{children}{m&&<div id="toast" className="show">{m}</div>}</ToastCtx.Provider>;
}
export const useToast=()=>useContext(ToastCtx);

const NavCtx=createContext<{screen:string;go:(s:string)=>void;feedTab:string;setFeedTab:(t:string)=>void;viewId:string|null;viewUsername:string;openUser:(id:string,username:string)=>void}>({screen:'home',go:()=>{},feedTab:'foryou',setFeedTab:()=>{},viewId:null,viewUsername:'',openUser:()=>{}});
export function NavProvider({children}:{children:ReactNode}){
  const[screen,set]=useState('home');
  const[feedTab,setFeedTab]=useState('foryou');
  const[viewId,setViewId]=useState<string|null>(null);
  const[viewUsername,setViewUsername]=useState('');
  const go=useCallback((s:string)=>{set(s);if(s!=='user'){setViewId(null);setViewUsername('')}},[]);
  const openUser=useCallback((id:string,username:string)=>{setViewId(id);setViewUsername(username);set('user')},[]);
  return <NavCtx.Provider value={{screen,go,feedTab,setFeedTab,viewId,viewUsername,openUser}}>{children}</NavCtx.Provider>;
}
export const useNav=()=>useContext(NavCtx);

export function Loader(){
  const[s,setS]=useState(true);
  useEffect(()=>{const t=setTimeout(()=>setS(false),1100);return()=>clearTimeout(t)},[]);
  if(!s)return null;
  return <div id="loader"><div className="loader-logo">Glo</div><div className="from-verve">From<br/>Verve</div></div>;
}

export function Realtime(){
  useEffect(()=>{
    const s=sb();
    const ch=s.channel('rt')
      .on('postgres_changes',{event:'INSERT',schema:'public',table:'posts'},()=>window.dispatchEvent(new Event('glo-refresh')))
      .on('postgres_changes',{event:'INSERT',schema:'public',table:'notifications'},()=>window.dispatchEvent(new Event('glo-refresh')))
      .on('postgres_changes',{event:'INSERT',schema:'public',table:'messages'},()=>window.dispatchEvent(new Event('glo-refresh')))
      .on('postgres_changes',{event:'INSERT',schema:'public',table:'stories'},()=>window.dispatchEvent(new Event('glo-refresh')))
      .subscribe();
    return()=>{s.removeChannel(ch)};
  },[]);
  return null;
}

export function VerifiedBadge({type}:{type:'blue'|'gold'|null}){
  if(!type)return null;
  const g=type==='gold';
  return <span className={`tick ${g?'gold':''}`}>
    <svg width="16" height="16" viewBox="0 0 24 24">
      {g&&<defs><linearGradient id="qg" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stopColor="#d8b76a"/><stop offset=".5" stopColor="#c29a3d"/><stop offset="1" stopColor="#8c6c23"/></linearGradient></defs>}
      <path fill={g?'url(#qg)':'#2e6f8e'} d="M12 2l2.4 2.4 3.3-.5 1 3.2 3 1.5-1.2 3.1L22 14l-2.2 2.6.3 3.3-3.3.8-1.8 2.9-3-1.4-3 1.4-1.8-2.9-3.3-.8.3-3.3L2 14l1.5-2.3L2.3 8.6l3-1.5 1-3.2 3.3.5z"/>
      <path d="m9 12 2 2 4-4" stroke={g?'#241a06':'#fff'} strokeWidth="2" fill="none"/>
    </svg>
  </span>;
}

const I=(d:string)=><svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d={d}/></svg>;
const GEAR=<svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M12.22 2h-.44a2 2 0 0 0-2 2v.18a2 2 0 0 1-1 1.73l-.43.25a2 2 0 0 1-2 0l-.15-.08a2 2 0 0 0-2.73.73l-.22.38a2 2 0 0 0 .73 2.73l.15.1a2 2 0 0 1 1 1.72v.51a2 2 0 0 1-1 1.74l-.15.09a2 2 0 0 0-.73 2.73l.22.38a2 2 0 0 0 2.73.73l.15-.08a2 2 0 0 1 2 0l.43.25a2 2 0 0 1 1 1.73V20a2 2 0 0 0 2 2h.44a2 2 0 0 0 2-2v-.18a2 2 0 0 1 1-1.73l.43-.25a2 2 0 0 1 2 0l.15.08a2 2 0 0 0 2.73-.73l.22-.39a2 2 0 0 0-.73-2.73l-.15-.08a2 2 0 0 1-1-1.74v-.5a2 2 0 0 1 1-1.74l.15-.09a2 2 0 0 0 .73-2.73l-.22-.38a2 2 0 0 0-2.73-.73l-.15.08a2 2 0 0 1-2 0l-.43-.25a2 2 0 0 1-1-1.73V4a2 2 0 0 0-2-2z"/><circle cx="12" cy="12" r="3"/></svg>;

const AUTH_SCREENS=['messages','bookmarks','settings','profile'];

function NotificationsSlide({open,onClose}:{open:boolean;onClose:()=>void}){
  const{userId}=useAuth();
  const[n,setN]=useState<Notif[]>([]);
  useEffect(()=>{
    if(!open||!userId)return;
    const load=async()=>{const s=sb();const{data}=await s.from('notifications').select('*,actor:profiles(*)').eq('user_id',userId).order('created_at',{ascending:false});if(data)setN(data)};
    load();window.addEventListener('glo-refresh',load);return()=>window.removeEventListener('glo-refresh',load);
  },[open,userId]);
  return <aside id="notifDrawer" className={open?'open':''}>
    <div className="notif-drawer-head"><b>Notifications</b><button className="icon-btn" onClick={onClose} aria-label="Close"><svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M18 6 6 18M6 6l12 12"/></svg></button></div>
    <div className="notif-drawer-body">
      {!userId?<div className="empty">Log in to see notifications.</div>:n.length===0?<div className="empty">Nothing yet. Likes, follows and reposts will land here.</div>:n.map(x=><div key={x.id} className="notif rise"><div className={`notif-icon ${x.actor?.verified==='gold'?'gold':''}`}><svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="8" r="4"/><path d="M4 21c0-4 3.6-6 8-6s8 2 8 6"/></svg></div><div className="notif-info"><b>{x.actor?.display_name}</b><p>{x.type==='follow'?'followed you.':`${x.type}d your post.`}</p><time>{timeAgo(x.created_at)}</time></div></div>)}
    </div>
  </aside>;
}

export function FollowListDrawer({id,type,open,onClose}:{id:string;type:'following'|'followers';open:boolean;onClose:()=>void}){
  const[rows,setRows]=useState<Profile[]>([]);
  const{openUser}=useNav();
  useEffect(()=>{
    if(!open)return;
    (async()=>{
      const s=sb();
      if(type==='following'){const{data}=await s.from('follows').select('following_id').eq('follower_id',id);const ids=(data||[]).map(x=>x.following_id);if(ids.length){const{data:ps}=await s.from('profiles').select('*').in('id',ids);setRows(ps||[])}else setRows([])}
      else{const{data}=await s.from('follows').select('follower_id').eq('following_id',id);const ids=(data||[]).map(x=>x.follower_id);if(ids.length){const{data:ps}=await s.from('profiles').select('*').in('id',ids);setRows(ps||[])}else setRows([])}
    })();
  },[id,type,open]);
  return <aside id="listDrawer" className={open?'open':''}>
    <div className="list-drawer-head"><b>{type==='following'?'Following':'Followers'}</b><button className="icon-btn" onClick={onClose} aria-label="Close"><svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M18 6 6 18M6 6l12 12"/></svg></button></div>
    <div className="list-drawer-body">
      {rows.length===0?<div className="empty">Nothing here yet.</div>:rows.map(r=><button key={r.id} className="account" style={{width:'100%',textAlign:'left'}} onClick={()=>{onClose();openUser(r.id,r.username)}}>
        {r.avatar_url?<img src={r.avatar_url} alt="" className="avatar avatar-img"/>:<div className={`avatar ${r.avatar_grad}`}>{r.display_name[0]}</div>}
        <div className="acc-info"><div className="acc-name"><b>{r.display_name}</b><VerifiedBadge type={r.verified}/></div><div className="acc-handle">@{r.username}</div></div>
      </button>)}
    </div>
  </aside>;
}

export function Shell({children}:{children:ReactNode}){
  const path=usePathname();
  const router=useRouter();
  const[open,setOpen]=useState(false);
  const[notifOpen,setNotifOpen]=useState(false);
  const[fabOpen,setFabOpen]=useState(false);
  const{screen,go,viewId,viewUsername}=useNav();
  const{userId,profile}=useAuth();
  const[me,setMe]=useState(profile);
  const[userMenuOpen,setUserMenuOpen]=useState(false);

  useEffect(()=>{
    if(!userId){setMe(profile);return}
    const load=async()=>{const s=sb();const{data}=await s.from('profiles').select('*').eq('id',userId).single();if(data)setMe(data)};
    load();window.addEventListener('glo-refresh',load);return()=>window.removeEventListener('glo-refresh',load);
  },[userId,profile]);

  if(path==='/login'||path.startsWith('/sign'))return <>{children}</>;

  const T:Record<string,string>={home:'Glo',explore:'Explore',profile:'Profile',user:viewUsername||'Profile',notifications:'Notifications',messages:'Messages',bookmarks:'Bookmarks',settings:'Settings',quix:'Quix chat'};

  const nav=(s:string)=>{if(AUTH_SCREENS.includes(s)&&!userId){router.push('/login');return}go(s);setOpen(false)};
  const handleCreate=(type:'post'|'story')=>{setFabOpen(false);if(!userId){router.push('/login');return}window.dispatchEvent(new Event(type==='post'?'glo-compose-post':'glo-compose-story'))};
  const item=(s:string,label:string,icon:ReactNode)=><button className={`nav-item ${screen===s?'active':''}`} onClick={()=>nav(s)}>{icon}{label}</button>;

  const isHome=screen==='home';
  const isUser=screen==='user';

  return <>
    <div id="backdrop" className={open||notifOpen?'show':''} onClick={()=>{setOpen(false);setNotifOpen(false);setUserMenuOpen(false)}}/>
    <nav id="drawer" className={open?'open':''}>
      <div className="drawer-head">
        {me?.avatar_url?<img src={me.avatar_url} alt="" className="avatar avatar-img"/>:<div className={`avatar ${me?.avatar_grad||'av-me'}`}>{userId?(me?.display_name||'A')[0]:'?'}</div>}
        {userId&&me?<div className="drawer-id"><div className="drawer-id-left"><b>{me.display_name}<VerifiedBadge type={me.verified}/></b><span className="handle">@{me.username}</span></div><div className="drawer-stats"><div><b>{me.following_count??0}</b><span>Following</span></div><div><b>{me.followers_count??0}</b><span>Followers</span></div></div></div>:<div className="drawer-id"><div className="drawer-id-left"><b>Guest</b><span className="handle">lurking mode</span></div><div style={{display:'flex',gap:8}}><button className="follow-btn on" onClick={()=>router.push('/login')}>Log in</button><button className="follow-btn" onClick={()=>router.push('/sign-up')}>Sign up</button></div></div>}
      </div>
      <div className="nav">
        {item('home','Home',I('m3 10 9-7 9 7v10a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z'))}
        {item('profile','Profile',<svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="8" r="4"/><path d="M4 21c0-4 3.6-6 8-6s8 2 8 6"/></svg>)}
        {item('messages','Messages',<svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect x="3" y="5" width="18" height="14" rx="2"/><path d="m3 7 9 6 9-6"/></svg>)}
        {item('bookmarks','Bookmarks',I('M19 21l-7-5-7 5V5a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2z'))}
        {item('quix','Quix chat',<img src="/quix.png" alt="" className="q-img"/>)}
        {item('settings','Settings',GEAR)}
      </div>
      <div className="drawer-foot">Glo © 2026</div>
    </nav>
    <NotificationsSlide open={notifOpen} onClose={()=>setNotifOpen(false)}/>
    <div className="wrap">
      <header>
        {isUser?<button className="icon-btn" onClick={()=>go('home')} aria-label="Back"><svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M19 12H5M12 19l-7-7 7-7"/></svg></button>:<button className={`icon-btn burger ${open?'open':''}`} onClick={()=>setOpen(!open)} aria-label="Menu"><span/><span/><span/></button>}
        <div className={isHome?'wordmark':'page-title'} style={{flex:1,textAlign:'center',overflow:'hidden',textOverflow:'ellipsis',whiteSpace:'nowrap'}}>{isHome?<>Glo<i>.</i></>:T[screen]}</div>
        {isHome&&<button className="icon-btn" onClick={()=>{if(!userId){router.push('/login');return}setOpen(false);setNotifOpen(!notifOpen)}} aria-label="Notifications"><svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M18 8a6 6 0 0 0-12 0c0 7-3 8-3 8h18s-3-1-3-8"/><path d="M13.7 21a2 2 0 0 1-3.4 0"/></svg></button>}
        {isUser&&<div style={{position:'relative'}}><button className="icon-btn" onClick={()=>setUserMenuOpen(!userMenuOpen)} aria-label="Menu"><svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="5" r="1"/><circle cx="12" cy="12" r="1"/><circle cx="12" cy="19" r="1"/></svg></button>{userMenuOpen&&<div className="user-menu"><button className="danger" onClick={()=>{setUserMenuOpen(false);window.dispatchEvent(new CustomEvent('glo-unfollow',{detail:viewId}))}}>Unfollow</button></div>}</div>}
      </header>
      {children}
    </div>
    {isHome&&<div className="fab-container"><div className={`fab-menu ${fabOpen?'open':''}`}><button className="fab-option" onClick={()=>handleCreate('post')}><svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M12 20h9"/><path d="M16.5 3.5a2.1 2.1 0 0 1 3 3L7 19l-4 1 1-4z"/></svg>Post</button><button className="fab-option" onClick={()=>handleCreate('story')}><svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="12" r="10"/><path d="m16 12-4-4-4 4M12 16V8"/></svg>Story</button></div><button className={`fab ${fabOpen?'open':''}`} onClick={()=>setFabOpen(!fabOpen)} aria-label="Create"><svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="2.4"><path d="M12 5v14M5 12h14"/></svg></button></div>}
  </>;
}