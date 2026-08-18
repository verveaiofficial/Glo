'use server';

import { createServerClient } from '@supabase/ssr';
import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';

async function server() {
  const c = await cookies();

  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll: () => c.getAll(),
        setAll: (t) => {
          try {
            t.forEach(({ name, value, options }) => c.set(name, value, options));
          } catch {}
        }
      }
    }
  );
}

async function uid() {
  const s = await server();
  const { data: { user } } = await s.auth.getUser();
  return { s, user };
}

async function ensureProfile(s: any, user: any) {
  if (!user) return;

  const { data } = await s.from('profiles').select('id').eq('id', user.id).maybeSingle();
  if (data) return;

  const meta = user.user_metadata || {};
  const username = meta.username || `user_${user.id.slice(0, 8)}`;
  const display_name = meta.display_name || username;
  const avatar_grad = 'av-' + ((user.id.charCodeAt(0) % 5) + 1);

  await s.from('profiles').upsert({
    id: user.id,
    username,
    display_name,
    avatar_grad
  });
}

export async function login(prevState: any, fd: FormData) {
  const s = await server();

  const { error } = await s.auth.signInWithPassword({
    email: fd.get('email') as string,
    password: fd.get('password') as string
  });

  if (error) return { error: error.message };

  redirect('/');
}

export async function signup(prevState: any, fd: FormData) {
  const s = await server();

  const { data: { user }, error } = await s.auth.signUp({
    email: fd.get('email') as string,
    password: fd.get('password') as string,
    options: {
      data: {
        username: fd.get('username') as string,
        display_name: fd.get('display_name') as string
      }
    }
  });

  if (error) return { error: error.message };

  if (user) {
    const username = (fd.get('username') as string) || user.id;
    const display_name = (fd.get('display_name') as string) || 'New User';
    const avatar_grad = 'av-' + ((user.id.charCodeAt(0) % 6) + 1);

    const { error: pError } = await s.from('profiles').upsert({
      id: user.id,
      username,
      display_name,
      avatar_grad
    });

    if (pError) return { error: pError.message };
  }

  redirect('/login');
}

export async function logout() {
  const s = await server();
  await s.auth.signOut();
  redirect('/login');
}

export async function createPost(fd: FormData) {
  try {
    const { s, user } = await uid();
    if (!user) return { error: 'Sign in first.' };

    await ensureProfile(s, user);

    const content = ((fd.get('content') as string) || '').trim();
    const media = (fd.get('media_url') as string) || null;

    if (!content && !media) return { error: 'Post is empty.' };

    const { error } = await s.from('posts').insert({
      user_id: user.id,
      content,
      media_url: media
    });

    if (error) return { error: error.message };

    return { ok: true };
  } catch (e: any) {
    return { error: e?.message || 'Unexpected error.' };
  }
}

export async function createStory(fd: FormData) {
  try {
    const { s, user } = await uid();
    if (!user) return { error: 'Sign in first.' };

    await ensureProfile(s, user);

    const content = ((fd.get('content') as string) || '').trim();
    if (!content) return { error: 'Story is empty.' };

    const gradient = (fd.get('gradient') as string) || 'g1';

    const { error } = await s.from('stories').insert({
      user_id: user.id,
      content,
      gradient,
      expires_at: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString()
    });

    if (error) return { error: error.message };

    return { ok: true };
  } catch (e: any) {
    return { error: e?.message || 'Unexpected error.' };
  }
}

export async function uploadMedia(fd: FormData) {
  try {
    const { s, user } = await uid();
    if (!user) return null;

    await ensureProfile(s, user);

    const f = fd.get('file') as File;
    if (!f) return null;

    const ext = f.name.split('.').pop()?.replace(/[^a-zA-Z0-9]/g, '') || 'jpg';
    const path = `${user.id}/${Date.now()}-${Math.random().toString(36).substring(2)}.${ext}`;

    const { error } = await s.storage.from('media').upload(path, f, {
      cacheControl: '3600',
      upsert: false,
      contentType: f.type || 'image/jpeg'
    });

    if (error) {
      console.error('Upload error:', error);
      return null;
    }

    const { data } = await s.storage.from('media').getPublicUrl(path);
    return data.publicUrl;
  } catch (e) {
    console.error('Upload catch:', e);
    return null;
  }
}

async function toggle(table: string, postId: string) {
  try {
    const { s, user } = await uid();
    if (!user) return;

    await ensureProfile(s, user);

    const { data } = await s
      .from(table)
      .select('*')
      .eq('user_id', user.id)
      .eq('post_id', postId)
      .maybeSingle();

    if (data) {
      await s.from(table).delete().eq('user_id', user.id).eq('post_id', postId);
    } else {
      await s.from(table).insert({ user_id: user.id, post_id: postId });
    }
  } catch (e) {
    console.error(e);
  }
}

export async function toggleLike(p: string) {
  await toggle('likes', p);
}

export async function toggleRepost(p: string) {
  await toggle('reposts', p);
}

export async function toggleBookmark(p: string) {
  await toggle('bookmarks', p);
}

export async function toggleFollow(t: string) {
  try {
    const { s, user } = await uid();
    if (!user || user.id === t) return;

    await ensureProfile(s, user);

    const { data } = await s
      .from('follows')
      .select('*')
      .eq('follower_id', user.id)
      .eq('following_id', t)
      .maybeSingle();

    if (data) {
      await s.from('follows').delete().eq('follower_id', user.id).eq('following_id', t);
    } else {
      await s.from('follows').insert({ follower_id: user.id, following_id: t });
    }
  } catch (e) {
    console.error(e);
  }
}

export async function updateProfile(fd: FormData) {
  try {
    const { s, user } = await uid();
    if (!user) return { error: 'Sign in first.' };

    await ensureProfile(s, user);

    const display_name = ((fd.get('display_name') as string) || '').trim();
    const bio = ((fd.get('bio') as string) || '').trim();
    const avatar_url = (fd.get('avatar_url') as string) || null;
    const banner_url = (fd.get('banner_url') as string) || null;

    if (!display_name) return { error: 'Name cannot be empty.' };

    const { error } = await s
      .from('profiles')
      .update({
        display_name,
        bio,
        avatar_url,
        banner_url
      })
      .eq('id', user.id);

    if (error) return { error: error.message };

    return { ok: true };
  } catch (e: any) {
    return { error: e?.message || 'Unexpected error.' };
  }
}