import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: 'AI Question Generator | 50 Progressive Technical & Interview Questions',
  description: 'Turn any topic, technology, or interview subject into 50 progressively challenging questions from Beginner to Staff/Challenge level in English, Hindi, and Hinglish.',
  keywords: ['AI Question Generator', 'Interview Questions', 'Coding Questions', 'MCQ', 'Python OOP', 'DSA', 'Next.js', 'OpenAI'],
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" className="dark">
      <body className="min-h-screen bg-[#090b10] text-gray-100 antialiased selection:bg-indigo-500 selection:text-white">
        {children}
      </body>
    </html>
  );
}
