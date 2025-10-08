// Node script: json_to_geojson.js
// Usage: node json_to_geojson.js input.json output.geojson

const fs = require("fs");
const input = process.argv[2];
const output = process.argv[3] || "output.geojson";
if (!input) {
  console.error("Usage: node json_to_geojson.js input.json [output.geojson]");
  process.exit(1);
}
const raw = fs.readFileSync(input, "utf8");
const records = JSON.parse(raw);
const features = [];
for (const r of records) {
  const lat = parseFloat(r.Latitude);
  const lon = parseFloat(r.Longitude);
  if (!isNaN(lat) && !isNaN(lon)) {
    // Build properties: keep Name/Address fields and keywords
    const props = {
      Name_EN: r.Name_EN || "",
      Name_TC: r.Name_TC || "",
      Address_EN: r.Address_EN || "",
      Address_TC: r.Address_TC || "",
      Keyword_EN: r.Keyword_EN || [],
      Keyword_TC: r.Keyword_TC || []
    };
    features.push({
      type: "Feature",
      properties: props,
      geometry: { type: "Point", coordinates: [lon, lat] }
    });
  }
}
const geo = { type: "FeatureCollection", features: features };
fs.writeFileSync(output, JSON.stringify(geo, null, 2), "utf8");
console.log(`Wrote ${features.length} features to ${output}`);

//node json_to_geojson.js vegetarian_restaurants_hk.json vegetarian_restaurants.geojson