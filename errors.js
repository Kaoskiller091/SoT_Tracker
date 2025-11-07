// errors.js - Error classes that don't affect existing error handling
class BotError extends Error {
  constructor(message, code, userMessage) {
    super(message);
    this.name = 'BotError';
    this.code = code;
    this.userMessage = userMessage || 'An error occurred. Please try again later.';
  }
}

class DatabaseError extends BotError {
  constructor(message, sqlError, query, params) {
    super(
      message, 
      'DB_ERROR', 
      'There was a database error. Please try again later.'
    );
    this.sqlError = sqlError;
    this.query = query;
    this.params = params;
  }
}

class CommandError extends BotError {
  constructor(message, command, userMessage) {
    super(message, 'CMD_ERROR', userMessage);
    this.command = command;
  }
}

// Helper function that works with existing error handling
const handleError = async (error, interaction) => {
  console.error('Error:', error);
  
  let userMessage = 'An unexpected error occurred. Please try again later.';
  
  if (error instanceof BotError) {
    userMessage = error.userMessage;
  }
  
  try {
    if (interaction) {
      if (interaction.deferred || interaction.replied) {
        await interaction.followUp({ content: userMessage, ephemeral: true });
      } else {
        await interaction.reply({ content: userMessage, ephemeral: true });
      }
    }
  } catch (replyError) {
    console.error('Error sending error message:', replyError);
  }
};

module.exports = {
  BotError,
  DatabaseError,
  CommandError,
  handleError
};
