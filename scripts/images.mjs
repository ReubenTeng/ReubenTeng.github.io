import { open } from 'node:fs/promises';
import sharp from 'sharp';

export async function checkImageSource(input, label = input) {
  const file = await open(input, 'r');
  try {
    const buffer = Buffer.alloc(256);
    const { bytesRead } = await file.read(buffer, 0, buffer.length, 0);
    if (!bytesRead) throw new Error(`Image "${label}" is empty.`);
    if (buffer.subarray(0, bytesRead).toString('utf8').startsWith('version https://git-lfs.github.com/spec/v1')) {
      throw new Error(`Image "${label}" is a Git LFS pointer, not downloaded image data. Run "git lfs pull" locally, or set "lfs: true" on actions/checkout in GitHub Actions.`);
    }
  } finally {
    await file.close();
  }
}

export async function optimizePhoto(input, thumbnail, display, label = input) {
  try {
    await checkImageSource(input, label);
    // Sharp detects actual image data, including PNG and JPEG, regardless of extension case.
    const pipeline = sharp(input).rotate();
    await pipeline.clone().resize(480, 480, { fit: 'inside', withoutEnlargement: true }).webp({ quality: 78 }).toFile(thumbnail);
    const info = await pipeline.clone().resize(2400, 2400, { fit: 'inside', withoutEnlargement: true }).webp({ quality: 88 }).toFile(display);
    return { width: info.width, height: info.height };
  } catch (error) {
    throw new Error(`Could not build photograph "${label}": ${error.message}`, { cause: error });
  }
}
