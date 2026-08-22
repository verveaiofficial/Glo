import { createContext, useContext, useState, useCallback, useEffect, useRef, ReactNode } from 'react';
import { sb, Profile, Post, Story, Notif, Msg, timeAgo, fmt, signUp, signIn, signOut, createPost, toggleLike, toggleRepost, toggleBookmark, toggleFollow, createStory, updateProfile, uploadMedia, sendMessage, fetchNotifications, markNotifRead } from './lib/supabase';

// ============ CONTEXTS ============
const AuthCtx = createContext<{ userId: string | null; profile: Profile | null; reload: () => void }>({ userId: null, profile: null, reload: () => {} });
const useAuth = () => useContext(AuthCtx);
const ToastCtx = createContext<(m: string) => void>(() => {});
const useToast = () => useContext(ToastCtx);
const NavCtx = createContext<{ screen: string; go: (s: string) => void; feedTab: string; setFeedTab: (t: string) => void; viewId: string | null; viewUsername: string; openUser: (id: string, username: string) => void; chatId: string | null; chatName: string; openChat: (id: string, name: string) => void; closeChat: () => void; viewFollowing: boolean; setViewFollowing: (v: boolean) => void }>({ screen: 'home', go: () => {}, feedTab: 'foryou', setFeedTab: () => {}, viewId: null, viewUsername: '', openUser: () => {}, chatId: null, chatName: '', openChat: () => {}, closeChat: () => {}, viewFollowing: false, setViewFollowing: () => {} });
const useNav = () => useContext(NavCtx);

// ============ HOOKS ============
function useRefresh(fn: () => void) {
  useEffect(() => { fn(); const h = () => fn(); window.addEventListener('glo-refresh', h); return () => window.removeEventListener('glo-refresh', h); }, []);
}

// ============ GLOBAL FX (RIPPLE) ============
function RippleFx() {
  useEffect(() => {
    const style = document.createElement('style');
    style.textContent = ` .glo-ripple { position: absolute; border-radius: 50%; transform: scale(0); animation: glo-ripple .55s ease-out; background: rgba(255,255,255,.25); pointer-events: none; } @keyframes glo-ripple { to { transform: scale(3.2); opacity: 0; } } `;
    document.head.appendChild(style);
    const onDown = (e: PointerEvent) => {
      const btn = (e.target as HTMLElement).closest('button'); if (!btn) return;
      const cs = getComputedStyle(btn); if (cs.position === 'static') btn.style.position = 'relative'; if (cs.overflow === 'visible') btn.style.overflow = 'hidden';
      const rect = btn.getBoundingClientRect(); const size = Math.max(rect.width, rect.height);
      const span = document.createElement('span'); span.className = 'glo-ripple'; span.style.width = size + 'px'; span.style.height = size + 'px';
      span.style.left = (e.clientX - rect.left - size / 2) + 'px'; span.style.top = (e.clientY - rect.top - size / 2) + 'px';
      btn.appendChild(span); setTimeout(() => span.remove(), 600);
    };
    document.addEventListener('pointerdown', onDown);
    return () => { document.removeEventListener('pointerdown', onDown); style.remove(); };
  }, []);
  return null;
}

// ============ SMALL COMPONENTS ============
function VerifiedBadge({ type }: { type: 'blue' | 'gold' | null }) {
  if (!type) return null;
  const g = type === 'gold';
  return (
    <span className={`tick ${g ? 'gold' : ''}`}>
      <svg width="16" height="16" viewBox="0 0 24 24">
        {g && (<defs><linearGradient id="qg" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stopColor="#d8b76a" /><stop offset=".5" stopColor="#c29a3d" /><stop offset="1" stopColor="#8c6c23" /></linearGradient></defs>)}
        <path fill={g ? 'url(#qg)' : '#2e6f8e'} d="M12 2l2.4 2.4 3.3-.5 1 3.2 3 1.5-1.2 3.1L22 14l-2.2 2.6.3 3.3-3.3.8-1.8 2.9-3-1.4-3 1.4-1.8-2.9-3.3-.8.3-3.3L2 14l1.5-2.3L2.3 8.6l3-1.5 1-3.2 3.3.5z" />
        <path d="m9 12 2 2 4-4" stroke={g ? '#241a06' : '#fff'} strokeWidth="2" fill="none" />
      </svg>
    </span>
  );
}

