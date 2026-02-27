import type { Config } from 'tailwindcss';

const config: Config = {
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        table: '#0f3d2e',
        accent: '#f59e0b'
      }
    }
  },
  plugins: []
};

export default config;
