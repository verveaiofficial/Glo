'use server';
import { createServerClient } from '@supabase/ssr';
import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';
import { revalidatePath } from 'next/cache';

async function server(){
  const c=await cookies();
  return createServerClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!, {
    cookies:{ getAll:()=>c.getAll(), setAll:t=>{try{t.forEach(({name,value,options})=>c.set(name,value,options));}catch{}} }
  });
}
async function uid(){ const s=await server(); const {data:{user}}=await s.auth.getUser(); return {s,user}; }

export async function login(fd:FormData){ const s=await server(); const {error}=await s.auth.signInWithPassword({email:fd.get('email')as string,password:fd.get('password')as string}); if(error)return{error:error.message}; redirect('/'); }
export async function signup(fd:FormData){ const s=await server(); const {error}=await s.auth.signUp({email:fd.get('email')as string,password:fd.get('password')as string,options:{data:{username:fd.get('username')as string,display_name:fd.get('display_name')as string}}}); if(error)return{error:error.message}; redirect('/login'); }
export async function logout(){ const s=await server(); await s.auth.signOut(); redirect('/login'); }

export async function createPost(fd:FormData){ const {s,user}=await uid(); if(!user)return; const content=(fd.get('content')as string)||''; const media=(fd.get('media_url')as string)||null; if(!content.trim()&&!media)return; await s.from('posts').insert({user_id:user.id,content,media_url:media}); }
export async function uploadMedia(fd:FormData){ const {s,user}=await uid(); if(!user)return null; const f=fd.get('file')as File; if(!f)return null; const path=`${user.id}/${Date.now()}-${f.name}`; const {error}=await s.storage.from('media').upload(path,f); if(error)return null; const {data}=await s.storage.from('media').getPublicUrl(path); return data.publicUrl; }

async function toggle(table:string,postId:string){ const {s,user}=await uid(); if(!user)return; const {data}=await s.from(table).select('*').eq('user_id',user.id).eq('post_id',postId).maybeSingle(); if(data)await s.from(table).delete().eq('user_id',user.id).eq('post_id',postId); else await s.from(table).insert({user_id:user.id,post_id:postId}); }
export async function toggleLike(p:string){await toggle('likes',p);} export async function toggleRepost(p:string){await toggle('reposts',p);} export async function toggleBookmark(p:string){await toggle('bookmarks',p);}
export async function toggleFollow(t:string){ const {s,user}=await uid(); if(!user||user.id===t)return; const {data}=await s.from('follows').select('*').eq('follower_id',user.id).eq('following_id',t).maybeSingle(); if(data)await s.from('follows').delete().eq('follower_id',user.id).eq('following_id',t); else await s.from('follows').insert({follower_id:user.id,following_id:t}); }
export async function updateProfile(fd:FormData){ const {s,user}=await uid(); if(!user)return; await s.from('profiles').update({display_name:fd.get('display_name')as string,bio:fd.get('bio')as string}).eq('id',user.id); }
