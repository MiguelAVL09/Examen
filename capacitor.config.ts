import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'mx.cinepolis.capacitacion',
  appName: 'Cinépolis PRO',
  webDir: 'dist',
  backgroundColor: '#0a1224',
  server: { androidScheme: 'https' },
  plugins: { SystemBars: { insetsHandling: 'native', style: 'DARK' } },
};

export default config;
