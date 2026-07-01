import type { Config } from 'tailwindcss';
const config: Config = { content: ['./app/**/*.{js,ts,jsx,tsx,mdx}', './components/**/*.{js,ts,jsx,tsx,mdx}'], theme: { extend: { colors: { scout: { 50: '#f4f8f3', 100: '#e6f0e3', 600: '#477446', 700: '#365d36', 900: '#203821' } } } }, plugins: [] };
export default config;
