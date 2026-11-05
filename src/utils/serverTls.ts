/**
 * @file serverTls.ts
 * @description The TLS settings used by the server when it calls an upstream
 * service (the backend, the third-party APIs).
 *
 * WHY THIS FILE EXISTS
 * On this machine the TLS 1.3 handshake with the Cloudflare edge of the
 * backend NEVER completes: the TCP connection is opened, the ClientHello is
 * sent, and no answer ever comes back. The request then dies with
 * `UND_ERR_CONNECT_TI NewbieCoder@2024MEOUT` after ~10 seconds.
 *
 * The symptom is very confusing:
 *   - every route that touches the backend answers `502`;
 *   - the backend itself looks fine, because `curl` (which uses the
 *     Windows TLS stack, not the OpenSSL one of Node.js) answers in 200 ms;
 *   - the same endpoints sometimes answer `200` and sometimes `502`, which
 *     looks like a random failure of the backend.
 *
 * The cause is the post-quantum key exchange that OpenSSL 3.5 (shipped with
 * Node.js 24) proposes by default in TLS 1.3 (`X25519MLKEM768`): the edge of
 * the backend does not always answer that group, so the handshake stalls.
 *
 * THE FIX
 * The maximum TLS version is lowered to 1.2 for the outgoing connections.
 * The handshake then completes in a few hundred milliseconds.
 *
 * WHY THE SETTING IS GLOBAL
 * Node.js does not offer a per-request TLS option for `fetch` and for
 * `axios`, so the limit has to be applied to the TLS module itself. The
 * value `tls.DEFAULT_MAX_VERSION` is read when a connection is created, so
 * setting it once is enough.
 *
 * IT CAN BE TURNED OFF
 * A deployment whose network does not have the problem can set
 * `BACKEND_TLS_MAX_VERSION=TLSv1.3` (or any other value) to restore the
 * default behaviour without a code change.
 */

import tls from 'tls';

/**
 * The maximum TLS version of the outgoing connections.
 *
 * The value is read from the environment, so it can be changed without
 * touching the code.
 */
const TLS_MAX_VERSION = process.env.BACKEND_TLS_MAX_VERSION || 'TLSv1.2';

/**
 * Lowers the maximum TLS version of the process, once.
 *
 * The function is idempotent: calling it several times is harmless.
 */
export const applyServerTlsDefaults = (): void => {
  if (tls.DEFAULT_MAX_VERSION === TLS_MAX_VERSION) return;
  tls.DEFAULT_MAX_VERSION = TLS_MAX_VERSION as typeof tls.DEFAULT_MAX_VERSION;
};

/**
 * The maximum TLS version that is applied.
 *
 * It is exported for the diagnostics: the value can be printed in a log
 * without exposing any secret.
 */
export const SERVER_TLS_MAX_VERSION = TLS_MAX_VERSION;

// The limit is applied as soon as the module is loaded, so a route only has
// to import it to be covered.
applyServerTlsDefaults();

export default applyServerTlsDefaults;
