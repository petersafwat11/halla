#!/usr/bin/env node
/**
 * @halaa-checkin/api
 * User provisioning CLI.
 * Provisions named admin or reception accounts with hidden password prompt.
 * Adheres to Technical Contract Section 2.
 */

import readline from 'node:readline';
import { Writable } from 'node:stream';
import { config, validateConfig } from '../src/config.js';
import { connectDb, disconnectDb } from '../src/db/connection.js';
import { ensureIndexes } from '../src/db/indexes.js';
import { provisionUser } from '../src/modules/auth/auth.service.js';
import { ROLES, ROLE_VALUES } from '@halaa-checkin/contracts';

/**
 * Prompt user for hidden password on stdin.
 *
 * @param {string} query
 * @returns {Promise<string>}
 */
function promptHiddenPassword(query) {
  return new Promise((resolve) => {
    let muted = false;
    const mutableStdout = new Writable({
      write(chunk, encoding, callback) {
        if (!muted) {
          process.stdout.write(chunk, encoding);
        }
        callback();
      },
    });

    const rl = readline.createInterface({
      input: process.stdin,
      output: mutableStdout,
      terminal: true,
    });

    rl.question(query, (password) => {
      rl.close();
      process.stdout.write('\n');
      resolve(password);
    });

    muted = true;
  });
}

/**
 * Parse CLI command arguments.
 */
function parseArgs() {
  const args = process.argv.slice(2);
  const parsed = {
    username: '',
    displayName: '',
    role: ROLES.RECEPTION,
    events: [],
  };

  for (let i = 0; i < args.length; i++) {
    const arg = args[i];
    if (arg === '--username' && args[i + 1]) {
      parsed.username = args[++i];
    } else if (arg === '--displayName' && args[i + 1]) {
      parsed.displayName = args[++i];
    } else if (arg === '--role' && args[i + 1]) {
      parsed.role = args[++i];
    } else if (arg === '--events' && args[i + 1]) {
      parsed.events = args[++i].split(',').map((id) => id.trim()).filter(Boolean);
    }
  }

  return parsed;
}

async function main() {
  try {
    validateConfig(config);
    const args = parseArgs();

    // 1. Gather required fields interactively if not provided
    const rl = readline.createInterface({
      input: process.stdin,
      output: process.stdout,
    });

    const questionAsync = (q) => new Promise((res) => rl.question(q, res));

    let username = args.username;
    if (!username) {
      username = await questionAsync('Enter username: ');
    }

    let displayName = args.displayName;
    if (!displayName) {
      displayName = await questionAsync('Enter display name: ');
    }

    let role = args.role;
    if (!args.role || !ROLE_VALUES.includes(args.role)) {
      const roleAnswer = await questionAsync(`Enter role (${ROLE_VALUES.join('/')}) [${ROLES.RECEPTION}]: `);
      if (roleAnswer.trim()) {
        role = roleAnswer.trim();
      }
    }
    rl.close();

    // 2. Secure hidden password prompt
    let password = process.env.USER_PASSWORD;
    if (!password) {
      password = await promptHiddenPassword('Enter password (hidden): ');
      if (!password) {
        throw new Error('Password cannot be empty');
      }
      const confirmPassword = await promptHiddenPassword('Confirm password (hidden): ');
      if (password !== confirmPassword) {
        throw new Error('Passwords do not match');
      }
    }

    // 3. Connect to database
    console.log(`Connecting to database (${config.mongodb.dbName})...`);
    await connectDb(config);
    await ensureIndexes();

    // 4. Provision user
    const safeUser = await provisionUser({
      username,
      displayName,
      password,
      role,
      assignedEventIds: args.events,
    });

    console.log('\nUser provisioned successfully:');
    console.log(JSON.stringify(safeUser, null, 2));

    await disconnectDb();
    process.exit(0);
  } catch (err) {
    console.error('\nError provisioning user:', err.message);
    try {
      await disconnectDb();
    } catch {
      // Ignore disconnect errors on fatal exit
    }
    process.exit(1);
  }
}

if (import.meta.url === `file:///${process.argv[1].replace(/\\/g, '/')}`) {
  main();
}
