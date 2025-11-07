// test-access-control.js - Test access control functionality
require('dotenv').config();
const accessControl = require('./access-control');

async function testAccessControl() {
  try {
    console.log('Initializing access control tables...');
    await accessControl.initTables();
    
    // Test user IDs (would normally be Discord user IDs)
    const adminId = '123456789012345678';
    const whitelistedId = '234567890123456789';
    const regularId = '345678901234567890';
    const guildId = '456789012345678901';
    
    console.log('\n--- Testing Admin Functions ---');
    console.log(`Adding ${adminId} as admin...`);
    await accessControl.addAdmin(adminId);
    
    console.log(`Adding ${whitelistedId} to whitelist...`);
    await accessControl.addToWhitelist(whitelistedId);
    
    console.log('\n--- Testing Server Settings ---');
    console.log(`Setting whitelist requirement for guild ${guildId}...`);
    await accessControl.setServerWhitelistRequired(guildId, true);
    
    console.log('\n--- Testing Access Checks ---');
    
    console.log(`Is ${adminId} an admin?`, await accessControl.isAdmin(adminId));
    console.log(`Is ${whitelistedId} an admin?`, await accessControl.isAdmin(whitelistedId));
    
    console.log(`Is ${adminId} whitelisted?`, await accessControl.isWhitelisted(adminId));
    console.log(`Is ${whitelistedId} whitelisted?`, await accessControl.isWhitelisted(whitelistedId));
    console.log(`Is ${regularId} whitelisted?`, await accessControl.isWhitelisted(regularId));
    
    console.log(`Does guild ${guildId} require whitelist?`, await accessControl.serverRequiresWhitelist(guildId));
    
    console.log(`Can ${adminId} use bot in guild ${guildId}?`, await accessControl.canUseBot(adminId, guildId));
    console.log(`Can ${whitelistedId} use bot in guild ${guildId}?`, await accessControl.canUseBot(whitelistedId, guildId));
    console.log(`Can ${regularId} use bot in guild ${guildId}?`, await accessControl.canUseBot(regularId, guildId));
    
    console.log('\n--- Testing Command Permissions ---');
    console.log(`Can ${adminId} use 'admin' command?`, await accessControl.canUseCommand(adminId, guildId, 'admin'));
    console.log(`Can ${whitelistedId} use 'track_gold' command?`, await accessControl.canUseCommand(whitelistedId, guildId, 'track_gold'));
    console.log(`Can ${regularId} use 'track_gold' command?`, await accessControl.canUseCommand(regularId, guildId, 'track_gold'));
    
    console.log('\n--- Getting User Lists ---');
    const admins = await accessControl.getAdminUsers();
    console.log('Admin users:', admins);
    
    const whitelisted = await accessControl.getWhitelistedUsers();
    console.log('Whitelisted users:', whitelisted);
    
    console.log('\nAll tests completed successfully!');
  } catch (error) {
    console.error('Test failed:', error);
  } finally {
    await accessControl.close();
  }
}

// Run the tests
testAccessControl();
