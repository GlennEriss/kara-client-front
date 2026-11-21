import { RetireLegacyPwa } from "@/components/browser/RetireLegacyPwa";
import Providers from "@/providers/Providers";
import { Analytics } from "@vercel/analytics/next";
import "./globals.css";

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className="antialiased">
        <Providers>
          {children}
        </Providers>
        <RetireLegacyPwa />
        <Analytics />
      </body>
    </html>
  );
}