function Empty({ icon, title, sub }: { icon: ReactNode; title: string; sub: string }) {
  return (
    <div className="empty">
      <div style={{ width: 56, height: 56, borderRadius: '50%', background: 'rgba(255,255,255,.06)', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 14px', color: '#8b98a5' }}>{icon}</div>
      <div style={{ fontSize: 17, fontWeight: 800, color: 'var(--text)' }}>{title}</div>
      <div style={{ marginTop: 6 }}>{sub}</div>
    </div>
  );
}

const IC = {
  pen: <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M12 20h9" /><path d="M16.5 3.5a2.1 2.1 0 0 1 3 3L7 19l-4 1 1-4z" /></svg>,
  users: <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="9" cy="8" r="4" /><path d="M2 21c0-4 3.1-6 7-6s7 2 7 6" /><circle cx="17.5" cy="9.5" r="3" /><path d="M22 21c0-3-1.8-4.7-4.5-5.2" /></svg>,
  mail: <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect x="3" y="5" width="18" height="14" rx="2" /><path d="m3 7 9 6 9-6" /></svg>,
  bm: <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M19 21l-7-5-7 5V5a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2z" /></svg>,
  lock: <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect x="4" y="11" width="16" height="10" rx="2" /><path d="M8 11V7a4 4 0 0 1 8 0v4" /></svg>,
};

// ============ AVATAR CROP ============
function AvatarCrop({ src, onDone, close }: { src: string; onDone: (f: File) => void; close: () => void }) {
  const C = 240; const OUT = 512;
  const imgRef = useRef<HTMLImageElement | null>(null);
  const [ready, setReady] = useState(false);
  const [zoom, setZoom] = useState(1);
  const [pos, setPos] = useState({ x: 0, y: 0 });
  const [dims, setDims] = useState({ w: 0, h: 0 });
  const dragRef = useRef<{ sx: number; sy: number; bx: number; by: number } | null>(null);
  useEffect(() => { const img = new Image(); img.onload = () => { imgRef.current = img; setDims({ w: img.naturalWidth, h: img.naturalHeight }); setReady(true); }; img.src = src; }, [src]);
  const baseScale = dims.w && dims.h ? Math.max(C / dims.w, C / dims.h) : 1;
  const scale = baseScale * zoom; const imgW = dims.w * scale; const imgH = dims.h * scale;
  const clampPos = (x: number, y: number) => ({ x: Math.min(0, Math.max(C - imgW, x)), y: Math.min(0, Math.max(C - imgH, y)) });
  useEffect(() => { if (ready) setPos({ x: (C - imgW) / 2, y: (C - imgH) / 2 }); /* eslint-disable-next-line react-hooks/exhaustive-deps */ }, [ready]);
  useEffect(() => { setPos((p) => clampPos(p.x, p.y)); /* eslint-disable-next-line react-hooks/exhaustive-deps */ }, [zoom, imgW, imgH]);
  const onDown = (e: React.PointerEvent<HTMLDivElement>) => { e.preventDefault(); (e.currentTarget as HTMLElement).setPointerCapture?.(e.pointerId); dragRef.current = { sx: e.clientX, sy: e.clientY, bx: pos.x, by: pos.y }; };
  const onMove = (e: React.PointerEvent<HTMLDivElement>) => { const d = dragRef.current; if (!d) return; setPos(clampPos(d.bx + (e.clientX - d.sx), d.by + (e.clientY - d.sy))); };
  const onUp = () => { dragRef.current = null; };
  const save = () => {
    const img = imgRef.current; if (!img || !ready) return;
    const canvas = document.createElement('canvas'); canvas.width = OUT; canvas.height = OUT;
    const ctx = canvas.getContext('2d'); if (!ctx) return;
    const sx = -pos.x / scale; const sy = -pos.y / scale; const sw = C / scale; const sh = C / scale;
    ctx.drawImage(img, sx, sy, sw, sh, 0, 0, OUT, OUT);
    canvas.toBlob((blob) => { if (!blob) return; onDone(new File([blob], 'avatar-crop.png', { type: 'image/png' })); }, 'image/png');
  };
  return (
    <div style={{ position: 'fixed', inset: 0, zIndex: 2000, background: 'rgba(0,0,0,.85)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 20 }}>
      <div style={{ width: '100%', maxWidth: 360, background: 'var(--card, #0b0b0c)', border: '1px solid var(--gbrd-soft, rgba(255,255,255,.1))', borderRadius: 20, padding: 18 }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 14 }}>
          <b style={{ fontSize: 17 }}>Adjust photo</b>
          <button className="icon-btn" onClick={close} aria-label="Close"><svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M18 6 6 18M6 6l12 12" /></svg></button>
        </div>
        <div onPointerDown={onDown} onPointerMove={onMove} onPointerUp={onUp} onPointerCancel={onUp} style={{ width: C, height: C, margin: '0 auto', borderRadius: '50%', overflow: 'hidden', position: 'relative', touchAction: 'none', cursor: 'grab', background: 'rgba(255,255,255,.06)', border: '2px solid var(--gbrd-soft, rgba(255,255,255,.15))' }}>
          {ready && (<img src={src} alt="" draggable={false} style={{ position: 'absolute', left: pos.x, top: pos.y, width: imgW, height: imgH, maxWidth: 'none', pointerEvents: 'none', userSelect: 'none' }} />)}
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginTop: 16 }}>
          <button className="icon-btn" onClick={() => setZoom((z) => Math.max(1, +(z - 0.25).toFixed(2)))} aria-label="Zoom out"><svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M5 12h14" /></svg></button>
          <input type="range" min={1} max={4} step={0.01} value={zoom} onChange={(e) => setZoom(parseFloat(e.target.value))} style={{ flex: 1 }} aria-label="Zoom" />
          <button className="icon-btn" onClick={() => setZoom((z) => Math.min(4, +(z + 0.25).toFixed(2)))} aria-label="Zoom in"><svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M12 5v14M5 12h14" /></svg></button>
        </div>
        <div style={{ display: 'flex', gap: 10, marginTop: 16 }}>
          <button className="pbtn" style={{ flex: 1, justifyContent: 'center' }} onClick={close}>Cancel</button>
          <button className="post-btn" style={{ flex: 1 }} disabled={!ready} onClick={save}>Apply</button>
        </div>
      </div>
    </div>
  );
}

// ============ POST CARD ============
function PostCard({ post, liked, reposted, bookmarked }: { post: Post; liked: boolean; reposted: boolean; bookmarked: boolean }) {
  const toast = useToast(); const { userId } = useAuth(); const { openUser } = useNav();
  const [lk, setLk] = useState(liked); const [lp, setLp] = useState(post.likes_count);
  const [rp, setRp] = useState(reposted); const [rc, setRc] = useState(post.reposts_count);
  const [bm, setBm] = useState(bookmarked);
  const p = post.profiles;
  const guard = () => { if (!userId) { toast('Log in first.'); return true; } return false; };
  const canDelete = userId === post.user_id;
  const del = async () => { if (!canDelete) return; if (!window.confirm('Delete this post?')) return; const { error } = await sb.from('posts').delete().eq('id', post.id); if (error) { toast('Could not delete post.'); return; } toast('Post deleted.'); window.dispatchEvent(new Event('glo-refresh')); };
  return (
    <article className="post rise">
      <div className="post-head">
        <button className="avatar" style={{ background: p?.avatar_url ? 'transparent' : undefined, padding: 0 }} onClick={() => p && openUser(p.id, p.username)}>
          {p?.avatar_url ? (<img src={p.avatar_url} alt="" className="avatar avatar-img" />) : (<div className={`avatar ${p?.avatar_grad || 'av-1'}`}>{(p?.display_name || '?')[0]}</div>)}
        </button>
        <div className="post-body">
          <div className="post-user">
            <button style={{ background: 'none', border: 'none', color: 'inherit', font: 'inherit', fontWeight: 700, fontSize: 15, padding: 0, cursor: 'pointer' }} onClick={() => p && openUser(p.id, p.username)}>{p?.display_name}</button>
            <VerifiedBadge type={p?.verified || null} />
            <span>@{p?.username} · {timeAgo(post.created_at)}</span>
          </div>
          <div className="post-text">{post.content}</div>
          {post.media_url && <img src={post.media_url} alt="" style={{ marginTop: 12, height: 200, objectFit: 'cover', width: '100%', borderRadius: 16, border: '1px solid var(--gbrd-soft)' }} />}
          <div className="actions">
            <button type="button" className="act reply" onClick={() => { if (guard()) return; toast('Replies coming soon.'); }}><svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M21 11.5a8.4 8.4 0 0 1-9 8.4 8.6 8.6 0 0 1-3.8-.9L3 21l2-4.9a8.4 8.4 0 1 1 16-4.6z" /></svg><span>{fmt(post.replies_count)}</span></button>
            <button type="button" className={`act repost ${rp ? 'on' : ''}`} onClick={() => { if (guard()) return; setRp(!rp); setRc(rc + (rp ? -1 : 1)); toggleRepost(post.id); }}><svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="m17 2 4 4-4 4" /><path d="M3 11v-1a4 4 0 0 1 4-4h14" /><path d="m7 22-4-4 4-4" /><path d="M21 13v1a4 4 0 0 1-4 4H3" /></svg><span>{fmt(rc)}</span></button>
            <button type="button" className={`act like ${lk ? 'on' : ''}`} onClick={() => { if (guard()) return; const on = !lk; setLk(on); setLp(lp + (on ? 1 : -1)); toggleLike(post.id); }}><svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M19 14c1.5-1.5 3-3.2 3-5.5A5.5 5.5 0 0 0 16.5 3c-1.8 0-3.4 1-4.5 2.5C10.9 4 9.3 3 7.5 3A5.5 5.5 0 0 0 2 8.5c0 2.3 1.5 4 3 5.5l7 7z" /></svg><span>{fmt(lp)}</span></button>
            <button type="button" className={`act bm ${bm ? 'on' : ''}`} aria-label={bm ? 'Remove bookmark' : 'Save to bookmarks'} title={bm ? 'Remove bookmark' : 'Save to bookmarks'} style={{ minWidth: 44, minHeight: 38, display: 'inline-flex', alignItems: 'center', justifyContent: 'center', padding: 8 }} onClick={() => { if (guard()) return; setBm(!bm); toggleBookmark(post.id); toast(bm ? 'Removed from bookmarks.' : 'Saved to bookmarks.'); }}><svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" style={{ pointerEvents: 'none' }}><path d="M19 21l-7-5-7 5V5a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2z" /></svg></button>
            <button type="button" className="act share" onClick={() => { if (guard()) return; toast('Link copied.'); }}><svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M12 3v13" /><path d="m7 8 5-5 5 5" /><path d="M5 15v4a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2v-4" /></svg></button>
            {canDelete && (<button type="button" className="act share" aria-label="Delete post" title="Delete post" style={{ color: '#f4212e', minWidth: 44, minHeight: 38, display: 'inline-flex', alignItems: 'center', justifyContent: 'center', padding: 8 }} onClick={del}><svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" style={{ pointerEvents: 'none' }}><path d="M3 6h18" /><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6" /><path d="M8 6V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" /><path d="M10 11v6" /><path d="M14 11v6" /></svg></button>)}
          </div>
        </div>
      </div>
    </article>
  );
}

// ============ POST MODAL ============
function PostModal({ close }: { close: () => void }) {
  const { profile } = useAuth(); const toast = useToast();
  const [text, setText] = useState(''); const [media, setMedia] = useState<string | null>(null); const [busy, setBusy] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null); const left = 280 - text.length;
  const onFile = async (e: React.ChangeEvent<HTMLInputElement>) => { const f = e.target.files?.[0]; if (!f) return; const url = await uploadMedia(f); if (url) setMedia(url); else toast('Upload failed.'); };
  const submit = async () => { if (busy || (!text.trim() && !media)) return; setBusy(true); const res = await createPost(text, media || undefined); setBusy(false); if (res && res.error) { toast('Could not post: ' + res.error); return; } setText(''); setMedia(null); toast('Posted to Glo.'); close(); window.scrollTo({ top: 0, behavior: 'smooth' }); window.dispatchEvent(new Event('glo-refresh')); };
  return (
    <div className="post-modal">
      <div className="post-modal-head">
        <button className="icon-btn" onClick={close} aria-label="Close"><svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M18 6 6 18M6 6l12 12" /></svg></button>
        <button className="post-btn" disabled={busy || (!text.trim() && !media)} onClick={submit}>{busy ? 'Posting...' : 'Post'}</button>
      </div>
      <div className="post-modal-body">
        {profile?.avatar_url ? <img src={profile.avatar_url} alt="" className="avatar avatar-img" style={{ marginBottom: 8 }} /> : <div className={`avatar ${profile?.avatar_grad || 'av-me'}`} style={{ marginBottom: 8 }}>{(profile?.display_name || 'A')[0]}</div>}
        <textarea autoFocus value={text} onChange={(e) => setText(e.target.value)} placeholder="What's happening?" />
        {media && (
          <div style={{ position: 'relative' }}>
            <img src={media} alt="" style={{ width: '100%', height: 200, objectFit: 'cover', borderRadius: 12 }} />
            <button className="icon-btn" onClick={() => setMedia(null)} style={{ position: 'absolute', top: 8, right: 8, background: 'rgba(0,0,0,0.6)' }} aria-label="Remove media"><svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="2"><path d="M18 6 6 18M6 6l12 12" /></svg></button>
          </div>
        )}
        <div style={{ display: 'flex', gap: 10, alignItems: 'center', marginTop: 'auto', paddingTop: 12, borderTop: '1px solid var(--gbrd-soft)' }}>
          <button className="icon-btn" onClick={() => fileRef.current?.click()} aria-label="Add image"><svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="var(--blue)" strokeWidth="2"><rect x="3" y="3" width="18" height="18" rx="3" /><circle cx="9" cy="9" r="2" /><path d="m21 15-4.5-4.5L6 21" /></svg></button>
          <input ref={fileRef} type="file" accept="image/*" hidden onChange={onFile} />
          <span className={`char ${left < 20 ? 'warn' : ''}`}>{text ? left : ''}</span>
        </div>
      </div>
    </div>
  );
}

