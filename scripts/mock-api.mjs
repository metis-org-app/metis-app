// Minimal in-memory stand-in for metis-api, for working on the front before an endpoint exists.
// Implements only the contract in metis-api docs/domain-model.md that the app already uses.
// Usage: npm run mock:api  (listens on http://localhost:5151, like metis-api). Needs a real Cognito user pool.
import { createServer } from 'node:http';

const PORT = Number(process.env.PORT ?? 5151);
// Cognito is not mocked: sign-in and sign-up talk to the real (dev) user pool, which issues the tokens. Only the
// metis-api side is here: the JWT payload is decoded without checking its signature.
const users = new Map(); // sub -> { id, name, email }

const json = (res, status, body) => {
  res.writeHead(status, { 'content-type': status >= 400 ? 'application/problem+json' : 'application/json' });
  res.end(body === undefined ? '' : JSON.stringify(body));
};
const problem = (res, status, title, extra = {}) => json(res, status, { title, status, ...extra });

const claims = (req) => {
  const token = (req.headers.authorization ?? '').replace(/^Bearer /, '');
  try {
    const payload = JSON.parse(Buffer.from(token.split('.')[1] ?? '', 'base64url').toString());
    return payload.exp * 1000 > Date.now() ? payload : undefined;
  } catch {
    return undefined;
  }
};

createServer(async (req, res) => {
  const { pathname } = new URL(req.url ?? '/', `http://localhost:${PORT}`);
  const route = `${req.method} ${pathname}`;

  // The ID token: creates the user (named after the email's local part) the first time, returns them every time.
  if (route === 'POST /api/auth/sync') {
    const payload = claims(req);
    if (!payload || payload.token_use !== 'id' || !payload.email) return problem(res, 401, 'Unauthorized');
    if (payload.email_verified !== true && payload.email_verified !== 'true')
      return problem(res, 403, 'Forbidden');
    const email = String(payload.email).toLowerCase();
    const user = users.get(payload.sub) ?? { id: payload.sub, name: email.split('@')[0], email };
    users.set(payload.sub, user);
    return json(res, 200, user);
  }

  // The access token, like every other call.
  if (route === 'GET /api/auth/me') {
    const payload = claims(req);
    const user = payload?.token_use === 'access' ? users.get(payload.sub) : undefined;
    if (!user) return problem(res, 401, 'Unauthorized');
    return json(res, 200, user);
  }

  return problem(res, 404, 'Not Found');
}).listen(PORT, () => console.log(`mock metis-api on http://localhost:${PORT}`));
