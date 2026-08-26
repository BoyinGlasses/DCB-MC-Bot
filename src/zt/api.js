/**
 * ZeroTier Central API wrapper
 * Docs: https://docs.zerotier.com/central/v1/
 */
import { request } from 'undici';
import { config } from '../config.js';

const BASE_URL = 'https://my.zerotier.com/api/v1';

function getHeaders() {
  return {
    'Authorization': `Bearer ${config.zerotier.apiToken}`,
    'Content-Type': 'application/json',
  };
}

function getNetworkUrl(path = '') {
  if (!config.zerotier.networkId) {
    throw new Error('ZT_NETWORK_ID is not configured');
  }
  return `${BASE_URL}/network/${config.zerotier.networkId}${path}`;
}

/**
 * Get a single member by ID
 * @param {string} memberId - ZeroTier Node ID (10 hex chars)
 * @returns {Promise<Object|null>}
 */
export async function getMember(memberId) {
  if (!memberId) return null;
  try {
    const { statusCode, body } = await request(
      getNetworkUrl(`/member/${memberId}`),
      { headers: getHeaders() }
    );
    if (statusCode !== 200) return null;
    return await body.json();
  } catch (err) {
    console.error(`[ZT-API] getMember(${memberId}) failed:`, err.message);
    return null;
  }
}

/**
 * List all members in the network
 * @returns {Promise<Array>}
 */
export async function listMembers() {
  try {
    const { statusCode, body } = await request(
      getNetworkUrl('/member'),
      { headers: getHeaders() }
    );
    if (statusCode !== 200) return [];
    return await body.json();
  } catch (err) {
    console.error('[ZT-API] listMembers failed:', err.message);
    return [];
  }
}

/**
 * Authorize or de-authorize a member
 * @param {string} memberId
 * @param {boolean} authorized
 * @param {string[]} [ipAssignments] - Optional IP assignments
 * @returns {Promise<boolean>} true if API call succeeded
 */
export async function setMemberAuthorized(memberId, authorized = true, ipAssignments = null) {
  const payload = { authorized };
  if (ipAssignments && Array.isArray(ipAssignments)) {
    payload.ipAssignments = ipAssignments;
  }

  try {
    const { statusCode } = await request(
      getNetworkUrl(`/member/${memberId}`),
      {
        method: 'POST',
        headers: getHeaders(),
        body: JSON.stringify(payload),
      }
    );
    return statusCode === 200;
  } catch (err) {
    console.error(`[ZT-API] setMemberAuthorized(${memberId}) failed:`, err.message);
    return false;
  }
}

/**
 * Get network info
 * @returns {Promise<Object|null>}
 */
export async function getNetwork() {
  try {
    const { statusCode, body } = await request(
      getNetworkUrl(''),
      { headers: getHeaders() }
    );
    if (statusCode !== 200) return null;
    return await body.json();
  } catch (err) {
    console.error('[ZT-API] getNetwork failed:', err.message);
    return null;
  }
}

/**
 * Test API connection
 * @returns {Promise<boolean>}
 */
export async function testConnection() {
  try {
    const network = await getNetwork();
    return network !== null;
  } catch {
    return false;
  }
}