// ============ STORIES ============
function Stories() {
  const [stories, setStories] = useState<Story[]>([]);
  const [view, setView] = useState<{ g: number; i: number } | null>(null);
  const [compose, setCompose] = useState(false);
  const [text, setText] = useState(''); const [grad, setGrad] = useState('g1'); const [busy, setBusy] = useState(false);
  const toast = useToast(); const { userId, profile } = useAuth(); const { openUser } = useNav();
  useEffect(() => { const load = async () => { const { data } = await sb.from('stories').select('*,profiles:user_id(*)').gt('expires_at', new Date().toISOString()).order('created_at'); setStories(data || []); }; load(); window.addEventListener('glo-refresh', load); return () => window.removeEventListener('glo-refresh', load); }, []);
  useEffect(() => { const h = () => { if (userId) setCompose(true); }; window.addEventListener('glo-compose-story', h); return () => window.removeEventListener('glo-compose-story', h); }, [userId]);
  const groups: { uid: string; items: Story[] }[] = [];
  stories.forEach((s) => { const g = groups.find((x) => x.uid === s.user_id); if (g) g.items.push(s); else groups.push({ uid: s.user_id, items: [s] }); });
  const myGroupIdx = groups.findIndex((g) => g.uid === userId);
  const next = () => setView((v) => { if (!v) return null; const g = groups[v.g]; if (!g) return null; if (v.i + 1 < g.items.length) return { g: v.g, i: v.i + 1 }; if (v.g + 1 < groups.length) return { g: v.g + 1, i: 0 }; return null; });
  const prev = () => setView((v) => { if (!v) return null; if (v.i > 0) return { g: v.g, i: v.i - 1 }; if (v.g > 0) return { g: v.g - 1, i: groups[v.g - 1].items.length - 1 }; return null; });
  useEffect(() => { if (!view) return; const t = setTimeout(next, 5000); return () => clearTimeout(t); }, [view]);
  const share = async () => { if (!text.trim()) return; setBusy(true); const res = await createStory(text, grad); setBusy(false); if (res && res.error) { toast(res.error); return; } setCompose(false); setText(''); toast('Story added.'); window.dispatchEvent(new Event('glo-refresh')); };
  const curGroup = view ? groups[view.g] : null;
  const cur = curGroup && view ? curGroup.items[view.i] : null;
  return (
    <>
      <div className="stories">
        <button className="story" onClick={() => { if (!userId) { toast('Log in first'); return; } if (myGroupIdx >= 0) setView({ g: myGroupIdx, i: 0 }); else setCompose(true); }}>
          <span className={`story-ring ${myGroupIdx >= 0 ? (profile?.verified === 'gold' ? 'gold' : '') : 'you'}`}>
            {profile?.avatar_url ? <img src={profile.avatar_url} alt="" className="avatar avatar-img" /> : <span className={`avatar ${profile?.avatar_grad || 'av-me'}`}>{userId ? (profile?.display_name || 'A')[0] : '+'}</span>}
            {myGroupIdx < 0 && <span className="story-plus">+</span>}
          </span>
          <span className="story-name">Your story</span>
        </button>
        {groups.map((g, gi) => { if (gi === myGroupIdx) return null; const p = g.items[0].profiles; return (
          <button key={g.uid} className="story" onClick={() => setView({ g: gi, i: 0 })}>
            <span className={`story-ring ${p?.verified === 'gold' ? 'gold' : ''}`}>
              {p?.avatar_url ? <img src={p.avatar_url} alt="" className="avatar avatar-img" /> : <span className={`avatar ${p?.avatar_grad || 'av-1'}`}>{(p?.display_name || '?')[0]}</span>}
            </span>
            <span className="story-name">{p?.display_name}</span>
          </button>
        ); })}
      </div>
      {cur && view && curGroup && (
        <div id="storyViewer" className={`show ${cur.gradient || 'g1'}`}>
          <div className="sv-progress">{curGroup.items.map((_, i) => (<i key={i} className={i < view.i ? 'done' : i === view.i ? 'live' : ''} />))}</div>
          <div className="sv-head">
            {cur.profiles?.avatar_url ? <img src={cur.profiles.avatar_url} alt="" className="avatar avatar-img" /> : <div className={`avatar ${cur.profiles?.avatar_grad || 'av-1'}`}>{(cur.profiles?.display_name || '?')[0]}</div>}
            <b onClick={(e) => { e.stopPropagation(); setView(null); if (cur.profiles) openUser(cur.profiles.id, cur.profiles.username); }}>{cur.profiles?.display_name} <VerifiedBadge type={cur.profiles?.verified || null} /></b>
            <button className="icon-btn" onClick={(e) => { e.stopPropagation(); setView(null); }} aria-label="Close story"><svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="2.2"><path d="M18 6 6 18M6 6l12 12" /></svg></button>
          </div>
          <div className="sv-body">{cur.content}</div>
          <button className="sv-tap left" onClick={prev} aria-label="Previous" />
          <button className="sv-tap right" onClick={next} aria-label="Next" />
        </div>
      )}
      {compose && (
        <div className={`story-compose grad-${grad}`}>
          <div className="sc-head">
            <button className="icon-btn" onClick={() => setCompose(false)} aria-label="Close"><svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="2.2"><path d="M18 6 6 18M6 6l12 12" /></svg></button>
            <b>New story</b>
            <button className="post-btn" disabled={busy || !text.trim()} onClick={share}>{busy ? '...' : 'Share'}</button>
          </div>
          <div className="sc-body"><textarea autoFocus value={text} onChange={(e) => setText(e.target.value)} placeholder="Type something..." maxLength={120} /></div>
          <div className="sc-grads">{['g1', 'g2', 'g3', 'g4', 'g5', 'g6'].map((g) => (<button key={g} className={`grad-${g} ${grad === g ? 'sel' : ''}`} onClick={() => setGrad(g)} aria-label={g} />))}</div>
        </div>
      )}
    </>
  );
}

// ============ ACCOUNT ROW ============
function AccountRow({ acc, following: initFollowing }: { acc: Profile; following: boolean }) {
  const [f, setF] = useState(initFollowing); const toast = useToast(); const { userId } = useAuth(); const { openUser } = useNav();
  return (
    <div className="account rise">
      <button style={{ background: 'none', border: 'none', padding: 0, cursor: 'pointer' }} onClick={() => openUser(acc.id, acc.username)}>
        {acc.avatar_url ? <img src={acc.avatar_url} alt="" className={`avatar avatar-img ${acc.verified === 'gold' ? 'gold-ring' : ''}`} /> : <div className={`avatar ${acc.avatar_grad} ${acc.verified === 'gold' ? 'gold-ring' : ''}`}>{acc.display_name[0]}</div>}
      </button>
      <div className="acc-info" style={{ cursor: 'pointer' }} onClick={() => openUser(acc.id, acc.username)}>
        <div className="acc-name"><b>{acc.display_name}</b><VerifiedBadge type={acc.verified} /></div>
        <div className="acc-handle">@{acc.username}</div>
        <div className="acc-bio">{acc.bio}</div>
      </div>
      <button className={`follow-btn ${f ? 'on' : ''}`} onClick={() => { if (!userId) { toast('Log in first'); return; } setF(!f); toggleFollow(acc.id); toast(f ? `Unfollowed ${acc.display_name}.` : `Following ${acc.display_name}.`); window.dispatchEvent(new Event('glo-refresh')); }}>{f ? 'Following' : 'Follow'}</button>
    </div>
  );
}

// ============ SCREENS ============
function TabsBar() {
  const { go, feedTab, setFeedTab } = useNav();
  const idx = feedTab === 'foryou' ? 0 : feedTab === 'following' ? 1 : 2;
  return (
    <div className="tabs tri">
      <button className={`tab ${idx === 0 ? 'active' : ''}`} onClick={() => { setFeedTab('foryou'); go('home'); }}>For You</button>
      <button className={`tab ${idx === 1 ? 'active' : ''}`} onClick={() => { setFeedTab('following'); go('home'); }}>Following</button>
      <button className={`tab ${idx === 2 ? 'active' : ''}`} onClick={() => { setFeedTab('explore'); go('home'); }}>Explore</button>
      <div className="tab-line" data-idx={idx} />
    </div>
  );
}

