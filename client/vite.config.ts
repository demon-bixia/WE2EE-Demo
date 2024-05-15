import { sveltekit } from '@sveltejs/kit/vite';
import { defineConfig } from 'vite';
import fs from 'fs';

export default defineConfig({
	plugins: [sveltekit()],
	server: {
		https: {
			key: fs.readFileSync(`${__dirname}/certificates/server/key.pem`),
			cert: fs.readFileSync(`${__dirname}/certificates/server/crt.pem`)
		},
		proxy: {}
	}
});
