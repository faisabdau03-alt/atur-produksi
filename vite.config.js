import { defineConfig } from 'vite';
import { mysqlApiPlugin } from './server/apiPlugin.js';

export default defineConfig({
  plugins: [mysqlApiPlugin()],
  server: {
    host: true,
    port: 5173,
  },
});
