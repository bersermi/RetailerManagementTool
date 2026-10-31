// ============================================================================
// A STAND-IN FOR APPLE, for docs/checks/5R-k-apple-revoke-contract.sh only.
//
// The function under test signs a client secret with a private key and sends
// it to Apple twice. Nothing in a check may talk to Apple, and nothing but the
// holder of the matching PUBLIC key can say whether that signature is right.
// So this file makes the key pair, hands the private half to the check (which
// gives it to the function as its secret), keeps the public half, and plays
// Apple's two endpoints: it VERIFIES every client secret it is sent and writes
// down what arrived, and the check reads that log.
//
//   node 5R-k-apple-stand-in.mjs <port> <path to write the private key to> [mode]
//
// What it answers is chosen by the `code` it is traded:
//   good            a refresh token, and an id token for SUBJECT_A
//   other-account   the same, for an Apple account that is not the login's
//   refused         400, as Apple answers a spent or foreign code
//
// ⚠️ AND EACH CODE IS ISSUED TO ONE APP, as Apple issues it to the bundle id
// whose sheet asked (plan `10.4b-iii-c`): a bare code is Wera's (`mx.wera.app`),
// and `<code>@<client id>` is that app's — `good@mx.wera.cocina` is Wera
// Cocina's. A trade naming any other client is refused 400 `invalid_grant`, so
// a Cocina code sent without its app's name fails at the trade, as it would at
// Apple.
//
//   GET  /__log     everything received so far, as JSON
//   POST /__reset   forget it
//
// ⚠️ TWO DISHONEST MODES, FOR THE FALSIFIER ONLY. The function is the thing
// under test, so the falsifier does not edit it: it makes Apple lie instead and
// requires the check to notice.
//   wrong-key           verifies secrets against a key the function was never
//                       given, so a correctly signed one reads as unsigned
//   one-apple-account   says every code belongs to the login's Apple account,
//                       so the function revokes where it must not
// ============================================================================

import { createServer } from 'node:http';
import { writeFileSync } from 'node:fs';
import { webcrypto as crypto } from 'node:crypto';

const [port, keyPath, mode = 'honest'] = process.argv.slice(2);
if (!port || !keyPath || !['honest', 'wrong-key', 'one-apple-account'].includes(mode)) {
  console.error('usage: node 5R-k-apple-stand-in.mjs <port> <private key path> [honest|wrong-key|one-apple-account]');
  process.exit(2);
}

export const SUBJECT_A = 'apple-sub-contract-A';
const WERA = 'mx.wera.app';

/** The app a code was issued to, and the code without it. */
function issued(code) {
  const at = String(code ?? '').lastIndexOf('@');
  return at < 0 ? { client: WERA, bare: String(code ?? '') } : { client: code.slice(at + 1), bare: code.slice(0, at) };
}
const SUBJECT_OTHER = 'apple-sub-somebody-else';

const newPair = () =>
  crypto.subtle.generateKey({ name: 'ECDSA', namedCurve: 'P-256' }, true, ['sign', 'verify']);
const pair = await newPair();
const verifyWith = mode === 'wrong-key' ? (await newPair()).publicKey : pair.publicKey;
const der = Buffer.from(await crypto.subtle.exportKey('pkcs8', pair.privateKey));
const lines = der.toString('base64').match(/.{1,64}/g).join('\n');
writeFileSync(keyPath, `-----BEGIN PRIVATE KEY-----\n${lines}\n-----END PRIVATE KEY-----\n`);

const b64url = (value) => Buffer.from(value).toString('base64url');
const unsigned = (claims) => `${b64url('{"alg":"none"}')}.${b64url(JSON.stringify(claims))}.x`;

/** What a client secret says, and whether THIS key pair's private half signed it. */
async function readSecret(secret) {
  const parts = String(secret ?? '').split('.');
  if (parts.length !== 3) return { signed: false };
  try {
    const header = JSON.parse(Buffer.from(parts[0], 'base64url').toString());
    const claims = JSON.parse(Buffer.from(parts[1], 'base64url').toString());
    const signed = await crypto.subtle.verify(
      { name: 'ECDSA', hash: 'SHA-256' },
      verifyWith,
      Buffer.from(parts[2], 'base64url'),
      Buffer.from(`${parts[0]}.${parts[1]}`),
    );
    return {
      signed,
      alg: header.alg,
      kid: header.kid,
      iss: claims.iss,
      sub: claims.sub,
      aud: claims.aud,
      lifetime: claims.exp - claims.iat,
      age: Math.floor(Date.now() / 1000) - claims.iat,
    };
  } catch {
    return { signed: false };
  }
}

let log = [];

const server = createServer(async (request, response) => {
  const chunks = [];
  for await (const chunk of request) chunks.push(chunk);
  const fields = Object.fromEntries(new URLSearchParams(Buffer.concat(chunks).toString()));
  const send = (status, body) => {
    response.writeHead(status, { 'content-type': 'application/json' });
    response.end(body === undefined ? '' : JSON.stringify(body));
  };

  if (request.method === 'GET' && request.url === '/__log') return send(200, log);
  if (request.method === 'POST' && request.url === '/__reset') {
    log = [];
    return send(200, []);
  }

  if (request.method === 'POST' && request.url === '/auth/token') {
    const { client_secret: secret, ...rest } = fields;
    log.push({ path: '/auth/token', ...rest, secret: await readSecret(secret) });
    const { client, bare } = issued(fields.code);
    if (bare === 'refused' || fields.client_id !== client) return send(400, { error: 'invalid_grant' });
    const other = bare === 'other-account' && mode !== 'one-apple-account';
    const subject = other ? SUBJECT_OTHER : SUBJECT_A;
    return send(200, {
      access_token: 'stand-in-access',
      token_type: 'Bearer',
      expires_in: 3600,
      refresh_token: `stand-in-refresh-${fields.code}`,
      id_token: unsigned({ iss: 'https://appleid.apple.com', sub: subject }),
    });
  }

  if (request.method === 'POST' && request.url === '/auth/revoke') {
    const { client_secret: secret, ...rest } = fields;
    log.push({ path: '/auth/revoke', ...rest, secret: await readSecret(secret) });
    return send(200);
  }

  log.push({ path: request.url, unexpected: true });
  return send(404, { error: 'not_found' });
});

// Every interface: the function runs in a container and reaches this by the
// host's address, not by loopback.
server.listen(Number(port), '0.0.0.0');
