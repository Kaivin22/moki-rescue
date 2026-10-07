/* Local development only. No installs, migrations, Docker, or firewall changes. */
const fs = require('node:fs');
const path = require('node:path');
const os = require('node:os');
const { spawn, spawnSync } = require('node:child_process');
const root = path.resolve(__dirname, '..');

function lanAddresses(interfaces) {
  return Object.entries(interfaces)
    .filter(([name]) => !/loopback|vethernet|wsl|docker|virtual|vpn|tailscale/i.test(name))
    .flatMap(([, items]) =>
      (items || [])
        .filter((item) => item.family === 'IPv4' && !item.internal && !item.address.startsWith('169.254.'))
        .map((item) => item.address),
    );
}
function resolveApiUrl(configured, addresses, port = '8080') {
  if (configured) {
    const url = new URL(configured);
    if (!['http:', 'https:'].includes(url.protocol) || url.username || url.password || url.search || url.hash)
      throw new Error('EXPO_PUBLIC_API_URL must be an HTTP(S) origin without credentials/query.');
    if (!['localhost', '127.0.0.1', '0.0.0.0', '[::1]'].includes(url.hostname))
      return configured.replace(/\/+$/, '').replace(/\/api$/, '');
  }
  if (addresses.length !== 1)
    throw new Error(
      'Set EXPO_PUBLIC_API_URL to the backend LAN address in .env; network selection is ambiguous.',
    );
  return `http://${addresses[0]}:${configured ? new URL(configured).port || port : port}`;
}
async function healthy(base, suffix = '/api/health/ready') {
  try {
    const response = await fetch(base + suffix, { signal: AbortSignal.timeout(6000) });
    const result = await response.json();
    return response.ok && (suffix.endsWith('/ready') ? result.status === 'ready' : result.status === 'ok');
  } catch {
    return false;
  }
}

async function main() {
  process.chdir(root);
  if (fs.existsSync('.env.local')) process.loadEnvFile('.env.local');
  if (fs.existsSync('.env')) process.loadEnvFile('.env');
  if (process.env.APP_ENV === 'production' || process.env.EAS_BUILD_PROFILE === 'production')
    throw new Error('This launcher is for local development only.');
  const args = process.argv.slice(2);
  const backendOnly = args.includes('--backend');
  const frontendOnly = args.includes('--frontend-only');
  const addresses = lanAddresses(os.networkInterfaces());
  const port = process.env.PORT || '8080';
  if (!/^\d{1,5}$/.test(port) || +port < 1 || +port > 65535) throw new Error('Invalid PORT.');
  const apiUrl = backendOnly
    ? `http://127.0.0.1:${port}`
    : resolveApiUrl(process.env.EXPO_PUBLIC_API_URL, addresses, port);
  process.env.EXPO_PUBLIC_API_URL = apiUrl;
  process.env.OSRM_MOTORBIKE_BASE_URL ||= 'http://127.0.0.1:5000';
  process.env.SPRING_FLYWAY_ENABLED = 'false';
  process.env.EXPO_NO_TELEMETRY = '1';
  const temporary = path.join(root, '.tmp', 'local-development');
  fs.mkdirSync(temporary, { recursive: true });
  process.env.TEMP = temporary;
  process.env.TMP = temporary;
  let backend;
  let expo;
  let stopping = false;
  const stop = (code = 0) => {
    if (stopping) return;
    stopping = true;
    expo?.kill();
    backend?.kill();
    process.exitCode = code;
  };
  process.on('SIGINT', () => stop());
  process.on('SIGTERM', () => stop());
  const ready = await healthy(apiUrl);
  if (!ready) {
    const parsed = new URL(apiUrl);
    const local = ['127.0.0.1', 'localhost', ...addresses].includes(parsed.hostname);
    if (frontendOnly || !local)
      throw new Error(
        `API not ready at ${apiUrl}. Start that backend/check its .env; for a changed Wi-Fi IP update EXPO_PUBLIC_API_URL. Expo was not started.`,
      );
    if ((parsed.port || '80') !== port)
      throw new Error('API URL port and backend PORT differ. Fix .env before starting.');
    if (await healthy(apiUrl, '/api/health'))
      throw new Error(
        'Backend is running but its database is not ready. Check backend logs; do not start a duplicate process.',
      );
    for (const name of [
      'SPRING_DATASOURCE_URL',
      'SPRING_DATASOURCE_USERNAME',
      'SPRING_DATASOURCE_PASSWORD',
      'SUPABASE_URL',
    ]) {
      if (!process.env[name]) throw new Error(`Missing ${name} in .env`);
    }
    if (process.env.SPRING_DATASOURCE_USERNAME === 'postgres')
      console.warn(
        'WARNING: local .env uses postgres. Configure the dedicated motorescue_api credentials before deployment.',
      );
    console.log('Building backend from installed Maven dependencies (offline, no migrations)…');
    const build = spawnSync(
      process.platform === 'win32' ? 'mvnw.cmd' : './mvnw',
      ['-o', '-Dmaven.repo.local=.m2repo', '-DskipTests', 'package'],
      {
        cwd: path.join(root, 'backend'),
        stdio: 'inherit',
        shell: process.platform === 'win32',
        windowsHide: true,
      },
    );
    if (build.status !== 0)
      throw new Error(
        'Backend build failed. This launcher does not download missing dependencies automatically.',
      );
    const logPath = path.join(temporary, 'backend.log');
    const log = fs.openSync(logPath, 'w');
    backend = spawn(
      'java',
      // Keep the jar argument ASCII. Some Windows JDK builds misdecode an
      // absolute path containing Vietnamese characters passed by child_process.
      ['-Dfile.encoding=UTF-8', '-jar', 'backend/target/moki-rescue-0.0.1-SNAPSHOT.jar'],
      { cwd: root, env: process.env, stdio: ['ignore', log, log], windowsHide: true },
    );
    fs.closeSync(log);
    backend.on('error', (error) => {
      console.error(error.message);
      stop(1);
    });
    backend.on('exit', (code) => {
      if (!stopping) {
        console.error(`Backend exited (${code}); see ${logPath}`);
        stop(code || 1);
      }
    });
    const deadline = Date.now() + 60_000;
    let connected = false;
    while (!stopping && Date.now() < deadline) {
      if (await healthy(apiUrl)) {
        connected = true;
        break;
      }
      await new Promise((resolve) => setTimeout(resolve, 1000));
    }
    if (!connected) {
      console.error(`API not ready. See ${logPath}`);
      stop(1);
      return;
    }
  }
  if (stopping) return;
  console.log(`API READY: ${apiUrl}/api/health/ready`);
  console.log('On iPhone: use the same Wi-Fi and open the above URL in Safari. Do not use localhost.');
  if (backendOnly) {
    if (!backend) console.log('Reusing an already running backend.');
    return;
  }
  const expoArgs = args.filter((arg) => !['--backend', '--frontend-only'].includes(arg));
  expo = spawn(process.execPath, [path.join(root, 'node_modules/expo/bin/cli'), 'start', ...expoArgs], {
    cwd: root,
    env: process.env,
    stdio: 'inherit',
    windowsHide: true,
  });
  expo.on('error', (error) => {
    console.error(error.message);
    stop(1);
  });
  expo.on('exit', (code) => stop(code || 0));
}
module.exports = { lanAddresses, resolveApiUrl };
if (require.main === module)
  main().catch((error) => {
    console.error(error.message);
    process.exitCode = 1;
  });
