import type { Metadata } from 'next'
import { Suspense } from 'react'
import { Inter, IBM_Plex_Sans_Arabic } from 'next/font/google'
import { UIProvider } from '@/lib/ui-context'
import MetaPixel from '@/components/analytics/MetaPixel'
import './globals.css'

const inter = Inter({
  subsets: ['latin'],
  variable: '--font-inter',
  display: 'swap',
})

const plexArabic = IBM_Plex_Sans_Arabic({
  subsets: ['arabic'],
  weight: ['400', '500', '600', '700'],
  variable: '--font-plex-arabic',
  display: 'swap',
})

export const metadata: Metadata = {
  title: 'NeuraOps — Intelligent Operations',
  description: 'AI agents that handle your customer support, 24/7.',
}

const antiFlashScript = `
(function() {
  try {
    var theme = localStorage.getItem('neuraops-theme') || 'dark';
    var lang = localStorage.getItem('neuraops-lang') || 'ar';
    var html = document.documentElement;
    if (theme === 'dark') html.classList.add('dark');
    else html.classList.remove('dark');
    html.lang = lang;
    html.dir = lang === 'ar' ? 'rtl' : 'ltr';
  } catch (e) {}
})();
`

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="ar" dir="rtl" className="dark" suppressHydrationWarning>
      <head>
        <script dangerouslySetInnerHTML={{ __html: antiFlashScript }} />
      </head>
      <body
        className={`${inter.variable} ${plexArabic.variable} font-arabic bg-paper-50 text-ink-950 dark:bg-ink-950 dark:text-paper-50 transition-colors duration-300`}
        suppressHydrationWarning
      >
        <Suspense fallback={null}>
          <MetaPixel />
        </Suspense>
        <UIProvider>{children}</UIProvider>
      </body>
    </html>
  )
}
