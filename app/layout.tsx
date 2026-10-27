import type { Metadata } from 'next';
import 'maplibre-gl/dist/maplibre-gl.css';
import './globals.css';
export const metadata: Metadata = { title: 'ImpactLens SG · MRT planning workspace', description: 'Explore hypothetical MRT lines and compare modelled Singapore journeys.' };
export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return <html lang="en"><body>{children}</body></html>;
}
