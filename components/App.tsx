'use client';

import { useEffect, useRef, useState } from 'react';
import { sb, Post, Profile, Msg, timeAgo } from '@/lib/supabase';
import { useNav, useAuth, useToast, VerifiedBadge } from './core';
import { PostCard, Stories, AccountRow, Empty, PostModal } from './widgets';
import { logout, updateProfile, uploadMedia } from '@/app/actions';

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
  mail: <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect x="3" y="5" width="18" height="14" rx="2" /><path d="m3 7 9 6 9-6" /></svg>,
  bm: <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M19 21l-7-5-7 5V5a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2z" /></svg>,
  lock: <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect x="4" y="11" width="16" height="10" rx="2" /><path d="M8 11V7a4 4 0 0 1 8 0v4" /></svg>,
};

function AuthPrompt() {
  return <Empty icon={IC.lock} title="This part needs an account" sub="Log in or sign up to join the fun." />;
}

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
  const { userId } = useAuth();
  const { feedTab } = useNav();
  const [posts, setPosts] = useState<Post[]>([]);
  const [fl, setFl] = useState({ liked: [] as string[], reposted: [] as string[], bookmarked: [] as string[], following: [] as string[] });
  const [postModal, setPostModal] = useState(false);

  useEffect(() => {
    const h = () => setPostModal(true);
    window.addEventListener('glo-compose-post', h);
    return () => window.removeEventListener('glo-compose-post', h);
  }, []);

  const load = async () => {
    const s = sb();
    const { data } = await s.from('posts').select('*,profiles(*)').is('parent_id', null).order('created_at', { ascending: false });
    if (data) setPosts(data);
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

  const list = feedTab === 'following' ? posts.filter((p) => fl.following.includes(p.user_id)) : posts;

  return (
    <>
      <TabsBar />
      <div key={feedTab} className="fade-in">
        {feedTab === 'explore' ? (
          <Explore />
        ) : (
          <>
            <Stories />
            {list.length === 0 ? (
              feedTab === 'following' ? (
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
        )}
      </div>
      {postModal && <PostModal close={() => setPostModal(false)} />}
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
    if (data) setAccs(data);
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
        <Empty icon={IC.users} title="No one to explore yet" sub="When people join Glo, they'll show up here." />
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

function EditProfile({ profile, close }: { profile: Profile; close: () => void }) {
  const toast = useToast();
  const [name, setName] = useState(profile.display_name);
  const [bio, setBio] = useState(profile.bio || '');
  const [avatarUrl, setAvatarUrl] = useState<string | null>(profile.avatar_url || null);
  const [bannerUrl, setBannerUrl] = useState<string | null>(profile.banner_url || null);
  const [busy, setBusy] = useState(false);
  const avatarRef = useRef<HTMLInputElement>(null);
  const bannerRef = useRef<HTMLInputElement>(null);

  const upload = async (file: File, type: 'avatar' | 'banner') => {
    const fd = new FormData();
    fd.append('file', file);
    const url = await uploadMedia(fd);
    if (!url) {
      toast('Upload failed.');
      return;
    }
    if (type === 'avatar') setAvatarUrl(url);
    else setBannerUrl(url);
    toast(type === 'avatar' ? 'Profile photo updated.' : 'Banner updated.');
  };

  const save = async () => {
    if (!name.trim()) {
      toast('Name cannot be empty.');
      return;
    }
    setBusy(true);
    const fd = new FormData();
    fd.append('display_name', name.trim());
    fd.append('bio', bio.trim());
    if (avatarUrl) fd.append('avatar_url', avatarUrl);
    if (bannerUrl) fd.append('banner_url', bannerUrl);
    
    const res = await updateProfile(fd);
    setBusy(false);
    
    if (res?.error) {
      toast(res.error);
      return;
    }
    toast('Profile saved.');
    setTimeout(() => window.location.reload(), 650);
  };

  return (
    <div className="edit-profile">
      <div className="edit-profile-head">
        <button className="icon-btn" onClick={close} aria-label="Close">
          <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M18 6 6 18M6 6l12 12" />
          </svg>
        </button>
        <b>Edit profile</b>
        <button className="post-btn" disabled={busy || !name.trim()} onClick={save}>
          {busy ? 'Saving...' : 'Save'}
        </button>
      </div>

      <div className="edit-profile-body">
        <div className="banner-edit">
          {bannerUrl ? <img src={bannerUrl} alt="Banner" /> : null}
          <button className="icon-btn" onClick={() => bannerRef.current?.click()} aria-label="Change banner">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="2">
              <rect x="3" y="3" width="18" height="18" rx="3" />
              <circle cx="9" cy="9" r="2" />
              <path d="m21 15-4.5-4.5L6 21" />
            </svg>
          </button>
          <input
            ref={bannerRef}
            type="file"
            accept="image/*"
            hidden
            onChange={(e) => {
              const f = e.target.files?.[0];
              if (f) upload(f, 'banner');
              e.target.value = '';
            }}
          />
        </div>

        <div className="avatar-edit-row">
          <div className="avatar-edit">
            {avatarUrl ? (
              <img src={avatarUrl} alt="Avatar" className="avatar avatar-img" />
            ) : (
              <div className={`avatar ${profile.avatar_grad}`}>{(name || 'A')[0]}</div>
            )}

            <button className="icon-btn" onClick={() => avatarRef.current?.click()} aria-label="Change profile photo">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="2">
                <rect x="3" y="3" width="18" height="18" rx="3" />
                <circle cx="9" cy="9" r="2" />
                <path d="m21 15-4.5-4.5L6 21" />
              </svg>
            </button>

            <input
              ref={avatarRef}
              type="file"
              accept="image/*"
              hidden
              onChange={(e) => {
                const f = e.target.files?.[0];
                if (f) upload(f, 'avatar');
                e.target.value = '';
              }}
            />
          </div>

          <div>
            <b>{name}</b>
            <div style={{ color: 'var(--dim)', fontSize: 13.5 }}>@{profile.username}</div>
          </div>
        </div>

        <input className="edit-in" value={name} onChange={(e) => setName(e.target.value)} placeholder="Display name" />
        <textarea className="edit-in" rows={4} value={bio} onChange={(e) => setBio(e.target.value)} placeholder="Bio" />
      </div>
    </div>
  );
}

function ProfileScreen() {
  const { userId, profile } = useAuth();
  const toast = useToast();
  const [tab, setTab] = useState('posts');
  const [edit, setEdit] = useState(false);
  const [data, setData] = useState({
    posts: [] as Post[], replies: [] as Post[], reposts: [] as Post[], likes: [] as Post[],
    rpIds: [] as string[], lkIds: [] as string[], bmIds: [] as string[]
  });

  useRefresh(async () => {
    if (!userId) return;
    const s = sb();
    const [p, r, rp, lk, bm] = await Promise.all([
      s.from('posts').select('*,profiles(*)').eq('user_id', userId).is('parent_id', null).order('created_at', { ascending: false }),
      s.from('posts').select('*,profiles(*)').eq('user_id', userId).not('parent_id', 'is', null).order('created_at', { ascending: false }),
      s.from('reposts').select('post_id').eq('user_id', userId),
      s.from('likes').select('post_id').eq('user_id', userId),
      s.from('bookmarks').select('post_id').eq('user_id', userId),
    ]);
    const rpIds = (rp.data || []).map((x) => x.post_id);
    const lkIds = (lk.data || []).map((x) => x.post_id);
    const bmIds = (bm.data || []).map((x) => x.post_id);
    let reposts: Post[] = [];
    let likes: Post[] = [];
    if (rpIds.length) { const q = await s.from('posts').select('*,profiles(*)').in('id', rpIds); reposts = q.data || []; }
    if (lkIds.length) { const q = await s.from('posts').select('*,profiles(*)').in('id', lkIds); likes = q.data || []; }
    setData({ posts: p.data || [], replies: r.data || [], reposts, likes, rpIds, lkIds, bmIds });
  });

  if (!userId) return <AuthPrompt />;
  if (!profile) return null;

  const joined = new Date(profile.created_at).toLocaleDateString('en-US', { month: 'long', year: 'numeric' });
  const list = tab === 'posts' ? data.posts : tab === 'replies' ? data.replies : tab === 'reposts' ? data.reposts : data.likes;
  const E: Record<string, [string, string]> = {
    posts: ['No posts yet', "When you post, it'll show up here."],
    replies: ['Nothing to see here — yet.', 'Replies will show up here.'],
    reposts: ['Nothing to see here — yet.', 'Reposts will show up here.'],
    likes: ['Nothing to see here — yet.', 'Posts you like will show up here.'],
  };

  return (
    <>
      <div className="cover">
        {profile.banner_url ? <img src={profile.banner_url} alt="Banner" className="cover-img" /> : null}
      </div>

      <div className="profile-head">
        <div className="profile-top">
          {profile.avatar_url ? (
            <img src={profile.avatar_url} alt="Avatar" className="avatar avatar-img" />
          ) : (
            <div className={`avatar ${profile.avatar_grad}`}>{profile.display_name[0]}</div>
          )}

          <div className="profile-actions">
            <button className="pbtn" onClick={() => { navigator.clipboard?.writeText(window.location.href); toast('Link copied.'); }}>Share</button>
            <button className="pbtn" onClick={() => setEdit(true)}>Edit profile</button>
          </div>
        </div>

        <h2>{profile.display_name} <VerifiedBadge type={profile.verified} /></h2>
        <div className="handle">@{profile.username}</div>
        {profile.bio ? <p className="bio">{profile.bio}</p> : <p className="bio add-bio" onClick={() => setEdit(true)}>Add bio</p>}

        <div className="p-meta">
          <span>Joined {joined}</span>
          <span><b>{profile.following_count}</b> Following</span>
          <span><b>{profile.followers_count}</b> Followers</span>
        </div>
      </div>

      <div className="ptabs">
        {(['posts', 'replies', 'reposts', 'likes'] as const).map((t) => (
          <button key={t} className={`ptab ${tab === t ? 'active' : ''}`} onClick={() => setTab(t)}>{t[0].toUpperCase() + t.slice(1)}</button>
        ))}
      </div>

      {list.length === 0 ? (
        <div className="pempty fade-in" key={tab}>
          <h3>{E[tab][0]}</h3>
          <p>{E[tab][1]}</p>
        </div>
      ) : (
        <div id="feed" className="fade-in" key={tab}>
          {list.map((p) => (
            <PostCard key={p.id} post={p} liked={data.lkIds.includes(p.id)} reposted={data.rpIds.includes(p.id)} bookmarked={data.bmIds.includes(p.id)} />
          ))}
        </div>
      )}

      {edit && <EditProfile profile={profile} close={() => setEdit(false)} />}
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
    if (data) setM(data);
  });

  if (!userId) return <AuthPrompt />;

  return m.length === 0 ? (
    <Empty icon={IC.mail} title="No messages" sub="Say hi to someone. It's free." />
  ) : (
    <>
      {m.map((x) => (
        <div key={x.id} className={`msg rise ${x.read ? '' : 'unread'}`}>
          {x.sender?.avatar_url ? (
            <img src={x.sender.avatar_url} alt="" className="avatar avatar-img" />
          ) : (
            <div className={`avatar ${x.sender?.avatar_grad || 'av-1'}`}>{(x.sender?.display_name || '?')[0]}</div>
          )}

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
    if (!ids.length) { setPosts([]); return; }
    const { data: p } = await s.from('posts').select('*,profiles(*)').in('id', ids);
    if (p) setPosts(p);
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
      {screen === 'profile' && <ProfileScreen />}
      {screen === 'messages' && <Messages />}
      {screen === 'bookmarks' && <Bookmarks />}
      {screen === 'settings' && <Settings />}
    </div>
  );
}

export default function App() {
  return <Body />;
}