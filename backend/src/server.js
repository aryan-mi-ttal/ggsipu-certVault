const dns = require('dns');
if (dns.setDefaultResultOrder) {
  dns.setDefaultResultOrder('ipv4first');
}

const path = require('path');
require('dotenv').config();
require('dotenv').config({ path: path.resolve(__dirname, '../.env') });

const app = require('./app');
const { initDb } = require('./db');

const PORT = process.env.PORT || 5000;

// Initialize database schema and start server
initDb().then(() => {
  const server = app.listen(PORT, () => {
    console.log(`CertVault Backend running on http://localhost:${PORT}`);
  });

  server.on('error', (err) => {
    if (err.code === 'EADDRINUSE') {
      console.error(`\n[ERROR] Port ${PORT} is already in use by another process.`);
      console.error(`To free port ${PORT} in PowerShell, run:`);
      console.error(`  Stop-Process -Id (Get-NetTCPConnection -LocalPort ${PORT}).OwningProcess -Force\n`);
    } else {
      console.error('Server error:', err);
    }
  });
}).catch((err) => {
  console.error('[DATABASE] Failed to initialize database:', err);
  process.exit(1);
});
