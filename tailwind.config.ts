import type { Config } from 'tailwindcss';
import almaPreset from './alma.preset';

const config: Config = {
  presets: [almaPreset],
  content: ['./src/**/*.{ts,tsx}'],
  darkMode: ['selector', '[data-theme="dark"]'],
};

export default config;
