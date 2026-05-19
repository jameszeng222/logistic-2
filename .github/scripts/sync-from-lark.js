const https = require('https');
const fs = require('fs');
const path = require('path');

const BASE_TOKEN = 'CEqSb9DltajJ1Dsax54c4UT9n7c';
const OUTPUT_DIR = path.join(__dirname, '..', '..', 'public', 'data');

// 从环境变量获取飞书应用凭证（GitHub Actions 中使用）
const APP_ID = process.env.LARK_APP_ID;
const APP_SECRET = process.env.LARK_APP_SECRET;

// 获取 tenant access token
async function getTenantToken() {
  if (!APP_ID || !APP_SECRET) {
    console.log('未配置 LARK_APP_ID 和 LARK_APP_SECRET，使用个人 token 模式');
    return null;
  }

  return new Promise((resolve, reject) => {
    const data = JSON.stringify({
      app_id: APP_ID,
      app_secret: APP_SECRET
    });

    const options = {
      hostname: 'open.feishu.cn',
      path: '/open-apis/auth/v3/tenant_access_token/internal',
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Content-Length': data.length
      }
    };

    const req = https.request(options, (res) => {
      let body = '';
      res.on('data', (chunk) => body += chunk);
      res.on('end', () => {
        try {
          const json = JSON.parse(body);
          if (json.code === 0) {
            resolve(json.tenant_access_token);
          } else {
            reject(new Error(`获取 token 失败: ${json.msg}`));
          }
        } catch (e) {
          reject(e);
        }
      });
    });

    req.on('error', reject);
    req.write(data);
    req.end();
  });
}

// 调用飞书 API
async function feishuApi(path, token) {
  return new Promise((resolve, reject) => {
    const options = {
      hostname: 'open.feishu.cn',
      path: path,
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      }
    };

    const req = https.request(options, (res) => {
      let body = '';
      res.on('data', (chunk) => body += chunk);
      res.on('end', () => {
        try {
          resolve(JSON.parse(body));
        } catch (e) {
          resolve(body);
        }
      });
    });

    req.on('error', reject);
    req.end();
  });
}

// 获取所有记录
async function fetchAllRecords(tableId, token) {
  const records = [];
  let hasMore = true;
  let pageToken = '';

  while (hasMore) {
    let apiPath = `/open-apis/bitable/v1/apps/${BASE_TOKEN}/tables/${tableId}/records?page_size=500`;
    if (pageToken) {
      apiPath += `&page_token=${pageToken}`;
    }

    const result = await feishuApi(apiPath, token);

    if (!result || result.code !== 0) {
      console.error('Failed to fetch records:', result);
      break;
    }

    records.push(...(result.data?.items || []));
    hasMore = result.data?.has_more || false;
    pageToken = result.data?.page_token || '';

    if (hasMore) {
      await new Promise(r => setTimeout(r, 200));
    }
  }

  return records;
}

