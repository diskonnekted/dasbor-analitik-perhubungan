$j = Get-Content 'I:\perhubungan\public\pju_ruas.geojson' -Raw | ConvertFrom-Json
Write-Host ('Total features: ' + $j.features.Count)
# Inspect first 3 feature properties
for ($i=0; $i -lt 3; $i++) {
    $f = $j.features[$i]
    Write-Host "---"
    Write-Host ("type=" + $f.geometry.type + " coords=" + $f.geometry.coordinates.Count)
    Write-Host ("properties keys: " + ($f.properties.PSObject.Properties | ForEach-Object { $_.Name }) -join ', ')
    Write-Host ("properties dump: " + ($f.properties | ConvertTo-Json -Compress))
}
