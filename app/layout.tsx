import type { Metadata } from 'next';
import { Inter, Montserrat, JetBrains_Mono } from 'next/font/google';
import './globals.css';

const montserrat = Montserrat({
  subsets: ['latin'],
  weight: ['600', '700'],
  variable: '--font-montserrat',
});

const inter = Inter({
  subsets: ['latin'],
  weight: ['400', '500'],
  variable: '--font-inter',
});

const jetbrainsMono = JetBrains_Mono({
  subsets: ['latin'],
  weight: ['500'],
  variable: '--font-jetbrains',
});

export const metadata: Metadata = {
  title: 'ILUNI FT ELEKTRO UNPAK - Alumni Database & Networking Platform',
  description:
    'Jaringan Alumni Fakultas Teknik Program Studi Teknik Elektro Universitas Pakuan Bogor. Hubungkan kembali dengan rekan sejawat, temukan peluang karir, dan bangun jejaring profesional.',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="id" className="light">
      <body
        className={`${montserrat.variable} ${inter.variable} ${jetbrainsMono.variable} font-inter bg-surface text-on-surface antialiased`}
      >
        {children}
      </body>
    </html>
  );
}