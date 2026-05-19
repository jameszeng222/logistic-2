const { execSync } = require('child_process');
const path = require('path');
const fs = require('fs');

const BASE_TOKEN = 'CEqSb9DltajJ1Dsax54c4UT9n7c';

function runLarkCli(args) {
  const cliPath = path.join(process.env.USERPROFILE, 'AppData', 'Roaming', 'npm', 'lark-cli.cmd');
  const env = { ...process.env, PATH: `C:\\Program Files\\nodejs;${process.env.PATH}` };
  const cmd = `"${cliPath}" ${args.join(' ')}`;
  try {
    const result = execSync(cmd, { encoding: 'utf8', env, cwd: 'c:\\Users\\HT\\Documents\\logistic-2' });
    return JSON.parse(result);
  } catch (e) {
    console.error('Error:', e.stderr || e.message);
    return null;
  }
}

// Import carriers to 渠道配置 table
const carriers = [
  { id: 'yuntu-standard', name: '云途标快', code: 'YT-BK', billingMode: 'yuntu', volumetricFactor: 5000, serviceType: '标准快递', color: '#E63946', minDays: 7, maxDays: 15 },
  { id: 'yuntu-economy', name: '云途特惠', code: 'YT-TH', billingMode: 'yuntu', volumetricFactor: 8000, serviceType: '经济快递', color: '#2A9D8F', minDays: 10, maxDays: 20 },
  { id: 'yuntu-wig', name: '云途假发专线', code: 'YT-WIG', billingMode: 'yuntu', volumetricFactor: 6000, serviceType: '假发专线', color: '#E9C46A', minDays: 7, maxDays: 15 },
  { id: 'dhl', name: 'DHL', code: 'DHL', billingMode: 'express', volumetricFactor: 5000, serviceType: 'DHL Express', color: '#FFCC00', minDays: 2, maxDays: 5 },
  { id: 'ups', name: 'UPS', code: 'UPS', billingMode: 'express', volumetricFactor: 5000, serviceType: 'UPS Express', color: '#351C15', minDays: 2, maxDays: 5 },
  { id: 'fedex', name: 'FedEx', code: 'FDX', billingMode: 'express', volumetricFactor: 5000, serviceType: 'FedEx International', color: '#4D148C', minDays: 2, maxDays: 5 }
];

console.log('Importing carriers...');
for (const c of carriers) {
  const record = {
    '渠道ID': c.id,
    '渠道名称': c.name,
    '渠道代码': c.code,
    '计费模式': c.billingMode,
    '体积系数': c.volumetricFactor,
    '服务类型': c.serviceType,
    '颜色': c.color,
    '预计天数最小': c.minDays,
    '预计天数最大': c.maxDays
  };
  fs.writeFileSync('record.json', JSON.stringify(record));
  runLarkCli([
    'base', '+record-upsert',
    '--base-token', BASE_TOKEN,
    '--table-id', 'tblKMO4ICBiBaFZD',
    '--json', '@record.json'
  ]);
}

// Import fuel surcharges
const fuelData = [
  { carrierId: 'dhl', rate: 0.16 },
  { carrierId: 'fedex', rate: 0.15 },
  { carrierId: 'ups', rate: 0.14 }
];

console.log('Importing fuel surcharges...');
for (const f of fuelData) {
  const record = {
    '渠道ID': f.carrierId,
    '费率': f.rate,
    '生效日期': '2025-01-01',
    '失效日期': '2099-12-31'
  };
  fs.writeFileSync('record.json', JSON.stringify(record));
  runLarkCli([
    'base', '+record-upsert',
    '--base-token', BASE_TOKEN,
    '--table-id', 'tblI0yajPhIznBeS',
    '--json', '@record.json'
  ]);
}

console.log('Data import complete!');
