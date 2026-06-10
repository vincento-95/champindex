// Quick WFS test - testing larger COUNT and different radii
const tests = [
  { lat: 48.41, lon: 2.67, label: 'Fontainebleau' },
  { lat: 44.0, lon: -0.8, label: 'Landes' },
  { lat: 48.1, lon: 6.9, label: 'Vosges' },
  { lat: 45.5, lon: 3.0, label: 'Auvergne' },
  { lat: 43.3, lon: -0.8, label: 'Pyrénées (Pau)' },
  { lat: 42.2, lon: 9.1, label: 'Corse' },
];

const R = 0.01;

for (const test of tests) {
  const bbox = `${test.lon - R},${test.lat - R},${test.lon + R},${test.lat + R},EPSG:4326`;
  const url = `https://data.geopf.fr/wfs/ows?SERVICE=WFS&VERSION=2.0.0&REQUEST=GetFeature&TYPENAME=LANDCOVER.FORESTINVENTORY.V2:formation_vegetale&OUTPUTFORMAT=application/json&SRSNAME=EPSG:4326&PROPERTYNAME=essence,tfv&BBOX=${bbox}&COUNT=50`;

  console.log(`\n=== ${test.label} (${test.lat}, ${test.lon}) ===`);

  try {
    const r = await fetch(url);
    const d = await r.json();
    const features = d.features || [];
    console.log(`  ${features.length} features`);

    // Count essence types
    const essences = {};
    const tfvs = {};
    for (const f of features) {
      const e = f.properties?.essence || 'null';
      const t = f.properties?.tfv || 'null';
      essences[e] = (essences[e] || 0) + 1;
      tfvs[t] = (tfvs[t] || 0) + 1;
    }
    console.log('  Essences:', JSON.stringify(essences));
    console.log('  TFV:', JSON.stringify(tfvs));
  } catch (e) {
    console.log(`  ERROR: ${e.message}`);
  }

  await new Promise(r => setTimeout(r, 300));
}
