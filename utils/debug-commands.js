// debug-commands.js
const fs = require('fs');
const path = require('path');

// Get commands directory
const commandsPath = path.join(__dirname, 'commands');

// Check if directory exists
if (!fs.existsSync(commandsPath)) {
  console.error(`Commands directory not found: ${commandsPath}`);
  process.exit(1);
}

// Get command files
const commandFiles = fs.readdirSync(commandsPath).filter(file => file.endsWith('.js'));

console.log(`Found ${commandFiles.length} command files:`);
for (const file of commandFiles) {
  console.log(`- ${file}`);
  
  try {
    const filePath = path.join(commandsPath, file);
    const command = require(filePath);
    
    if ('name' in command && 'execute' in command) {
      console.log(`  ✓ Valid command: ${command.name}`);
    } else {
      console.log(`  ✗ Invalid command: missing required properties`);
      if (!('name' in command)) console.log(`    - Missing 'name' property`);
      if (!('execute' in command)) console.log(`    - Missing 'execute' property`);
    }
  } catch (error) {
    console.error(`  ✗ Error loading command file ${file}:`, error);
  }
}
