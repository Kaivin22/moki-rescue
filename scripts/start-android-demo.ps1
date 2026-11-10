param([switch]$Headless)
$ErrorActionPreference = 'Stop'
$projectRoot = Split-Path $PSScriptRoot -Parent
$sdk = Join-Path $env:LOCALAPPDATA 'Android\Sdk'
$emulator = Join-Path $sdk 'emulator\emulator.exe'
$adb = Join-Path $sdk 'platform-tools\adb.exe'
if (!(Test-Path $emulator)) { throw 'Android Emulator is not installed at the expected SDK path.' }
if (!(Test-Path "$projectRoot\.tmp\avd\Rescue_Demo.ini")) { throw 'Rescue_Demo has not been prepared on this machine.' }
# This alias avoids Unicode-path problems in native Android tools. It does not copy the project.
if (Test-Path R:\) {
    # Verify the alias by file identity, avoiding OEM/Unicode decoding of subst output.
    $probeName = 'apk-root-' + [guid]::NewGuid().ToString('N') + '.txt'
    $probePath = Join-Path $projectRoot ('.tmp\' + $probeName)
    try {
        [IO.File]::WriteAllText($probePath, $probeName)
        if (!(Test-Path ("R:\.tmp\" + $probeName)) -or
            [IO.File]::ReadAllText("R:\.tmp\" + $probeName) -ne $probeName) {
            throw 'Drive R is used by another directory.'
        }
    } finally { Remove-Item -LiteralPath $probePath -ErrorAction SilentlyContinue }
} else {
    & subst R: $projectRoot
    if ($LASTEXITCODE -ne 0) { throw 'Cannot create temporary drive R.' }
}
$env:ANDROID_HOME = $sdk
$env:ANDROID_SDK_ROOT = $sdk
$env:ANDROID_AVD_HOME = 'R:\.tmp\avd'
$running = Get-CimInstance Win32_Process | Where-Object {
    $_.Name -eq 'qemu-system-x86_64.exe' -and $_.CommandLine -match 'Rescue_Demo'
}
if ($running) { Write-Host 'Rescue_Demo is already running.'; & $adb devices; exit 0 }
$arguments = @('-avd', 'Rescue_Demo', '-no-snapshot', '-gpu', 'swiftshader_indirect', '-skin', '1080x2340', '-no-audio')
if ($Headless) {
    Start-Process -FilePath $emulator -ArgumentList ($arguments + '-no-window') -WindowStyle Hidden
} else {
    Start-Process -FilePath $emulator -ArgumentList $arguments
}
Write-Host 'Starting Rescue_Demo. Android Studio and Metro are not needed for an installed standalone APK.'
Write-Host 'The API and OSRM must still be running for rescue features.'
