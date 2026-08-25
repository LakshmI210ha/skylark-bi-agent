// app/layout.tsx
import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: 'Skylark Drones — Monday.com Business Intelligence Agent',
  description:
    'Conversational Executive Business Intelligence Agent answering founder-level pipeline and operational questions with live Monday.com data.',
  keywords: ['Skylark Drones', 'Business Intelligence', 'Monday.com', 'AI Agent', 'Pipeline Analytics'],
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body>
        <main>{children}</main>
      </body>
    </html>
  );
}
