[CmdletBinding()]
param([string]$BaseUrl = 'http://127.0.0.1:5000', [switch]$Fixture)
$ErrorActionPreference = 'Stop'
$base = $BaseUrl.TrimEnd('/')
$pair = if ($Fixture) { '108.2,16.05;108.21,16.05' } else { '108.2201,16.0611;108.2229,16.0472' }
$route = Invoke-RestMethod -Uri "$base/route/v1/driving/${pair}?overview=full&geometries=geojson&steps=true&radiuses=150;150" -TimeoutSec 15
if ($route.code -ne 'Ok' -or $route.routes.Count -lt 1 -or $route.routes[0].geometry.coordinates.Count -lt 2 -or
    $route.routes[0].distance -le 0 -or $route.routes[0].duration -le 0) { throw 'No valid road geometry/distance/ETA.' }
$table = Invoke-RestMethod -Uri "$base/table/v1/driving/${pair}?sources=0&destinations=1&annotations=duration,distance&radiuses=150;150" -TimeoutSec 15
if ($table.code -ne 'Ok' -or $table.durations[0][0] -le 0 -or $table.distances[0][0] -le 0) { throw 'Invalid matching table.' }
if ([Math]::Abs($route.routes[0].duration - $table.durations[0][0]) -gt 1) { throw 'Route/Table ETA mismatch.' }
if ($Fixture) {
    $names = @($route.routes[0].legs[0].steps | ForEach-Object { $_.name })
    if ($names -match 'forbidden-' -or $names -notcontains 'motorcycle-access') { throw 'Motorcycle access rules failed.' }
    $reverse = Invoke-RestMethod -Uri "$base/route/v1/driving/108.21,16.05;108.2,16.05?overview=false&steps=true&radiuses=20;20" -TimeoutSec 15
    if ($reverse.code -ne 'Ok' -or $reverse.routes[0].distance -le $route.routes[0].distance + 500) { throw 'One-way rule failed.' }
}
Write-Host ('OSRM Route + Table passed: {0:N0} m, {1:N0} seconds, {2} geometry points.' -f
    $route.routes[0].distance, $route.routes[0].duration, $route.routes[0].geometry.coordinates.Count)
