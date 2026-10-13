@echo off
echo === test fetch via curl ===
curl -s -o nul -w "ruas: HTTP %%{http_code}, %%{size_download} bytes\n" http://localhost:5173/pju_ruas.geojson
curl -s -o nul -w "parkir: HTTP %%{http_code}, %%{size_download} bytes\n" http://localhost:5173/pju_titik_parkir.geojson
curl -s -o nul -w "jukir: HTTP %%{http_code}, %%{size_download} bytes\n" http://localhost:5173/pju_titik_jukir.geojson
curl -s -o nul -w "choro: HTTP %%{http_code}, %%{size_download} bytes\n" http://localhost:5173/pju_choropleth.json
