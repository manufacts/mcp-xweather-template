import { mkdir, readFile, writeFile } from 'node:fs/promises';
const target=new URL('../public/maplibre/',import.meta.url);
await mkdir(target,{recursive:true});
// Explicit module-worker URLs survive view bundling. .js ensures the public
// asset server sends a JavaScript MIME type inside an MCP App sandbox.
for(const name of ['maplibre-gl-worker','maplibre-gl-shared']) {
  const source=await readFile(new URL('../node_modules/maplibre-gl/dist/'+name+'.mjs',import.meta.url),'utf8');
  await writeFile(new URL(name+'.js',target),source.replaceAll('./maplibre-gl-shared.mjs','./maplibre-gl-shared.js').replace(/\/\/# sourceMappingURL=.*$/gm,''));
}
