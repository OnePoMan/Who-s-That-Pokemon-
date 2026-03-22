import type { Metadata, Viewport } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Who's That Pokemon? - Draw & Guess",
  description: "A multiplayer Pokemon drawing and guessing game. Draw Pokemon from memory and challenge your friends to guess them!",
  manifest: "/manifest.json",
  icons: {
    icon: "/favicon.ico",
  },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
  themeColor: "#DC0A2D",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className="h-full antialiased">
      <body className="min-h-full flex flex-col">
        {/* Pokeball background pattern */}
        <div className="pokeball-bg" />

        {/* Pokedex frame */}
        <div className="relative z-10 flex-1 flex flex-col max-w-2xl mx-auto w-full p-2 sm:p-3">
          <div className="pokedex-frame flex-1 flex flex-col">
            {/* Indicator lights */}
            <div className="pokedex-lights">
              <div className="pokedex-light blue" />
              <div className="pokedex-light red" />
              <div className="pokedex-light green" />
            </div>

            {/* Screen */}
            <div className="pokedex-screen flex-1 flex flex-col">
              {children}
            </div>
          </div>
        </div>
      </body>
    </html>
  );
}
