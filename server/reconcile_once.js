const { reconcileAllCounters } = require('./src/services/maintenanceService');

async function run() {
  console.log('--- AUTO-MAINTENANCE START ---');
  try {
    const result = await reconcileAllCounters();
    console.log('SUCCESS:', result);
    process.exit(0);
  } catch (e) {
    console.error('ERROR:', e.message);
    process.exit(1);
  }
}

run();
