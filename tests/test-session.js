// test-session.js - Test session tracking functionality
require('dotenv').config();
const sessionModel = require('./session-model');
const userModel = require('./user-model');
const goldModel = require('./gold-model');

async function testSessionTracking() {
  try {
    console.log('Initializing session tables...');
    await sessionModel.initTables();
    
    // Test user ID (would normally be a Discord user ID)
    const testUserId = '123456789012345678';
    const testUsername = 'TestUser';
    
    // Ensure user exists
    console.log('\nCreating test user...');
    await userModel.createOrUpdateUser(testUserId, testUsername);
    console.log('Test user created/updated');
    
    console.log('\n--- Testing Session Start ---');
    console.log('Starting a new session...');
    const session = await sessionModel.startSession(
      testUserId,
      'Test Voyage',
      5000 // Starting gold
    );
    console.log('Session started:', session);
    
    // Update gold
    await goldModel.updateGold(testUserId, 5000);
    console.log('Gold updated to starting amount');
    
    console.log('\n--- Testing Cash-Ins ---');
    console.log('Adding first cash-in...');
    const cashIn1 = await sessionModel.addCashIn(
      session.id,
      1500, // Amount
      'Sold some treasure chests'
    );
    console.log('Cash-in added:', cashIn1);
    
    // Update gold after first cash-in
    await goldModel.updateGold(testUserId, 6500);
    console.log('Gold updated after first cash-in');
    
    console.log('Adding second cash-in...');
    const cashIn2 = await sessionModel.addCashIn(
      session.id,
      2500, // Amount
      'Completed a voyage'
    );
    console.log('Cash-in added:', cashIn2);
    
    // Update gold after second cash-in
    await goldModel.updateGold(testUserId, 9000);
    console.log('Gold updated after second cash-in');
    
    console.log('\n--- Testing Session End ---');
    console.log('Ending the session...');
    const completedSession = await sessionModel.endSession(
      session.id,
      9000, // Ending gold
      'Great session with friends'
    );
    console.log('Session ended:', completedSession);
    
    console.log('\n--- Testing Session History ---');
    console.log('Getting session history...');
    const history = await sessionModel.getUserSessions(testUserId);
    console.log(`Found ${history.length} sessions in history`);
    if (history.length > 0) {
      console.log('Most recent session:', history[0]);
    }
    
    console.log('\n--- Testing Session Statistics ---');
    console.log('Getting session stats...');
    const stats = await sessionModel.getSessionStats(testUserId);
    console.log('Session statistics:', stats);
    
    console.log('\n--- Testing Cash-In Retrieval ---');
    console.log('Getting cash-ins for session...');
    const cashIns = await sessionModel.getSessionCashIns(session.id);
    console.log(`Found ${cashIns.length} cash-ins for session`);
    console.log('Cash-ins:', cashIns);
    
    console.log('\nAll tests completed successfully!');
  } catch (error) {
    console.error('Test failed:', error);
  } finally {
    try {
      await sessionModel.close();
      await goldModel.close();
      await userModel.close();
      console.log('Database connections closed');
    } catch (closeError) {
      console.error('Error closing connections:', closeError);
    }
    process.exit(0);
  }
}

// Run the tests
console.log('Starting session tracking tests...');
testSessionTracking();
