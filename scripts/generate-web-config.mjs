import { readFile, writeFile } from 'fs/promises';
import path from 'path';
import { fileURLToPath } from 'url';

// Setup __dirname equivalent in ESM
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Get homepage from env variable
const homepage = process.env.VITE_HOMEPAGE;

if (!homepage) {
    console.error('❌ VITE_HOMEPAGE is not defined. Check your .env file or build script.');
    process.exit(1);
}

// Define paths
const templatePath = path.resolve(__dirname, '../web.config.template');
const outputPath = path.resolve(__dirname, '../dist/web.config');

// Read, replace, and write
try {
    let template = await readFile(templatePath, 'utf-8');
    template = template.replace(/__HOMEPAGE__/g, homepage);
    await writeFile(outputPath, template);
    console.log(`✅ web.config generated with homepage: ${homepage}`);
} catch (err) {
    console.error('❌ Error generating web.config:', err);
    process.exit(1);
}