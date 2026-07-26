const { reconcileAllCounters } = require('../../server/src/services/maintenanceService');

async function run() {
  console.log('--- MANUAL RECONCILIATION START ---');
  try {
    const result = await reconcileAllCounters();
    console.log('Result:', result);
    console.log('--- SUCCESS ---');
  } catch (e) {
    console.error('Error:', e.message);
    process.exit(1);
  }
}

run();
