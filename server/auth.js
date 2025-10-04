const crypto = require('crypto');
const jwt = require('jsonwebtoken');
const { SiweMessage } = require('siwe');

const JWT_SECRET = process.env.JWT_SECRET;
const DOMAIN = process.env.DOMAIN;

/*  
    * Generate a random nonce (one-time value) to prevent replay attacks.
    * This nonce is sent to the client and must be signed back during authentication.
*/
function generateNonce() {
  return crypto.randomBytes(16).toString('base64url');
}

/*  
    * Issue a new JWT (JSON Web Token) for the authenticated user.
    * The token will contain the provided payload (e.g. user ID, wallet address)
    * and is signed with the server's secret key.
*/
function issueJwt(payload) {
  return jwt.sign(payload, JWT_SECRET, { expiresIn: '7d' });
}

/*  
    * Verify the validity of a given JWT token.
    * If the token is valid and not expired, it returns the decoded payload.
    * If the token is invalid or expired, it returns null.
*/
function verifyJwt(token) {
  try {
    return jwt.verify(token, JWT_SECRET);
  } catch {
    return null;
  }
}

/*  
    * Verify a Sign-In With Ethereum (SIWE) message and signature.
    * Ensures that:
    *  - The signature is valid for the provided message
    *  - The domain matches the server's domain
    *  - The nonce matches the expected nonce
    *  - The Ethereum address matches the expected address
*/
async function verifySiwe({ message, signature, expectedNonce, expectedAddress }) {
  const msg = new SiweMessage(message);
  const result = await msg.verify({ signature, domain: DOMAIN, nonce: expectedNonce });
  if (!result.success) return { ok: false, error: "Invalid SIWE signature" };

  if (msg.address.toLowerCase() !== expectedAddress.toLowerCase()) {
    return { ok: false, error: "Address mismatch" };
  }
  return { ok: true, address: msg.address };
}

module.exports = { generateNonce, issueJwt, verifyJwt, verifySiwe };
