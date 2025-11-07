// utils/verify-commands.js
const fs = require('fs');
const path = require('path');
const logger = require('../logger');

function verifyCommands() {
  const commandsPath = path.join(__dirname, '../commands');
  const results = {
    timestamp: new Date().toISOString(),
    totalCommands: 0,
    validCommands: 0,
    invalidCommands: [],
    details: {}
  };
  
  try {
    // Get all command files
    const commandFiles = fs.readdirSync(commandsPath).filter(file => file.endsWith('.js'));
    results.totalCommands = commandFiles.length;
    
    // Check each command
    for (const file of commandFiles) {
      const filePath = path.join(commandsPath, file);
      try {
        const command = require(filePath);
        
        // Check required properties
        const hasName = typeof command.name === 'string';
        const hasExecute = typeof command.execute === 'function';
        
        if (hasName && hasExecute) {
          results.validCommands++;
          results.details[file] = { valid: true };
        } else {
          results.invalidCommands.push(file);
          results.details[file] = {
            valid: false,
            hasName,
            hasExecute,
            issues: []
          };
          
          if (!hasName) results.details[file].issues.push('Missing name property');
          if (!hasExecute) results.details[file].issues.push('Missing execute function');
        }
      } catch (error) {
        results.invalidCommands.push(file);
        results.details[file] = {
          valid: false,
          error: error.message
        };
      }
    }
    
    // Log results
    if (results.invalidCommands.length === 0) {
      logger.info(`All ${results.totalCommands} commands are valid`);
    } else {
      logger.warn(`Found ${results.invalidCommands.length} invalid commands out of ${results.totalCommands}`);
      for (const file of results.invalidCommands) {
        logger.warn(`Invalid command: ${file}`, results.details[file]);
      }
    }
    
    return results;
  } catch (error) {
    logger.error('Error verifying commands:', error);
    results.error = error.message;
    return results;
  }
}

// Run if called directly
if (require.main === module) {
  const results = verifyCommands();
  console.log(JSON.stringify(results, null, 2));
  process.exit(results.invalidCommands.length === 0 ? 0 : 1);
}

module.exports = { verifyCommands };

