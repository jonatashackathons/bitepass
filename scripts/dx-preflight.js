const { execSync } = require('node:child_process');
const net = require('node:net');

function checkDocker() {
  try {
    execSync('docker info', { stdio: 'ignore' });
  } catch {
    console.error(
      '\n[BitePass DX Preflight] Docker daemon is not running.\n' +
        '  → Start Docker Desktop for Postgres/Redis prod-parity mode (`npm run dx:up`),\n' +
        '  → OR run `npm run dev` for instant zero-Docker offline mode (`STORAGE_DRIVER=memory`).\n'
    );
    process.exit(1);
  }
}

function checkPortFreeOrBitePass(port, containerName, envVar) {
  return new Promise((resolve) => {
    const server = net.createServer();
    server.once('error', () => {
      try {
        const running = execSync(`docker ps --filter "name=${containerName}" --format "{{.Names}}"`, {
          encoding: 'utf8',
        }).trim();
        if (running.includes(containerName)) {
          resolve(true);
          return;
        }
      } catch {
        // ignore
      }
      console.error(
        `\n[BitePass DX Preflight] Port ${port} is already in use by another process.\n` +
          `  → Override with: ${envVar}=${Number(port) + 1} npm run dx:up\n`
      );
      process.exit(1);
    });
    server.once('listening', () => {
      server.close(() => resolve(true));
    });
    server.listen(Number(port), '127.0.0.1');
  });
}

(async () => {
  checkDocker();
  const pgPort = process.env.BITEPASS_PG_PORT || '54329';
  const redisPort = process.env.BITEPASS_REDIS_PORT || '63799';
  const appPort = process.env.PORT || '3000';
  await checkPortFreeOrBitePass(pgPort, 'bitepass-postgres', 'BITEPASS_PG_PORT');
  await checkPortFreeOrBitePass(redisPort, 'bitepass-redis', 'BITEPASS_REDIS_PORT');
  await checkPortFreeOrBitePass(appPort, 'bitepass-app', 'PORT');
  console.log(`✅ DX Preflight OK (Postgres :${pgPort}, Redis :${redisPort}, App :${appPort})`);
})();

