import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL || 'YOUR_SUPABASE_URL';
const SUPABASE_ANON_KEY = import.meta.env.VITE_SUPABASE_ANON_KEY || 'YOUR_ANON_KEY';

export const sb = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

export type Profile = {
  id: string;
  username: string;
  display_name: string;
  bio: string | null;
  avatar_url: string | null;
  avatar_grad: string;
  banner_url: string | null;
  verified: 'blue' | 'gold' | null;
  following_count: number;
  followers_count: number;
  created_at: string;
};

export type Post = {
  id: string;
  user_id: string;
  content: string;
  media_url: string | null;
  parent_id: string | null;
  likes_count: number;
  reposts_count: number;
  replies_count: number;
  created_at: string;
  profiles: Profile;
};

export type Story = {
  id: string;
  user_id: string;
  content: string;
  gradient: string;
  expires_at: string;
  created_at: string;
  profiles: Profile;
};

export type Notif = {
  id: string;
  user_id: string;
  actor_id: string;
  type: string;
  post_id: string | null;
  read: boolean;
  created_at: string;
  actor: Profile;
};

export type Msg = {
  id: string;
  sender_id: string;
  recipient_id: string;
  content: string;
  read: boolean;
  created_at: string;
  sender: Profile;
};

export const timeAgo = (date: string) => {
  const s = Math.floor((Date.now() - new Date(date).getTime()) / 1000);
  if (s < 60) return `${s}s`;
  if (s < 3600) return `${Math.floor(s / 60)}m`;
  if (s < 86400) return `${Math.floor(s / 3600)}h`;
  if (s < 604800) return `${Math.floor(s / 86400)}d`;
  return new Date(date).toLocaleDateString();
};

export const fmt = (n: number) => {
  if (n < 1000) return n.toString();
  if (n < 1000000) return (n / 1000).toFixed(1) + 'K';
  return (n / 1000000).toFixed(1) + 'M';
};

// Auth
export const signUp = async (email: string, password: string, username: string) => {
  const { data, error } = await sb.auth.signUp({ email, password, options: { data: { username, display_name: username, avatar_grad: 'av-' + Math.ceil(Math.random() * 5) } } });
  if (error) return { error: error.message };
  return { data };
};

export const signIn = async (email: string, password: string) => {
  const { error } = await sb.auth.signInWithPassword({ email, password });
  if (error) return { error: error.message };
  return { data: true };
};

export const signOut = async () => {
  await sb.auth.signOut();
  window.location.reload();
};

// Posts
export const createPost = async (content: string, mediaUrl?: string) => {
  const { data: { user } } = await sb.auth.getUser();
  if (!user) return { error: 'Not logged in' };
  const { error } = await sb.from('posts').insert({
    user_id: user.id,
    content,
    media_url: mediaUrl || null
  });
  if (error) return { error: error.message };
  return { data: true };
};

export const toggleLike = async (postId: string) => {
  const { data: { user } } = await sb.auth.getUser();
  if (!user) return;
  const { data: existing } = await sb.from('likes').select('*').eq('user_id', user.id).eq('post_id', postId).maybeSingle();
  if (existing) {
    await sb.from('likes').delete().eq('user_id', user.id).eq('post_id', postId);
  } else {
    await sb.from('likes').insert({ user_id: user.id, post_id: postId });
  }
};

export const toggleRepost = async (postId: string) => {
  const { data: { user } } = await sb.auth.getUser();
  if (!user) return;
  const { data: existing } = await sb.from('reposts').select('*').eq('user_id', user.id).eq('post_id', postId).maybeSingle();
  if (existing) {
    await sb.from('reposts').delete().eq('user_id', user.id).eq('post_id', postId);
  } else {
    await sb.from('reposts').insert({ user_id: user.id, post_id: postId });
  }
};

export const toggleBookmark = async (postId: string) => {
  const { data: { user } } = await sb.auth.getUser();
  if (!user) return;
  const { data: existing } = await sb.from('bookmarks').select('*').eq('user_id', user.id).eq('post_id', postId).maybeSingle();
  if (existing) {
    await sb.from('bookmarks').delete().eq('user_id', user.id).eq('post_id', postId);
  } else {
    await sb.from('bookmarks').insert({ user_id: user.id, post_id: postId });
  }
};

export const toggleFollow = async (targetId: string) => {
  const { data: { user } } = await sb.auth.getUser();
  if (!user) return;
  const { data: existing } = await sb.from('follows').select('*').eq('follower_id', user.id).eq('following_id', targetId).maybeSingle();
  if (existing) {
    await sb.from('follows').delete().eq('follower_id', user.id).eq('following_id', targetId);
  } else {
    await sb.from('follows').insert({ follower_id: user.id, following_id: targetId });
  }
};

// Stories
export const createStory = async (content: string, gradient: string) => {
  const { data: { user } } = await sb.auth.getUser();
  if (!user) return { error: 'Not logged in' };
  const expires = new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString();
  const { error } = await sb.from('stories').insert({
    user_id: user.id,
    content,
    gradient,
    expires_at: expires
  });
  if (error) return { error: error.message };
  return { data: true };
};

// Profile
export const updateProfile = async (updates: Partial<Profile>) => {
  const { data: { user } } = await sb.auth.getUser();
  if (!user) return { error: 'Not logged in' };
  const { error } = await sb.from('profiles').update(updates).eq('id', user.id);
  if (error) return { error: error.message };
  return { data: true };
};

// Media upload
export const uploadMedia = async (file: File): Promise<string | null> => {
  const { data: { user } } = await sb.auth.getUser();
  if (!user) return null;
  const ext = file.name.split('.').pop();
  const path = `${user.id}/${Date.now()}.${ext}`;
  const { error } = await sb.storage.from('media').upload(path, file);
  if (error) return null;
  const { data } = sb.storage.from('media').getPublicUrl(path);
  return data.publicUrl;
};

// Notifications
export const fetchNotifications = async (): Promise<Notif[]> => {
  const { data: { user } } = await sb.auth.getUser();
  if (!user) return [];
  const { data } = await sb.from('notifications').select('*, actor:actor_id(*)').eq('user_id', user.id).order('created_at', { ascending: false }).limit(60);
  return (data as Notif[]) || [];
};

export const markNotifRead = async (id: string) => {
  await sb.from('notifications').update({ read: true }).eq('id', id);
};

// Send message
export const sendMessage = async (recipientId: string, content: string) => {
  const { data: { user } } = await sb.auth.getUser();
  if (!user) return { error: 'Not logged in' };
  const { error } = await sb.from('messages').insert({
    sender_id: user.id,
    recipient_id: recipientId,
    content
  });
  if (error) return { error: error.message };
  return { data: true };
};
