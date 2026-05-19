
import { dhlZoneRaw, countryNameToCode } from './src/data/expressZones';
import { countries } from './src/data/countries';

// 按区整理
const zones: Record&lt;number, string[]&gt; = { 1: [], 2: [], 3: [], 4: [], 5: [], 6: [], 7: [], 8: [], 9: [] };
const missing: string[] = [];

for (const [name, zone] of Object.entries(dhlZoneRaw)) {
  const code = countryNameToCode.get(name);
  if (code) {
    zones[zone].push(name);
  } else {
    missing.push(name);
  }
}

// 输出
console.log("=== DHL 分区表 ===\n");
for (let z = 1; z &lt;= 9; z++) {
  console.log(`\n第 ${z} 区 (${zones[z].length}个国家/地区):`);
  zones[z].sort().forEach((name) =&gt; {
    const code = countryNameToCode.get(name);
    console.log(`  - ${name} (${code})`);
  });
}

console.log(`\n=== 无法识别的名称 (${missing.length}个):`);
missing.forEach((name) =&gt; console.log(`  - ${name}`));

console.log("\n\n=== 现有国家列表 (参考):");
console.log(countries.map((c) =&gt; `${c.nameCN} (${c.code})`).join("\n"));
