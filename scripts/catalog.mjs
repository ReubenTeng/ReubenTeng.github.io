import { readdir, readFile } from 'node:fs/promises';
import path from 'node:path';
import { createHash } from 'node:crypto';

export const slug = (text) => text.normalize('NFKD').replace(/[\u0300-\u036f]/g, '').toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '') || 'album';
const hash = (text) => createHash('sha256').update(text).digest('hex').slice(0, 8);
export const titleFromFilename = (name) => path.parse(name).name.replace(/[_-]+/g, ' ').replace(/\b\w/g, c => c.toUpperCase());
async function metadata(directory) {
  try { return JSON.parse(await readFile(path.join(directory, 'album.json'), 'utf8')); }
  catch (error) { if (error.code === 'ENOENT') return {}; throw new Error(`Invalid album.json in ${directory}: ${error.message}`); }
}
export async function discoverAlbums(directory) {
  let entries;
  try { entries = await readdir(directory, { withFileTypes: true }); }
  catch (error) { if (error.code === 'ENOENT') return []; throw error; }
  const albums = [];
  for (const entry of entries.filter(e => e.isDirectory() && !e.name.startsWith('.')).sort((a,b) => a.name.localeCompare(b.name, 'en', { numeric: true }))) {
    const folder = path.join(directory, entry.name);
    const meta = await metadata(folder);
    const files = (await readdir(folder, { withFileTypes: true })).filter(e => e.isFile() && /\.(jpe?g|png|webp|avif)$/i.test(e.name)).map(e => e.name);
    const order = Array.isArray(meta.order) ? meta.order : [];
    files.sort((a,b) => {
      const ai = order.indexOf(a), bi = order.indexOf(b);
      return (ai < 0 ? Infinity : ai) - (bi < 0 ? Infinity : bi) || a.localeCompare(b, 'en', { numeric: true });
    });
    const photos = files.map(filename => {
      const detail = meta.photos?.[filename] || {};
      return { id: `${slug(path.parse(filename).name)}-${hash(filename)}`, filename, title: detail.title || titleFromFilename(filename), alt: detail.alt || `${titleFromFilename(filename)} — ${meta.title || entry.name}`, caption: detail.caption || '' };
    });
    albums.push({ id: `${slug(entry.name)}-${hash(entry.name)}`, directory: entry.name, title: meta.title || entry.name, description: meta.description || 'A collection of moments, seen along the way.', color: /^#[0-9a-f]{6}$/i.test(meta.color || '') ? meta.color : '#7f9270', cover: photos.find(p => p.filename === meta.cover)?.id || photos[0]?.id || null, photos });
  }
  return albums;
}
