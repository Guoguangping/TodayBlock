'use strict';

const { spawn } = require('node:child_process');
const fs = require('node:fs');
const path = require('node:path');

const root = path.resolve(__dirname, '..');
const candidates = [
  path.join(root, '.cache', 'electron-dist', 'electron.exe'),
  path.join(root, 'node_modules', 'electron', 'dist', 'electron.exe')
];
const electron = candidates.find((candidate) => fs.existsSync(candidate));

if (!electron) {
  console.error('Electron binary not found.');
  console.error('Download electron-v45.0.0-win32-x64.zip and extract it to .cache/electron-dist/');
  process.exit(1);
}

const forwarded = process.argv.slice(2);
const env = { ...process.env };
delete env.ELECTRON_RUN_AS_NODE;
const child = spawn(electron, [root, ...forwarded], {
  cwd: root,
  env,
  stdio: 'inherit',
  windowsHide: false
});

child.on('exit', (code, signal) => {
  if (signal) process.kill(process.pid, signal);
  else process.exit(code ?? 0);
});
