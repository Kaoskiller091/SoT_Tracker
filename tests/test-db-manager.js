// test-db-manager.js
const dbManager = require('./db-manager');

async function testDbManager() {
  console.log('Testing Database Manager...');
  
  try {
    // Initialize the connection
    console.log('Initializing connection...');
    await dbManager.initialize();
    
    // Test a simple query
    console.log('Executing test query...');
    const result = await dbManager.query('SELECT 1 + 1 AS solution');
    console.log('Query result:', result[0].solution);
    
    // Test connection status
    const status = dbManager.getStatus();
    console.log('\nConnection Status:');
    console.log('- Connected:', status.isConnected);
    console.log('- Queries executed:', status.stats.queriesExecuted);
    console.log('- Errors encountered:', status.stats.errorsEncountered);
    
    // Close connection
    console.log('\nClosing connection...');
    await dbManager.close();
    console.log('Connection closed');
  } catch (error) {
    console.error('Test failed:', error);
  }
}

testDbManager();
