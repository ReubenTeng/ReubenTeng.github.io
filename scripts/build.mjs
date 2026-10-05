import { mkdir, writeFile, cp, rm } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { discoverAlbums } from './catalog.mjs';
import { optimizePhoto } from './images.mjs';

const root = fileURLToPath(new URL('../', import.meta.url));
const destination = path.join(root, 'dist');
// Only generated output is removed; photo originals are never modified.
if (path.dirname(destination) !== path.resolve(root)) throw new Error('Unsafe output directory');
await rm(destination, { recursive: true, force: true });
await mkdir(path.join(destination, 'media'), { recursive: true });
const albums = await discoverAlbums(path.join(root, 'photos'));
for (const album of albums) {
  for (const photo of album.photos) {
    const input = path.join(root, 'photos', album.directory, photo.filename);
    const stem = `${album.id}-${photo.id}`;
    photo.thumbnail = `./media/${stem}-thumb.webp`;
    photo.src = `./media/${stem}.webp`;
    const label = `photos/${album.directory}/${photo.filename}`;
    console.log(`Processing ${label}`);
    const info = await optimizePhoto(input, path.join(destination, photo.thumbnail), path.join(destination, photo.src), label);
    photo.width = info.width;
    photo.height = info.height;
    delete photo.filename;
  }
  delete album.directory;
}
await writeFile(path.join(destination, 'albums.json'), JSON.stringify(albums, null, 2));
await cp(path.join(root, 'src'), path.join(destination, 'src'), { recursive: true });
for (const name of ['index.html', 'favicon.svg']) await cp(path.join(root, name), path.join(destination, name));
await writeFile(path.join(destination, '.nojekyll'), '');
console.log(`Built ${albums.length} albums and ${albums.reduce((sum, a) => sum + a.photos.length, 0)} photos → dist/`);
