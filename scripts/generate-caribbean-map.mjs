import fs from 'node:fs';

const [inputPath, outputPath] = process.argv.slice(2);
if (!inputPath || !outputPath) {
  throw new Error('Usage: node scripts/generate-caribbean-map.mjs <Natural Earth GeoJSON> <output SVG>');
}

const data = JSON.parse(fs.readFileSync(inputPath, 'utf8'));
const WIDTH = 1100;
const HEIGHT = 640;
const BOUNDS = { west: -89.5, east: -58, south: 5, north: 28.5 };
const MAINLAND_CARICOM = new Set(['Belize', 'Guyana', 'Suriname']);

function project(point) {
  const x = ((point[0] - BOUNDS.west) / (BOUNDS.east - BOUNDS.west)) * WIDTH;
  const y = ((BOUNDS.north - point[1]) / (BOUNDS.north - BOUNDS.south)) * HEIGHT;
  return [x, y];
}

function simplify(points) {
  if (points.length < 12) return points;
  const result = [points[0]];
  let previous = project(points[0]);
  for (let index = 1; index < points.length - 1; index += 1) {
    const current = project(points[index]);
    const dx = current[0] - previous[0];
    const dy = current[1] - previous[1];
    if ((dx * dx) + (dy * dy) >= 0.16) {
      result.push(points[index]);
      previous = current;
    }
  }
  result.push(points.at(-1));
  return result;
}

function ringPath(ring) {
  return simplify(ring).map((point, index) => {
    const [x, y] = project(point);
    return `${index ? 'L' : 'M'}${x.toFixed(1)} ${y.toFixed(1)}`;
  }).join(' ') + ' Z';
}

function geometryPath(geometry) {
  const polygons = geometry.type === 'Polygon' ? [geometry.coordinates] : geometry.coordinates;
  return polygons.flatMap((polygon) => polygon.map(ringPath)).join(' ');
}

const features = data.features.filter((feature) => {
  const properties = feature.properties || {};
  return properties.SUBREGION === 'Caribbean' ||
    MAINLAND_CARICOM.has(properties.NAME) ||
    MAINLAND_CARICOM.has(properties.SOVEREIGNT);
});

const paths = features.map((feature) => {
  const name = String(feature.properties.NAME || feature.properties.SOVEREIGNT || 'Caribbean geography')
    .replaceAll('&', '&amp;').replaceAll('"', '&quot;');
  return `  <path data-place="${name}" d="${geometryPath(feature.geometry)}"/>`;
}).join('\n');

const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${WIDTH} ${HEIGHT}" role="img" aria-labelledby="title desc">
  <title id="title">The Caribbean archipelago</title>
  <desc id="desc">Caribbean map geometry derived from Natural Earth 1:10m Admin 0 map units.</desc>
  <metadata>Source: Natural Earth ne_10m_admin_0_map_units, public domain, https://www.naturalearthdata.com/about/terms-of-use/; generated for FTN Platform.</metadata>
  <g fill="currentColor" fill-rule="evenodd">
${paths}
  </g>
</svg>\n`;

fs.mkdirSync(new URL('../assets/maps/', import.meta.url), { recursive: true });
fs.writeFileSync(outputPath, svg);
console.log(`Generated ${outputPath} from ${features.length} Natural Earth map units.`);
