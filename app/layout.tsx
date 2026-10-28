import type { Metadata } from 'next';
import 'maplibre-gl/dist/maplibre-gl.css';
import './globals.css';
export const metadata: Metadata = { title: 'ImpactLens SG · What if?', description: 'Explore Singapore, plan hypothetical changes and compare evidence-informed accessibility scenarios.' };
export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return <html lang="en"><body>{children}</body></html>;
}
