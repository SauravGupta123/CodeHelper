/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        'vscode-bg': '#1e1e1e',
        'vscode-surface': '#252526',
        'vscode-border': '#3c3c3c',
        'vscode-text': '#d4d4d4',
        'vscode-muted': '#a0a0a0',
        'vscode-accent': '#007acc',
        'vscode-success': '#4caf50',
        'vscode-warn': '#ffd700',
      }
    },
  },
  plugins: [],
}
