#!/usr/bin/env node
// 이미지 폴더를 스캔해 manifest.json 을 만든다.
// 사용: node tools/make-manifest.mjs [폴더경로=images]
import { readdir, writeFile } from 'node:fs/promises';
import { join } from 'node:path';

const dir = process.argv[2] || 'images';
const files = (await readdir(dir))
  .filter((f) => /\.(jpe?g|png|webp|avif|gif|svg|bmp)$/i.test(f) && !f.startsWith('.'))
  .sort((a, b) => a.localeCompare(b, undefined, { numeric: true }));

await writeFile(join(dir, 'manifest.json'), JSON.stringify(files, null, 2) + '\n');
console.log(`${join(dir, 'manifest.json')} — ${files.length}개 이미지`);
