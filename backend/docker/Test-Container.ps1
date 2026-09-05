param([string]$Image = 'moki-rescue-api:local')
$ErrorActionPreference = 'Stop'
$smokeSuffix = [Guid]::NewGuid().ToString('N').Substring(0, 12)
$smokeNetwork = "moki-smoke-$smokeSuffix"
$smokeDatabase = "moki-smoke-db-$smokeSuffix"
$smokeApi = "moki-smoke-api-$smokeSuffix"
$smokeInit = (Resolve-Path -LiteralPath "$PSScriptRoot/../src/test/resources/db/test/supabase-compatibility.sql").Path

function Invoke-SmokeDocker([string[]]$DockerArgs) {
    $result = & docker @DockerArgs
    if ($LASTEXITCODE -ne 0) { throw "Docker operation failed: $($DockerArgs[0])" }
    return $result
}

try {
    Invoke-SmokeDocker -DockerArgs @('network', 'create', '--internal', '--label', "moki.smoke=$smokeSuffix", $smokeNetwork) | Out-Null
    Invoke-SmokeDocker -DockerArgs @('run', '-d', '--name', $smokeDatabase, '--network', $smokeNetwork,
        '--network-alias', 'database', '--label', "moki.smoke=$smokeSuffix",
        '--mount', "type=bind,source=$smokeInit,target=/docker-entrypoint-initdb.d/compatibility.sql,readonly",
        '--tmpfs', '/var/lib/postgresql/data:rw,size=256m',
        '-e', 'POSTGRES_PASSWORD=local-smoke-owner', '-e', 'POSTGRES_DB=moki_rescue',
        'postgis/postgis:16-3.5') | Out-Null

    $smokeReady = $false
    for ($attempt = 0; $attempt -lt 45; $attempt++) {
        & docker exec $smokeDatabase pg_isready -h 127.0.0.1 -U postgres -d moki_rescue 2>$null | Out-Null
        if ($LASTEXITCODE -eq 0) { $smokeReady = $true; break }
        Start-Sleep -Seconds 1
    }
    if (!$smokeReady) { throw 'Disposable PostGIS did not become ready.' }
    Invoke-SmokeDocker -DockerArgs @('exec', $smokeDatabase, 'psql', '-U', 'postgres', '-d', 'moki_rescue',
        '-v', 'ON_ERROR_STOP=1', '-c', "CREATE ROLE motorescue_api LOGIN PASSWORD 'local-smoke-runtime'") | Out-Null

    # Only this disposable smoke test enables owner-backed startup migration.
    # Normal compose deployment always disables it and uses a separate migration job.
    Invoke-SmokeDocker -DockerArgs @('run', '-d', '--name', $smokeApi, '--network', $smokeNetwork,
        '--label', "moki.smoke=$smokeSuffix", '--read-only', '--cap-drop=ALL',
        '--security-opt', 'no-new-privileges:true', '--tmpfs', '/tmp:rw,size=64m,mode=1777',
        '-e', 'SPRING_DATASOURCE_URL=jdbc:postgresql://database:5432/moki_rescue',
        '-e', 'SPRING_DATASOURCE_USERNAME=motorescue_api', '-e', 'SPRING_DATASOURCE_PASSWORD=local-smoke-runtime',
        '-e', 'SPRING_FLYWAY_ENABLED=true', '-e', 'SPRING_FLYWAY_USER=postgres',
        '-e', 'SPRING_FLYWAY_PASSWORD=local-smoke-owner',
        '-e', 'SUPABASE_URL=https://supabase.example.invalid',
        '-e', 'OSRM_MOTORBIKE_BASE_URL=https://routing.example.invalid',
        '-e', 'ASSISTANT_ENABLED=false', $Image) | Out-Null

    $smokeReady = $false
    for ($attempt = 0; $attempt -lt 45; $attempt++) {
        $smokeRunning = Invoke-SmokeDocker -DockerArgs @('inspect', '--format', '{{.State.Running}}', $smokeApi)
        if ($smokeRunning -ne 'true') {
            & docker logs --tail 80 $smokeApi
            throw 'API container exited during startup.'
        }
        try {
            & docker exec $smokeApi java -cp /app/healthcheck Healthcheck 2>$null | Out-Null
        } catch {
            & docker logs --tail 80 $smokeApi
            throw
        }
        if ($LASTEXITCODE -eq 0) { $smokeReady = $true; break }
        Start-Sleep -Seconds 1
    }
    if (!$smokeReady) {
        & docker logs --tail 60 $smokeApi
        throw 'Container readiness failed.'
    }
    $smokeUser = Invoke-SmokeDocker -DockerArgs @('inspect', '--format', '{{.Config.User}}', $smokeApi)
    if ($smokeUser -ne '10001:10001') { throw 'Runtime must not run as root.' }
    $smokeVersions = Invoke-SmokeDocker -DockerArgs @('exec', $smokeDatabase, 'psql', '-U', 'postgres', '-d', 'moki_rescue',
        '-tAc', "SELECT COUNT(*) FROM public.flyway_schema_history WHERE success")
    if ([int]$smokeVersions -ne 4) { throw 'Expected all four versioned migrations.' }
    Write-Output 'PASS: non-root/read-only container, PostGIS migrations and database readiness. No cloud connections.'
} finally {
    # Only delete unique resources created by this invocation, after checking ownership labels.
    foreach ($smokeContainer in @($smokeApi, $smokeDatabase)) {
        $smokeOwnedId = & docker container ls -aq --filter "name=^/$smokeContainer$" --filter "label=moki.smoke=$smokeSuffix"
        if ($LASTEXITCODE -eq 0 -and $smokeOwnedId) {
            & docker rm --force $smokeOwnedId | Out-Null
        }
    }
    $smokeOwnedNetwork = & docker network ls -q --filter "name=^$smokeNetwork$" --filter "label=moki.smoke=$smokeSuffix"
    if ($LASTEXITCODE -eq 0 -and $smokeOwnedNetwork) {
        & docker network rm $smokeOwnedNetwork | Out-Null
    }
}
