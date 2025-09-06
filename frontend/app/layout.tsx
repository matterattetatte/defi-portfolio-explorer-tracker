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
  return {
    title: "DeFi Portfolio Explorer",
    description: "Advanced liquidity pool analytics and historical insights for DeFi portfolios",
    other: {
      'fc:frame': JSON.stringify({
        version: 'next',
        imageUrl: 'https://s3.filebin.net/filebin/2a20180f07158350aea9a3d17e4c545ef0a00135c80e54dae920b06af370adc7/ed25798971065000b810aaee06993d6d3360f366f69024c5cadeb08066ba943a?X-Amz-Algorithm=AWS4-HMAC-SHA256&X-Amz-Credential=7pMj6hGeoKewqmMQILjm%2F20250906%2Fus-east-1%2Fs3%2Faws4_request&X-Amz-Date=20250906T180042Z&X-Amz-Expires=60&X-Amz-SignedHeaders=host&response-cache-control=max-age%3D60&response-content-disposition=inline%3B%20filename%3D%22image%20%283%29.png%22&response-content-type=image%2Fpng&X-Amz-Signature=6a0baf937050f505426fe4554e5732a9a8915c1e6427378d379cc5c635ea7b12',
        button: {
          title: 'Pool keeper',
          action: {
            type: 'launch_frame',
            name: 'Pool keeper',
            url: 'https://defi-portfolio-explorer-tracker-39io7hey6.vercel.app'
          }
        }
    })
  }
}
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
