/**
 * @halaa-checkin/api
 * Authentication and User Provisioning Service.
 * Implements secure login with scrypt, session rotation, and revocation.
 */

import { ERROR_CODES, DomainError, ROLES, ROLE_VALUES } from '@halaa-checkin/contracts';
import { User } from './user.model.js';
import { Session } from './session.model.js';
import {
  hashPassword,
  verifyPassword,
  generateSessionToken,
  generateCsrfToken,
  sha256,
} from '../../utils/crypto.js';

// Dummy hash for constant-time comparison when username is not found
const DUMMY_HASH =
  'scrypt$N=16384,r=8,p=1$00000000000000000000000000000000$00000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000';

/**
 * Authenticate user credentials and issue a new session.
 *
 * @param {object} params
 * @param {string} params.username
 * @param {string} params.password
 * @param {object} params.config
 * @returns {Promise<{ user: object, sessionToken: string, csrfToken: string, expiresAt: Date }>}
 */
export async function loginUser({ username, password, config }) {
  const normUsername = String(username || '').trim().toLowerCase();

  const user = await User.findOne({
    username: normUsername,
    disabledAt: null,
  }).select('+passwordHash');

  if (!user || !user.passwordHash) {
    // Perform dummy computation to prevent timing attacks
    await verifyPassword(password, DUMMY_HASH);
    throw new DomainError({
      code: ERROR_CODES.UNAUTHENTICATED,
      message: 'Invalid username or password',
      status: 401,
    });
  }

  const isValidPassword = await verifyPassword(password, user.passwordHash);
  if (!isValidPassword) {
    throw new DomainError({
      code: ERROR_CODES.UNAUTHENTICATED,
      message: 'Invalid username or password',
      status: 401,
    });
  }

  // Issue new session
  const sessionToken = generateSessionToken();
  const tokenHash = sha256(sessionToken);
  const csrfToken = generateCsrfToken();
  const expiresAt = new Date(Date.now() + config.session.ttlMs);

  await Session.create({
    tokenHash,
    userId: user._id,
    csrfToken,
    expiresAt,
  });

  return {
    user: user.toSafeDto(),
    sessionToken,
    csrfToken,
    expiresAt,
  };
}

/**
 * Terminate an active session by its raw token.
 *
 * @param {string} sessionToken
 * @returns {Promise<void>}
 */
export async function logoutUser(sessionToken) {
  if (!sessionToken || typeof sessionToken !== 'string') {
    return;
  }
  const tokenHash = sha256(sessionToken);
  await Session.deleteOne({ tokenHash });
}

/**
 * Provision or update a named user account.
 * Revokes all existing sessions if password or roles are changed.
 *
 * @param {object} params
 * @param {string} params.username
 * @param {string} params.displayName
 * @param {string} params.password
 * @param {string} [params.role='reception']
 * @param {string[]} [params.assignedEventIds=[]]
 * @returns {Promise<object>} Safe user DTO
 */
export async function provisionUser({
  username,
  displayName,
  password,
  role = ROLES.RECEPTION,
  assignedEventIds = [],
}) {
  const normUsername = String(username || '').trim().toLowerCase();
  const normDisplayName = String(displayName || '').trim();

  if (!normUsername) {
    throw new Error('Username is required');
  }
  if (!normDisplayName) {
    throw new Error('Display name is required');
  }
  if (!ROLE_VALUES.includes(role)) {
    throw new Error(`Invalid role '${role}'. Must be one of: ${ROLE_VALUES.join(', ')}`);
  }
  if (!password || password.length < 8) {
    throw new Error('Password must be at least 8 characters long');
  }

  // F28: validate assigned event existence; provisioning previously accepted
  // arbitrary ObjectIds without checking Event records.
  const assignedIds = Array.isArray(assignedEventIds) ? assignedEventIds : [];
  if (assignedIds.length > 0) {
    const { Event } = await import('../events/event.model.js');
    const { default: mongoose } = await import('mongoose');
    for (const eid of assignedIds) {
      if (!mongoose.Types.ObjectId.isValid(String(eid))) {
        throw new Error(`Invalid event assignment '${eid}': must be a valid ObjectId`);
      }
    }
    const found = await Event.countDocuments({ _id: { $in: assignedIds } });
    if (found !== assignedIds.length) {
      throw new Error('One or more assigned events do not exist');
    }
  }

  const passwordHash = await hashPassword(password);

  const existingUser = await User.findOne({ username: normUsername });

  let user;
  if (existingUser) {
    existingUser.displayName = normDisplayName;
    existingUser.passwordHash = passwordHash;
    existingUser.role = role;
    existingUser.assignedEventIds = assignedIds;
    existingUser.disabledAt = null;
    user = await existingUser.save();

    // Revoke all existing sessions on credential update
    await Session.deleteMany({ userId: user._id });
  } else {
    user = await User.create({
      username: normUsername,
      displayName: normDisplayName,
      passwordHash,
      role,
      assignedEventIds: assignedIds,
    });
  }

  return user.toSafeDto();
}

/**
 * Disable a user account and immediately revoke all active sessions.
 *
 * @param {string} userId
 * @returns {Promise<void>}
 */
export async function disableUser(userId) {
  await User.updateOne({ _id: userId }, { disabledAt: new Date() });
  await Session.deleteMany({ userId });
}
