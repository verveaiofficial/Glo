import { createBrowserClient } from '@supabase/ssr';
export function sb(){ return createBrowserClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!); }

export type Profile={id:string;username:string;display_name:string;bio:string;avatar_grad:string;verified:'blue'|'gold'|null;followers_count:number;following_count:number;created_at:string};
export type Post={id:string;user_id:string;content:string;media_url:string|null;parent_id:string|null;repost_of:string|null;likes_count:number;reposts_count:number;replies_count:number;created_at:string;profiles?:Profile|null};
export type Story={id:string;user_id:string;content:string;gradient:string;created_at:string;expires_at:string;profiles?:Profile|null};
export type Notif={id:string;user_id:string;actor_id:string;type:string;post_id:string|null;read:boolean;created_at:string;actor?:Profile|null};
export type Msg={id:string;sender_id:string;recipient_id:string;content:string;read:boolean;created_at:string;sender?:Profile|null};

export const fmt=(n:number)=> n>=1000 ? (n/1000).toFixed(1).replace('.0','')+'K' : String(n);
export function timeAgo(iso:string){ const s=Math.floor((Date.now()-new Date(iso).getTime())/1000); if(s<60)return'now'; if(s<3600)return Math.floor(s/60)+'m'; if(s<86400)return Math.floor(s/3600)+'h'; return Math.floor(s/86400)+'d'; }
