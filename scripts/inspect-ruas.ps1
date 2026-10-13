$j = Get-Content 'I:\perhubungan\public\pju_ruas.geojson' -Raw | ConvertFrom-Json
Write-Host ('Total features: ' + $j.features.Count)
$geotypes = @{}
$coordCounts = @()
foreach ($f in $j.features) {
    $t = $f.geometry.type
    if ($geotypes.ContainsKey($t)) { $geotypes[$t]++ } else { $geotypes[$t] = 1 }
    if ($f.geometry.coordinates) { $coordCounts += $f.geometry.coordinates.Count }
}
Write-Host ('Geometry types: ' + ($geotypes.GetEnumerator() | ForEach-Object { "$($_.Key)=$($_.Value)" }) -join ', ')
$coordCounts = $coordCounts | Sort-Object
Write-Host ('Coord count: min=' + $coordCounts[0] + ' median=' + $coordCounts[[math]::Floor($coordCounts.Count/2)] + ' max=' + $coordCounts[-1])
# sample first 3 features
for ($i=0; $i -lt 3; $i++) {
    $f = $j.features[$i]
    $p = $f.properties
    Write-Host ("---")
    Write-Host ("id=" + $p.id + " nomor=" + $p.nomor_ruas + " nama=" + $p.nama_ruas)
    Write-Host ("type=" + $f.geometry.type + " coords=" + $f.geometry.coordinates.Count)
    Write-Host ("first=" + ($f.geometry.coordinates[0] -join ','))
    Write-Host ("last=" + ($f.geometry.coordinates[-1] -join ','))
}
