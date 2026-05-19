const { execSync } = require('child_process');
const path = require('path');
const fs = require('fs');

const BASE_TOKEN = 'CEqSb9DltajJ1Dsax54c4UT9n7c';
const OUTPUT_DIR = path.join(__dirname, 'public', 'data');

function runLarkCli(args) {
  const cliPath = path.join(process.env.USERPROFILE, 'AppData', 'Roaming', 'npm', 'lark-cli.cmd');
  const env = { ...process.env, PATH: `C:\\Program Files\\nodejs;${process.env.PATH}` };
  const cmd = `"${cliPath}" ${args.join(' ')}`;
  try {
    const result = execSync(cmd, { encoding: 'utf8', env, cwd: __dirname });
    return JSON.parse(result);
  } catch (e) {
    console.error('Error:', e.stderr || e.message);
    return null;
  }
}

function fetchAllRecords(tableId) {
  const records = [];
  let hasMore = true;
  let pageToken = '';

  while (hasMore) {
    const args = [
      'base', '+record-list',
      '--base-token', BASE_TOKEN,
      '--table-id', tableId,
      '--limit', '200',
      '--format', 'json'
    ];
    if (pageToken) {
      args.push('--page-token', pageToken);
    }

    const result = runLarkCli(args);
    if (!result || !result.ok) {
      console.error('Failed to fetch records:', result);
      break;
    }

    const fields = result.data?.fields || [];
    const items = result.data?.data || [];
    const recordIds = result.data?.record_id_list || [];

    // Convert array format to object format
    for (let i = 0; i < items.length; i++) {
      const row = items[i];
      const record = { id: recordIds[i], fields: {} };
      for (let j = 0; j < fields.length; j++) {
        record.fields[fields[j]] = row[j];
      }
      records.push(record);
    }

    hasMore = result.data?.has_more || false;
    pageToken = result.data?.page_token || '';

    if (hasMore) {
      execSync('timeout /t 1 /nobreak >nul 2>&1', { shell: 'cmd.exe' });
    }
  }

  return records;
}

// Ensure output directory exists
if (!fs.existsSync(OUTPUT_DIR)) {
  fs.mkdirSync(OUTPUT_DIR, { recursive: true });
}

console.log('Syncing data from Feishu Base...\n');

// 1. Sync carriers
console.log('1. Syncing carriers...');
const carriers = fetchAllRecords('tblKMO4ICBiBaFZD');
const carriersData = carriers.map(r => ({
  id: r.fields['渠道ID'],
  name: r.fields['渠道名称'],
  code: r.fields['渠道代码'],
  billingMode: r.fields['计费模式'],
  volumetricFactor: r.fields['体积系数'],
  services: [r.fields['服务类型']],
  color: r.fields['颜色'],
  estimatedDays: {
    min: r.fields['预计天数最小'],
    max: r.fields['预计天数最大']
  }
}));
fs.writeFileSync(path.join(OUTPUT_DIR, 'carriers.json'), JSON.stringify(carriersData, null, 2));
console.log(`   ✓ ${carriersData.length} carriers synced`);

// 2. Sync zones
console.log('2. Syncing zones...');
const zones = fetchAllRecords('tblRPQcNyWVts9zI');
const zonesData = {
  dhl: {},
  fedex: {},
  ups: {}
};
for (const r of zones) {
  const carrier = (r.fields['渠道'] || '').toLowerCase();
  const code = r.fields['国家代码'];
  const zone = r.fields['分区'];
  if (carrier && code && zone) {
    zonesData[carrier] = zonesData[carrier] || {};
    zonesData[carrier][code] = zone;
  }
}
fs.writeFileSync(path.join(OUTPUT_DIR, 'zones.json'), JSON.stringify(zonesData, null, 2));
console.log(`   ✓ ${zones.length} zones synced`);

// 3. Sync DHL prices
console.log('3. Syncing DHL prices...');
const dhlPrices = fetchAllRecords('tbls1wHuCiGmSdCq');
const dhlPricesData = dhlPrices.map(r => ({
  weight: r.fields['重量'],
  zonePrices: {
    '1': r.fields['分区1'] || 0,
    '2': r.fields['分区2'] || 0,
    '3': r.fields['分区3'] || 0,
    '4': r.fields['分区4'] || 0,
    '5': r.fields['分区5'] || 0,
    '6': r.fields['分区6'] || 0,
    '7': r.fields['分区7'] || 0,
    '8': r.fields['分区8'] || 0,
    '9': r.fields['分区9'] || 0,
  }
}));
fs.writeFileSync(path.join(OUTPUT_DIR, 'dhl-prices.json'), JSON.stringify(dhlPricesData, null, 2));
console.log(`   ✓ ${dhlPricesData.length} DHL price tiers synced`);

