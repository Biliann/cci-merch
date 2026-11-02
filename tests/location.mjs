import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import { stripTypeScriptTypes } from 'node:module';

const source = await fs.readFile(new URL('../lib/region-location.ts', import.meta.url), 'utf8');
const boundary = await fs.readFile(new URL('../lib/kazakhstan-boundary.json', import.meta.url), 'utf8');
// Load the actual pure helper without a browser, server, or emitted build files.
const compiled = stripTypeScriptTypes(
  source.replace("import boundary from './kazakhstan-boundary.json';", `const boundary = ${boundary};`),
);
const { resolveRegion } = await import(`data:text/javascript;base64,${Buffer.from(compiled).toString('base64')}`);

const cities = [
  ['Almaty hub', 43.2389, 76.8897, 'Юг'],
  ['Astana hub', 51.1694, 71.4491, 'Север'],
  ['Atyrau hub', 47.0945, 51.9238, 'Запад'],
  ['Oskemen hub', 49.9483, 82.6285, 'Восток'],
  ['Shymkent', 42.3155, 69.5869, 'Юг'],
  ['Karaganda', 49.8047, 73.1094, 'Север'],
  ['Aktobe', 50.2839, 57.167, 'Запад'],
  ['Semey', 50.4111, 80.2275, 'Восток'],
  ['Aktau', 43.6532, 51.1975, 'Запад'],
  ['Petropavl', 54.8753, 69.1628, 'Север'],
  // These foreign cities are inside Kazakhstan's bounding box; a box-only
  // country check would incorrectly assign them to a catalogue.
  ['Tashkent, Uzbekistan', 41.2995, 69.2401, null],
  ['Bishkek, Kyrgyzstan', 42.8746, 74.5698, null],
  ['Omsk, Russia', 54.9885, 73.3242, null],
  ['London, UK', 51.5074, -0.1278, null],
  ['Null island', 0, 0, null],
];

for (const [name, latitude, longitude, expected] of cities) {
  assert.equal(resolveRegion(latitude, longitude), expected, name);
  console.log(`PASS ${name}`);
}

const invalid = [
  [NaN, 76], [43, NaN], [Infinity, 76], [43, -Infinity],
  [91, 76], [-91, 76], [43, 181], [43, -181],
  [undefined, 76], [43, null], ['43.2389', 76.8897],
];
for (const coordinates of invalid) {
  assert.equal(resolveRegion(...coordinates), null, `Invalid coordinates: ${coordinates}`);
}
console.log(`PASS ${invalid.length} invalid coordinate pairs`);
console.log(`${cities.length + invalid.length} location checks passed.`);