function Home() {
  const { userId } = useAuth(); const { feedTab } = useNav();
  const [posts, setPosts] = useState<Post[]>([]);
  const [fl, setFl] = useState({ liked: [] as string[], reposted: [] as string[], bookmarked: [] as string[], following: [] as string[] });
  const [postModal, setPostModal] = useState(false);
  useEffect(() => { const h = () => setPostModal(true); window.addEventListener('glo-compose-post', h); return () => window.removeEventListener('glo-compose-post', h); }, []);
  const load = async () => {
    const { data } = await sb.from('posts').select('*,profiles:user_id(*)').is('parent_id', null).order('created_at', { ascending: false });
    if (data) setPosts(data);
    if (userId) {
      const [l, r, b, f] = await Promise.all([sb.from('likes').select('post_id').eq('user_id', userId), sb.from('reposts').select('post_id').eq('user_id', userId), sb.from('bookmarks').select('post_id').eq('user_id', userId), sb.from('follows').select('following_id').eq('follower_id', userId)]);
      setFl({ liked: (l.data || []).map((x: any) => x.post_id), reposted: (r.data || []).map((x: any) => x.post_id), bookmarked: (b.data || []).map((x: any) => x.post_id), following: (f.data || []).map((x: any) => x.following_id) });
    }
  };
  useRefresh(load);
  const list = feedTab === 'following' ? posts.filter((p) => fl.following.includes(p.user_id)) : posts;
  return (
    <>
      <TabsBar />
      <div key={feedTab} className="fade-in">
        {feedTab === 'explore' ? <Explore /> : (
          <>
            <Stories />
            {list.length === 0 ? (feedTab === 'following' ? <Empty icon={IC.users} title="Nothing from your follows yet" sub="Follow people in Explore and their posts will show up here." /> : <Empty icon={IC.pen} title="Nothing here yet" sub="It's quiet in here. Be the first to post something." />) : (<div id="feed">{list.map((p) => (<PostCard key={p.id} post={p} liked={fl.liked.includes(p.id)} reposted={fl.reposted.includes(p.id)} bookmarked={fl.bookmarked.includes(p.id)} />))}</div>)}
          </>
        )}
      </div>
      {postModal && <PostModal close={() => setPostModal(false)} />}
    </>
  );
}

function Explore() {
  const { userId } = useAuth();
  const [accs, setAccs] = useState<Profile[]>([]); const [following, setFollowing] = useState<string[]>([]); const [ready, setReady] = useState(false);
  useRefresh(async () => {
    const accRes = userId ? await sb.from('profiles').select('*').neq('id', userId).order('followers_count', { ascending: false }) : await sb.from('profiles').select('*').order('followers_count', { ascending: false });
    if (accRes.data) setAccs(accRes.data);
    if (userId) { const { data: f } = await sb.from('follows').select('following_id').eq('follower_id', userId); setFollowing((f || []).map((x: any) => x.following_id)); } else { setFollowing([]); }
    setReady(true);
  });
  const visible = accs.filter((a) => !following.includes(a.id));
  return (
    <>
      <div className="search"><input placeholder="Search people..." onInput={(e: any) => { const q = e.target.value.toLowerCase(); document.querySelectorAll('#accList .account').forEach((a: any) => { a.style.display = a.textContent.toLowerCase().includes(q) ? '' : 'none'; }); }} /></div>
      <div className="sec-label">Suggested for you</div>
      {!ready ? null : visible.length === 0 ? (<Empty icon={IC.users} title="No one to explore yet" sub="When people join Glo, they'll show up here." />) : (<div id="accList">{visible.map((a) => (<AccountRow key={a.id} acc={a} following={following.includes(a.id)} />))}</div>)}
    </>
  );
}

// ============ EDIT PROFILE ============
function EditProfile({ profile, close }: { profile: Profile; close: () => void }) {
  const toast = useToast(); const { reload } = useAuth();
  const [name, setName] = useState(profile.display_name); const [bio, setBio] = useState(profile.bio || '');
  const [avatarUrl, setAvatarUrl] = useState<string | null>(profile.avatar_url || null); const [bannerUrl, setBannerUrl] = useState<string | null>(profile.banner_url || null);
  const [busy, setBusy] = useState(false); const [cropSrc, setCropSrc] = useState<string | null>(null);
  const avatarRef = useRef<HTMLInputElement>(null); const bannerRef = useRef<HTMLInputElement>(null);
  const uploadBanner = async (file: File) => { const url = await uploadMedia(file); if (!url) { toast('Upload failed.'); return; } setBannerUrl(url); toast('Banner updated.'); };
  const onAvatarFile = (f: File) => { const reader = new FileReader(); reader.onload = () => setCropSrc(String(reader.result)); reader.readAsDataURL(f); };
  const onCropDone = async (file: File) => { setCropSrc(null); const url = await uploadMedia(file); if (!url) { toast('Upload failed.'); return; } setAvatarUrl(url); toast('Profile photo updated.'); };
  const save = async () => { if (!name.trim()) { toast('Name cannot be empty.'); return; } setBusy(true); const updates: any = { display_name: name.trim(), bio: bio.trim() }; if (avatarUrl) updates.avatar_url = avatarUrl; if (bannerUrl) updates.banner_url = bannerUrl; const res = await updateProfile(updates); setBusy(false); if (res?.error) { toast(res.error); return; } toast('Profile saved.'); window.dispatchEvent(new Event('glo-refresh')); reload(); setTimeout(() => close(), 650); };
  return (
    <div className="edit-profile">
      <div className="edit-profile-head">
        <button className="icon-btn" onClick={close} aria-label="Close"><svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M18 6 6 18M6 6l12 12" /></svg></button>
        <b>Edit profile</b>
        <button className="post-btn" disabled={busy || !name.trim()} onClick={save}>{busy ? 'Saving...' : 'Save'}</button>
      </div>
      <div className="edit-profile-body">
        <div className="banner-edit">
          {bannerUrl ? <img src={bannerUrl} alt="Banner" /> : null}
          <button className="icon-btn" onClick={() => bannerRef.current?.click()} aria-label="Change banner"><svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="2"><rect x="3" y="3" width="18" height="18" rx="3" /><circle cx="9" cy="9" r="2" /><path d="m21 15-4.5-4.5L6 21" /></svg></button>
          <input ref={bannerRef} type="file" accept="image/*" hidden onChange={(e) => { const f = e.target.files?.[0]; if (f) uploadBanner(f); e.target.value = ''; }} />
        </div>
        <div className="avatar-edit-row">
          <div className="avatar-edit">
            {avatarUrl ? <img src={avatarUrl} alt="Avatar" className="avatar avatar-img" /> : <div className={`avatar ${profile.avatar_grad}`}>{(name || 'A')[0]}</div>}
            <button className="icon-btn" onClick={() => avatarRef.current?.click()} aria-label="Change profile photo"><svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="2"><rect x="3" y="3" width="18" height="18" rx="3" /><circle cx="9" cy="9" r="2" /><path d="m21 15-4.5-4.5L6 21" /></svg></button>
            <input ref={avatarRef} type="file" accept="image/*" hidden onChange={(e) => { const f = e.target.files?.[0]; if (f) onAvatarFile(f); e.target.value = ''; }} />
          </div>
          <div><b>{name}</b><div style={{ color: 'var(--dim)', fontSize: 13.5 }}>@{profile.username}</div></div>
        </div>
        <input className="edit-in" value={name} onChange={(e) => setName(e.target.value)} placeholder="Display name" />
        <textarea className="edit-in" rows={4} value={bio} onChange={(e) => setBio(e.target.value)} placeholder="Bio" />
      </div>
      {cropSrc && <AvatarCrop src={cropSrc} onDone={onCropDone} close={() => setCropSrc(null)} />}
    </div>
  );
}

