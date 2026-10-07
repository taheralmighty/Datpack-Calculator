const { spawnSync } = require('node:child_process');
const reviewed = new Set(['@svgr/plugin-svgo', '@svgr/webpack', 'bfj', 'braces', 'css-select', 'jsonpath', 'node-forge', 'nth-check', 'postcss', 'react-scripts', 'rollup-plugin-terser', 'serialize-javascript', 'svgo', 'underscore', 'webpack-dev-middleware', 'workbox-build', 'workbox-webpack-plugin']);
if (!process.env.npm_execpath) throw new Error('Run this gate through npm run audit:reviewed.');
const result = spawnSync(process.execPath, [process.env.npm_execpath, 'audit', '--json'], { encoding: 'utf8' });
let audit;
try { audit = JSON.parse(result.stdout); } catch { console.error(result.stderr || 'Audit returned no valid JSON'); process.exit(1); }
if (audit.error) { console.error(audit.error); process.exit(1); }
const expired = Date.now() > Date.parse('2026-12-07T00:00:00Z');
// Dependents only inherit severity; judge each package by the advisories filed against it.
const advisories = item => item.via.filter(via => typeof via === 'object');
const blocked = Object.values(audit.vulnerabilities || {}).filter(item => advisories(item).some(via =>
  via.severity === 'critical' || (via.severity === 'high' && (expired || !reviewed.has(item.name)))));
console.log(JSON.stringify(audit.metadata.vulnerabilities, null, 2));
if (blocked.length) { console.error('Unreviewed/expired high or critical risks:', blocked.map(item => item.name)); process.exit(1); }
console.log('Only time-limited, documented build-tool exceptions remain. See SECURITY-REVIEW.md.');