import { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'com.taskora.app',
  appName: 'Taskora',
  webDir: 'dist',
  server: {
    androidScheme: 'https'
  }
};

export default config;