function FollowListDrawer({ id, type, open, onClose }: { id: string; type: 'following' | 'followers'; open: boolean; onClose: () => void }) {
  const [rows, setRows] = useState<Profile[]>([]); const { openUser } = useNav();
  useEffect(() => {
    if (!open) return;
    (async () => {
      if (type === 'following') { const { data } = await sb.from('follows').select('following_id').eq('follower_id', id); const ids = (data || []).map((x: any) => x.following_id); if (ids.length) { const { data: ps } = await sb.from('profiles').select('*').in('id', ids); setRows(ps || []); } else setRows([]); }
      else { const { data } = await sb.from('follows').select('follower_id').eq('following_id', id); const ids = (data || []).map((x: any) => x.follower_id); if (ids.length) { const { data: ps } = await sb.from('profiles').select('*').in('id', ids); setRows(ps || []); } else setRows([]); }
    })();
  }, [id, type, open]);
  return (
    <aside id="listDrawer" className={open ? 'open' : ''}>
      <div className="list-drawer-head"><b>{type === 'following' ? 'Following' : 'Followers'}</b><button className="icon-btn" onClick={onClose} aria-label="Close"><svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M18 6 6 18M6 6l12 12" /></svg></button></div>
      <div className="list-drawer-body">
        {rows.length === 0 ? <div className="empty">Nothing here yet.</div> : rows.map((r) => (
          <button key={r.id} className="account" style={{ width: '100%', textAlign: 'left' }} onClick={() => { onClose(); openUser(r.id, r.username); }}>
            {r.avatar_url ? <img src={r.avatar_url} alt="" className="avatar avatar-img" /> : <div className={`avatar ${r.avatar_grad}`}>{r.display_name[0]}</div>}
            <div className="acc-info"><div className="acc-name"><b>{r.display_name}</b><VerifiedBadge type={r.verified} /></div><div className="acc-handle">@{r.username}</div></div>
          </button>
        ))}
      </div>
    </aside>
  );
}

function ProfileScreen() {
  const { userId, profile, reload } = useAuth(); const toast = useToast();
  const [tab, setTab] = useState('posts'); const [edit, setEdit] = useState(false);
  const [listType, setListType] = useState<null | 'following' | 'followers'>(null);
  const [me, setMe] = useState<Profile | null>(profile);
  const [followCounts, setFollowCounts] = useState({ following: 0, followers: 0 });
  const [data, setData] = useState({ posts: [] as Post[], replies: [] as Post[], reposts: [] as Post[], likes: [] as Post[], rpIds: [] as string[], lkIds: [] as string[], bmIds: [] as string[] });
  useEffect(() => { if (!userId) return; const load = async () => { const { data: d } = await sb.from('profiles').select('*').eq('id', userId).single(); if (d) setMe(d); }; load(); window.addEventListener('glo-refresh', load); return () => window.removeEventListener('glo-refresh', load); }, [userId, profile]);
  useRefresh(async () => {
    if (!userId) return;
    const [p, r, rp, lk, bm, followingRes, followersRes] = await Promise.all([sb.from('posts').select('*,profiles:user_id(*)').eq('user_id', userId).is('parent_id', null).order('created_at', { ascending: false }), sb.from('posts').select('*,profiles:user_id(*)').eq('user_id', userId).not('parent_id', 'is', null).order('created_at', { ascending: false }), sb.from('reposts').select('post_id').eq('user_id', userId), sb.from('likes').select('post_id').eq('user_id', userId), sb.from('bookmarks').select('post_id').eq('user_id', userId), sb.from('follows').select('*', { count: 'exact', head: true }).eq('follower_id', userId), sb.from('follows').select('*', { count: 'exact', head: true }).eq('following_id', userId)]);
    setFollowCounts({ following: followingRes.count ?? 0, followers: followersRes.count ?? 0 });
    const rpIds = (rp.data || []).map((x: any) => x.post_id); const lkIds = (lk.data || []).map((x: any) => x.post_id); const bmIds = (bm.data || []).map((x: any) => x.post_id);
    let reposts: Post[] = []; let likes: Post[] = [];
    if (rpIds.length) { const q = await sb.from('posts').select('*,profiles:user_id(*)').in('id', rpIds); reposts = q.data || []; }
    if (lkIds.length) { const q = await sb.from('posts').select('*,profiles:user_id(*)').in('id', lkIds); likes = q.data || []; }
    setData({ posts: p.data || [], replies: r.data || [], reposts, likes, rpIds, lkIds, bmIds });
  });
  if (!userId) return <Empty icon={IC.lock} title="This part needs an account" sub="Log in or sign up to join the fun." />;
  if (!me) return null;
  const joined = new Date(me.created_at).toLocaleDateString('en-US', { month: 'long', year: 'numeric' });
  const list = tab === 'posts' ? data.posts : tab === 'replies' ? data.replies : tab === 'reposts' ? data.reposts : data.likes;
  const E: Record<string, [string, string]> = { posts: ['No posts yet', "When you post, it'll show up here."], replies: ['Nothing to see here — yet.', 'Replies will show up here.'], reposts: ['Nothing to see here — yet.', 'Reposts will show up here.'], likes: ['Nothing to see here — yet.', 'Posts you like will show up here.'] };
  return (
    <>
      <div className="cover">{me.banner_url ? <img src={me.banner_url} alt="Banner" className="cover-img" /> : null}</div>
      <div className="profile-head">
        <div className="profile-top">
          {me.avatar_url ? <img src={me.avatar_url} alt="Avatar" className="avatar avatar-img" /> : <div className={`avatar ${me.avatar_grad}`}>{me.display_name[0]}</div>}
          <div className="profile-actions">
            <button className="pbtn" onClick={() => { navigator.clipboard?.writeText(window.location.href); toast('Link copied.'); }}>Share</button>
            <button className="pbtn" onClick={() => setEdit(true)}>Edit profile</button>
          </div>
        </div>
        <h2>{me.display_name} <VerifiedBadge type={me.verified} /></h2>
        <div className="handle">@{me.username}</div>
        {me.bio ? <p className="bio">{me.bio}</p> : <p className="bio add-bio" onClick={() => setEdit(true)}>Add bio</p>}
        <div className="p-meta">
          <span>Joined {joined}</span>
          <button onClick={() => setListType('following')}><b>{followCounts.following}</b> Following</button>
          <button onClick={() => setListType('followers')}><b>{followCounts.followers}</b> Followers</button>
        </div>
      </div>
      <div className="ptabs">{(['posts', 'replies', 'reposts', 'likes'] as const).map((t) => (<button key={t} className={`ptab ${tab === t ? 'active' : ''}`} onClick={() => setTab(t)}>{t[0].toUpperCase() + t.slice(1)}</button>))}</div>
      {list.length === 0 ? <div className="pempty fade-in" key={tab}><h3>{E[tab][0]}</h3><p>{E[tab][1]}</p></div> : <div id="feed" className="fade-in" key={tab}>{list.map((p) => (<PostCard key={p.id} post={p} liked={data.lkIds.includes(p.id)} reposted={data.rpIds.includes(p.id)} bookmarked={data.bmIds.includes(p.id)} />))}</div>}
      {edit && <EditProfile profile={me} close={() => setEdit(false)} />}
      <FollowListDrawer id={userId} type={listType || 'following'} open={!!listType} onClose={() => setListType(null)} />
    </>
  );
}

function MessageModal({ targetUserId, targetName, close }: { targetUserId: string; targetName: string; close: () => void }) {
  const toast = useToast(); const { openChat } = useNav();
  const [text, setText] = useState(''); const [busy, setBusy] = useState(false);
  const send = async () => { if (!text.trim()) return; setBusy(true); const res = await sendMessage(targetUserId, text.trim()); setBusy(false); if (res.error) { toast('Failed to send message.'); } else { toast('Message sent!'); setText(''); close(); openChat(targetUserId, targetName); window.dispatchEvent(new Event('glo-refresh')); } };
  return (
    <div className="post-modal">
      <div className="post-modal-head">
        <button className="icon-btn" onClick={close} aria-label="Close"><svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M18 6 6 18M6 6l12 12" /></svg></button>
        <b>Message {targetName}</b>
        <button className="post-btn" disabled={busy || !text.trim()} onClick={send}>{busy ? 'Sending...' : 'Send'}</button>
      </div>
      <div className="post-modal-body"><textarea autoFocus value={text} onChange={(e) => setText(e.target.value)} placeholder="Type a message..." style={{ minHeight: 150 }} /></div>
    </div>
  );
}

