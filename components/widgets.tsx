'use client';

import { useEffect, useRef, useState, ReactNode } from 'react';
import { useRouter } from 'next/navigation';
import { sb, fmt, timeAgo, Post, Profile, Story } from '@/lib/supabase';
import {
  toggleLike,
  toggleRepost,
  toggleBookmark,
  createPost,
  createStory,
  uploadMedia,
  toggleFollow
} from '@/app/actions';
import { VerifiedBadge, useAuth, useToast } from './core';

export function Empty({ icon, title, sub }: { icon: ReactNode; title: string; sub: string }) {
  return (
    <div className="empty">
      <div
        style={{
          width: 56,
          height: 56,
          borderRadius: '50%',
          background: 'rgba(255,255,255,.06)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          margin: '0 auto 14px',
          color: '#8b98a5'
        }}
      >
        {icon}
      </div>
      <div style={{ fontSize: 17, fontWeight: 800, color: 'var(--text)' }}>{title}</div>
      <div style={{ marginTop: 6 }}>{sub}</div>
    </div>
  );
}

export function PostCard({
  post,
  liked,
  reposted,
  bookmarked
}: {
  post: Post;
  liked: boolean;
  reposted: boolean;
  bookmarked: boolean;
}) {
  const toast = useToast();
  const { userId } = useAuth();
  const router = useRouter();

  const [lk, setLk] = useState(liked);
  const [lp, setLp] = useState(post.likes_count);
  const [rp, setRp] = useState(reposted);
  const [rc, setRc] = useState(post.reposts_count);
  const [bm, setBm] = useState(bookmarked);

  const p = post.profiles;

  const guard = () => {
    if (!userId) {
      router.push('/login');
      return true;
    }
    return false;
  };

  return (
    <article className="post rise">
      <div className="post-head">
        {p?.avatar_url ? (
          <img src={p.avatar_url} alt="" className="avatar avatar-img" />
        ) : (
          <div className={`avatar ${p?.avatar_grad || 'av-1'}`}>{(p?.display_name || '?')[0]}</div>
        )}

        <div className="post-body">
          <div className="post-user">
            <b>{p?.display_name}</b>
            <VerifiedBadge type={p?.verified || null} />
            <span>@{p?.username} · {timeAgo(post.created_at)}</span>
          </div>

          <div className="post-text">{post.content}</div>

          {post.media_url && (
            <img
              src={post.media_url}
              alt=""
              style={{
                marginTop: 12,
                height: 200,
                objectFit: 'cover',
                width: '100%',
                borderRadius: 16,
                border: '1px solid var(--gbrd-soft)'
              }}
            />
          )}

          <div className="actions">
            <button className="act reply" onClick={() => { if (guard()) return; toast('Replies coming soon.'); }}>
              <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M21 11.5a8.4 8.4 0 0 1-9 8.4 8.6 8.6 0 0 1-3.8-.9L3 21l2-4.9a8.4 8.4 0 1 1 16-4.6z" />
              </svg>
              <span>{fmt(post.replies_count)}</span>
            </button>

            <button
              className={`act repost ${rp ? 'on' : ''}`}
              onClick={() => {
                if (guard()) return;
                setRp(!rp);
                setRc(rc + (rp ? -1 : 1));
                toggleRepost(post.id);
              }}
            >
              <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="m17 2 4 4-4 4" />
                <path d="M3 11v-1a4 4 0 0 1 4-4h14" />
                <path d="m7 22-4-4 4-4" />
                <path d="M21 13v1a4 4 0 0 1-4 4H3" />
              </svg>
              <span>{fmt(rc)}</span>
            </button>

            <button
              className={`act like ${lk ? 'on' : ''}`}
              onClick={() => {
                if (guard()) return;
                const on = !lk;
                setLk(on);
                setLp(lp + (on ? 1 : -1));
                toggleLike(post.id);
              }}
            >
              <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M19 14c1.5-1.5 3-3.2 3-5.5A5.5 5.5 0 0 0 16.5 3c-1.8 0-3.4 1-4.5 2.5C10.9 4 9.3 3 7.5 3A5.5 5.5 0 0 0 2 8.5c0 2.3 1.5 4 3 5.5l7 7z" />
              </svg>
              <span>{fmt(lp)}</span>
            </button>

            <button
              className={`act bm ${bm ? 'on' : ''}`}
              onClick={() => {
                if (guard()) return;
                setBm(!bm);
                toggleBookmark(post.id);
                toast(bm ? 'Removed from bookmarks.' : 'Saved to bookmarks.');
              }}
            >
              <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M19 21l-7-5-7 5V5a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2z" />
              </svg>
            </button>

            <button className="act share" onClick={() => { if (guard()) return; toast('Link copied.'); }}>
              <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M12 3v13" />
                <path d="m7 8 5-5 5 5" />
                <path d="M5 15v4a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2v-4" />
              </svg>
            </button>
          </div>
        </div>
      </div>
    </article>
  );
}

