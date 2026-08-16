'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { sb, Post, Profile, Notif, Msg, timeAgo } from '@/lib/supabase';
import { NavProvider, useNav, useAuth, VerifiedBadge } from './core';
import { PostCard, Compose, Stories, AccountRow } from './widgets';
import { logout, updateProfile } from '@/app/actions';

function useRefresh(fn: () => void) {
  useEffect(() => {
    fn();
    const h = () => fn();
    window.addEventListener('glo-refresh', h);
    return () => window.removeEventListener('glo-refresh', h);
  }, []);
}

function AuthPrompt() {
  const router = useRouter();
  return (
    <div className="empty">
      <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
        <rect x="4" y="11" width="16" height="10" rx="2" />
        <path d="M8 11V7a4 4 0 0 1 8 0v4" />
      </svg>
      <br />
      This part needs an account.
      <div style={{ marginTop: 16, display: 'flex', gap: 10, justifyContent: 'center' }}>
        <button className="follow-btn" onClick={() => router.push('/login')}>Log in</button>
        <button className="follow-btn on" onClick={() => router.push('/sign-up')}>Sign up</button>
      </div>
    </div>
  );
}

function Home() {
  const { userId } = useAuth();
  const { go } = useNav();
  const [posts, setPosts] = useState<Post[]>([]);
  const [tab, setTab] = useState('foryou');
  const [fl, setFl] = useState({ liked: [] as string[], reposted: [] as string[], bookmarked: [] as string[], following: [] as string[] });

  const load = async () => {
    const s = sb();
    const { data } = await s.from('posts').select('*,profiles(*)').is('parent_id', null).order('created_at', { ascending: false });
    setPosts(data || []);
    if (userId) {
      const [l, r, b, f] = await Promise.all([
        s.from('likes').select('post_id').eq('user_id', userId),
        s.from('reposts').select('post_id').eq('user_id', userId),
        s.from('bookmarks').select('post_id').eq('user_id', userId),
        s.from('follows').select('following_id').eq('follower_id', userId),
      ]);
      setFl({
        liked: (l.data || []).map((x) => x.post_id),
        reposted: (r.data || []).map((x) => x.post_id),
        bookmarked: (b.data || []).map((x) => x.post_id),
        following: (f.data || []).map((x) => x.following_id),
      });
    }
  };

  useRefresh(load);

  const list = tab === 'following' ? posts.filter((p) => fl.following.includes(p.user_id)) : posts;

  return (
    <>
      <div className="tabs home">
        <button className={`tab ${tab === 'foryou' ? 'active' : ''}`} onClick={() => setTab('foryou')}>For You</button>
        <button className={`tab ${tab === 'following' ? 'active' : ''}`} onClick={() => setTab('following')}>Following</button>
        <button className="explore-link" onClick={() => go('explore')}>
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <circle cx="12" cy="12" r="10" />
            <path d="m16 8-2.5 5.5L8 16l2.5-5.5z" />
          </svg>
        </button>
        <div className="tab-line" data-tab={tab} />
      </div>
      <Stories />
      <Compose />
      <div id="feed">
        {list.map((p) => (
          <PostCard key={p.id} post={p} liked={fl.liked.includes(p.id)} reposted={fl.reposted.includes(p.id)} bookmarked={fl.bookmarked.includes(p.id)} />
        ))}
      </div>
    </>
  );
}

function Explore() {
  const { userId } = useAuth();
  const [accs, setAccs] = useState<Profile[]>([]);
  const [following, setFollowing] = useState<string[]>([]);

  useRefresh(async () => {
    const s = sb();
    const { data } = await s.from('profiles').select('*').neq('id', userId || '').order('followers_count', { ascending: false });
    setAccs(data || []);
    if (userId) {
      const { data: f } = await s.from('follows').select('following_id').eq('follower_id', userId);
      setFollowing((f || []).map((x) => x.following_id));
    }
  });

  return (
    <>
      <div className="search">
        <input
          placeholder="Search people..."
          onInput={(e: any) => {
            const q = e.target.value.toLowerCase();
            document.querySelectorAll('#accList .account').forEach((a: any) => {
              a.style.display = a.textContent.toLowerCase().includes(q) ? '' : 'none';
            });
          }}
        />
      </div>
      <div className="sec-label">Suggested for you</div>
      <div id="accList">
        {accs.map((a) => (
          <AccountRow key={a.id} acc={a} following={following.includes(a.id)} />
        ))}
      </div>
    </>
  );
}

function ProfileScreen() {
  const { userId, profile } = useAuth();
  const [posts, setPosts] = useState<Post[]>([]);

  useRefresh(async () => {
    if (!userId) return;
    const s = sb();
    const { data } = await s.from('posts').select('*,profiles(*)').eq('user_id', userId).is('parent_id', null).order('created_at', { ascending: false });
    setPosts(data || []);
  });

  if (!userId) return <AuthPrompt />;
  if (!profile) return null;

  return (
    <>
      <div className="cover" />
      <div className="profile-head">
        <div className="profile-top">
          <div className={`avatar ${profile.avatar_grad}`}>{profile.display_name[0]}</div>
        </div>
        <h2>
          {profile.display_name} <VerifiedBadge type={profile.verified} />
        </h2>
        <div className="handle">@{profile.username}</div>
        <p className="bio">{profile.bio}</p>
        <div className="p-meta">
          <span>
            <b>{profile.following_count}</b> Following
          </span>
          <span>
            <b>{profile.followers_count}</b> Followers
          </span>
        </div>
      </div>
      <div id="feed">
        {posts.map((p) => (
          <PostCard key={p.id} post={p} liked={false} reposted={false} bookmarked={false} />
        ))}
      </div>
    </>
  );
}

