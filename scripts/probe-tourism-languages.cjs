const path = require('node:path');
const root = 'D:/Backend/NoPlan';
require(path.join(root, 'node_modules/dotenv')).config({ path: path.join(root, '.env'), quiet: true });
const { normalizeServiceKey } = require(path.join(root, 'routes/admin/placeData/providers/providerUtils'));
async function main() {
  const key = normalizeServiceKey(process.env.PUBLIC_DATA_SERVICE_KEY);
  if (!key) return console.log('No configured public data key');
  for (const service of ['KorService2', 'EngService2', 'ChsService2', 'JpnService2']) {
    try {
      const params = new URLSearchParams({ serviceKey: key, MobileOS: 'ETC', MobileApp: 'NoPlan', _type: 'json', numOfRows: '1', pageNo: '1', areaCode: '1' });
      const response = await fetch(`https://apis.data.go.kr/B551011/${service}/areaBasedList2?${params}`, { signal: AbortSignal.timeout(15000) });
      const body = await response.text();
      let json; try { json = JSON.parse(body); } catch { /* Report only safe status, never provider messages or URLs. */ }
      const raw = json?.response?.body?.items?.item;
      const row = Array.isArray(raw) ? raw[0] : raw;
      console.log(JSON.stringify({ service, status: response.status, code: json?.response?.header?.resultCode, fields: Object.keys(row || {}), sample: row ? { title: row.title, contentid: row.contentid, contenttypeid: row.contenttypeid } : null }));
    } catch { console.log(JSON.stringify({ service, status: 'unreachable' })); }
  }
}
main();
