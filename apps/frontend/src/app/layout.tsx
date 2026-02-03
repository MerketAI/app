import type { Metadata } from 'next';
import { Inter } from 'next/font/google';
import './globals.css';
import { Providers } from '@/components/providers';

const inter = Inter({
  subsets: ['latin'],
  variable: '--font-inter',
});

export const metadata: Metadata = {
  title: 'Jeeper - AI Marketing Automation Platform',
  description: 'Put AI agents to work for your marketing. Generate content, automate campaigns, and grow your business with AI-powered marketing automation.',
  keywords: ['AI marketing', 'content generation', 'marketing automation', 'social media management'],
  openGraph: {
    title: 'Jeeper - AI Marketing Automation Platform',
    description: 'Put AI agents to work for your marketing',
    type: 'website',
  },
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" className={inter.variable}>
      <body className={`${inter.className} min-h-screen`}>
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