export function PostModal({ close }: { close: () => void }) {
  const { profile } = useAuth();
  const toast = useToast();

  const [text, setText] = useState('');
  const [media, setMedia] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const fileRef = useRef<HTMLInputElement>(null);
  const left = 280 - text.length;

  const onFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0];
    if (!f) return;

    const fd = new FormData();
    fd.append('file', f);

    const url = await uploadMedia(fd);
    if (url) setMedia(url);
    else toast('Upload failed.');
  };

  const submit = async () => {
    if (busy || (!text.trim() && !media)) return;

    setBusy(true);

    const fd = new FormData();
    fd.append('content', text);
    if (media) fd.append('media_url', media);

    const res = await createPost(fd);

    setBusy(false);

    if (res && res.error) {
      toast('Could not post: ' + res.error);
      return;
    }

    setText('');
    setMedia(null);
    toast('Posted to Glo.');
    window.dispatchEvent(new Event('glo-refresh'));
    close();
  };

  return (
    <div className="post-modal">
      <div className="post-modal-head">
        <button className="icon-btn" onClick={close} aria-label="Close">
          <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M18 6 6 18M6 6l12 12" />
          </svg>
        </button>

        <button className="post-btn" disabled={busy || (!text.trim() && !media)} onClick={submit}>
          {busy ? 'Posting...' : 'Post'}
        </button>
      </div>

      <div className="post-modal-body">
        {profile?.avatar_url ? (
          <img src={profile.avatar_url} alt="" className="avatar avatar-img" style={{ marginBottom: 8 }} />
        ) : (
          <div className={`avatar ${profile?.avatar_grad || 'av-me'}`} style={{ marginBottom: 8 }}>
            {(profile?.display_name || 'A')[0]}
          </div>
        )}

        <textarea
          autoFocus
          value={text}
          onChange={(e) => setText(e.target.value)}
          placeholder="What's happening?"
        />

        {media && (
          <div style={{ position: 'relative' }}>
            <img
              src={media}
              alt=""
              style={{ width: '100%', height: 200, objectFit: 'cover', borderRadius: 12 }}
            />
            <button
              className="icon-btn"
              onClick={() => setMedia(null)}
              style={{ position: 'absolute', top: 8, right: 8, background: 'rgba(0,0,0,0.6)' }}
              aria-label="Remove media"
            >
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="2">
                <path d="M18 6 6 18M6 6l12 12" />
              </svg>
            </button>
          </div>
        )}

        <div
          style={{
            display: 'flex',
            gap: 10,
            alignItems: 'center',
            marginTop: 'auto',
            paddingTop: 12,
            borderTop: '1px solid var(--gbrd-soft)'
          }}
        >
          <button className="icon-btn" onClick={() => fileRef.current?.click()} aria-label="Add image">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="var(--blue)" strokeWidth="2">
              <rect x="3" y="3" width="18" height="18" rx="3" />
              <circle cx="9" cy="9" r="2" />
              <path d="m21 15-4.5-4.5L6 21" />
            </svg>
          </button>

          <input ref={fileRef} type="file" accept="image/*" hidden onChange={onFile} />

          <span className={`char ${left < 20 ? 'warn' : ''}`}>{text ? left : ''}</span>
        </div>
      </div>
    </div>
  );
}

