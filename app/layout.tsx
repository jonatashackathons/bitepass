import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: 'BitePass — Autonomous Culinary Agent',
  description:
    'Effortless lunch ordering powered by Gemini 4 Argon, 2-phase PayPal escrow authorization, and real-time kitchen observability.',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" className="bg-[#FAF9F5]">
      <body className="min-h-screen bg-[#FAF9F5] text-[#1C1917] antialiased selection:bg-[#E05A38] selection:text-white font-sans">
        {children}
      </body>
    </html>
  );
}
