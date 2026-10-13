/* eslint-env node */
'use strict';

/**
 * Read-only, repeatable API audit runner.
 *
 * Endpoint discovery comes only from api-audit-inventory.cjs. This runner
 * never imports application code, never loads an environment package, and
 * never sends a non-GET request. Reports are generated only when the CLI is
 * executed; this module itself does not perform work when imported.
 */

const crypto = require('node:crypto');
const fs = require('node:fs');
const path = require('node:path');

const { getInventory, getCoverage } = require('./api-audit-inventory.cjs');

const repoRoot = path.resolve(__dirname, '..');
const reportsDirectory = path.join(repoRoot, 'reports');
const REPORT_MARKDOWN = path.join(reportsDirectory, 'api-audit-report.md');
const REPORT_JSON = path.join(reportsDirectory, 'api-audit-results.json');

const GET = 'GET';
const RESPONSE_SIZE_CAP = 128 * 1024;
const DEFAULT_TIMEOUT_MS = 5000;
const MAX_TIMEOUT_MS = 10000;
const REQUEST_DELAY_MS = 100;
const INVALID_TOKEN = 'invalid-audit-token';
const NUMERIC_QUERY_KEYS = new Set(['limit', 'page', 'offset']);
const ACCEPTED_INVALID_ID_STATUSES = new Set([400, 404, 422]);
const ACCEPTED_INVALID_QUERY_STATUSES = new Set([400, 422]);

const SENSITIVE_NAME_PATTERN = /authorization|token|password|secret|firebase|phone|email|cookie/i;
const SENSITIVE_QUERY_PATTERN = /token|password|secret|authorization|cookie|credential|api[-_]?key/i;
const ERROR_KEY_PATTERN = /^(error|detail|message|code|errors)$/i;
const FORBIDDEN_ERROR_KEY_PATTERN = /^(input|params?|sql|query|database|db|connection|host|port|dsn|jwt|authorization|token|password|secret|email|phone|user|uid|account|subject|identifier|resource[_-]?id)$/i;
const AUTH_ROUTE_PATTERN = /(^|[/_.-])(auth|login|logout|refresh|switch)([/_.-]|$)/i;
const LOGIN_ROUTE_PATTERN = /firebase|login|sign[-_]?in|refresh/i;
const PROTECTED_ROUTE_PATTERN = /(^|[/_.-])(user|users|screens|engagement|notification|notifications|follow|user[-_]?activity|rewards?|insights?|preference|preferences|auth)([/_.-]|$)/i;

const FIXTURE_PROVIDERS = [
  { path: '/base/languages', key: 'language', field: 'id' },
  { path: '/base/states', key: 'state', field: 'id' },
  { path: '/base/districts', key: 'district', field: 'id' },
  { path: '/base/cities', key: 'city', field: 'id' },
  { path: '/categories/all', key: 'category', field: 'id' },
  { path: '/news/v1/news/breaking', key: 'news', field: 'news_uid' },
  { path: '/posts/feed', key: 'post', field: 'post_uid' },
  { path: '/content/advertisements/active', key: 'advertisement', field: 'ad_id' },
  { path: '/content/polls/active', key: 'poll', field: 'poll_uid' },
];

const DETAIL_FIXTURES = [
  { prefix: '/base/languages/', key: 'language' },
  { prefix: '/base/states/', key: 'state' },
  { prefix: '/base/hierarchy/states/', key: 'state' },
  { prefix: '/base/states/', key: 'state' },
  { prefix: '/base/districts/', key: 'district' },
  { prefix: '/base/cities/', key: 'city' },
  { prefix: '/categories/', key: 'category' },
  { prefix: '/news/v1/news/', key: 'news' },
  { prefix: '/screens/news/', key: 'news' },
  { prefix: '/posts/', key: 'post' },
  { prefix: '/content/advertisements/', key: 'advertisement' },
  { prefix: '/content/polls/', key: 'poll' },
];

function parseArgs(argv) {
  const options = {
    dryRun: false,
    noAuth: false,
    limit: null,
    endpoint: null,
  };

  for (const argument of argv) {
    if (argument === '--dry-run') {
      options.dryRun = true;
      continue;
    }
    if (argument === '--no-auth') {
      options.noAuth = true;
      continue;
    }
    if (argument.startsWith('--limit=')) {
      const value = argument.slice('--limit='.length);
      if (!/^\d+$/.test(value) || Number(value) < 1) {
        throw new Error('--limit must be a positive integer.');
      }
      options.limit = Number(value);
      continue;
    }
    if (argument.startsWith('--endpoint=')) {
      const value = argument.slice('--endpoint='.length).trim();
      if (!value) throw new Error('--endpoint must include an inventory id.');
      options.endpoint = value;
      continue;
    }
    throw new Error(`Unknown option: ${argument}`);
  }

  return options;
}

function nonEmpty(value) {
  return typeof value === 'string' && value.trim() ? value.trim() : null;
}

