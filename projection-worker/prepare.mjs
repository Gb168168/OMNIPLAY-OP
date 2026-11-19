import { copyFile, mkdir, readFile, writeFile } from 'node:fs/promises';

const repo = new URL('../', import.meta.url);
const build = new URL('tmp/customer-view-function/', repo);
await mkdir(build, {recursive:true});
for (const name of ['member-model.js','group-field-values.js','pagcor-approval-model.js',
  'game-list-source.js','resource-links.js']) await copyFile(new URL(name,repo),new URL(name,build));
for (const name of ['index.js','package.json']) await copyFile(new URL(name,import.meta.url),new URL(name,build));
const sync = await readFile(new URL('sync.js',import.meta.url),'utf8');
await writeFile(new URL('sync.js',build),sync.replace("'../member-model.js'","'./member-model.js'"));
