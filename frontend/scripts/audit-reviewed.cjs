const { spawnSync } = require('node:child_process');
const reviewed = new Set(['@svgr/plugin-svgo', '@svgr/webpack', 'bfj', 'css-select', 'jsonpath', 'nth-check', 'postcss', 'react-scripts', 'rollup-plugin-terser', 'serialize-javascript', 'svgo', 'underscore', 'workbox-build', 'workbox-webpack-plugin']);
if (!process.env.npm_execpath) throw new Error('Run this gate through npm run audit:reviewed.');
const result = spawnSync(process.execPath, [process.env.npm_execpath, 'audit', '--json'], { encoding: 'utf8' });
let audit;
try { audit = JSON.parse(result.stdout); } catch { console.error(result.stderr || 'Audit returned no valid JSON'); process.exit(1); }
if (audit.error) { console.error(audit.error); process.exit(1); }
const expired = Date.now() > Date.parse('2026-10-14T00:00:00Z');
const blocked = Object.values(audit.vulnerabilities || {}).filter(item => item.severity === 'critical' || (item.severity === 'high' && (expired || !reviewed.has(item.name))));
console.log(JSON.stringify(audit.metadata.vulnerabilities, null, 2));
if (blocked.length) { console.error('Unreviewed/expired high or critical risks:', blocked.map(item => item.name)); process.exit(1); }
console.log('Only time-limited, documented build-tool exceptions remain. See SECURITY-REVIEW.md.');