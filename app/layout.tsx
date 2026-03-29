import type { Metadata, Viewport } from "next";
import "./globals.css";
import { LoveThemeProvider } from "@/components/LoveThemeProvider";
import { Providers } from "@/components/Providers";

export const metadata: Metadata = {
  title: "Our Little World",
  description: "A private digital home for two.",
  manifest: "/manifest.json",
  appleWebApp: {
    capable: true,
    statusBarStyle: "default",
    title: "Our Little World",
  },
};

export const viewport: Viewport = {
  themeColor: "#0056b3",
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        <script
          dangerouslySetInnerHTML={{
            __html: `
              if ('serviceWorker' in navigator) {
                window.addEventListener('load', async () => {
                  let didReloadForController = false;

                  try {
                    if ('${process.env.NODE_ENV}' === 'production') {
                      navigator.serviceWorker.addEventListener('controllerchange', () => {
                        if (didReloadForController) return;
                        didReloadForController = true;
                        window.location.reload();
                      });
                    }

                    const registration = await navigator.serviceWorker.register('/sw.js');
                    await registration.update();
                  } catch (error) {
                    console.warn('Service worker registration failed', error);
                  }
                });
              }
            `,
          }}
        />
      </head>
      <body
        className="bg-romantic-warm text-slate-800 antialiased"
        suppressHydrationWarning
      >
        <Providers>
          <LoveThemeProvider>
            {children}
          </LoveThemeProvider>
        </Providers>
      </body>
    </html>
  );
}
