// test-scheduler.js - Simplified version
const schedule = require('node-schedule');

console.log('Testing scheduler...');
console.log('Current time:', new Date().toLocaleTimeString());

// Schedule a job to run in 10 seconds
const futureDate = new Date(Date.now() + 10000);
console.log('Scheduling job for:', futureDate.toLocaleTimeString());

const job = schedule.scheduleJob(futureDate, function() {
  console.log('Scheduled job executed at:', new Date().toLocaleTimeString());
});

console.log('Job scheduled. Waiting for execution...');
