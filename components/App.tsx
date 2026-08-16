'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { sb, Post, Profile, Notif, Msg, timeAgo } from '@/lib/supabase';
import { useNav, useAuth, VerifiedBadge } from './core';
import { PostCard, Compose, Stories, AccountRow, Empty } from './widgets';
import { logout, updateProfile } from '@/app/actions';

function useRefresh(fn: () => void) {
  useEffect(() => {
    fn();
    const h = () => fn();
    window.addEventListener('glo-refresh', h);
    return () => window.removeEventListener('glo-refresh', h);
  }, []);
}

const IC = {
  pen: <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M12 20h9" /><path d="M16.5 3.5a2.1 2.1 0 0 1 3 3L7 19l-4 1 1-4z" /></svg>,
  users: <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="9" cy="8" r="4" /><path d="M2 21c0-4 3.1-6 7-6s7 2 7 6" /><circle cx="17.5" cy="9.5" r="3" /><path d="M22 21c0-3-1.8-4.7-4.5-5.2" /></svg>,
  compass: <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="12" r="10" /><path d="m16 8-2.5 5.5L8 16l2.5-5.5z" /></svg>,
  bell: <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M18 8a6 6 0 0 0-12 0c0 7-3 8-3 8h18s-3-1-3-8" /><path d="M13.7 21a2 2 0 0 1-3.4 0" /></svg>,
  mail: <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect x="3" y="5" width="18" height="14" rx="2" /><path d="m3 7 9 6 9-6" /></svg>,
  bm: <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M19 21l-7-5-7 5V5a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2z" /></svg>,
};

function AuthPrompt() {
  const router = useRouter();
  return (
    <Empty
      icon={<svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect x="4" y="11" width="16" height="10" rx="2" /><path d="M8 11V7a4 4 0 0 1 8 0v4" /></svg>}
      title="This part needs an account"
      sub="Log in or sign up to join the fun."
    />
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
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="12" r="10" /><path d="m16 8-2.5 5.5L8 16l2.5-5.5z" /></svg>
        </button>
        <div className="tab-line" data-tab={tab} />
      </div>
      <Stories />
      <Compose />
      {list.length === 0 ? (
        tab === 'following' ? (
          <Empty icon={IC.users} title="Nothing from your follows yet" sub="Follow people in Explore and their posts will show up here." />
        ) : (
          <Empty icon={IC.pen} title="Nothing here yet" sub="It's quiet in here. Be the first to post something." />
        )
      ) : (
        <div id="feed">
          {list.map((p) => (
            <PostCard key={p.id} post={p} liked={fl.liked.includes(p.id)} reposted={fl.reposted.includes(p.id)} bookmarked={fl.bookmarked.includes(p.id)} />
          ))}
        </div>
      )}
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
      {accs.length === 0 ? (
        <Empty icon={IC.compass} title="No one to explore yet" sub="When people join Glo, they'll show up here." />
      ) : (
        <div id="accList">
          {accs.map((a) => (
            <AccountRow key={a.id} acc={a} following={following.includes(a.id)} />
          ))}
        </div>
      )}
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
        <div className="profile-top"><div className={`avatar ${profile.avatar_grad}`}>{profile.display_name[0]}</div></div>
        <h2>{profile.display_name} <VerifiedBadge type={profile.verified} /></h2>
        <div className="handle">@{profile.username}</div>
        <p className="bio">{profile.bio}</p>
        <div className="p-meta">
          <span><b>{profile.following_count}</b> Following</span>
          <span><b>{profile.followers_count}</b> Followers</span>
        </div>
      </div>
      {posts.length === 0 ? (
        <Empty icon={IC.pen} title="No posts yet" sub="When you post, it'll live here." />
      ) : (
        <div id="feed">
          {posts.map((p) => (
            <PostCard key={p.id} post={p} liked={false} reposted={false} bookmarked={false} />
          ))}
        </div>
      )}
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

  return n.length === 0 ? (
    <Empty icon={IC.bell} title="Nothing yet" sub="Likes, follows and reposts will land here." />
  ) : (
    <>
      {n.map((x) => (
        <div key={x.id} className="notif rise">
          <div className={`notif-icon ${x.actor?.verified === 'gold' ? 'gold' : ''}`}>
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="8" r="4" /><path d="M4 21c0-4 3.6-6 8-6s8 2 8 6" /></svg>
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

  return m.length === 0 ? (
    <Empty icon={IC.mail} title="No messages" sub="Say hi to someone. It's free." />
  ) : (
    <>
      {m.map((x) => (
        <div key={x.id} className={`msg rise ${x.read ? '' : 'unread'}`}>
          <div className={`avatar ${x.sender?.avatar_grad || 'av-1'}`}>{(x.sender?.display_name || '?')[0]}</div>
          <div className="msg-info">
            <div className="msg-top"><b>{x.sender?.display_name}</b><time>{timeAgo(x.created_at)}</time></div>
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

  return posts.length === 0 ? (
    <Empty icon={IC.bm} title="No bookmarks yet" sub="Save posts and find them here later." />
  ) : (
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
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="8" r="4" /><path d="M4 21c0-4 3.6-6 8-6s8 2 8 6" /></svg>
          {profile?.username}
        </div>
        <form action={updateProfile} className="set-row" style={{ flexDirection: 'column', alignItems: 'stretch', gap: 10 }}>
          <input name="display_name" defaultValue={profile?.display_name} placeholder="Display name" style={{ background: '#202327', border: '1px solid transparent', borderRadius: 8, padding: '10px 12px', color: 'var(--text)', font: 'inherit' }} />
          <input name="bio" defaultValue={profile?.bio} placeholder="Bio" style={{ background: '#202327', border: '1px solid transparent', borderRadius: 8, padding: '10px 12px', color: 'var(--text)', font: 'inherit' }} />
          <button className="post-btn" type="submit">Save</button>
        </form>
        <form action={logout} className="set-row" style={{ borderBottom: 'none' }}>
          <button type="submit" style={{ color: '#f4212e', background: 'none', border: 'none', font: 'inherit', cursor: 'pointer' }}>Log out</button>
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
  return <Body />;
}