function UserScreen() {
  const { viewId, openUser, setViewFollowing } = useNav();
  const { userId } = useAuth(); const toast = useToast();
  const [user, setUser] = useState<Profile | null>(null);
  const [following, setFollowing] = useState(false); const [followsMe, setFollowsMe] = useState(false);
  const [followCounts, setFollowCounts] = useState({ following: 0, followers: 0 });
  const [tab, setTab] = useState('posts'); const [msgOpen, setMsgOpen] = useState(false);
  const [listType, setListType] = useState<null | 'following' | 'followers'>(null);
  const [data, setData] = useState({ posts: [] as Post[], reposts: [] as Post[], rpIds: [] as string[] });
  const [tick, setTick] = useState(0);
  useEffect(() => { const h = () => setTick((t) => t + 1); window.addEventListener('glo-refresh', h); return () => window.removeEventListener('glo-refresh', h); }, []);
  useEffect(() => { setViewFollowing(following); }, [following, setViewFollowing]);
  useEffect(() => {
    if (!viewId) return;
    (async () => {
      const { data: u } = await sb.from('profiles').select('*').eq('id', viewId).single(); if (u) setUser(u);
      const { data: f } = await sb.from('follows').select('*').eq('follower_id', userId || '').eq('following_id', viewId).maybeSingle(); setFollowing(!!f);
      const { data: fm } = await sb.from('follows').select('*').eq('follower_id', viewId).eq('following_id', userId || '').maybeSingle(); setFollowsMe(!!fm);
      const { count: followingCount } = await sb.from('follows').select('*', { count: 'exact', head: true }).eq('follower_id', viewId);
      const { count: followersCount } = await sb.from('follows').select('*', { count: 'exact', head: true }).eq('following_id', viewId);
      setFollowCounts({ following: followingCount ?? (u?.following_count ?? 0), followers: followersCount ?? (u?.followers_count ?? 0) });
      const { data: p } = await sb.from('posts').select('*,profiles:user_id(*)').eq('user_id', viewId).is('parent_id', null).order('created_at', { ascending: false }); if (p) setData((d) => ({ ...d, posts: p }));
      const { data: rp } = await sb.from('reposts').select('post_id').eq('user_id', viewId); const rpIds = (rp || []).map((x: any) => x.post_id);
      if (rpIds.length) { const { data: rpPosts } = await sb.from('posts').select('*,profiles:user_id(*)').in('id', rpIds); setData((d) => ({ ...d, reposts: rpPosts || [], rpIds })); }
    })();
  }, [viewId, userId, tick]);
  useEffect(() => {
    const h = async (e: Event) => { if ((e as CustomEvent).detail === viewId && viewId) { await toggleFollow(viewId); setFollowing(false); setViewFollowing(false); toast('Unfollowed.'); window.dispatchEvent(new Event('glo-refresh')); } };
    window.addEventListener('glo-unfollow', h);
    return () => window.removeEventListener('glo-unfollow', h);
  }, [viewId, toast, setViewFollowing]);
  if (!user || !viewId) return null;
  const handleFollow = async () => { if (!userId || !viewId) { if (!userId) toast('Log in to follow.'); return; } await toggleFollow(viewId); setFollowing(!following); toast(following ? `Unfollowed ${user.display_name}.` : `Following ${user.display_name}.`); window.dispatchEvent(new Event('glo-refresh')); };
  const joined = new Date(user.created_at).toLocaleDateString('en-US', { month: 'long', year: 'numeric' });
  const list = tab === 'posts' ? data.posts : data.reposts;
  return (
    <>
      <div className="cover">{user.banner_url ? <img src={user.banner_url} alt="Banner" className="cover-img" /> : null}</div>
      <div className="profile-head">
        <div className="profile-top">
          {user.avatar_url ? <img src={user.avatar_url} alt="Avatar" className="avatar avatar-img" /> : <div className={`avatar ${user.avatar_grad}`}>{user.display_name[0]}</div>}
          <div className="profile-actions">
            <button className="pbtn" onClick={() => { navigator.clipboard?.writeText(window.location.href); toast('Link copied.'); }}>Share</button>
            {userId && userId !== viewId && (
              <button className={`pbtn ${following ? 'on' : ''}`} onClick={() => { if (following) { setMsgOpen(true); } else { handleFollow(); } }}>
                {following ? 'Message' : (followsMe ? 'Follow back' : 'Follow')}
              </button>
            )}
          </div>
        </div>
        <h2>{user.display_name} <VerifiedBadge type={user.verified} /></h2>
        <div className="handle">@{user.username}</div>
        {user.bio ? <p className="bio">{user.bio}</p> : <p className="bio">No bio yet.</p>}
        <div className="p-meta">
          <span>Joined {joined}</span>
          <button onClick={() => setListType('following')}><b>{followCounts.following}</b> Following</button>
          <button onClick={() => setListType('followers')}><b>{followCounts.followers}</b> Followers</button>
        </div>
      </div>
      <div className="ptabs">
        <button className={`ptab ${tab === 'posts' ? 'active' : ''}`} onClick={() => setTab('posts')}>Posts</button>
        <button className={`ptab ${tab === 'reposts' ? 'active' : ''}`} onClick={() => setTab('reposts')}>Reposts</button>
      </div>
      {list.length === 0 ? <div className="pempty"><h3>No {tab} yet</h3><p>When they {tab === 'posts' ? 'post' : 'repost'}, it'll show up here.</p></div> : <div id="feed">{list.map((p) => (<PostCard key={p.id} post={p} liked={false} reposted={false} bookmarked={false} />))}</div>}
      {msgOpen && user && <MessageModal targetUserId={viewId} targetName={user.display_name} close={() => setMsgOpen(false)} />}
      <FollowListDrawer id={viewId} type={listType || 'following'} open={!!listType} onClose={() => setListType(null)} />
    </>
  );
}

function QuixPage() {
  useEffect(() => { window.open('https://chat-quix.vercel.app', '_blank', 'noopener,noreferrer'); }, []);
  return null;
}

function Messages() {
  const { userId } = useAuth(); const { chatId, openChat } = useNav(); const toast = useToast();
  const [m, setM] = useState<any[]>([]); const [chatMsgs, setChatMsgs] = useState<any[]>([]);
  const [chatInput, setChatInput] = useState(''); const [busy, setBusy] = useState(false);
  const fetchMessages = async () => {
    if (!userId) return;
    if (chatId) {
      const { data: sent } = await sb.from('messages').select('*,recipient:profiles!messages_recipient_id_fkey(*)').eq('sender_id', userId).eq('recipient_id', chatId);
      const { data: recv } = await sb.from('messages').select('*,sender:profiles!messages_sender_id_fkey(*)').eq('sender_id', chatId).eq('recipient_id', userId);
      setChatMsgs([...(sent || []), ...(recv || [])].sort((a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime()));
    } else {
      const { data: recv } = await sb.from('messages').select('*,sender:profiles!messages_sender_id_fkey(*)').eq('recipient_id', userId);
      const { data: sent } = await sb.from('messages').select('*,recipient:profiles!messages_recipient_id_fkey(*)').eq('sender_id', userId);
      setM([...(recv || []), ...(sent || [])].sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime()));
    }
  };
  useEffect(() => { fetchMessages(); const h = () => fetchMessages(); window.addEventListener('glo-refresh', h); return () => window.removeEventListener('glo-refresh', h); }, [chatId, userId]);
  if (!userId) return <Empty icon={IC.lock} title="This part needs an account" sub="Log in or sign up to join the fun." />;
  if (chatId) {
    const sendMsg = async () => { if (!chatInput.trim()) return; setBusy(true); const res = await sendMessage(chatId, chatInput.trim()); setBusy(false); if (res.error) { toast('Failed to send.'); } else { setChatInput(''); window.dispatchEvent(new Event('glo-refresh')); } };
    return (
      <div className="chat-page">
        <div className="chat-body">
          {chatMsgs.length === 0 ? <div className="empty">No messages yet. Say hi!</div> : chatMsgs.map((c) => (<div key={c.id} className={`chat-bubble ${c.sender_id === userId ? 'mine' : 'theirs'}`}>{c.content}</div>))}
        </div>
        <div className="chat-input-row">
          <input value={chatInput} onChange={(e) => setChatInput(e.target.value)} placeholder="Message..." onKeyDown={(e) => e.key === 'Enter' && sendMsg()} />
          <button className="post-btn" disabled={busy || !chatInput.trim()} onClick={sendMsg}>Send</button>
        </div>
      </div>
    );
  }
  const threads: any[] = [];
  m.forEach((x) => {
    const otherId = x.sender_id === userId ? x.recipient_id : x.sender_id;
    const other = x.sender_id === userId ? x.recipient : x.sender;
    const t = threads.find((th) => th.otherId === otherId);
    if (t) { if (x.recipient_id === userId && !x.read) t.unread = true; } else { threads.push({ otherId, other, latest: x, unread: x.recipient_id === userId && !x.read }); }
  });
  return threads.length === 0 ? <Empty icon={IC.mail} title="No messages" sub="Say hi to someone. It's free." /> : <>{threads.map((t) => (
    <div key={t.otherId} className={`msg rise ${t.unread ? 'unread' : ''}`} onClick={() => openChat(t.otherId, t.other?.display_name || '')} style={{ cursor: 'pointer' }}>
      {t.other?.avatar_url ? <img src={t.other.avatar_url} alt="" className="avatar avatar-img" /> : <div className={`avatar ${t.other?.avatar_grad || 'av-1'}`}>{(t.other?.display_name || '?')[0]}</div>}
      <div className="msg-info"><div className="msg-top"><b>{t.other?.display_name}</b><time>{timeAgo(t.latest.created_at)}</time></div><p>{t.latest.sender_id === userId ? `You: ${t.latest.content}` : t.latest.content}</p></div>
      {t.unread && <span className="dot" />}
    </div>
  ))}</>;
}

function Bookmarks() {
  const { userId } = useAuth(); const [posts, setPosts] = useState<Post[]>([]);
  useRefresh(async () => {
    if (!userId) return;
    const { data } = await sb.from('bookmarks').select('post_id').eq('user_id', userId); const ids = (data || []).map((x: any) => x.post_id);
    if (!ids.length) { setPosts([]); return; }
    const { data: p } = await sb.from('posts').select('*,profiles:user_id(*)').in('id', ids); if (p) setPosts(p);
  });
  if (!userId) return <Empty icon={IC.lock} title="This part needs an account" sub="Log in or sign up to join the fun." />;
  return posts.length === 0 ? <Empty icon={IC.bm} title="No bookmarks yet" sub="Save posts and find them here later." /> : <div id="feed">{posts.map((p) => (<PostCard key={p.id} post={p} liked={false} reposted={false} bookmarked />))}</div>;
}

function Settings() {
  const { userId, profile } = useAuth();
  if (!userId) return <Empty icon={IC.lock} title="This part needs an account" sub="Log in or sign up to join the fun." />;
  return (
    <>
      <div className="sec-label">Account</div>
      <div className="set-card">
        <div className="set-row"><svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="8" r="4" /><path d="M4 21c0-4 3.6-6 8-6s8 2 8 6" /></svg>{profile?.username}</div>
        <button className="set-row" style={{ borderBottom: 'none', color: '#f4212e' }} onClick={signOut}>Log out</button>
      </div>
      <div className="set-foot">Glo © 2026 · From Verve</div>
    </>
  );
}

function AuthScreen({ mode }: { mode: 'login' | 'signup' }) {
  const toast = useToast();
  const [email, setEmail] = useState(''); const [password, setPassword] = useState(''); const [username, setUsername] = useState(''); const [busy, setBusy] = useState(false);
  const submit = async () => { if (!email || !password || (mode === 'signup' && !username)) { toast('Fill all fields.'); return; } setBusy(true); const res = mode === 'signup' ? await signUp(email, password, username) : await signIn(email, password); setBusy(false); if (res.error) { toast(res.error); return; } window.location.href = window.location.pathname; };
  return (
    <div className="auth-wrap">
      <button className="icon-btn" style={{ position: 'fixed', top: 16, left: 16, zIndex: 1000 }} onClick={() => { window.location.href = window.location.pathname; }} aria-label="Back"><svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M19 12H5M12 19l-7-7 7-7" /></svg></button>
      <div className="auth-card">
        <h2 style={{ fontSize: 24 }}>{mode === 'signup' ? 'Create account' : 'Log in'}</h2>
        <div className="auth-form">
          {mode === 'signup' && <input placeholder="Username" value={username} onChange={(e) => setUsername(e.target.value)} />}
          <input type="email" placeholder="Email" value={email} onChange={(e) => setEmail(e.target.value)} />
          <input type="password" placeholder="Password" value={password} onChange={(e) => setPassword(e.target.value)} />
          <button className="post-btn" disabled={busy} onClick={submit} style={{ width: '100%', padding: 14 }}>{busy ? '...' : mode === 'signup' ? 'Sign up' : 'Log in'}</button>
        </div>
        <button className="auth-link" onClick={() => window.location.href = mode === 'signup' ? '/?mode=login' : '/?mode=signup'}>{mode === 'signup' ? 'Already have an account? Log in' : "Don't have an account? Sign up"}</button>
      </div>
    </div>
  );
}

// ============ SHELL (LAYOUT) ============
function Shell({ children }: { children: ReactNode }) {
  const [open, setOpen] = useState(false); const [notifOpen, setNotifOpen] = useState(false); const [fabOpen, setFabOpen] = useState(false);
  const { screen, go, viewId, viewUsername, chatId, chatName, closeChat, viewFollowing, openUser } = useNav();
  const { userId, profile } = useAuth();
  const [me, setMe] = useState(profile); const [userMenuOpen, setUserMenuOpen] = useState(false);
  useEffect(() => { if (!userId) { setMe(profile); return; } const load = async () => { const { data } = await sb.from('profiles').select('*').eq('id', userId).single(); if (data) setMe(data); }; load(); window.addEventListener('glo-refresh', load); return () => window.removeEventListener('glo-refresh', load); }, [userId, profile]);
  const [notifs, setNotifs] = useState<Notif[]>([]); const unread = notifs.filter((n) => !n.read).length;
  useEffect(() => { if (!userId) { setNotifs([]); return; } const load = async () => { const list = await fetchNotifications(); setNotifs(list); }; load(); const t = setInterval(load, 20000); window.addEventListener('glo-refresh', load); return () => { clearInterval(t); window.removeEventListener('glo-refresh', load); }; }, [userId]);
  const notifIcon = (t: string) => t === 'like' ? <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M19 14c1.5-1.5 3-3.2 3-5.5A5.5 5.5 0 0 0 16.5 3c-1.8 0-3.4 1-4.5 2.5C10.9 4 9.3 3 7.5 3A5.5 5.5 0 0 0 2 8.5c0 2.3 1.5 4 3 5.5l7 7z" /></svg> : t === 'repost' ? <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="m17 2 4 4-4 4" /><path d="M3 11v-1a4 4 0 0 1 4-4h14" /><path d="m7 22-4-4 4-4" /><path d="M21 13v1a4 4 0 0 1-4 4H3" /></svg> : t === 'reply' ? <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M21 11.5a8.4 8.4 0 0 1-9 8.4 8.6 8.6 0 0 1-3.8-.9L3 21l2-4.9a8.4 8.4 0 1 1 16-4.6z" /></svg> : t === 'follow' ? IC.users : IC.pen;
  const notifColor = (t: string) => t === 'like' ? 'pink' : t === 'repost' ? 'green' : t === 'post' ? 'gold' : '';
  const notifLabel = (t: string) => t === 'like' ? 'liked your post' : t === 'repost' ? 'reposted your post' : t === 'reply' ? 'replied to your post' : t === 'follow' ? 'followed you' : 'shared a new post';
  const openNotif = (n: Notif) => { if (!n.read) { setNotifs((cur) => cur.map((x) => x.id === n.id ? { ...x, read: true } : x)); markNotifRead(n.id); } setNotifOpen(false); if (n.actor) openUser(n.actor.id, n.actor.username); };
  const T: Record<string, string> = { home: 'Glo', explore: 'Explore', profile: 'Profile', user: viewUsername || 'Profile', notifications: 'Notifications', messages: 'Messages', bookmarks: 'Bookmarks', settings: 'Settings', quix: 'Quix chat' };
  const nav = (s: string) => { if (s === 'quix') { window.open('https://chat-quix.vercel.app', '_blank', 'noopener,noreferrer'); setOpen(false); return; } if (['messages', 'bookmarks', 'settings', 'profile'].includes(s) && !userId) { window.location.href = '/?mode=login'; return; } go(s); setOpen(false); };
  const handleCreate = (type: 'post' | 'story') => { setFabOpen(false); if (!userId) { window.location.href = '/?mode=login'; return; } window.dispatchEvent(new Event(type === 'post' ? 'glo-compose-post' : 'glo-compose-story')); };
  const I = (d: string) => <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d={d} /></svg>;
  const GEAR = <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M12.22 2h-.44a2 2 0 0 0-2 2v.18a2 2 0 0 1-1 1.73l-.43.25a2 2 0 0 1-2 0l-.15-.08a2 2 0 0 0-2.73.73l-.22.38a2 2 0 0 0 .73 2.73l.15.1a2 2 0 0 1 1 1.72v.51a2 2 0 0 1-1 1.74l-.15.09a2 2 0 0 0-.73 2.73l.22.38a2 2 0 0 0 2.73.73l.15-.08a2 2 0 0 1 2 0l.43.25a2 2 0 0 1 1 1.73V20a2 2 0 0 0 2 2h.44a2 2 0 0 0 2-2v-.18a2 2 0 0 1 1-1.73l.43-.25a2 2 0 0 1 2 0l.15.08a2 2 0 0 0 2.73-.73l.22-.39a2 2 0 0 0-.73-2.73l-.15-.08a2 2 0 0 1-1-1.74v-.5a2 2 0 0 1 1-1.74l.15-.09a2 2 0 0 0 .73-2.73l-.22-.38a2 2 0 0 0-2.73-.73l-.15.08a2 2 0 0 1-2 0l-.43-.25a2 2 0 0 1-1-1.73V4a2 2 0 0 0-2-2z" /><circle cx="12" cy="12" r="3" /></svg>;
  const item = (s: string, label: string, icon: ReactNode) => <button className={`nav-item ${screen === s ? 'active' : ''}`} onClick={() => nav(s)}>{icon}{label}</button>;
  const isHome = screen === 'home'; const isUser = screen === 'user'; const isChat = screen === 'messages' && !!chatId;
  return (
    <>
      <div id="backdrop" className={open || notifOpen ? 'show' : ''} onClick={() => { setOpen(false); setNotifOpen(false); setUserMenuOpen(false); }} />
      <nav id="drawer" className={open ? 'open' : ''}>
        <div className="drawer-head">
          {me?.avatar_url ? <img src={me.avatar_url} alt="" className="avatar avatar-img" /> : <div className={`avatar ${me?.avatar_grad || 'av-me'}`}>{userId ? (me?.display_name || 'A')[0] : '?'}</div>}
          {userId && me ? (
            <div className="drawer-id">
              <div className="drawer-id-left"><b>{me.display_name} <VerifiedBadge type={me.verified} /></b><span className="handle">@{me.username}</span></div>
              <div className="drawer-stats"><div><b>{me.following_count ?? 0}</b><span>Following</span></div><div><b>{me.followers_count ?? 0}</b><span>Followers</span></div></div>
            </div>
          ) : (
            <div className="drawer-id">
              <div className="drawer-id-left"><b>Guest</b><span className="handle">lurking mode</span></div>
              <div style={{ display: 'flex', gap: 8 }}>
                <button className="follow-btn on" onClick={() => window.location.href = '/?mode=login'}>Log in</button>
                <button className="follow-btn" onClick={() => window.location.href = '/?mode=signup'}>Sign up</button>
              </div>
            </div>
          )}
        </div>
        <div className="nav">
          {item('home', 'Home', I('m3 10 9-7 9 7v10a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z'))}
          {item('profile', 'Profile', <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="8" r="4" /><path d="M4 21c0-4 3.6-6 8-6s8 2 8 6" /></svg>)}
          {item('messages', 'Messages', <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect x="3" y="5" width="18" height="14" rx="2" /><path d="m3 7 9 6 9-6" /></svg>)}
          {item('bookmarks', 'Bookmarks', I('M19 21l-7-5-7 5V5a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2z'))}
          {item('quix', 'Quix chat', <img src="/quix.png" alt="" className="q-img" />)}
          {item('settings', 'Settings', GEAR)}
        </div>
        <div className="drawer-foot">Glo © 2026</div>
      </nav>
      <div className="wrap">
        <header>
          {(isUser || isChat) ? <button className="icon-btn" onClick={() => { if (isChat) { closeChat(); } else { go('home'); } }} aria-label="Back"><svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M19 12H5M12 19l-7-7 7-7" /></svg></button> : <button className={`icon-btn burger ${open ? 'open' : ''}`} onClick={() => setOpen(!open)} aria-label="Menu"><span /><span /><span /></button>}
          <div className={isHome ? 'wordmark' : 'page-title'} style={{ flex: 1, textAlign: 'center', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{isHome ? <>Glo<i>.</i></> : isChat ? chatName : T[screen]}</div>
          {isHome && <div style={{ position: 'relative' }}><button className="icon-btn" onClick={() => { if (!userId) { window.location.href = '/?mode=login'; return; } setOpen(false); setNotifOpen(!notifOpen); }} aria-label="Notifications"><svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M18 8a6 6 0 0 0-12 0c0 7-3 8-3 8h18s-3-1-3-8" /><path d="M13.7 21a2 2 0 0 1-3.4 0" /></svg></button>{unread > 0 && <span className="notif-dot">{unread > 9 ? '9+' : unread}</span>}</div>}
          {isUser && userId && viewFollowing && (
            <div style={{ position: 'relative' }}>
              <button className="icon-btn" onClick={() => setUserMenuOpen(!userMenuOpen)} aria-label="Menu"><svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="5" r="1" /><circle cx="12" cy="12" r="1" /><circle cx="12" cy="19" r="1" /></svg></button>
              {userMenuOpen && <div className="user-menu"><button className="danger" onClick={() => { setUserMenuOpen(false); window.dispatchEvent(new CustomEvent('glo-unfollow', { detail: viewId })); }}>Unfollow</button></div>}
            </div>
          )}
        </header>
        {children}
      </div>
      {isHome && (
        <div className="fab-container">
          <div className={`fab-menu ${fabOpen ? 'open' : ''}`}>
            <button className="fab-option" onClick={() => handleCreate('post')}><svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M12 20h9" /><path d="M16.5 3.5a2.1 2.1 0 0 1 3 3L7 19l-4 1 1-4z" /></svg>Post</button>
            <button className="fab-option" onClick={() => handleCreate('story')}><svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="12" r="10" /><path d="m16 12-4-4-4 4M12 16V8" /></svg>Story</button>
          </div>
          <button className={`fab ${fabOpen ? 'open' : ''}`} onClick={() => setFabOpen(!fabOpen)} aria-label="Create"><svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="2.4"><path d="M12 5v14M5 12h14" /></svg></button>
        </div>
      )}
      <aside id="notifDrawer" className={notifOpen ? 'open' : ''}>
        <div className="notif-drawer-head">
          <b>Notifications</b>
          <button className="icon-btn" onClick={() => setNotifOpen(false)} aria-label="Close notifications"><svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M18 6 6 18M6 6l12 12" /></svg></button>
        </div>
        <div className="notif-drawer-body">{notifs.length === 0 ? <Empty icon={IC.mail} title="No notifications yet" sub="When someone interacts with you, it'll show up here." /> : notifs.map((n) => (<div key={n.id} className={`notif ${n.read ? '' : 'unread'}`} onClick={() => openNotif(n)}><div className={`notif-icon ${notifColor(n.type)}`}>{notifIcon(n.type)}</div><div className="notif-info"><b>{n.actor?.display_name || 'Someone'}</b><p>{notifLabel(n.type)}</p><time>{timeAgo(n.created_at)}</time></div></div>))}</div>
      </aside>
    </>
  );
}

// ============ MAIN APP ============
export default function App() {
  const [userId, setUserId] = useState<string | null>(null); const [profile, setProfile] = useState<Profile | null>(null);
  const [loading, setLoading] = useState(true); const [toastMsg, setToastMsg] = useState<string | null>(null);
  const [screen, setScreen] = useState('home'); const [feedTab, setFeedTab] = useState('foryou');
  const [viewId, setViewId] = useState<string | null>(null); const [viewUsername, setViewUsername] = useState('');
  const [chatId, setChatId] = useState<string | null>(null); const [chatName, setChatName] = useState('');
  const [viewFollowing, setViewFollowing] = useState(false);
  const loadUser = async () => {
    const started = Date.now();
    const { data: { user } } = await sb.auth.getUser();
    setUserId(user?.id || null);
    if (user) { const { data } = await sb.from('profiles').select('*').eq('id', user.id).single(); setProfile(data); } else { setProfile(null); }
    const remain = Math.max(0, 3000 - (Date.now() - started));
    setTimeout(() => setLoading(false), remain);
  };
  useEffect(() => { loadUser(); const { data: { subscription } } = sb.auth.onAuthStateChange(() => loadUser()); return () => subscription.unsubscribe(); }, []);
  const toast = useCallback((m: string) => { setToastMsg(m); setTimeout(() => setToastMsg(null), 4000); }, []);
  const go = useCallback((s: string) => { setScreen(s); if (s !== 'user') { setViewId(null); setViewUsername(''); setViewFollowing(false); } }, []);
  const openUser = useCallback((id: string, username: string) => { setViewId(id); setViewUsername(username); setViewFollowing(false); setScreen('user'); }, []);
  const openChat = useCallback((id: string, name: string) => { setChatId(id); setChatName(name); setScreen('messages'); }, []);
  const closeChat = useCallback(() => { setChatId(null); setChatName(''); }, []);
  const urlParams = new URLSearchParams(window.location.search);
  const authMode = urlParams.get('mode');
  if (authMode === 'login' || authMode === 'signup') {
    return (<ToastCtx.Provider value={toast}><RippleFx />{toastMsg && <div id="toast" className="show">{toastMsg}</div>}<AuthScreen mode={authMode} /></ToastCtx.Provider>);
  }
  if (loading) { return (<div id="loader"><div className="loader-logo">Glo</div><div className="from-verve">From<br />Verve</div></div>); }
  return (
    <AuthCtx.Provider value={{ userId, profile, reload: loadUser }}>
      <ToastCtx.Provider value={toast}>
        <NavCtx.Provider value={{ screen, go, feedTab, setFeedTab, viewId, viewUsername, openUser, chatId, chatName, openChat, closeChat, viewFollowing, setViewFollowing }}>
          <RippleFx />
          {toastMsg && <div id="toast" className="show">{toastMsg}</div>}
          <Shell>
            <div key={screen} className="screen active">
              {screen === 'home' && <Home />}
              {screen === 'profile' && <ProfileScreen />}
              {screen === 'user' && viewId && <UserScreen />}
              {screen === 'quix' && <QuixPage />}
              {screen === 'messages' && <Messages />}
              {screen === 'bookmarks' && <Bookmarks />}
              {screen === 'settings' && <Settings />}
            </div>
          </Shell>
        </NavCtx.Provider>
      </ToastCtx.Provider>
    </AuthCtx.Provider>
  );
}