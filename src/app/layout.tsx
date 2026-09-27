import type { Metadata, Viewport } from 'next';
import { Fredoka, Press_Start_2P } from 'next/font/google';
import ServiceWorkerRegistrar from '@/components/ServiceWorkerRegistrar';
import './globals.css';

// next/font downloads these at build time and serves them from this site, so no request goes
// to Google when someone plays.
const pressStart = Press_Start_2P({ weight: '400', subsets: ['latin'], variable: '--font-press-start', display: 'swap' });
const fredoka = Fredoka({ subsets: ['latin'], variable: '--font-fredoka', display: 'swap' });

export const metadata: Metadata = {
  title: "Who's That Pokémon? — Draw & Guess",
  description: 'Draw Pokémon from memory and challenge a friend to guess them, on one phone or two.',
  applicationName: "Who's That Pokémon?",
  appleWebApp: { capable: true, title: 'Draw & Guess', statusBarStyle: 'black-translucent' },
  formatDetection: { telephone: false },
};

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  // Pinch-zoom stays available for accessibility; the canvas opts out of browser gestures itself.
  viewportFit: 'cover',
  themeColor: '#DC0A2D',
};

// Applies a theme chosen in settings before the first paint ("system" leaves it to the device).
const THEME_SCRIPT = `(function(){try{var t=JSON.parse(localStorage.getItem("wtp-prefs")||"{}").theme;if(t==="light"||t==="dark")document.documentElement.setAttribute("data-theme",t)}catch(e){}})()`;

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en" className={`h-full antialiased ${pressStart.variable} ${fredoka.variable}`} suppressHydrationWarning>
      <head>
        <script dangerouslySetInnerHTML={{ __html: THEME_SCRIPT }} />
      </head>
      <body className="min-h-full flex flex-col">
        <div className="pokeball-bg" aria-hidden />
        <div className="pokedex-shell relative z-10 flex-1 flex flex-col max-w-2xl mx-auto w-full p-2 sm:p-3">
          <div className="pokedex-frame flex-1 flex flex-col">
            <div className="pokedex-lights" aria-hidden>
              <div className="pokedex-light blue" />
              <div className="pokedex-light red" />
              <div className="pokedex-light green" />
            </div>
            <div className="pokedex-screen flex-1 flex flex-col">{children}</div>
          </div>
        </div>
        <ServiceWorkerRegistrar />
      </body>
    </html>
  );
}
