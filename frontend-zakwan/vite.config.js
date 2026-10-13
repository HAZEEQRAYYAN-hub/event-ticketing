import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'

// Vite settings for Tixora.
// - react(): lets Vite understand React code (.jsx files)
// - tailwindcss(): turns Tailwind class names into real CSS
export default defineConfig({
  plugins: [react(), tailwindcss()],
  server: {
    port: 5173, // the website opens at http://localhost:5173
  },
})