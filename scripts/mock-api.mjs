// Minimal in-memory stand-in for metis-api, for working on the front before an endpoint exists.
// Implements only the contract in metis-api docs/domain-model.md that the app already uses.
// Usage: npm run mock:api  (listens on http://localhost:5151, like metis-api)
import { randomUUID } from 'node:crypto';
import { createServer } from 'node:http';

const PORT = Number(process.env.PORT ?? 5151);
const users = new Map(); // email -> { id, name, email, password }
const tokens = new Map(); // token -> email

const json = (res, status, body) => {
  res.writeHead(status, { 'content-type': status >= 400 ? 'application/problem+json' : 'application/json' });
  res.end(body === undefined ? '' : JSON.stringify(body));
};
const problem = (res, status, title, extra = {}) => json(res, status, { title, status, ...extra });

const readJson = (req) =>
  new Promise((resolve) => {
    let raw = '';
    req.on('data', (chunk) => (raw += chunk));
    req.on('end', () => {
      try {
        resolve(JSON.parse(raw || '{}'));
      } catch {
        resolve({});
      }
    });
  });

const issueToken = (email) => {
  const accessToken = randomUUID();
  tokens.set(accessToken, email);
  return { tokenType: 'Bearer', accessToken, expiresIn: 43200 };
};

createServer(async (req, res) => {
  const { pathname } = new URL(req.url ?? '/', `http://localhost:${PORT}`);
  const route = `${req.method} ${pathname}`;

  if (route === 'POST /api/auth/register') {
    const { name = '', email = '', password = '' } = await readJson(req);
    const errors = {};
    if (!name.trim()) errors.Name = ['Name is required.'];
    if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email)) errors.Email = ['Email is not valid.'];
    if (password.length < 8) errors.Password = ['Password must have at least 8 characters.'];
    if (Object.keys(errors).length)
      return problem(res, 400, 'One or more validation errors occurred.', { errors });
    const key = email.trim().toLowerCase();
    if (users.has(key)) return problem(res, 409, 'Email is already registered.');
    users.set(key, { id: randomUUID(), name: name.trim(), email: key, password });
    return json(res, 200, issueToken(key));
  }

  if (route === 'POST /api/auth/login') {
    const { email = '', password = '' } = await readJson(req);
    const user = users.get(email.trim().toLowerCase());
    if (!user || user.password !== password) return problem(res, 401, 'Unauthorized');
    return json(res, 200, issueToken(user.email));
  }

  if (route === 'GET /api/auth/me') {
    const token = (req.headers.authorization ?? '').replace(/^Bearer /, '');
    const user = users.get(tokens.get(token) ?? '');
    if (!user) return problem(res, 401, 'Unauthorized');
    return json(res, 200, { id: user.id, name: user.name, email: user.email });
  }

  return problem(res, 404, 'Not Found');
}).listen(PORT, () => console.log(`mock metis-api on http://localhost:${PORT}`));
