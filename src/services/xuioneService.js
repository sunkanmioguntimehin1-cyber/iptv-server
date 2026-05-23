const axios  = require('axios');
const logger = require('../utils/logger');
const ApiError = require('../utils/ApiError');

// ─── XUI.ONE admin API base request ──────────────────────────────────────────
const xuiApi = axios.create({
  baseURL: process.env.XUIONE_BASE_URL,
  timeout: 15000,
});

// Get admin auth cookie (XUI.ONE uses session-based admin auth)
let sessionCookie = null;

const getAdminSession = async () => {
  try {
    const res = await xuiApi.post('/api/login', {
      username: process.env.XUIONE_USERNAME,
      password: process.env.XUIONE_PASSWORD,
    });

    // XUI.ONE sets a session cookie — extract it
    const cookies = res.headers['set-cookie'];
    if (cookies) {
      sessionCookie = cookies.map((c) => c.split(';')[0]).join('; ');
    }

    logger.info('XUI.ONE admin session obtained');
    return sessionCookie;
  } catch (err) {
    logger.error(`XUI.ONE login failed: ${err.message}`);
    throw ApiError.internal('IPTV panel connection failed');
  }
};

const apiCall = async (method, path, data = {}) => {
  if (!sessionCookie) await getAdminSession();

  try {
    const res = await xuiApi({
      method,
      url:  path,
      data: method !== 'get' ? data : undefined,
      params: method === 'get' ? data : undefined,
      headers: { Cookie: sessionCookie },
    });
    return res.data;
  } catch (err) {
    // Re-auth on 401 and retry once
    if (err.response?.status === 401) {
      sessionCookie = null;
      await getAdminSession();
      const retry = await xuiApi({
        method,
        url:  path,
        data: method !== 'get' ? data : undefined,
        params: method === 'get' ? data : undefined,
        headers: { Cookie: sessionCookie },
      });
      return retry.data;
    }
    logger.error(`XUI.ONE API error [${method} ${path}]: ${err.message}`);
    throw ApiError.internal('IPTV panel error');
  }
};

// ─── Generate a unique IPTV username from user name + random ─────────────────
const generateIptvUsername = (name) => {
  const base   = name.toLowerCase().replace(/[^a-z0-9]/g, '').slice(0, 10);
  const suffix = Math.random().toString(36).slice(2, 6);
  return `${base}_${suffix}`;
};

const generateIptvPassword = () =>
  Math.random().toString(36).slice(2, 10) +
  Math.random().toString(36).slice(2, 6).toUpperCase();

// ─── Create a subscriber account on XUI.ONE ──────────────────────────────────
const createSubscriber = async ({ userName, durationDays, maxConnections = 1 }) => {
  const iptvUsername = generateIptvUsername(userName);
  const iptvPassword = generateIptvPassword();

  const expiresAt = new Date();
  expiresAt.setDate(expiresAt.getDate() + durationDays);

  // XUI.ONE API endpoint to create a user
  // Adjust the payload structure to match your XUI.ONE version
  const result = await apiCall('post', '/api/user/create', {
    username:        iptvUsername,
    password:        iptvPassword,
    max_connections: maxConnections,
    is_trial:        0,
    active:          1,
    exp_date:        Math.floor(expiresAt.getTime() / 1000), // Unix timestamp
  });

  logger.info(`XUI.ONE subscriber created: ${iptvUsername}`);

  return {
    xuiUserId:    result.user_id ?? result.id ?? iptvUsername,
    iptvUsername,
    iptvPassword,
    expiresAt,
  };
};

// ─── Extend an existing subscriber's expiry ──────────────────────────────────
const extendSubscriber = async (xuiUserId, durationDays) => {
  const newExpiry = new Date();
  newExpiry.setDate(newExpiry.getDate() + durationDays);

  await apiCall('post', '/api/user/update', {
    id:       xuiUserId,
    exp_date: Math.floor(newExpiry.getTime() / 1000),
    active:   1,
  });

  logger.info(`XUI.ONE subscriber ${xuiUserId} extended to ${newExpiry}`);
  return newExpiry;
};

// ─── Deactivate a subscriber (on cancellation / expiry) ──────────────────────
const deactivateSubscriber = async (xuiUserId) => {
  await apiCall('post', '/api/user/update', {
    id:     xuiUserId,
    active: 0,
  });
  logger.info(`XUI.ONE subscriber ${xuiUserId} deactivated`);
};

// ─── Delete a subscriber entirely ────────────────────────────────────────────
const deleteSubscriber = async (xuiUserId) => {
  await apiCall('post', '/api/user/delete', { id: xuiUserId });
  logger.info(`XUI.ONE subscriber ${xuiUserId} deleted`);
};

module.exports = {
  createSubscriber,
  extendSubscriber,
  deactivateSubscriber,
  deleteSubscriber,
};
