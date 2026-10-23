'use strict';

const fs = require('node:fs');
const path = require('node:path');
const PELibrary = require('pe-library');
const ResEdit = require('resedit');

const root = path.resolve(__dirname, '..');
const exePath = process.argv[2] || path.join(root, 'release', 'win-unpacked', 'TodayBlock.exe');
const icoPath = path.join(root, 'assets', 'icon.ico');

if (!fs.existsSync(exePath)) throw new Error(`EXE not found: ${exePath}`);
if (!fs.existsSync(icoPath)) throw new Error(`ICO not found: ${icoPath}`);

const executable = PELibrary.NtExecutable.from(fs.readFileSync(exePath), { ignoreCert: true });
const resources = PELibrary.NtExecutableResource.from(executable);
const iconFile = ResEdit.Data.IconFile.from(fs.readFileSync(icoPath));

// Electron's stub contains more than one RT_GROUP_ICON (usually 1 and 101).
// Explorer uses the first group, so replace every group instead of only 101.
const iconData = iconFile.icons.map((item) => item.data);
const iconGroupIds = [...new Set(
  resources.entries.filter((entry) => entry.type === 14).map((entry) => entry.id)
)];
if (!iconGroupIds.length) iconGroupIds.push(1);
for (const id of iconGroupIds) {
  ResEdit.Resource.IconGroupEntry.replaceIconsForResource(
    resources.entries,
    id,
    1033,
    iconData
  );
}

const versions = ResEdit.Resource.VersionInfo.fromEntries(resources.entries);
if (versions.length) {
  const version = versions[0];
  version.setFileVersion(0, 1, 0, 0, 1033);
  version.setProductVersion(0, 1, 0, 0, 1033);
  version.setStringValues(
    { lang: 1033, codepage: 1200 },
    {
      FileDescription: 'TodayBlock',
      ProductName: 'TodayBlock',
      CompanyName: 'TodayBlock',
      LegalCopyright: 'Copyright © 2026 TodayBlock',
      OriginalFilename: 'TodayBlock.exe',
      InternalName: 'TodayBlock'
    }
  );
  version.outputToResourceEntries(resources.entries);
}

resources.outputResource(executable);
fs.writeFileSync(exePath, Buffer.from(executable.generate()));
console.log(`Updated resources: ${exePath}`);
