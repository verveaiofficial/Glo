'use server';
import { createServerClient } from '@supabase/ssr';
import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';

async function server() {
  const c = await cookies();
  return createServerClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!, {
    cookies: { getAll: () => c.getAll(), setAll: (t) => { try { t.forEach(({ name, value, options }) => c.set(name, value, options)); } catch {} } }
  });
}

async function uid() { const s = await server(); const { data: { user } } = await s.auth.getUser(); return { s, user }; }

export async function login(fd: FormData) { 
  const s = await server(); 
  const { error } = await s.auth.signInWithPassword({ email: fd.get('email') as string, password: fd.get('password') as string }); 
  if (error) return { error: error.message }; 
  redirect('/'); 
}

export async function signup(fd: FormData) { 
  const s = await server(); 
  const { data: { user }, error } = await s.auth.signUp({ 
    email: fd.get('email') as string, 
    password: fd.get('password') as string, 
    options: { data: { username: fd.get('username') as string, display_name: fd.get('display_name') as string } } 
  }); 
  if (error) return { error: error.message }; 
  
  if (user) {
    const username = (fd.get('username') as string) || user.id;
    const display_name = (fd.get('display_name') as string) || 'New User';
    const avatar_grad = 'av-' + ((user.id.charCodeAt(0) % 6) + 1);
    const { error: pError } = await s.from('profiles').upsert({ id: user.id, username, display_name, avatar_grad });
    if (pError) return { error: pError.message };
  }
  
  redirect('/login'); 
}

export async function logout() { const s = await server(); await s.auth.signOut(); redirect('/login'); }

export async function createPost(fd: FormData) {
  try {
    const { s, user } = await uid();
    if (!user) return { error: 'Sign in first.' };
    const content = ((fd.get('content') as string) || '').trim();
    const media = (fd.get('media_url') as string) || null;
    if (!content && !media) return { error: 'Post is empty.' };
    const { error } = await s.from('posts').insert({ user_id: user.id, content, media_url: media });
    if (error) return { error: error.message };
    return { ok: true };
  } catch (e: any) { return { error: e?.message || 'Unexpected error.' }; }
}

export async function createStory(fd: FormData) {
  try {
    const { s, user } = await uid();
    if (!user) return { error: 'Sign in first.' };
    const content = ((fd.get('content') as string) || '').trim();
    if (!content) return { error: 'Story is empty.' };
    const gradient = (fd.get('gradient') as string) || 'g1';
    const { error } = await s.from('stories').insert({ user_id: user.id, content, gradient });
    if (error) return { error: error.message };
    return { ok: true };
  } catch (e: any) { return { error: e?.message || 'Unexpected error.' }; }
}

export async function uploadMedia(fd: FormData) {
  try {
    const { s, user } = await uid(); 
    if (!user) return null;
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

async function toggle(table: string, postId: string, countField: string) {
  try {
    const { s, user } = await uid(); if (!user) return;
    const { data } = await s.from(table).select('*').eq('user_id', user.id).eq('post_id', postId).maybeSingle();
    let isLiked = !!data;
    
    if (isLiked) {
      await s.from(table).delete().eq('user_id', user.id).eq('post_id', postId);
    } else {
      await s.from(table).insert({ user_id: user.id, post_id: postId });
    }
    
    if (countField) {
      const { data: postData } = await s.from('posts').select(countField).eq('id', postId).single();
      if (postData) {
        // FIX: Cast to 'any' to bypass TypeScript's strict dynamic key access error
        const currentCount = (postData as any)[countField] || 0;
        const newCount = Math.max(0, currentCount + (isLiked ? -1 : 1));
        await s.from('posts').update({ [countField]: newCount }).eq('id', postId);
      }
    }
  } catch (e) { console.error(e); }
}

export async function toggleLike(p: string) { await toggle('likes', p, 'likes_count'); }
export async function toggleRepost(p: string) { await toggle('reposts', p, 'reposts_count'); }
export async function toggleBookmark(p: string) { await toggle('bookmarks', p, ''); }

export async function toggleFollow(t: string) {
  try {
    const { s, user } = await uid(); if (!user || user.id === t) return;
    const { data } = await s.from('follows').select('*').eq('follower_id', user.id).eq('following_id', t).maybeSingle();
    let isFollowing = !!data;
    
    if (isFollowing) {
      await s.from('follows').delete().eq('follower_id', user.id).eq('following_id', t);
    } else {
      await s.from('follows').insert({ follower_id: user.id, following_id: t });
    }

    const { data: targetProfile } = await s.from('profiles').select('followers_count').eq('id', t).single();
    if (targetProfile) {
      const targetCount = (targetProfile as any).followers_count || 0;
      await s.from('profiles').update({ followers_count: Math.max(0, targetCount + (isFollowing ? -1 : 1)) }).eq('id', t);
    }
    
    const { data: myProfile } = await s.from('profiles').select('following_count').eq('id', user.id).single();
    if (myProfile) {
      const myCount = (myProfile as any).following_count || 0;
      await s.from('profiles').update({ following_count: Math.max(0, myCount + (isFollowing ? -1 : 1)) }).eq('id', user.id);
    }
  } catch (e) { console.error(e); }
}

export async function updateProfile(fd: FormData) {
  try {
    const { s, user } = await uid(); if (!user) return;
    await s.from('profiles').update({ display_name: fd.get('display_name') as string, bio: fd.get('bio') as string }).eq('id', user.id);
  } catch {}
}