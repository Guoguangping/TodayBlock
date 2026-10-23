'use strict';

const fs = require('node:fs');
const path = require('node:path');
const { execFileSync } = require('node:child_process');

const root = path.resolve(__dirname, '..');
const electronDir = path.join(root, '.cache', 'electron-dist');
const stage = path.join(root, 'build', 'app');
const out = process.env.TODAYBLOCK_OUT
  ? path.resolve(root, process.env.TODAYBLOCK_OUT)
  : path.join(root, 'release', 'TodayBlock');
const exe = path.join(out, 'TodayBlock.exe');

if (!fs.existsSync(path.join(electronDir, 'electron.exe'))) {
  console.error('Electron runtime missing.');
  console.error('Extract electron-v45.0.0-win32-x64.zip into .cache/electron-dist/');
  process.exit(1);
}

if (!fs.existsSync(path.join(stage, 'node_modules', 'mammoth'))) {
  console.error('Packaged dependencies missing.');
  console.error('Run once:');
  console.error('  cd build/app');
  console.error('  pnpm install --prod --node-linker=hoisted --ignore-scripts');
  process.exit(1);
}

for (const entry of ['main.js', 'preload.js', 'src', 'assets']) {
  const from = path.join(root, entry);
  const to = path.join(stage, entry);
  if (fs.existsSync(from)) {
    fs.rmSync(to, { recursive: true, force: true });
    fs.cpSync(from, to, { recursive: true });
  }
}

fs.rmSync(out, { recursive: true, force: true });
fs.mkdirSync(path.dirname(out), { recursive: true });
fs.cpSync(electronDir, out, { recursive: true });

const appOut = path.join(out, 'resources', 'app');
fs.mkdirSync(path.dirname(appOut), { recursive: true });
fs.cpSync(stage, appOut, { recursive: true });

fs.renameSync(path.join(out, 'electron.exe'), exe);
execFileSync(process.execPath, [path.join(root, 'tools', 'set-exe-resources.js'), exe], {
  stdio: 'inherit'
});

fs.writeFileSync(path.join(out, '使用说明.txt'), [
  'TodayBlock 0.1.0',
  '',
  '双击 TodayBlock.exe 启动。',
  '启动后右上角出现悬浮块：大数字=今天到期且未完成，红色角标=逾期。',
  '',
  '单击悬浮块：展开日历。',
  '拖动悬浮块：移动位置。',
  'Esc / 右上角 ×：收起。',
  '面板右上角「全览」：打开工作看板，可搜索、筛选、拖动状态、批量操作和导出。',
  '回收站：删除的任务会先进入回收站，可恢复或彻底删除。',
  '托盘图标：显示/隐藏、展开日历、暂停提醒、开机启动、退出。',
  '快捷键：Ctrl+Alt+T 展开/收起。',
  '',
  '拖文件：把 PDF / DOCX / XLSX / XLS / TXT / MD 拖到悬浮块或日历上，等待预览，确认后写入任务。',
  '文件/文字解析只使用 AI；没有配置 AI 时会提示先配置，不再本地降级。',
  '',
  '数据位置（便携）：',
  'TodayBlock\\data\\',
  '复制整个 TodayBlock 文件夹到另一台电脑即可带走数据。',
  '如果程序目录不可写，会自动改用 %APPDATA%\\TodayBlock\\。',
  '',
  '首次启动带示例任务，可在 设置 → 数据 → 清除示例 删除。',
  ''
].join('\r\n'), 'utf8');

console.log('');
console.log(`Portable app: ${exe}`);
console.log(`Folder:       ${out}`);
console.log('You can zip this folder and copy it to another Windows PC.');
