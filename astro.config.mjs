import { unified } from '@astrojs/markdown-remark';
import mdx from '@astrojs/mdx';
import sitemap from '@astrojs/sitemap';
import vercel from '@astrojs/vercel';
import autoImport from 'astro-auto-import';
import icon from 'astro-icon';
import pagefind from 'astro-pagefind';
import { defineConfig } from 'astro/config';

export default defineConfig({
  site: 'https://rxdevman.com',

  security: {
    checkOrigin: false,
  },
  markdown: {
    processor: unified(),
    shikiConfig: {
      theme: 'github-dark',
      wrap: true,
    },
  },
  integrations: [
    autoImport({
      imports: [
        // --- blog components  ---
        './src/components/blog/BlogPostCard.astro',
        './src/components/blog/Toc.astro',
        './src/components/blog/ViewCounter.astro',
        './src/components/blog/ShareButtons.astro',

        // --- content components  ---
        './src/components/content/CodeExplainer.astro',
        './src/components/content/GitCommand.astro',
        './src/components/content/Image.astro',
        './src/components/content/InfoBox.astro',
        './src/components/content/NarrativeSection.astro',
        './src/components/content/ProsCons.astro',
        './src/components/content/PullQuote.astro',
        './src/components/content/SideNote.astro',
        './src/components/content/Table.astro',
        './src/components/content/YouTube.astro',

        // --- layout components  ---
        './src/components/layout/Navbar.astro',

        // --- tools components  ---
        './src/components/tools/ToolCard.astro',

        // --- ui components  ---
        './src/components/ui/FeatureCard.astro',
        './src/components/ui/FeatureGrid.astro',
        './src/components/ui/ProgressBar.astro',
      ],
    }),
    mdx(),
    icon(),
    sitemap(),
    pagefind(),
  ],
  adapter: vercel({ imageService: true }),
});
