import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

const repoName = process.env.GITHUB_REPOSITORY?.split('/')[1];
const isGithubActions = process.env.GITHUB_ACTIONS === 'true';

// For GitHub Pages project site: https://<user>.github.io/<repo>/
const base = process.env.VITE_BASE_PATH || (isGithubActions && repoName ? `/${repoName}/` : '/');

export default defineConfig({
  plugins: [react()],
  base,
})
