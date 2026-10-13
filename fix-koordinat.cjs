// ponytail: one-off repair for 2 titik_parkir dengan koordinat rusak di SQL.
// Upgrade path: perbaiki baris di u1639363_parkir.sql lalu regenerate dari sumber.
const fs = require('fs');

const inIndonesia = ([lng, lat]) => lat > -11 && lat < 6 && lng > 95 && lng < 141;

// foto: "./media/parkir/-7_2719422,109_7401499_Toko_DYSS_Karangkobar1.jpg" → [lat,lng]
const fromFoto = (foto) => {
  const m = /(-?[\d]+)_([\d]+),(-?[\d]+)_([\d]+)_/.exec(foto || '');
  if (!m) return null;
  const lat = parseFloat(`${m[1]}.${m[2]}`);
  const lng = parseFloat(`${m[3]}.${m[4]}`);
  return inIndonesia([lng, lat]) && Math.abs(lat) < 9 ? [lat, lng] : null;
};

const fixTitik = JSON.parse(fs.readFileSync('public/parkir_titik_parkir.geojson', 'utf8'));
const byId = {};
let repaired = 0;

for (const f of fixTitik.features) {
  const c = f.geometry && f.geometry.coordinates;
  if (!c || inIndonesia(c)) { if (c) byId[f.properties.id] = c; continue; }

  const fixed = fromFoto(f.properties.foto)
    // fallback: lat positif di rentang lintang Jawa (kasus id 31, minus hilang) → negasikan
    || (c[1] > 0 && c[1] < 9 && inIndonesia([c[0], -c[1]]) ? [-c[1], c[0] === c[1] ? c[0] : c[0]] : null);

  if (fixed) {
    // koordinat GeoJSON = [lng, lat]
    f.geometry.coordinates = [fixed[1], fixed[0]];
    byId[f.properties.id] = f.geometry.coordinates;
    repaired++;
    console.log(`diperbaiki id ${f.properties.id} "${f.properties.nama}": ${JSON.stringify(c)} → ${JSON.stringify(f.geometry.coordinates)}`);
  } else {
    console.log(`GAGAL id ${f.properties.id} "${f.properties.nama}" ${JSON.stringify(c)}`);
  }
}
fs.writeFileSync('public/parkir_titik_parkir.geojson', JSON.stringify(fixTitik));

// propagasi ke titik_jukir via id_titik_parkir
const jukir = JSON.parse(fs.readFileSync('public/parkir_titik_jukir.geojson', 'utf8'));
let jukirFixed = 0;
for (const f of jukir.features) {
  const fix = byId[f.properties.id_titik_parkir];
  if (fix && !inIndonesia(f.geometry.coordinates)) {
    f.geometry.coordinates = fix;
    jukirFixed++;
  }
}
fs.writeFileSync('public/parkir_titik_jukir.geojson', JSON.stringify(jukir));

console.log(`\ntitik_parkir diperbaiki: ${repaired}, titik_jukir ikut: ${jukirFixed}`);
