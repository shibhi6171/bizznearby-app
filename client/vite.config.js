import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

// VITE_BASE=./ and VITE_HASH_ROUTER=1 make a build that works from a sub-folder such as GitHub Pages
// (https://user.github.io/repo/). Netlify, Vercel and Render use the defaults.
export default defineConfig({ base: process.env.VITE_BASE || '/', plugins: [react()], server: { port: 5173 } });
