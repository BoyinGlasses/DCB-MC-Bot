/**
 * ZeroTier approval flow logic
 * Handles request creation, approval, denial, and queries
 */
import { readJson, writeJson, appendToArray } from '../storage/store.js';
import { setMemberAuthorized } from './api.js';

const REQUESTS_FILE = 'zt-requests.json';
const AUDIT_FILE = 'zt-audit.json';

const ZT_ID_REGEX = /^[a-f0-9]{10}$/i;

/**
 * Validate ZeroTier Node ID format
 * @param {string} id
 * @returns {boolean}
 */
export function isValidZtId(id) {
  return typeof id === 'string' && ZT_ID_REGEX.test(id);
}

/**
 * Normalize ZeroTier ID to lowercase
 * @param {string} id
 * @returns {string}
 */
export function normalizeZtId(id) {
  return id.toLowerCase().trim();
}

/**
 * Read all requests
 * @returns {Array}
 */
function readAllRequests() {
  return readJson(REQUESTS_FILE, []);
}

/**
 * Save all requests
 * @param {Array} requests
 */
function writeAllRequests(requests) {
  writeJson(REQUESTS_FILE, requests);
}

/**
 * Create a new join request
 * @param {string} discordUserId
 * @param {string} ztMemberId - ZeroTier Node ID
 * @param {string} mcUsername
 * @returns {{ok: boolean, request?: Object, error?: string}}
 */
export function createRequest(discordUserId, ztMemberId, mcUsername) {
  const normalizedId = normalizeZtId(ztMemberId);
  if (!isValidZtId(normalizedId)) {
    return { ok: false, error: 'invalid_zt_id' };
  }

  if (!discordUserId || !mcUsername) {
    return { ok: false, error: 'missing_fields' };
  }

  const requests = readAllRequests();

  // Check duplicate pending request from same user
  const existingPending = requests.find(
    r => r.discordUserId === discordUserId && r.status === 'pending'
  );
  if (existingPending) {
    return { ok: false, error: 'already_pending', request: existingPending };
  }

  // Check duplicate ZT ID
  const existingZt = requests.find(
    r => r.ztMemberId === normalizedId && r.status === 'pending'
  );
  if (existingZt) {
    return { ok: false, error: 'zt_id_in_use' };
  }

  const request = {
    id: `req_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
    discordUserId,
    ztMemberId: normalizedId,
    mcUsername: mcUsername.trim().slice(0, 32),
    status: 'pending',
    createdAt: new Date().toISOString(),
    resolvedAt: null,
    resolvedBy: null,
    denyReason: null,
  };

  requests.push(request);
  writeAllRequests(requests);
  appendToArray(AUDIT_FILE, {
    action: 'request_created',
    requestId: request.id,
    discordUserId,
    mcUsername: request.mcUsername,
  });

  return { ok: true, request };
}

/**
 * Get a request by ID
 * @param {string} requestId
 * @returns {Object|undefined}
 */
export function getRequest(requestId) {
  return readAllRequests().find(r => r.id === requestId);
}

/**
 * Get all requests for a user
 * @param {string} discordUserId
 * @returns {Array}
 */
export function getRequestsByUser(discordUserId) {
  return readAllRequests().filter(r => r.discordUserId === discordUserId);
}

/**
 * Get latest request for a user
 * @param {string} discordUserId
 * @returns {Object|undefined}
 */
export function getLatestRequestForUser(discordUserId) {
  const userReqs = getRequestsByUser(discordUserId);
  if (userReqs.length === 0) return undefined;
  return userReqs.sort((a, b) => b.createdAt.localeCompare(a.createdAt))[0];
}

/**
 * Get all pending requests
 * @returns {Array}
 */
export function getPendingRequests() {
  return readAllRequests().filter(r => r.status === 'pending');
}

/**
 * Approve a request
 * @param {string} requestId
 * @param {string} adminDiscordId
 * @returns {Promise<{ok: boolean, request?: Object, error?: string}>}
 */
export async function approveRequest(requestId, adminDiscordId) {
  const requests = readAllRequests();
  const idx = requests.findIndex(r => r.id === requestId);
  if (idx === -1) return { ok: false, error: 'not_found' };
  if (requests[idx].status !== 'pending') {
    return { ok: false, error: 'already_resolved' };
  }

  // Call ZeroTier API to authorize
  const ztSuccess = await setMemberAuthorized(requests[idx].ztMemberId, true);
  if (!ztSuccess) {
    return { ok: false, error: 'zt_api_failed' };
  }

  requests[idx].status = 'approved';
  requests[idx].resolvedAt = new Date().toISOString();
  requests[idx].resolvedBy = adminDiscordId;
  writeAllRequests(requests);

  appendToArray(AUDIT_FILE, {
    action: 'request_approved',
    requestId,
    adminDiscordId,
    discordUserId: requests[idx].discordUserId,
  });

  return { ok: true, request: requests[idx] };
}

/**
 * Deny a request
 * @param {string} requestId
 * @param {string} adminDiscordId
 * @param {string} [reason]
 * @returns {{ok: boolean, request?: Object, error?: string}}
 */
export function denyRequest(requestId, adminDiscordId, reason = '') {
  const requests = readAllRequests();
  const idx = requests.findIndex(r => r.id === requestId);
  if (idx === -1) return { ok: false, error: 'not_found' };
  if (requests[idx].status !== 'pending') {
    return { ok: false, error: 'already_resolved' };
  }

  requests[idx].status = 'denied';
  requests[idx].resolvedAt = new Date().toISOString();
  requests[idx].resolvedBy = adminDiscordId;
  requests[idx].denyReason = reason.trim().slice(0, 200);
  writeAllRequests(requests);

  appendToArray(AUDIT_FILE, {
    action: 'request_denied',
    requestId,
    adminDiscordId,
    reason: requests[idx].denyReason,
  });

  return { ok: true, request: requests[idx] };
}

/**
 * Mark a request as auto-approved by poller
 * @param {string} requestId
 */
export function markAutoApproved(requestId) {
  const requests = readAllRequests();
  const idx = requests.findIndex(r => r.id === requestId);
  if (idx === -1) return;
  if (requests[idx].status !== 'pending') return;

  requests[idx].status = 'approved';
  requests[idx].resolvedAt = new Date().toISOString();
  requests[idx].resolvedBy = 'auto-poller';
  writeAllRequests(requests);

  appendToArray(AUDIT_FILE, {
    action: 'request_auto_approved',
    requestId,
  });
}
