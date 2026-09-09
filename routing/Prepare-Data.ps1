[CmdletBinding()]
param(
    # Use a local OSM extract for reproducible builds; never use Google map data.
    [string]$InputFile,
    [switch]$DownloadDaNang,
    # Native OSRM v5.27.1 executables (Linux/WSL); no container runtime.
    [Parameter(Mandatory = $true)][string]$OsrmProfilesDirectory,
    [string]$OsrmBinDirectory,
    [ValidatePattern('^[a-zA-Z0-9][a-zA-Z0-9_-]{0,60}$')]
    [string]$OutputName = ('danang-' + (Get-Date -Format 'yyyyMMdd-HHmmss')),
    [ValidateRange(1, 8)][int]$Threads = 2
)
$ErrorActionPreference = 'Stop'
if ([bool]$InputFile -eq [bool]$DownloadDaNang) {
    throw 'Specify exactly one of -InputFile path.osm[.pbf] or -DownloadDaNang.'
}
$profiles = (Resolve-Path -LiteralPath $OsrmProfilesDirectory).Path
if (!(Test-Path -LiteralPath (Join-Path $profiles 'car.lua')) -or
    !(Test-Path -LiteralPath (Join-Path $profiles 'lib'))) { throw 'Expected the official OSRM profiles directory with car.lua and lib/.' }
$commands = @{}
foreach ($name in @('osrm-extract', 'osrm-partition', 'osrm-customize')) {
    $candidate = if ($OsrmBinDirectory) { Join-Path $OsrmBinDirectory $name } else { $name }
    $commands[$name] = (Get-Command $candidate -ErrorAction Stop).Source
}
$dataRoot = Join-Path $PSScriptRoot 'data'
$outputDir = Join-Path $dataRoot $OutputName
if (Test-Path -LiteralPath $outputDir) { throw "Output already exists; choose a new -OutputName: $outputDir" }
$sourcePath = $null
if ($InputFile) {
    $sourcePath = (Resolve-Path -LiteralPath $InputFile).Path
    if ($sourcePath -notmatch '\.osm(\.pbf)?$') { throw 'Input must be .osm or .osm.pbf.' }
}
New-Item -ItemType Directory -Path $outputDir | Out-Null
$suffix = if ($sourcePath -and $sourcePath.EndsWith('.pbf')) { '.osm.pbf' } else { '.osm' }
$osmFile = Join-Path $outputDir ('map' + $suffix)
if ($DownloadDaNang) {
    # One bounded roads-only OSM query for a central Da Nang demo. Not all service zones.
    # Relations + recursive members preserve turn restrictions and their way nodes.
    $query = '[out:xml][timeout:120];(way["highway"](15.95,108.05,16.18,108.34);relation["type"="restriction"](15.95,108.05,16.18,108.34););(._;>>;);out body;'
    Write-Host 'Downloading a bounded OpenStreetMap road extract (not map tiles)...'
    Invoke-WebRequest -Uri 'https://overpass-api.de/api/interpreter' -Method Post -Body @{ data = $query } `
        -UserAgent 'MokiRescue-OSRM-Prototype/1.0' -TimeoutSec 150 -UseBasicParsing -OutFile $osmFile
    $reader = [System.Xml.XmlReader]::Create($osmFile)
    try {
        while ($reader.Read()) {
            if ($reader.NodeType -eq [System.Xml.XmlNodeType]::Element -and $reader.Name -eq 'remark') {
                throw 'Overpass returned a partial/error extract. Keep this directory for diagnostics and retry later with a new OutputName.'
            }
        }
    } finally { $reader.Dispose() }
} else {
    Copy-Item -LiteralPath $sourcePath -Destination $osmFile
}
Write-Host ('Input SHA256: ' + (Get-FileHash -LiteralPath $osmFile -Algorithm SHA256).Hash)
$profileFile = Join-Path $PSScriptRoot 'profiles/motorcycle.lua'
$routeFile = Join-Path $outputDir 'map.osrm'
$previousProfiles = $env:OSRM_PROFILES_DIR
try {
    $env:OSRM_PROFILES_DIR = $profiles
    & $commands['osrm-extract'] -t $Threads -p $profileFile $osmFile
    if ($LASTEXITCODE -ne 0) { throw 'osrm-extract failed. Output was not activated.' }
    & $commands['osrm-partition'] -t $Threads $routeFile
    if ($LASTEXITCODE -ne 0) { throw 'osrm-partition failed. Output was not activated.' }
    & $commands['osrm-customize'] -t $Threads $routeFile
    if ($LASTEXITCODE -ne 0) { throw 'osrm-customize failed. Output was not activated.' }
} finally { $env:OSRM_PROFILES_DIR = $previousProfiles }
Write-Host 'Prepared successfully. Start the local router with:'
Write-Host ('osrm-routed --algorithm mld --ip 127.0.0.1 --port 5000 --threads 2 "' + $routeFile + '"')
