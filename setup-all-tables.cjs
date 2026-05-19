const { execSync } = require('child_process');
const path = require('path');
const fs = require('fs');

const BASE_TOKEN = 'CEqSb9DltajJ1Dsax54c4UT9n7c';

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

// Create remaining tables
const tables = [
  {
    name: '云途运费模板',
    fields: [
      { type: 'text', name: '渠道ID' },
      { type: 'text', name: '国家代码' },
      { type: 'text', name: '国家名称' },
      { type: 'number', name: '重量起', style: { type: 'plain', precision: 1 } },
      { type: 'number', name: '重量止', style: { type: 'plain', precision: 1 } },
      { type: 'number', name: '单价', style: { type: 'plain', precision: 2 } },
      { type: 'number', name: '挂号费', style: { type: 'plain', precision: 2 } }
    ]
  },
  {
    name: 'DHL价格表',
    fields: [
      { type: 'number', name: '重量', style: { type: 'plain', precision: 1 } },
      { type: 'number', name: '分区1', style: { type: 'plain', precision: 2 } },
      { type: 'number', name: '分区2', style: { type: 'plain', precision: 2 } },
      { type: 'number', name: '分区3', style: { type: 'plain', precision: 2 } },
      { type: 'number', name: '分区4', style: { type: 'plain', precision: 2 } },
      { type: 'number', name: '分区5', style: { type: 'plain', precision: 2 } },
      { type: 'number', name: '分区6', style: { type: 'plain', precision: 2 } },
      { type: 'number', name: '分区7', style: { type: 'plain', precision: 2 } },
      { type: 'number', name: '分区8', style: { type: 'plain', precision: 2 } },
      { type: 'number', name: '分区9', style: { type: 'plain', precision: 2 } }
    ]
  },
  {
    name: 'FedEx价格表',
    fields: [
      { type: 'number', name: '重量', style: { type: 'plain', precision: 1 } },
      { type: 'number', name: '分区2', style: { type: 'plain', precision: 2 } },
      { type: 'number', name: '分区A', style: { type: 'plain', precision: 2 } },
      { type: 'number', name: '分区B', style: { type: 'plain', precision: 2 } },
      { type: 'number', name: '分区D', style: { type: 'plain', precision: 2 } },
      { type: 'number', name: '分区E', style: { type: 'plain', precision: 2 } },
      { type: 'number', name: '分区F', style: { type: 'plain', precision: 2 } },
      { type: 'number', name: '分区G', style: { type: 'plain', precision: 2 } },
      { type: 'number', name: '分区H', style: { type: 'plain', precision: 2 } },
      { type: 'number', name: '分区K', style: { type: 'plain', precision: 2 } },
      { type: 'number', name: '分区M', style: { type: 'plain', precision: 2 } },
      { type: 'number', name: '分区N', style: { type: 'plain', precision: 2 } },
      { type: 'number', name: '分区O', style: { type: 'plain', precision: 2 } },
      { type: 'number', name: '分区P', style: { type: 'plain', precision: 2 } },
      { type: 'number', name: '分区Q', style: { type: 'plain', precision: 2 } },
      { type: 'number', name: '分区R', style: { type: 'plain', precision: 2 } },
      { type: 'number', name: '分区S', style: { type: 'plain', precision: 2 } },
      { type: 'number', name: '分区T', style: { type: 'plain', precision: 2 } },
      { type: 'number', name: '分区U', style: { type: 'plain', precision: 2 } },
      { type: 'number', name: '分区V', style: { type: 'plain', precision: 2 } },
      { type: 'number', name: '分区X', style: { type: 'plain', precision: 2 } },
      { type: 'number', name: '分区Y', style: { type: 'plain', precision: 2 } },
      { type: 'number', name: '分区Z', style: { type: 'plain', precision: 2 } }
    ]
  },
  {
    name: 'UPS价格表',
    fields: [
      { type: 'number', name: '重量', style: { type: 'plain', precision: 1 } },
      { type: 'number', name: '分区1', style: { type: 'plain', precision: 2 } }
    ]
  },
  {
    name: '分区表',
    fields: [
      { type: 'text', name: '渠道' },
      { type: 'text', name: '国家代码' },
      { type: 'text', name: '国家名称' },
      { type: 'text', name: '分区' }
    ]
  },
  {
    name: '燃油附加费',
    fields: [
      { type: 'text', name: '渠道ID' },
      { type: 'number', name: '费率', style: { type: 'plain', precision: 2 } },
      { type: 'date', name: '生效日期' },
      { type: 'date', name: '失效日期' }
    ]
  },
  {
    name: '附加费',
    fields: [
      { type: 'text', name: '渠道ID' },
      { type: 'text', name: '国家代码' },
      { type: 'text', name: '附加费名称' },
      { type: 'number', name: '金额', style: { type: 'plain', precision: 2 } },
      { type: 'text', name: '计费方式' },
      { type: 'date', name: '生效日期' },
      { type: 'date', name: '失效日期' }
    ]
  }
];

for (const table of tables) {
  const fieldsFile = `table_${table.name}_fields.json`;
  fs.writeFileSync(fieldsFile, JSON.stringify(table.fields));
  runLarkCli([
    'base', '+table-create',
    '--base-token', BASE_TOKEN,
    '--name', table.name,
    '--fields', `@${fieldsFile}`
  ]);
}

console.log('All tables created!');