export function Stories() {
  const [stories, setStories] = useState<Story[]>([]);
  const [idx, setIdx] = useState<number | null>(null);
  const [compose, setCompose] = useState(false);
  const [text, setText] = useState('');
  const [grad, setGrad] = useState('g1');
  const [busy, setBusy] = useState(false);

  const toast = useToast();
  const { userId, profile } = useAuth();
  const router = useRouter();

  useEffect(() => {
    const load = async () => {
      const s = sb();
      const { data } = await s
        .from('stories')
        .select('*,profiles(*)')
        .gt('expires_at', new Date().toISOString())
        .order('created_at');

      setStories(data || []);
    };

    load();
    window.addEventListener('glo-refresh', load);
    return () => window.removeEventListener('glo-refresh', load);
  }, []);

  useEffect(() => {
    const h = () => {
      if (!userId) {
        router.push('/login');
        return;
      }
      setCompose(true);
    };

    window.addEventListener('glo-compose-story', h);
    return () => window.removeEventListener('glo-compose-story', h);
  }, [userId, router]);

  useEffect(() => {
    if (idx === null) return;
    const t = setTimeout(() => setIdx((i) => (i === null ? null : i >= stories.length - 1 ? null : i + 1)), 5000);
    return () => clearTimeout(t);
  }, [idx, stories.length]);

  const mine = stories.some((s) => s.user_id === userId);

  const share = async () => {
    if (!text.trim()) return;

    setBusy(true);

    const fd = new FormData();
    fd.append('content', text);
    fd.append('gradient', grad);

    const res = await createStory(fd);

    setBusy(false);

    if (res && res.error) {
      toast(res.error);
      return;
    }

    setCompose(false);
    setText('');
    toast('Story added.');
    window.dispatchEvent(new Event('glo-refresh'));
  };

  const cur = idx !== null ? stories[idx] : null;

  return (
    <>
      <div className="stories">
        <button
          className="story"
          onClick={() => {
            if (!userId) {
              router.push('/login');
              return;
            }
            setCompose(true);
          }}
        >
          <span className={`story-ring ${mine ? (profile?.verified === 'gold' ? 'gold' : '') : 'you'}`}>
            {profile?.avatar_url ? (
              <img src={profile.avatar_url} alt="" className="avatar avatar-img" />
            ) : (
              <span className={`avatar ${profile?.avatar_grad || 'av-me'}`}>
                {userId ? (profile?.display_name || 'A')[0] : '+'}
              </span>
            )}
            {!mine && <span className="story-plus">+</span>}
          </span>
          <span className="story-name">Your story</span>
        </button>

        {stories.map((s, i) => (
          <button key={s.id} className="story" onClick={() => setIdx(i)}>
            <span className={`story-ring ${s.profiles?.verified === 'gold' ? 'gold' : ''}`}>
              {s.profiles?.avatar_url ? (
                <img src={s.profiles.avatar_url} alt="" className="avatar avatar-img" />
              ) : (
                <span className={`avatar ${s.profiles?.avatar_grad || 'av-1'}`}>
                  {(s.profiles?.display_name || '?')[0]}
                </span>
              )}
            </span>
            <span className="story-name">{s.profiles?.display_name}</span>
          </button>
        ))}
      </div>

      {cur && (
        <div id="storyViewer" className={`show ${cur.gradient || 'g1'}`}>
          <div className="sv-progress">
            {stories.map((_, i) => (
              <i key={i} className={i < idx! ? 'done' : i === idx! ? 'live' : ''} />
            ))}
          </div>

          <div className="sv-head">
            {cur.profiles?.avatar_url ? (
              <img src={cur.profiles.avatar_url} alt="" className="avatar avatar-img" />
            ) : (
              <div className={`avatar ${cur.profiles?.avatar_grad || 'av-1'}`}>
                {(cur.profiles?.display_name || '?')[0]}
              </div>
            )}

            <b>{cur.profiles?.display_name}</b>

            <button className="icon-btn" onClick={() => setIdx(null)} aria-label="Close story">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="2.2">
                <path d="M18 6 6 18M6 6l12 12" />
              </svg>
            </button>
          </div>

          <div className="sv-body">{cur.content}</div>

          <button className="sv-tap left" onClick={() => setIdx(Math.max(0, idx! - 1))} aria-label="Previous story" />
          <button
            className="sv-tap right"
            onClick={() => setIdx(idx! >= stories.length - 1 ? null : idx! + 1)}
            aria-label="Next story"
          />
        </div>
      )}

      {compose && (
        <div className={`story-compose grad-${grad}`}>
          <div className="sc-head">
            <button className="icon-btn" onClick={() => setCompose(false)} aria-label="Close">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="2.2">
                <path d="M18 6 6 18M6 6l12 12" />
              </svg>
            </button>

            <b>New story</b>

            <button className="post-btn" disabled={busy || !text.trim()} onClick={share}>
              {busy ? '...' : 'Share'}
            </button>
          </div>

          <div className="sc-body">
            <textarea
              autoFocus
              value={text}
              onChange={(e) => setText(e.target.value)}
              placeholder="Type something..."
              maxLength={120}
            />
          </div>

          <div className="sc-grads">
            {['g1', 'g2', 'g3', 'g4', 'g5', 'g6'].map((g) => (
              <button
                key={g}
                className={`grad-${g} ${grad === g ? 'sel' : ''}`}
                onClick={() => setGrad(g)}
                aria-label={g}
              />
            ))}
          </div>
        </div>
      )}
    </>
  );
}

export function AccountRow({ acc, following }: { acc: Profile; following: boolean }) {
  const [f, setF] = useState(following);
  const toast = useToast();
  const { userId } = useAuth();
  const router = useRouter();

  return (
    <div className="account rise">
      {acc.avatar_url ? (
        <img src={acc.avatar_url} alt="" className={`avatar avatar-img ${acc.verified === 'gold' ? 'gold-ring' : ''}`} />
      ) : (
        <div className={`avatar ${acc.avatar_grad} ${acc.verified === 'gold' ? 'gold-ring' : ''}`}>
          {acc.display_name[0]}
        </div>
      )}

      <div className="acc-info">
        <div className="acc-name">
          <b>{acc.display_name}</b>
          <VerifiedBadge type={acc.verified} />
        </div>
        <div className="acc-handle">@{acc.username}</div>
        <div className="acc-bio">{acc.bio}</div>
      </div>

      <button
        className={`follow-btn ${f ? 'on' : ''}`}
        onClick={() => {
          if (!userId) {
            router.push('/login');
            return;
          }
          setF(!f);
          toggleFollow(acc.id);
          toast(f ? `Unfollowed ${acc.display_name}.` : `Following ${acc.display_name}.`);
        }}
      >
        {f ? 'Following' : 'Follow'}
      </button>
    </div>
  );
}