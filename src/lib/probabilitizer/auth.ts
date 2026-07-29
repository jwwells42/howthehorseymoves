// "Login with Lichess" for The Probabilitizer.
//
// Since Feb 2026 the Lichess opening explorer requires an OAuth token on every
// request. We use the Authorization Code + PKCE flow (Lichess's recommended way
// to let users log in), which runs entirely in the browser with no client secret
// and no server — so the app stays fully client-side. The token is the user's own,
// obtained via a redirect to lichess.org and stored by the library in localStorage.
//
// We request NO scopes: the explorer only needs you authenticated, not any access
// to your account. Endpoints: https://lichess.org/oauth (authorize),
// https://lichess.org/api/token (exchange). See lichess-org/api example/oauth-app.

import { OAuth2AuthCodePKCE, type HttpClient } from "@bity/oauth2-auth-code-pkce";

const LICHESS_HOST = "https://lichess.org";
// Any stable identifier — Lichess does not pre-register PKCE clients.
const CLIENT_ID = "howthehorseymoves";

/** Redirect back to the current page, stripped of any query string. */
function redirectUrl(): string {
  const url = new URL(location.href);
  url.search = "";
  return url.href;
}

export function createLichessOAuth(): OAuth2AuthCodePKCE {
  return new OAuth2AuthCodePKCE({
    authorizationUrl: `${LICHESS_HOST}/oauth`,
    tokenUrl: `${LICHESS_HOST}/api/token`,
    clientId: CLIENT_ID,
    scopes: [], // explorer needs authentication only, no account access
    redirectUrl: redirectUrl(),
    onAccessTokenExpiry: (refresh) => refresh(),
    onInvalidGrant: (_retry) => {},
  });
}

export type { HttpClient };
