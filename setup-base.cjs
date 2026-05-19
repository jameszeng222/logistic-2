const { execSync } = require('child_process');
const path = require('path');
const fs = require('fs');

const BASE_TOKEN = 'CEqSb9DltajJ1Dsax54c4UT9n7c';
const TABLE_ID = 'tblKMO4ICBiBaFZD';

function runLarkCli(args) {
  const cliPath = path.join(process.env.USERPROFILE, 'AppData', 'Roaming', 'npm', 'lark-cli.cmd');
  const env = { ...process.env, PATH: `C:\\Program Files\\nodejs;${process.env.PATH}` };
  const cmd = `"${cliPath}" ${args.join(' ')}`;
  console.log('Running:', cmd);
  try {
    const result = execSync(cmd, { encoding: 'utf8', env, cwd: 'c:\\Users\\HT\\Documents\\logistic-2' });
    console.log(result);
    return JSON.parse(result);
  } catch (e) {
    console.error('Error:', e.stderr || e.message);
    return null;
  }
}

// Create fields
const fields = [
  { type: 'text', name: '渠道ID' },
  { type: 'text', name: '渠道名称' },
  { type: 'text', name: '渠道代码' },
  { type: 'text', name: '计费模式' },
  { type: 'number', name: '体积系数', style: { type: 'plain', precision: 0 } },
  { type: 'text', name: '服务类型' },
  { type: 'text', name: '颜色' },
  { type: 'number', name: '预计天数最小', style: { type: 'plain', precision: 0 } },
  { type: 'number', name: '预计天数最大', style: { type: 'plain', precision: 0 } }
];

for (const field of fields) {
  const jsonFile = `field_${field.name.replace(/[^a-zA-Z0-9]/g, '_')}.json`;
  fs.writeFileSync(jsonFile, JSON.stringify(field));
  runLarkCli([
    'base', '+field-create',
    '--base-token', BASE_TOKEN,
    '--table-id', TABLE_ID,
    '--json', `@${jsonFile}`
  ]);
}

console.log('Done!');
