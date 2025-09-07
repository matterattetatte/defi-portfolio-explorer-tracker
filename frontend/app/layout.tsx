import "./theme.css";
import "@coinbase/onchainkit/styles.css";
import type { Metadata, Viewport } from "next";
import "./globals.css";
import { Providers } from "./providers";

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
};

export async function generateMetadata(): Promise<Metadata> {
  const baseUrl = 'https://defi-portfolio-explorer-tracker-39io7hey6.vercel.app';
  
  return {
    title: "Pool keeper - DeFi Portfolio Explorer",
    description: "Advanced liquidity pool analytics and historical insights for DeFi portfolios",
    other: {
      'fc:frame': JSON.stringify({
        version: 'vNext',
        imageUrl: `${baseUrl}/hero.png`,
        button: {
          title: 'Launch Pool keeper',
          action: {
            type: 'launch_miniapp',
            name: 'Pool keeper',
            url: baseUrl,
            splashImageUrl: `${baseUrl}/splash.png`,
            splashBackgroundColor: '#ffffff'
          }
        }
      })
    }
  };
}


export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className="bg-background">
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
