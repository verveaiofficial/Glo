import '@fontsource/inter/400.css';
import '@fontsource/inter/500.css';
import '@fontsource/inter/600.css';
import '@fontsource/inter/700.css';
import '@fontsource/inter/800.css';
import './globals.css';
import './polish.css';
import { createServerClient } from '@supabase/ssr';
import { cookies } from 'next/headers';
import { AuthProvider, ToastProvider, NavProvider, Shell, Loader, Realtime, RippleManager } from '@/components/core';

export const metadata = { title: 'Glo' };

export default async function RootLayout({ children }: { children: React.ReactNode }) {
  const c = await cookies();
  const s = createServerClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!, {
    cookies: { getAll: () => c.getAll(), setAll: (t) => { try { t.forEach(({ name, value, options }) => c.set(name, value, options)); } catch {} } }
  });
  const { data: { user } } = await s.auth.getUser();
  let profile = null;
  if (user) {
    const { data } = await s.from('profiles').select('*').eq('id', user.id).single();
    profile = data;
  }

  return (
    <html lang="en" style={{ colorScheme: 'dark' }} suppressHydrationWarning>
      <body style={{ colorScheme: 'dark' }} suppressHydrationWarning>
        <RippleManager />
        <AuthProvider userId={user?.id || null} profile={profile}>
          <ToastProvider>
            <NavProvider>
              <Loader />
              <Shell>{children}</Shell>
              {user && <Realtime />}
            </NavProvider>
          </ToastProvider>
        </AuthProvider>
      </body>
    </html>
  );
}