async function main() {
  console.log('🚀 Starting sync from Feishu...\n');

  // 确保输出目录存在
  if (!fs.existsSync(OUTPUT_DIR)) {
    fs.mkdirSync(OUTPUT_DIR, { recursive: true });
  }

  // 获取 token
  let token;
  try {
    token = await getTenantToken();
  } catch (e) {
    console.error('获取 token 失败:', e.message);
    console.log('请确保已配置 LARK_APP_ID 和 LARK_APP_SECRET');
    process.exit(1);
  }

  if (!token) {
    console.error('无法获取访问令牌');
    process.exit(1);
  }

  const recordCounts = {};

  // 1. Sync carriers
  console.log('1. Syncing carriers...');
  try {
    const carriers = await fetchAllRecords('tblKMO4ICBiBaFZD', token);
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
    recordCounts.carriers = carriersData.length;
    console.log(`   ✓ ${carriersData.length} carriers synced`);
  } catch (e) {
    console.error('   ✗ Failed:', e.message);
  }

  // 2. Sync zones
  console.log('2. Syncing zones...');
  try {
    const zones = await fetchAllRecords('tblRPQcNyWVts9zI', token);
    const zonesData = { dhl: {}, fedex: {}, ups: {} };
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
    recordCounts.zones = zones.length;
    console.log(`   ✓ ${zones.length} zones synced`);
  } catch (e) {
    console.error('   ✗ Failed:', e.message);
  }

  // 3. Sync DHL prices
  console.log('3. Syncing DHL prices...');
  try {
    const dhlPrices = await fetchAllRecords('tbls1wHuCiGmSdCq', token);
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
    recordCounts.dhlPrices = dhlPricesData.length;
    console.log(`   ✓ ${dhlPricesData.length} DHL price tiers synced`);
  } catch (e) {
    console.error('   ✗ Failed:', e.message);
  }

  // 4. Sync FedEx prices
  console.log('4. Syncing FedEx prices...');
  try {
    const fedexPrices = await fetchAllRecords('tblcDu3ZSgCGHqvm', token);
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
    recordCounts.fedexPrices = fedexPricesData.length;
    console.log(`   ✓ ${fedexPricesData.length} FedEx price tiers synced`);
  } catch (e) {
    console.error('   ✗ Failed:', e.message);
  }

  // 5. Sync UPS prices
  console.log('5. Syncing UPS prices...');
  try {
    const upsPrices = await fetchAllRecords('tblGQjHqkCLWPzcT', token);
    const upsPricesData = upsPrices.map(r => ({
      weight: r.fields['重量'],
      zonePrices: {
        '1': r.fields['分区1'] || 0,
      }
    }));
    fs.writeFileSync(path.join(OUTPUT_DIR, 'ups-prices.json'), JSON.stringify(upsPricesData, null, 2));
    recordCounts.upsPrices = upsPricesData.length;
    console.log(`   ✓ ${upsPricesData.length} UPS price tiers synced`);
  } catch (e) {
    console.error('   ✗ Failed:', e.message);
  }

  // 6. Sync fuel surcharges
  console.log('6. Syncing fuel surcharges...');
  try {
    const fuel = await fetchAllRecords('tblI0yajPhIznBeS', token);
    const fuelData = fuel.map(r => ({
      carrierId: r.fields['渠道ID'],
      rate: r.fields['费率'] || 0,
      effectiveDate: r.fields['生效日期'],
      expiryDate: r.fields['失效日期'],
    }));
    fs.writeFileSync(path.join(OUTPUT_DIR, 'fuel-surcharges.json'), JSON.stringify(fuelData, null, 2));
    recordCounts.fuelSurcharges = fuelData.length;
    console.log(`   ✓ ${fuelData.length} fuel surcharges synced`);
  } catch (e) {
    console.error('   ✗ Failed:', e.message);
  }

  // 7. Sync additional surcharges
  console.log('7. Syncing additional surcharges...');
  try {
    const additional = await fetchAllRecords('tbl2xi7GdQ1s2kGL', token);
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
    recordCounts.additionalSurcharges = additionalData.length;
    console.log(`   ✓ ${additionalData.length} additional surcharges synced`);
  } catch (e) {
    console.error('   ✗ Failed:', e.message);
  }

  // 8. Sync yuntu rates
  console.log('8. Syncing yuntu rates...');
  try {
    const yuntuRates = await fetchAllRecords('tblRW31dQmIXd4m1', token);
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
    recordCounts.yuntuRates = yuntuData.length;
    console.log(`   ✓ ${yuntuData.length} yuntu rates synced`);
  } catch (e) {
    console.error('   ✗ Failed:', e.message);
  }

  // Write metadata
  const metadata = {
    lastSync: new Date().toISOString(),
    baseToken: BASE_TOKEN,
    recordCounts
  };
  fs.writeFileSync(path.join(OUTPUT_DIR, 'metadata.json'), JSON.stringify(metadata, null, 2));

  console.log('\n✅ Sync complete!');
  console.log(`📁 Data saved to: ${OUTPUT_DIR}`);
  console.log(`🕐 Last sync: ${metadata.lastSync}`);
  console.log('\n📊 Record counts:');
  for (const [key, count] of Object.entries(recordCounts)) {
    console.log(`   ${key}: ${count}`);
  }
}

main().catch(console.error);
