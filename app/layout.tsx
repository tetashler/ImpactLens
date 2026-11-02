import type { Metadata } from 'next';
import { Bricolage_Grotesque, Instrument_Sans } from 'next/font/google';
import 'maplibre-gl/dist/maplibre-gl.css';
import './globals.css';
const display = Bricolage_Grotesque({ subsets: ['latin'], variable: '--font-display', display: 'swap' });
const text = Instrument_Sans({ subsets: ['latin'], variable: '--font-text', display: 'swap' });
export const metadata: Metadata = { title: 'ImpactLens SG · What if?', description: 'Explore Singapore, plan hypothetical changes and compare evidence-informed accessibility scenarios.' };
export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return <html lang="en" className={`${display.variable} ${text.variable}`}><body>{children}</body></html>;
}