function stripEnvQuotes(value) {
  const trimmed = String(value || '').trim();
  const quoted = trimmed.match(/^(["'])([\s\S]*?)\1(?:\s+#.*)?$/);
  if (quoted) return quoted[2];
  return trimmed.replace(/\s+#.*$/, '').trim();
}

function parseAllowedEnvFile(filename) {
  let text;
  try {
    text = fs.readFileSync(filename, 'utf8');
  } catch (_) {
    return {};
  }

  const values = {};
  const allowed = /^(?:export\s+)?(EXPO_PUBLIC_API_BASE_URL|EXPO_PUBLIC_API_TIMEOUT_MS)\s*=\s*(.*?)\s*$/;
  for (const line of text.split(/\r?\n/)) {
    if (/^\s*#/.test(line)) continue;
    const match = line.match(allowed);
    if (match) values[match[1]] = stripEnvQuotes(match[2]);
  }
  return values;
}

function readFileConfig() {
  const values = {};
  // .env.local is the local override; .env is the only other dotenv source.
  const sources = [
    ['.env', path.join(repoRoot, '.env')],
    ['.env.local', path.join(repoRoot, '.env.local')],
  ];
  for (const [source, filename] of sources) {
    const parsed = parseAllowedEnvFile(filename);
    for (const key of ['EXPO_PUBLIC_API_BASE_URL', 'EXPO_PUBLIC_API_TIMEOUT_MS']) {
      if (nonEmpty(parsed[key])) values[key] = { value: parsed[key], source };
    }
  }
  return values;
}

function validateBaseUrl(candidate, authenticated) {
  const value = nonEmpty(candidate);
  if (!value) return { value: null, origin: null, error: 'No API audit base URL was configured.' };

  let parsed;
  try {
    parsed = new URL(value);
  } catch (_) {
    return { value: null, origin: null, error: 'API audit base URL is not a valid URL.' };
  }
  if (!['http:', 'https:'].includes(parsed.protocol) || !parsed.hostname) {
    return { value: null, origin: null, error: 'API audit base URL must use http or https.' };
  }
  if (parsed.search) {
    return { value: null, origin: null, error: 'API audit base URL must not contain a query string.' };
  }
  if (parsed.username || parsed.password || parsed.hash) {
    return { value: null, origin: null, error: 'API audit base URL may not contain credentials or a fragment.' };
  }
  const localHttpHosts = new Set(['localhost', '127.0.0.1', '::1']);
  const hostname = parsed.hostname.toLowerCase().replace(/^\[|\]$/g, '');
  if (authenticated && parsed.protocol === 'http:' && !localHttpHosts.has(hostname)) {
    return { value: null, origin: null, error: 'Authenticated audits require HTTPS unless the host is localhost.' };
  }

  return {
    value: value.replace(/\/+$/, ''),
    origin: parsed.origin,
    error: null,
  };
}

function timeoutFrom(value) {
  const parsed = Number(value);
  if (!Number.isFinite(parsed) || parsed <= 0) return DEFAULT_TIMEOUT_MS;
  return Math.min(Math.round(parsed), MAX_TIMEOUT_MS);
}

function resolveConfig(options = {}) {
  const fileConfig = readFileConfig();
  const processBase = nonEmpty(process.env.API_AUDIT_BASE_URL);
  const processExpoBase = nonEmpty(process.env.EXPO_PUBLIC_API_BASE_URL);
  const baseCandidate = processBase || processExpoBase || fileConfig.EXPO_PUBLIC_API_BASE_URL?.value;
  const baseSource = processBase
    ? 'API_AUDIT_BASE_URL'
    : processExpoBase
      ? 'EXPO_PUBLIC_API_BASE_URL'
      : fileConfig.EXPO_PUBLIC_API_BASE_URL?.source || null;
  const processToken = nonEmpty(process.env.AUDIT_ACCESS_TOKEN);
  const accessToken = options.noAuth ? null : processToken;
  const base = validateBaseUrl(baseCandidate, Boolean(accessToken));

  const processTimeout = nonEmpty(process.env.EXPO_PUBLIC_API_TIMEOUT_MS);
  const timeoutValue = processTimeout || fileConfig.EXPO_PUBLIC_API_TIMEOUT_MS?.value;
  return {
    ...base,
    baseSource,
    timeoutMs: timeoutFrom(timeoutValue),
    accessToken,
    accessTokenProvided: Boolean(accessToken),
    processTokenProvided: Boolean(processToken),
    configurationError: typeof fetch !== 'function'
      ? 'Native Node fetch is unavailable; use Node 18 or newer.'
      : base.error,
    noAuth: Boolean(options.noAuth),
    dryRun: Boolean(options.dryRun),
  };
}

function stripQuery(pathValue) {
  return String(pathValue || '').split('?')[0].replace(/\/+$/, '') || '/';
}

function isHealthEntry(entry) {
  const pathText = stripQuery(entry.path).toLowerCase();
  const aliases = (entry.aliases || []).join(' ').toLowerCase();
  return pathText === '/' || /(^|[/_.-])health([/_.-]|$)/i.test(pathText) || /(^|[.])health([.]|$)/i.test(aliases);
}

function isNonHealth(entry) {
  return !isHealthEntry(entry);
}

function routeIdentityText(entry) {
  return [entry.path, ...(entry.aliases || [])].filter(Boolean).join(' ');
}

function isLikelyProtected(entry) {
  if (isHealthEntry(entry)) return false;
  return PROTECTED_ROUTE_PATTERN.test(routeIdentityText(entry));
}

function isAuthTokenRoute(entry) {
  const text = routeIdentityText(entry);
  return AUTH_ROUTE_PATTERN.test(text) && (
    LOGIN_ROUTE_PATTERN.test(text) ||
    /auth\.(?:google|syncProvider|firebaseLogin|refreshToken)/i.test(text)
  );
}

function sourceContract(entry) {
  return (entry.contracts || []).find((contract) => contract && contract.kind !== 'registry') || null;
}

function contractQueryFields(entry) {
  return sourceContract(entry)?.requestQuery?.fields || [];
}

function isSensitiveQueryKey(key) {
  return SENSITIVE_QUERY_PATTERN.test(String(key || ''));
}

function hasPathParameters(entry) {
  return Boolean((entry.pathParameters || []).length || /\{[^}]+\}/.test(String(entry.path || '')));
}

function fixtureProvider(entry) {
  const pathValue = stripQuery(entry.path);
  return FIXTURE_PROVIDERS.find((provider) => provider.path === pathValue) || null;
}

function fixtureKeyForDetail(entry) {
  const pathValue = stripQuery(entry.path);
  const match = DETAIL_FIXTURES.find((fixture) => pathValue.startsWith(fixture.prefix) && /\{[^}]+\}/.test(pathValue));
  return match?.key || null;
}

function requiresPublicFixture(entry) {
  return hasPathParameters(entry) || (entry.requiredQueryKeys || []).includes('content_uid');
}

function numericQueryKeys(entry) {
  const keys = new Set([...(entry.queryKeys || [])]);
  for (const field of contractQueryFields(entry)) {
    if (field.name) keys.add(field.name);
  }
  return [...keys].filter((key) => NUMERIC_QUERY_KEYS.has(String(key).toLowerCase()));
}

function readOnlyMutationCases(entry) {
  const method = String(entry.method || 'UNKNOWN').toUpperCase();
  return [
    `happy-path ${method} not sent`,
    'invalid/missing body or query not sent',
    'wrong body type and malformed JSON not sent',
    'missing, invalid, or expired auth not sent',
    'invalid IDs not sent',
    'role/permission checks not sent',
    'successful create/update/delete/claim fixture not sent',
  ];
}

function scenarioPlans(entry, config = {}) {
  const method = String(entry.method || 'UNKNOWN').toUpperCase();
  if (method !== GET) {
    return [{
      kind: 'read-only-blocked',
      scenario: `read-only blocked ${method}`,
      expectedResult: 'BLOCKED: this read-only audit never sends non-GET requests.',
      requestMethod: method,
      authMode: 'not-sent',
      blockedCases: readOnlyMutationCases(entry),
    }];
  }

  const protectedLikely = isLikelyProtected(entry);
  const nonHealth = isNonHealth(entry);
  const fixtureRequired = requiresPublicFixture(entry);
  const registryOnly = !entry.implemented;
  const plans = [{
    kind: 'baseline',
    scenario: registryOnly ? 'baseline GET no auth (registry-only contract)' : 'baseline GET no auth',
    expectedResult: `${registryOnly ? 'Registry-only contract limitation; GET is still exercised. ' : ''}${protectedLikely
      ? 'BLOCKED: no-auth baseline records reachability only; authentication identity is not asserted.'
      : 'PASS only for a reachable 2xx JSON/read response; 404 and 5xx require investigation.'}`,
    requestMethod: GET,
    authMode: 'none',
    protectedLikely,
    fixtureRequired,
    pathMode: 'fixture',
    queryMode: 'normal',
  }];

  if (!nonHealth) return plans;

  plans.push({
    kind: 'invalid-auth',
    scenario: 'invalid bearer GET',
    expectedResult: protectedLikely
      ? 'PASS only for explicit 401/403 invalid-auth rejection; 2xx is public-read behavior and identity isolation remains BLOCKED.'
      : 'Record public-read behavior; 401/403 is explicit invalid-auth rejection, not a public-route defect.',
    requestMethod: GET,
    authMode: 'invalid',
    protectedLikely,
    fixtureRequired,
    pathMode: 'fixture',
    queryMode: 'normal',
  });

  if (hasPathParameters(entry)) {
    plans.push({
      kind: 'invalid-id',
      scenario: 'invalid path ID GET',
      expectedResult: 'PASS for HTTP 400/404/422; 401/403 means ID validation was not exercised and is BLOCKED.',
      requestMethod: GET,
      authMode: 'none',
      protectedLikely,
      fixtureRequired: false,
      pathMode: 'invalid',
      queryMode: 'normal',
    });
  }

  for (const key of entry.requiredQueryKeys || []) {
    plans.push({
      kind: 'missing-query',
      scenario: `missing required query: ${key}`,
      expectedResult: `PASS for HTTP 400/422 missing ${key}; 401/403 means query validation was not exercised and is BLOCKED.`,
      requestMethod: GET,
      authMode: 'none',
      protectedLikely,
      fixtureRequired: false,
      pathMode: hasPathParameters(entry) ? 'fixture' : 'normal',
      queryMode: 'missing-required',
      queryKey: key,
    });
  }

  for (const key of numericQueryKeys(entry)) {
    plans.push({
      kind: 'invalid-query-type',
      scenario: `invalid numeric query type: ${key}`,
      expectedResult: `PASS for HTTP 400/422 invalid ${key}; 401/403 means query validation was not exercised and is BLOCKED.`,
      requestMethod: GET,
      authMode: 'none',
      protectedLikely,
      fixtureRequired,
      pathMode: hasPathParameters(entry) ? 'fixture' : 'normal',
      queryMode: 'invalid-type',
      queryKey: key,
    });
  }

  plans.push({
    kind: 'auth-success',
    scenario: 'authenticated GET',
    expectedResult: config.accessTokenProvided
      ? 'PASS for a 2xx authenticated GET; 401/403 is FAIL.'
      : 'BLOCKED: AUDIT_ACCESS_TOKEN is not available; no authenticated assertion is made.',
    requestMethod: GET,
    authMode: config.accessTokenProvided ? 'authenticated' : 'not-sent',
    protectedLikely,
    fixtureRequired,
    pathMode: 'fixture',
    queryMode: 'normal',
  });
  plans.push({
    kind: 'expired-auth',
    scenario: 'expired-auth GET',
    expectedResult: 'BLOCKED: no fabricated JWT is sent; a genuinely signed expired token was not provided.',
    requestMethod: GET,
    authMode: 'not-sent',
    protectedLikely,
    fixtureRequired: false,
    pathMode: hasPathParameters(entry) ? 'fixture' : 'normal',
    queryMode: 'normal',
  });
  return plans;
}

function invalidValueForKey(key) {
  const name = String(key || '').toLowerCase();
  if (name.includes('id') || name.includes('uid')) return 'invalid-audit-id';
  return 'invalid-audit-value';
}

function readQuery(entry) {
  const query = {};
  for (const [key, value] of Object.entries(entry.defaultQuery || {})) {
    if (isSensitiveQueryKey(key) || value === undefined || value === null) continue;
    query[key] = value;
  }
  return query;
}

function fixtureValue(state, key) {
  return state?.fixtures?.[key] ?? null;
}

function queryForPlan(entry, plan, state = {}) {
  const query = readQuery(entry);
  const required = [...(entry.requiredQueryKeys || [])];
  if (plan.queryMode === 'missing-required' && plan.queryKey) {
    delete query[plan.queryKey];
  }

  if (required.includes('content_uid') && plan.queryMode !== 'missing-required') {
    const newsUid = fixtureValue(state, 'news');
    if (newsUid) query.content_uid = newsUid;
  }
  if (required.includes('content_type') && plan.queryMode !== 'missing-required' && fixtureValue(state, 'news')) {
    query.content_type = 'news';
  }
  if (plan.queryMode === 'invalid-type' && plan.queryKey) {
    query[plan.queryKey] = 'not-a-number';
  }

  const missingFixture = required.includes('content_uid') && plan.queryMode !== 'missing-required' && !fixtureValue(state, 'news');
  return { query, missingFixture };
}

function concretePath(entry, plan, state = {}) {
  const pathValue = String(entry.path || '');
  if (!pathValue || pathValue.includes('<unknown>')) return null;
  let result = pathValue.startsWith('/') ? pathValue : `/${pathValue}`;
  const invalid = plan.pathMode === 'invalid';
  const detailKey = fixtureKeyForDetail(entry);
  const value = detailKey ? fixtureValue(state, detailKey) : null;
  if (hasPathParameters(entry) && !invalid && !value) return null;
  result = result.replace(/\{([^}]+)\}/g, (_, name) => {
    if (invalid) {
      const parameter = (entry.pathParameters || []).find((item) => item.name === name);
      return encodeURIComponent(String(parameter?.type || '').toLowerCase().includes('number') ? '-1' : 'invalid-audit-id');
    }
    return encodeURIComponent(String(value));
  });
  return result;
}

function buildRequestUrl(baseUrl, routePath, query = {}) {
  const base = new URL(baseUrl);
  if (base.search) throw new Error('API audit base URL must not contain a query string.');
  const basePath = base.pathname.replace(/\/+$/, '');
  const combinedPath = `${basePath}${routePath}` || '/';
  const url = new URL(combinedPath, base.origin);
  for (const [key, value] of Object.entries(query)) {
    if (value !== undefined && value !== null) url.searchParams.set(key, String(value));
  }
  return url;
}

function redactKnownSecrets(value, secret) {
  let result = String(value ?? '');
  if (secret) result = result.split(secret).join('[REDACTED]');
  return result
    .replace(/Bearer\s+[^\s,;]+/gi, 'Bearer [REDACTED]')
    .replace(/\beyJ[a-zA-Z0-9_-]{8,}\.[a-zA-Z0-9_-]{4,}\.[a-zA-Z0-9_-]{4,}\b/g, '[REDACTED_JWT]')
    .replace(/\b(?:invalid|placeholder|fake|dummy)[-_](?:audit[-_])?(?:firebase[-_])?(?:refresh[-_])?token\b/gi, '[REDACTED]')
    .replace(/([?&](?:[^=]*?(?:token|password|secret|credential|authorization)[^=]*)=)[^&#\s]*/gi, '$1[REDACTED]')
    .replace(/\b[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}\b/gi, '[REDACTED_EMAIL]')
    .replace(/\b(?:select|insert|update|delete)\s+.+/gi, '[REDACTED_SQL]')
    .replace(/(?:postgres(?:ql)?|mysql|mongodb|redis):\/\/[^\s]+/gi, '[REDACTED_DB_CONNECTION]');
}

function sanitizeText(value, secret) {
  const sanitized = redactKnownSecrets(value, secret).replace(
    /((?:authorization|token|password|secret|firebase|phone|email|cookie)\s*["']?\s*[:=]\s*["']?)[^,;}\s"']+/gi,
    '$1[REDACTED]'
  );
  return sanitized.replace(/(?<![\d])(?:\+?91[\s.-]?)?[6-9]\d{9}(?!\d)/g, '[REDACTED_PHONE]');
}

function sanitizeJson(value, secret, depth = 0) {
  if (depth > 8) return '[TRUNCATED]';
  if (Array.isArray(value)) return value.slice(0, 100).map((item) => sanitizeJson(item, secret, depth + 1));
  if (!value || typeof value !== 'object') return typeof value === 'string' ? sanitizeText(value, secret) : value;

  const result = {};
  for (const [key, item] of Object.entries(value).slice(0, 100)) {
    result[key] = SENSITIVE_NAME_PATTERN.test(key) ? '[REDACTED]' : sanitizeJson(item, secret, depth + 1);
  }
  return result;
}

function sanitizeErrorPayload(value, secret, depth = 0, nested = false) {
  if (depth > 6) return '[TRUNCATED]';
  if (Array.isArray(value)) return value.slice(0, 20).map((item) => sanitizeErrorPayload(item, secret, depth + 1, true));
  if (!value || typeof value !== 'object') return sanitizeText(value, secret);

  const result = {};
  for (const [key, item] of Object.entries(value).slice(0, 50)) {
    if (FORBIDDEN_ERROR_KEY_PATTERN.test(key) || SENSITIVE_NAME_PATTERN.test(key)) {
      result[key] = '[REDACTED]';
      continue;
    }
    if (!nested && !ERROR_KEY_PATTERN.test(key)) continue;
    result[key] = sanitizeErrorPayload(item, secret, depth + 1, true);
  }
  return result;
}

function redactEndpoint(urlOrPath, secret) {
  const value = String(urlOrPath || '');
  try {
    const parsed = new URL(value, 'http://audit.invalid');
    const params = [];
    for (const [key, item] of parsed.searchParams.entries()) {
      if (isSensitiveQueryKey(key)) params.push('[REDACTED_QUERY]=[REDACTED]');
      else params.push(`${encodeURIComponent(key)}=${encodeURIComponent(redactKnownSecrets(item, secret))}`);
    }
    let pathname = parsed.pathname || '/';
    try {
      pathname = decodeURIComponent(pathname);
    } catch (_) {
      // Keep the encoded path if it was not valid URI encoding.
    }
    return `${pathname}${params.length ? `?${params.join('&')}` : ''}`;
  } catch (_) {
    return sanitizeText(value, secret);
  }
}

function responseRequestId(response, secret) {
  const names = [
    'x-request-id',
    'x-correlation-id',
    'x-correlationid',
    'x-railway-request-id',
    'traceparent',
  ];
  for (const name of names) {
    const value = response.headers.get(name);
    if (value && value.length <= 256) return { header: name, value: redactKnownSecrets(value, secret) };
  }
  return null;
}

function sanitizeHeaders(headers, secret) {
  const result = {};
  for (const [key, value] of Object.entries(headers || {})) {
    result[key] = /^authorization$/i.test(key) ? '[REDACTED]' : redactKnownSecrets(value, secret);
  }
  return result;
}

async function readResponseBody(response, secret) {
  const contentType = response.headers.get('content-type');
  if (!response.body) return { contentType, bytes: 0, truncated: false, jsonParsed: false, parsed: null, text: '' };

  const reader = response.body.getReader();
  const chunks = [];
  let bytes = 0;
  let truncated = false;
  try {
    while (true) {
      const next = await reader.read();
      if (next.done) break;
      const chunk = Buffer.from(next.value);
      const remaining = RESPONSE_SIZE_CAP - bytes;
      if (remaining <= 0) {
        truncated = true;
        await reader.cancel();
        break;
      }
      if (chunk.length > remaining) {
        chunks.push(chunk.subarray(0, remaining));
        bytes += remaining;
        truncated = true;
        await reader.cancel();
        break;
      }
      chunks.push(chunk);
      bytes += chunk.length;
    }
  } finally {
    reader.releaseLock();
  }

  const text = Buffer.concat(chunks).toString('utf8');
  const looksJson = /\bjson\b/i.test(contentType || '') || /^[\s]*[\[{]/.test(text);
  let parsed = null;
  let jsonParsed = false;
  if (looksJson && text.trim()) {
    try {
      parsed = JSON.parse(text);
      jsonParsed = true;
    } catch (_) {
      parsed = null;
    }
  }
  return { contentType, bytes, truncated, jsonParsed, parsed, text: sanitizeText(text, secret).slice(0, 4000) };
}

function schemaSummary(value, depth = 0) {
  if (depth > 4) return { type: 'truncated' };
  if (Array.isArray(value)) {
    const itemTypes = [...new Set(value.slice(0, 20).map((item) => schemaSummary(item, depth + 1).type))];
    return { type: 'array', count: value.length, itemTypes };
  }
  if (value === null) return { type: 'null' };
  if (typeof value !== 'object') return { type: typeof value };
  const fields = {};
  for (const [key, item] of Object.entries(value).slice(0, 50)) fields[key] = schemaSummary(item, depth + 1);
  return { type: 'object', fields };
}

function responseSummary(body, status, entry, secret) {
  const summary = {
    contentType: body.contentType || null,
    bytes: body.bytes,
    truncated: body.truncated,
    parsedType: body.jsonParsed ? (body.parsed === null ? 'null' : typeof body.parsed) : (body.text ? 'text' : 'empty'),
  };
  if (status >= 400) {
    if (body.jsonParsed) summary.error = sanitizeErrorPayload(body.parsed, secret);
    else if (body.text) summary.error = { message: sanitizeText(body.text, secret).slice(0, 1000) };
    return summary;
  }
  if (body.jsonParsed) summary.schema = schemaSummary(body.parsed);
  if (entry.implemented && status >= 200 && status <= 299) {
    const validJson = body.jsonParsed && body.parsed !== null && /\bjson\b/i.test(body.contentType || '');
    summary.shape = validJson ? 'PASS' : 'FAIL';
    if (!validJson) summary.shapeError = 'Implemented service returned an empty, malformed, or non-JSON 2xx response.';
  }
  if (/^\/screens\//.test(stripQuery(entry.path)) && status >= 200 && status <= 299 && body.jsonParsed) {
    const errors = body.parsed && typeof body.parsed === 'object' && !Array.isArray(body.parsed) ? body.parsed.errors : null;
    if (errors && typeof errors === 'object' && Object.keys(errors).length > 0) {
      summary.shape = 'FAIL';
      summary.shapeError = 'Screen aggregate returned a nonempty errors map and is a partial result.';
    }
  }
  return summary;
}

function actualStatusCategory(status, plan) {
  if (status === 401 || status === 403) return 'auth';
  if (status === 429) return 'rate-limit';
  if (plan.kind === 'baseline' && plan.protectedLikely) return 'auth';
  return 'backend-http';
}

function evaluateHttp(entry, plan, status, context = {}) {
  const shapeFailure = Boolean(context.shapeFailure);
  const result = {
    status: 'BLOCKED',
    category: actualStatusCategory(status, plan),
    errorDetails: null,
    suggestedFix: null,
    stopAfter: false,
  };
  if (status === 429) {
    result.category = 'rate-limit';
    result.errorDetails = 'HTTP 429 received; subsequent network requests are stopped to avoid load.';
    result.suggestedFix = 'Coordinate an audit window or rate-limit allowance with the backend before rerunning.';
    result.stopAfter = true;
    return result;
  }
  if (plan.kind === 'baseline' && plan.protectedLikely) {
    result.category = 'auth';
    result.errorDetails = 'No-auth baseline is intentionally blocked because authentication identity is unknown.';
    result.suggestedFix = 'Provide an approved read-only signed token if authenticated behavior must be validated.';
    return result;
  }
  if ((plan.kind === 'invalid-id' || plan.kind === 'missing-query' || plan.kind === 'invalid-query-type')) {
    const accepted = plan.kind === 'invalid-id' ? ACCEPTED_INVALID_ID_STATUSES : ACCEPTED_INVALID_QUERY_STATUSES;
    if (accepted.has(status)) {
      result.status = 'PASS';
      result.category = 'backend-http';
      return result;
    }
    if (status === 401 || status === 403) {
      result.category = 'auth';
      result.errorDetails = 'Authentication rejection prevented validation of the requested malformed input.';
      result.suggestedFix = 'Use an approved read-only authenticated fixture if input validation must be distinguished from auth middleware.';
      return result;
    }
    if (status >= 500) {
      result.status = 'FAIL';
      result.errorDetails = `Backend returned HTTP ${status} for a safe validation scenario.`;
      result.suggestedFix = 'Inspect the backend validation path and return a controlled 4xx response.';
    } else {
      result.errorDetails = `HTTP ${status} did not prove the requested validation behavior.`;
      result.suggestedFix = 'Document the validation contract or provide an approved read-only fixture.';
    }
    return result;
  }
  if (plan.kind === 'invalid-auth') {
    if (status === 401 || status === 403) {
      result.status = 'PASS';
      result.category = 'auth';
      return result;
    }
    if (status >= 200 && status <= 299) {
      if (shapeFailure) {
        result.status = 'FAIL';
        result.category = 'response-shape';
        result.errorDetails = context.shapeError;
        result.suggestedFix = 'Return the documented JSON shape for the public read response.';
      } else if (plan.protectedLikely) {
        result.category = 'public-read';
        result.errorDetails = 'Invalid bearer was accepted or ignored; public-read behavior is recorded and identity isolation remains BLOCKED.';
        result.suggestedFix = 'Use an approved authenticated fixture to verify identity isolation; do not infer a security defect from this public response.';
      } else {
        result.status = 'PASS';
        result.category = 'public-read';
        result.errorDetails = 'Route behaved as a public read when presented with an invalid bearer.';
      }
      return result;
    }
    if (status === 404) {
      result.status = 'FAIL';
      result.errorDetails = 'Invalid-auth request returned HTTP 404; route/resource investigation is required.';
      result.suggestedFix = 'Confirm the deployed route and method before interpreting authentication behavior.';
      return result;
    }
    if (status >= 500) {
      result.status = 'FAIL';
      result.errorDetails = `Backend returned HTTP ${status} for invalid-auth GET.`;
      result.suggestedFix = 'Inspect backend logs and authentication middleware.';
    } else {
      result.errorDetails = `HTTP ${status} did not establish a stable invalid-auth contract.`;
      result.suggestedFix = 'Document the route behavior or provide an approved read-only fixture.';
    }
    return result;
  }
  if (plan.kind === 'auth-success') {
    if (status >= 200 && status <= 299) {
      if (shapeFailure) {
        result.status = 'FAIL';
        result.category = 'response-shape';
        result.errorDetails = context.shapeError;
        result.suggestedFix = 'Return the documented JSON shape for the authenticated read.';
      } else {
        result.status = 'PASS';
      }
      return result;
    }
    if (status === 401 || status === 403) {
      result.status = 'FAIL';
      result.category = 'auth';
      result.errorDetails = 'Authenticated GET was rejected by backend authentication/authorization.';
      result.suggestedFix = 'Verify bearer-token validation and route authorization for the documented read endpoint.';
    } else if (status === 404) {
      result.status = 'FAIL';
      result.errorDetails = 'Authenticated GET returned HTTP 404; route/resource investigation is required.';
      result.suggestedFix = 'Confirm the deployed route and any required fixture identifiers.';
    } else if (status >= 500) {
      result.status = 'FAIL';
      result.errorDetails = `Backend returned HTTP ${status} for authenticated GET.`;
      result.suggestedFix = 'Inspect backend logs and the authenticated route handler.';
    } else {
      result.errorDetails = `HTTP ${status} did not establish an authenticated read contract.`;
      result.suggestedFix = 'Document the authenticated read contract or rerun with an approved token.';
    }
    return result;
  }
  if (plan.kind === 'baseline') {
    if (status >= 200 && status <= 299) {
      if (shapeFailure) {
        result.status = 'FAIL';
        result.category = 'response-shape';
        result.errorDetails = context.shapeError;
        result.suggestedFix = 'Return the documented JSON shape for the implemented read service.';
      } else {
        result.status = 'PASS';
      }
    } else if (status === 404) {
      result.status = 'FAIL';
      result.errorDetails = 'Baseline GET returned HTTP 404; route/resource investigation is required.';
      result.suggestedFix = 'Confirm deployment, route registration, and the read contract.';
    } else if (status >= 500) {
      result.status = 'FAIL';
      result.errorDetails = `Baseline GET returned backend failure HTTP ${status}.`;
      result.suggestedFix = 'Inspect backend logs and the route handler.';
    } else {
      result.errorDetails = `Baseline GET returned HTTP ${status}; no automatic PASS is assigned.`;
      result.suggestedFix = 'Document the route contract or provide an approved read-only fixture.';
    }
  }
  return result;
}

function arrayItems(value) {
  if (Array.isArray(value)) return value;
  if (!value || typeof value !== 'object') return [];
  for (const key of ['items', 'data', 'results', 'news', 'articles', 'posts', 'advertisements', 'polls', 'languages', 'states', 'districts', 'cities', 'categories']) {
    if (Array.isArray(value[key])) return value[key];
  }
  return [];
}

function collectPublicFixtures(entry, plan, status, parsed, scenarioPassed, state) {
  if (plan.kind !== 'baseline' || plan.authMode !== 'none' || !scenarioPassed || status < 200 || status > 299 || isLikelyProtected(entry)) return;
  const provider = fixtureProvider(entry);
  if (!provider || state.fixtures[provider.key]) return;
  const item = arrayItems(parsed).find((candidate) => candidate && typeof candidate === 'object' && candidate[provider.field] !== undefined && candidate[provider.field] !== null);
  if (item) state.fixtures[provider.key] = item[provider.field];
}

function sleep(milliseconds) {
  return new Promise((resolve) => setTimeout(resolve, milliseconds));
}

function requestHeadersForPlan(plan, config, requestId) {
  const headers = {
    Accept: 'application/json, text/plain;q=0.9, */*;q=0.1',
    'X-Request-ID': requestId,
  };
  if (plan.authMode === 'invalid') headers.Authorization = `Bearer ${INVALID_TOKEN}`;
  if (plan.authMode === 'authenticated' && config.accessToken) headers.Authorization = `Bearer ${config.accessToken}`;
  return headers;
}

function baseResult(entry, plan, config, runId, timestamp = new Date().toISOString()) {
  return {
    runId,
    entryId: entry.id || null,
    endpoint: redactEndpoint(entry.path, config.accessToken),
    method: plan.requestMethod,
    scenario: plan.scenario,
    expectedResult: plan.expectedResult,
    actualResult: null,
    status: 'BLOCKED',
    httpStatus: null,
    responseSummary: null,
    errorDetails: null,
    suggestedFix: null,
    durationMs: 0,
    timestamp,
    sources: entry.sources || [],
    implemented: Boolean(entry.implemented),
    requestId: null,
    responseRequestId: null,
    responseRequestIdHeader: null,
    requestPath: null,
    requestHeaders: null,
    networkRequestSent: false,
    authMode: plan.authMode,
    blockedCases: plan.blockedCases || [],
    warnings: entry.implemented ? [] : ['Registry-only contract limitation; GET was still considered.'],
  };
}

function blockedResult(entry, plan, config, runId, reason, category = 'read-only', status = 'BLOCKED') {
  const result = baseResult(entry, plan, config, runId);
  result.status = status;
  result.actualResult = { category, reachable: false, detail: sanitizeText(reason, config.accessToken) };
  result.errorDetails = sanitizeText(reason, config.accessToken);
  if (category === 'config') result.suggestedFix = 'Set a configured http(s) API base URL without a query string and rerun.';
  if (category === 'fixture') result.suggestedFix = 'Rerun after a successful public list GET provides an allowed in-memory fixture.';
  if (category === 'rate-limit') result.suggestedFix = 'Wait for the rate-limit window or coordinate an audit allowance with the backend.';
  if (category === 'read-only') result.suggestedFix = 'Use a separate approved write test plan; this audit intentionally sends no mutation requests.';
  return result;
}

function plannedRequest(entry, plan, config, state) {
  const routePath = concretePath(entry, plan, state);
  if (!routePath) return { error: 'No allowed public fixture is available for this parameterized GET.', category: 'fixture' };
  const queryData = queryForPlan(entry, plan, state);
  if (queryData.missingFixture) return { error: 'Required content_uid fixture is unavailable; request was not sent.', category: 'fixture' };
  try {
    return { url: buildRequestUrl(config.value, routePath, queryData.query), query: queryData.query };
  } catch (error) {
    return { error: `Could not construct request URL: ${error.message}`, category: 'frontend-transport' };
  }
}

async function executePlan(entry, plan, config, state = {}) {
  const runId = state.runId || 'unassigned-run';
  if (String(plan.requestMethod || '').toUpperCase() !== GET) {
    return blockedResult(entry, plan, config, runId, 'Read-only audit refuses every non-GET request.', 'read-only');
  }
  if (plan.kind === 'expired-auth' || plan.authMode === 'not-sent') {
    return blockedResult(entry, plan, config, runId, 'No genuinely signed expired token or approved authenticated fixture was sent.', 'auth');
  }
  if (config.configurationError) return blockedResult(entry, plan, config, runId, config.configurationError, 'config', 'FAIL');

  const planned = plannedRequest(entry, plan, config, state);
  if (planned.error) return blockedResult(entry, plan, config, runId, planned.error, planned.category);

  const result = baseResult(entry, plan, config, runId);
  const requestId = crypto.randomUUID();
  const headers = requestHeadersForPlan(plan, config, requestId);
  result.requestId = requestId;
  result.requestPath = redactEndpoint(`${planned.url.pathname}${planned.url.search}`, config.accessToken);
  result.requestHeaders = sanitizeHeaders(headers, config.accessToken);
  result.networkRequestSent = true;
  const started = Date.now();
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), config.timeoutMs);
  let response = null;
  try {
    response = await fetch(planned.url, {
      method: GET,
      headers,
      redirect: 'manual',
      signal: controller.signal,
    });
    result.httpStatus = response.status;
    const returnedRequestId = responseRequestId(response, config.accessToken);
    if (returnedRequestId) {
      result.responseRequestId = returnedRequestId.value;
      result.responseRequestIdHeader = returnedRequestId.header;
    }
    const body = await readResponseBody(response, config.accessToken);
    result.responseSummary = responseSummary(body, response.status, entry, config.accessToken);
    const shapeFailure = result.responseSummary?.shape === 'FAIL';
    const evaluation = evaluateHttp(entry, plan, response.status, {
      shapeFailure,
      shapeError: result.responseSummary?.shapeError,
    });
    result.status = evaluation.status;
    result.actualResult = {
      category: evaluation.category,
      reachable: true,
      httpStatus: response.status,
      statusText: sanitizeText(response.statusText, config.accessToken),
    };
    result.errorDetails = evaluation.errorDetails;
    result.suggestedFix = evaluation.suggestedFix;
    collectPublicFixtures(entry, plan, response.status, body.parsed, evaluation.status === 'PASS', state);
    if (evaluation.stopAfter) state.rateLimited = true;
  } catch (error) {
    result.status = 'FAIL';
    result.actualResult = {
      category: error?.name === 'AbortError' ? 'network-timeout' : 'network',
      reachable: Boolean(response),
      httpStatus: response?.status ?? null,
    };
    result.errorDetails = error?.name === 'AbortError'
      ? `Request or response body timed out after ${config.timeoutMs}ms.`
      : `Network/transport error: ${sanitizeText(error?.message || 'fetch failed', config.accessToken)}`;
    result.suggestedFix = 'Verify API connectivity, TLS, timeout behavior, and response transport from the audit host.';
  } finally {
    // The timeout deliberately remains active until the response body has been read.
    clearTimeout(timeout);
    result.durationMs = Date.now() - started;
  }
  return result;
}

function inventoryOrder(inventory) {
  return inventory
    .map((entry, index) => ({ entry, index }))
    .sort((left, right) => {
      const leftProvider = entryMethodIsGet(left.entry) && fixtureProvider(left.entry) ? 0 : 1;
      const rightProvider = entryMethodIsGet(right.entry) && fixtureProvider(right.entry) ? 0 : 1;
      if (leftProvider !== rightProvider) return leftProvider - rightProvider;
      const leftDetail = entryMethodIsGet(left.entry) && hasPathParameters(left.entry) ? 1 : 0;
      const rightDetail = entryMethodIsGet(right.entry) && hasPathParameters(right.entry) ? 1 : 0;
      return leftDetail - rightDetail || left.index - right.index;
    })
    .map(({ entry }) => entry);
}

function entryMethodIsGet(entry) {
  return String(entry.method || '').toUpperCase() === GET;
}

function safeInventoryEntry(entry, secret) {
  return sanitizeJson(entry, secret);
}

function safePath(value, secret) {
  return redactEndpoint(value, secret);
}

function safeQueryKeys(keys, secret) {
  return (keys || []).map((key) => isSensitiveQueryKey(key) ? '[REDACTED_QUERY]' : sanitizeText(key, secret));
}

function inventorySummary(entry, config, selectedIds) {
  return {
    id: entry.id || null,
    method: entry.method || null,
    path: safePath(entry.path, config.accessToken),
    aliases: (entry.aliases || []).map((alias) => sanitizeText(alias, config.accessToken)),
    sources: entry.sources || [],
    implemented: Boolean(entry.implemented),
    expectedShape: entry.expectedShape || null,
    queryKeys: safeQueryKeys(entry.queryKeys, config.accessToken),
    requiredQueryKeys: safeQueryKeys(entry.requiredQueryKeys, config.accessToken),
    selected: selectedIds.has(entry.id),
  };
}

function safeCoverage(value, secret, key = '') {
  if (Array.isArray(value)) return value.map((item) => safeCoverage(item, secret, key));
  if (!value || typeof value !== 'object') {
    return typeof value === 'string' && /^(path|endpoint)$/i.test(key)
      ? safePath(value, secret)
      : typeof value === 'string'
        ? sanitizeText(value, secret)
        : value;
  }
  const result = {};
  for (const [childKey, childValue] of Object.entries(value)) result[childKey] = safeCoverage(childValue, secret, childKey);
  return result;
}

function responseSummaryForMarkdown(summary, secret) {
  if (!summary) return '';
  const compact = {
    contentType: summary.contentType,
    bytes: summary.bytes,
    truncated: summary.truncated,
    parsedType: summary.parsedType,
    schema: summary.schema,
    shape: summary.shape,
    error: summary.error,
  };
  if (summary.shapeError) compact.shapeError = summary.shapeError;
  return JSON.stringify(sanitizeJson(compact, secret));
}

function markdownCell(value) {
  return String(value ?? '').replace(/\r?\n/g, ' ').replace(/\|/g, '\\|');
}

function formatActualResult(result) {
  if (!result.actualResult) return '';
  const category = result.actualResult.category || 'unknown';
  const status = result.actualResult.httpStatus ?? result.httpStatus ?? '';
  const detail = result.actualResult.detail || result.actualResult.statusText || '';
  return `${category}${status !== '' ? ` HTTP ${status}` : ''}${detail ? ` (${detail})` : ''}`;
}

function reportCounts(results, inventory) {
  return {
    endpointCount: inventory.length,
    scenarioCount: results.length,
    pass: results.filter((result) => result.status === 'PASS').length,
    fail: results.filter((result) => result.status === 'FAIL').length,
    blocked: results.filter((result) => result.status === 'BLOCKED').length,
    requestsSent: results.filter((result) => result.networkRequestSent).length,
    requestsBlocked: results.filter((result) => !result.networkRequestSent).length,
    httpResponses: results.filter((result) => result.httpStatus !== null).length,
  };
}

function metadataForReport(config, options, inventory, selectedInventory, counts, runId, startedAt, completedAt, rateLimited) {
  return {
    runner: 'scripts/api-audit.cjs',
    runId,
    generatedAt: completedAt,
    startedAt,
    baseUrlOrigin: config.origin,
    baseUrlSource: config.baseSource,
    timeoutMs: config.timeoutMs,
    responseSizeCapBytes: RESPONSE_SIZE_CAP,
    requestDelayMs: REQUEST_DELAY_MS,
    processTokenProvided: config.processTokenProvided,
    authenticatedChecksEnabled: config.accessTokenProvided,
    noAuth: options.noAuth,
    dryRun: options.dryRun,
    endpointFilter: options.endpoint,
    limit: options.limit,
    endpointCount: inventory.length,
    selectedEndpointCount: selectedInventory.length,
    scenarioCount: counts.scenarioCount,
    requestsSent: counts.requestsSent,
    requestsBlocked: counts.requestsBlocked,
    rateLimitStop: Boolean(rateLimited),
    configurationError: config.configurationError,
    statusMeaning: 'PASS means this scenario met its stated contract only; it does not complete endpoint or identity-isolation validation.',
    mutationPolicy: 'read-only; no non-GET request is ever sent',
  };
}

function renderMarkdown(report, secret) {
  const { metadata, counts, inventory, coverage, results } = report;
  const lines = [];
  lines.push('# API audit report', '');
  lines.push('## Executive summary', '');
  lines.push(`Run **${metadata.runId}** discovered **${counts.endpointCount}** endpoints and produced **${counts.scenarioCount}** scenario rows: **${counts.pass} PASS**, **${counts.fail} FAIL**, **${counts.blocked} BLOCKED**. ` +
    `Requests sent: **${counts.requestsSent}**; requests blocked: **${counts.requestsBlocked}**.`);
  lines.push('**PASS means the individual scenario met its stated contract only; it does not mean the endpoint or identity isolation is fully validated.**');
  if (metadata.dryRun) lines.push('This report was generated with `--dry-run`; no network requests were sent.');
  if (metadata.rateLimitStop) lines.push('The runner stopped subsequent network requests after receiving HTTP 429.');
  if (metadata.configurationError) lines.push(`Configuration note: ${sanitizeText(metadata.configurationError, secret)}`);
  lines.push('');

  lines.push('## Scope, methodology, and safety', '');
  lines.push('- This is a read-only audit. Every non-GET inventory entry receives a BLOCKED row listing the happy path, malformed input, authentication, ID, and role cases that were intentionally not sent.');
  lines.push('- Every GET, including registry-only GETs and health GETs, is considered for a no-auth baseline. Registry-only is recorded as a contract limitation, not an automatic skip.');
  lines.push('- Non-health GETs receive invalid-bearer, invalid-ID, missing-required-query, invalid numeric-query-type, authenticated-success, and expired-auth rows where applicable. Expired JWT checks remain BLOCKED unless a genuinely signed expired token is supplied; the runner never fabricates one.');
  lines.push('- Public list GETs run before parameterized GETs. Only the allowed scalar IDs from successful public list responses are retained in memory as fixtures; private account data is not stored.');
  lines.push('- Response bodies are capped. Successful bodies retain schema/type/array-count summaries only. Error responses retain only structured error/detail/message/code/errors diagnostics with sensitive validation and infrastructure fields redacted.');
  lines.push('');

  lines.push('## Environment', '');
  lines.push('| Setting | Value |');
  lines.push('| --- | --- |');
  lines.push(`| Base URL origin | ${markdownCell(metadata.baseUrlOrigin || 'unavailable')} |`);
  lines.push(`| Base URL source | ${markdownCell(metadata.baseUrlSource || 'none')} |`);
  lines.push(`| Timeout | ${metadata.timeoutMs} ms (capped at ${MAX_TIMEOUT_MS} ms) |`);
  lines.push(`| Process token | ${metadata.processTokenProvided ? 'provided (value withheld)' : 'not provided'} |`);
  lines.push(`| Authenticated checks | ${metadata.authenticatedChecksEnabled ? 'enabled' : 'blocked'} |`);
  lines.push(`| Mode | ${metadata.noAuth ? 'no-auth' : metadata.dryRun ? 'dry-run' : 'live read-only audit'} |`);
  lines.push('');

  lines.push('## Counts', '');
  lines.push('| Endpoints | Scenarios | Requests sent | Requests blocked | PASS | FAIL | BLOCKED | HTTP responses |');
  lines.push('| ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |');
  lines.push(`| ${counts.endpointCount} | ${counts.scenarioCount} | ${counts.requestsSent} | ${counts.requestsBlocked} | ${counts.pass} | ${counts.fail} | ${counts.blocked} | ${counts.httpResponses} |`);
  lines.push('');

  lines.push('## Full result table', '');
  lines.push('| # | Endpoint | Method | Scenario | Expected result | Actual result | Status | HTTP | Request path/query | Request headers | Response summary | Error details | Suggested fix | Duration ms | Request ID | Response request ID | Sources | Implemented |');
  lines.push('| ---: | --- | --- | --- | --- | --- | --- | ---: | --- | --- | --- | --- | --- | ---: | --- | --- | --- | --- |');
  results.forEach((result, index) => {
    lines.push(`| ${index + 1} | ${markdownCell(result.endpoint)} | ${markdownCell(result.method)} | ${markdownCell(result.scenario)} | ${markdownCell(result.expectedResult)} | ${markdownCell(formatActualResult(result))} | **${result.status}** | ${result.httpStatus ?? ''} | ${markdownCell(result.requestPath || '')} | ${markdownCell(result.requestHeaders ? JSON.stringify(result.requestHeaders) : '')} | ${markdownCell(responseSummaryForMarkdown(result.responseSummary, secret))} | ${markdownCell(result.errorDetails || '')} | ${markdownCell(result.suggestedFix || '')} | ${result.durationMs} | ${markdownCell(result.requestId || '')} | ${markdownCell(result.responseRequestId ? `${result.responseRequestIdHeader || 'response'}=${result.responseRequestId}` : '')} | ${markdownCell((result.sources || []).join(', '))} | ${result.implemented ? 'yes' : 'no'} |`);
  });
  lines.push('');

  lines.push('## Endpoint inventory', '');
  lines.push('| ID | Method | Path | Implemented | Selected | Sources |');
  lines.push('| --- | --- | --- | --- | --- | --- |');
  for (const entry of inventory) {
    lines.push(`| ${markdownCell(entry.id)} | ${markdownCell(entry.method)} | ${markdownCell(entry.path)} | ${entry.implemented ? 'yes' : 'no'} | ${entry.selected ? 'yes' : 'no'} | ${markdownCell(entry.sources.join(', '))} |`);
  }
  lines.push('');

  lines.push('## Coverage gaps', '');
  if (!coverage.gaps || coverage.gaps.length === 0) lines.push('No registry/implementation coverage gaps were reported by the inventory analyzer.');
  else coverage.gaps.forEach((gap) => lines.push(`- ${markdownCell(sanitizeText(Object.entries(gap).map(([key, value]) => `${key}=${typeof value === 'object' ? JSON.stringify(value) : value}`).join('; '), secret))}`));
  lines.push('');

  lines.push('## Failed and blocked details', '');
  const attention = results.filter((result) => result.status !== 'PASS');
  if (!attention.length) lines.push('No failed or blocked scenarios.');
  else {
    for (const result of attention) {
      lines.push(`### ${markdownCell(result.status)} — ${markdownCell(result.endpoint)} — ${markdownCell(result.scenario)}`);
      lines.push(`- Expected: ${markdownCell(result.expectedResult)}`);
      lines.push(`- Actual: ${markdownCell(formatActualResult(result) || result.status)}`);
      if (result.errorDetails) lines.push(`- Error details: ${markdownCell(result.errorDetails)}`);
      if (result.blockedCases.length) lines.push(`- Not-sent cases: ${markdownCell(result.blockedCases.join('; '))}`);
      if (result.suggestedFix) lines.push(`- Suggested fix: ${markdownCell(result.suggestedFix)}`);
    }
  }
  lines.push('');

  lines.push('## Suggested backend fixes', '');
  const fixes = [...new Set(results.map((result) => result.suggestedFix).filter(Boolean))];
  if (!fixes.length) lines.push('No fixes were suggested by the observed results.');
  else fixes.forEach((fix) => lines.push(`- ${markdownCell(fix)}`));
  lines.push('');

  lines.push('## Commands to reproduce', '');
  lines.push('```sh');
  lines.push('npm run api-audit');
  lines.push('npm run api-audit -- --dry-run');
  lines.push('npm run api-audit -- --endpoint=api-001');
  lines.push('npm run api-audit -- --no-auth');
  lines.push('npm run api-audit -- --limit=5');
  lines.push('```');
  lines.push('The commands use the existing configured process environment or local `.env`/`.env.local`; no example host or token is embedded.');
  lines.push('');
  return `${lines.join('\n')}\n`;
}

function writeReports(report, secret) {
  fs.mkdirSync(reportsDirectory, { recursive: true });
  fs.writeFileSync(REPORT_JSON, `${JSON.stringify({
    metadata: report.metadata,
    counts: report.counts,
    inventory: report.inventory,
    inventoryContracts: report.inventoryContracts,
    coverage: report.coverage,
    results: report.results,
  }, null, 2)}\n`, 'utf8');
  fs.writeFileSync(REPORT_MARKDOWN, renderMarkdown(report, secret), 'utf8');
}

async function runAudit(options) {
  const runId = crypto.randomUUID();
  const startedAt = new Date().toISOString();
  const config = resolveConfig(options);
  const inventory = getInventory(repoRoot);
  const coverage = getCoverage(repoRoot);
  let selectedInventory = inventory;
  if (options.endpoint) {
    selectedInventory = inventory.filter((entry) => entry.id === options.endpoint);
    if (!selectedInventory.length) throw new Error(`Unknown inventory endpoint: ${options.endpoint}`);
  }
  if (options.limit !== null) selectedInventory = selectedInventory.slice(0, options.limit);
  selectedInventory = inventoryOrder(selectedInventory);
  const selectedIds = new Set(selectedInventory.map((entry) => entry.id));
  const state = { runId, fixtures: {}, rateLimited: false };
  const tasks = selectedInventory.flatMap((entry) => scenarioPlans(entry, config).map((plan) => ({ entry, plan })));
  const results = [];

  for (const { entry, plan } of tasks) {
    let result;
    if (state.rateLimited) {
      result = blockedResult(entry, plan, config, runId, 'Network execution stopped after a prior HTTP 429.', 'rate-limit');
    } else if (plan.kind === 'read-only-blocked') {
      result = blockedResult(entry, plan, config, runId, 'Read-only authorization prevents all non-GET execution.', 'read-only');
    } else if (config.configurationError) {
      result = blockedResult(entry, plan, config, runId, config.configurationError, 'config', 'FAIL');
    } else if (options.dryRun) {
      result = blockedResult(entry, plan, config, runId, 'Dry run requested; network request was not sent.', 'read-only');
    } else {
      result = await executePlan(entry, plan, config, state);
      if (result.networkRequestSent && !state.rateLimited) await sleep(REQUEST_DELAY_MS);
    }
    results.push(result);
  }

  const completedAt = new Date().toISOString();
  const counts = reportCounts(results, selectedInventory);
  const metadata = metadataForReport(config, options, inventory, selectedInventory, counts, runId, startedAt, completedAt, state.rateLimited);
  const report = {
    metadata,
    counts,
    inventory: inventory.map((entry) => inventorySummary(entry, config, selectedIds)),
    inventoryContracts: inventory.map((entry) => safeInventoryEntry(entry, config.accessToken)),
    coverage: safeCoverage(coverage, config.accessToken),
    results,
  };
  writeReports(report, config.accessToken);
  process.stdout.write(`API audit complete: ${counts.pass} PASS, ${counts.fail} FAIL, ${counts.blocked} BLOCKED; ${counts.requestsSent} requests sent. Reports written.\n`);
  return counts.fail ? 2 : 0;
}

async function main() {
  let options;
  try {
    options = parseArgs(process.argv.slice(2));
  } catch (error) {
    process.stderr.write(`API audit argument error: ${error.message}\n`);
    process.exitCode = 2;
    return;
  }
  try {
    process.exitCode = await runAudit(options);
  } catch (error) {
    process.stderr.write(`API audit failed before report generation: ${sanitizeText(error?.message || 'unknown error')}\n`);
    process.exitCode = 2;
  }
}

if (require.main === module) main();

module.exports = {
  parseArgs,
  parseAllowedEnvFile,
  resolveConfig,
  evaluateHttp,
  sanitizeJson,
  buildRequestUrl,
  scenarioPlans,
  executePlan,
  renderMarkdown,
};