// 4. Sync FedEx prices
console.log('4. Syncing FedEx prices...');
const fedexPrices = fetchAllRecords('tblcDu3ZSgCGHqvm');
const fedexPricesData = fedexPrices.map(r => ({
  weight: r.fields['重量'],
  zonePrices: {
    '2': r.fields['分区2'] || 0,
    'A': r.fields['分区A'] || 0,
    'B': r.fields['分区B'] || 0,
    'D': r.fields['分区D'] || 0,
    'E': r.fields['分区E'] || 0,
    'F': r.fields['分区F'] || 0,
    'G': r.fields['分区G'] || 0,
    'H': r.fields['分区H'] || 0,
    'K': r.fields['分区K'] || 0,
    'M': r.fields['分区M'] || 0,
    'N': r.fields['分区N'] || 0,
    'O': r.fields['分区O'] || 0,
    'P': r.fields['分区P'] || 0,
    'Q': r.fields['分区Q'] || 0,
    'R': r.fields['分区R'] || 0,
    'S': r.fields['分区S'] || 0,
    'T': r.fields['分区T'] || 0,
    'U': r.fields['分区U'] || 0,
    'V': r.fields['分区V'] || 0,
    'X': r.fields['分区X'] || 0,
    'Y': r.fields['分区Y'] || 0,
    'Z': r.fields['分区Z'] || 0,
  }
}));
fs.writeFileSync(path.join(OUTPUT_DIR, 'fedex-prices.json'), JSON.stringify(fedexPricesData, null, 2));
console.log(`   ✓ ${fedexPricesData.length} FedEx price tiers synced`);

// 5. Sync UPS prices
console.log('5. Syncing UPS prices...');
const upsPrices = fetchAllRecords('tblGQjHqkCLWPzcT');
const upsPricesData = upsPrices.map(r => ({
  weight: r.fields['重量'],
  zonePrices: {
    '1': r.fields['分区1'] || 0,
  }
}));
fs.writeFileSync(path.join(OUTPUT_DIR, 'ups-prices.json'), JSON.stringify(upsPricesData, null, 2));
console.log(`   ✓ ${upsPricesData.length} UPS price tiers synced`);

// 6. Sync fuel surcharges
console.log('6. Syncing fuel surcharges...');
const fuel = fetchAllRecords('tblI0yajPhIznBeS');
const fuelData = fuel.map(r => ({
  carrierId: r.fields['渠道ID'],
  rate: r.fields['费率'] || 0,
  effectiveDate: r.fields['生效日期'],
  expiryDate: r.fields['失效日期'],
}));
fs.writeFileSync(path.join(OUTPUT_DIR, 'fuel-surcharges.json'), JSON.stringify(fuelData, null, 2));
console.log(`   ✓ ${fuelData.length} fuel surcharges synced`);

// 7. Sync additional surcharges
console.log('7. Syncing additional surcharges...');
const additional = fetchAllRecords('tbl2xi7GdQ1s2kGL');
const additionalData = additional.map(r => ({
  carrierId: r.fields['渠道ID'],
  countryCode: r.fields['国家代码'],
  name: r.fields['附加费名称'],
  amount: r.fields['金额'] || 0,
  billingMethod: r.fields['计费方式'] || 'per_kg',
  effectiveDate: r.fields['生效日期'],
  expiryDate: r.fields['失效日期'],
}));
fs.writeFileSync(path.join(OUTPUT_DIR, 'additional-surcharges.json'), JSON.stringify(additionalData, null, 2));
console.log(`   ✓ ${additionalData.length} additional surcharges synced`);

// 8. Sync yuntu rates
console.log('8. Syncing yuntu rates...');
const yuntuRates = fetchAllRecords('tblRW31dQmIXd4m1');
const yuntuData = yuntuRates.map(r => ({
  carrierId: r.fields['渠道ID'],
  countryCode: r.fields['国家代码'],
  countryName: r.fields['国家名称'],
  weightStart: r.fields['重量起'],
  weightEnd: r.fields['重量止'],
  unitPrice: r.fields['单价'],
  registrationFee: r.fields['挂号费'],
}));
fs.writeFileSync(path.join(OUTPUT_DIR, 'yuntu-rates.json'), JSON.stringify(yuntuData, null, 2));
console.log(`   ✓ ${yuntuData.length} yuntu rates synced`);

// Write metadata
const metadata = {
  lastSync: new Date().toISOString(),
  baseToken: BASE_TOKEN,
  recordCounts: {
    carriers: carriersData.length,
    zones: zones.length,
    dhlPrices: dhlPricesData.length,
    fedexPrices: fedexPricesData.length,
    upsPrices: upsPricesData.length,
    fuelSurcharges: fuelData.length,
    additionalSurcharges: additionalData.length,
    yuntuRates: yuntuData.length,
  }
};
fs.writeFileSync(path.join(OUTPUT_DIR, 'metadata.json'), JSON.stringify(metadata, null, 2));

console.log('\n✅ Sync complete!');
console.log(`📁 Data saved to: ${OUTPUT_DIR}`);
console.log(`🕐 Last sync: ${metadata.lastSync}`);
