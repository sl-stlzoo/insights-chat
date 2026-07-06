// @ts-check
import { defineConfig } from 'astro/config';
import react from '@astrojs/react';
import starlight from '@astrojs/starlight';

// https://astro.build/config
export default defineConfig({
	base: '/docs',
	integrations: [
		react(),
		starlight({
			title: 'Maude Delivery Docs',
			description: 'Architecture, deployment, ADRs, phase tracking, and repository guides for the Azure Container Apps modernization.',
			components: {
				Search: './src/components/Search.astro',
			},
			customCss: ['./src/styles/custom.css'],
			social: [{ icon: 'github', label: 'Source Repository', href: 'https://github.com/motherduckdb/maude-claude-mcp-demo' }],
			sidebar: [
				{
					label: 'Overview',
					items: [
						{ label: 'Project Overview', slug: '' },
						{ label: 'Search', slug: 'search' },
					],
				},
				{
					label: 'Getting Started',
					items: [{ autogenerate: { directory: 'getting-started' } }],
				},
				{
					label: 'Platform',
					items: [{ autogenerate: { directory: 'platform' } }],
				},
				{
					label: 'Project',
					items: [{ autogenerate: { directory: 'project' } }],
				},
				{
					label: 'ADRs',
					items: [{ autogenerate: { directory: 'adr' } }],
				},
				{
					label: 'Repository READMEs',
					items: [{ autogenerate: { directory: 'repository' } }],
				},
			],
		}),
	],
});