function Notifs() {
  const { userId } = useAuth();
  const [n, setN] = useState<Notif[]>([]);

  useRefresh(async () => {
    if (!userId) return;
    const s = sb();
    const { data } = await s.from('notifications').select('*,actor:profiles(*)').eq('user_id', userId).order('created_at', { ascending: false });
    setN(data || []);
  });

  if (!userId) return <AuthPrompt />;

  return (
    <>
      {n.map((x) => (
        <div key={x.id} className="notif rise">
          <div className={`notif-icon ${x.actor?.verified === 'gold' ? 'gold' : ''}`}>
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <circle cx="12" cy="8" r="4" />
              <path d="M4 21c0-4 3.6-6 8-6s8 2 8 6" />
            </svg>
          </div>
          <div className="notif-info">
            <b>{x.actor?.display_name}</b>
            <p>{x.type === 'follow' ? 'followed you.' : `${x.type}d your post.`}</p>
            <time>{timeAgo(x.created_at)}</time>
          </div>
        </div>
      ))}
    </>
  );
}

function Messages() {
  const { userId } = useAuth();
  const [m, setM] = useState<Msg[]>([]);

  useRefresh(async () => {
    if (!userId) return;
    const s = sb();
    const { data } = await s.from('messages').select('*,sender:profiles!messages_sender_id_fkey(*)').eq('recipient_id', userId).order('created_at', { ascending: false });
    setM(data || []);
  });

  if (!userId) return <AuthPrompt />;

  return (
    <>
      {m.map((x) => (
        <div key={x.id} className={`msg rise ${x.read ? '' : 'unread'}`}>
          <div className={`avatar ${x.sender?.avatar_grad || 'av-1'}`}>{(x.sender?.display_name || '?')[0]}</div>
          <div className="msg-info">
            <div className="msg-top">
              <b>{x.sender?.display_name}</b>
              <time>{timeAgo(x.created_at)}</time>
            </div>
            <p>{x.content}</p>
          </div>
          {!x.read && <span className="dot" />}
        </div>
      ))}
    </>
  );
}

function Bookmarks() {
  const { userId } = useAuth();
  const [posts, setPosts] = useState<Post[]>([]);

  useRefresh(async () => {
    if (!userId) return;
    const s = sb();
    const { data } = await s.from('bookmarks').select('post_id').eq('user_id', userId);
    const ids = (data || []).map((x) => x.post_id);
    if (!ids.length) return setPosts([]);
    const { data: p } = await s.from('posts').select('*,profiles(*)').in('id', ids);
    setPosts(p || []);
  });

  if (!userId) return <AuthPrompt />;

  return (
    <div id="feed">
      {posts.map((p) => (
        <PostCard key={p.id} post={p} liked={false} reposted={false} bookmarked />
      ))}
    </div>
  );
}

function Settings() {
  const { userId, profile } = useAuth();

  if (!userId) return <AuthPrompt />;

  return (
    <>
      <div className="sec-label">Account</div>
      <div className="set-card">
        <div className="set-row">
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <circle cx="12" cy="8" r="4" />
            <path d="M4 21c0-4 3.6-6 8-6s8 2 8 6" />
          </svg>
          {profile?.username}
        </div>
        <form action={updateProfile} className="set-row" style={{ flexDirection: 'column', alignItems: 'stretch', gap: 10 }}>
          <input name="display_name" defaultValue={profile?.display_name} placeholder="Display name" style={{ background: 'var(--glass)', border: '1px solid var(--gbrd)', borderRadius: 12, padding: '10px 12px', color: 'var(--text)', font: 'inherit' }} />
          <input name="bio" defaultValue={profile?.bio} placeholder="Bio" style={{ background: 'var(--glass)', border: '1px solid var(--gbrd)', borderRadius: 12, padding: '10px 12px', color: 'var(--text)', font: 'inherit' }} />
          <button className="post-btn" type="submit">
            Save
          </button>
        </form>
        <form action={logout} className="set-row" style={{ borderBottom: 'none' }}>
          <button type="submit" style={{ color: '#e07a6a', background: 'none', border: 'none', font: 'inherit', cursor: 'pointer' }}>
            Log out
          </button>
        </form>
      </div>
      <div className="set-foot">Glo © 2026 · From Verve</div>
    </>
  );
}

function Body() {
  const { screen } = useNav();
  return (
    <div key={screen} className="screen active">
      {screen === 'home' && <Home />}
      {screen === 'explore' && <Explore />}
      {screen === 'profile' && <ProfileScreen />}
      {screen === 'notifications' && <Notifs />}
      {screen === 'messages' && <Messages />}
      {screen === 'bookmarks' && <Bookmarks />}
      {screen === 'settings' && <Settings />}
    </div>
  );
}

export default function App() {
  return (
    <NavProvider>
      <Body />
    </NavProvider>
  );
}