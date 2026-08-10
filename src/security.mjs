import crypto from "node:crypto";
import { config } from "./config.mjs";

const encoder = new TextEncoder();

function base64url(input) {
  return Buffer.from(input)
    .toString("base64")
    .replaceAll("+", "-")
    .replaceAll("/", "_")
    .replaceAll("=", "");
}

function fromBase64url(input) {
  const normalized = input.replaceAll("-", "+").replaceAll("_", "/");
  return Buffer.from(normalized, "base64").toString("utf8");
}

export function hashPassword(password) {
  const salt = crypto.randomBytes(16).toString("hex");
  const hash = crypto.pbkdf2Sync(password, salt, 120000, 32, "sha256").toString("hex");
  return `pbkdf2_sha256$120000$${salt}$${hash}`;
}

export function verifyPassword(password, stored) {
  const [algo, iterationsText, salt, expected] = String(stored).split("$");
  if (algo !== "pbkdf2_sha256" || !iterationsText || !salt || !expected) return false;
  const actual = crypto
    .pbkdf2Sync(password, salt, Number(iterationsText), 32, "sha256")
    .toString("hex");
  return crypto.timingSafeEqual(Buffer.from(actual, "hex"), Buffer.from(expected, "hex"));
}

export function signJwt(payload) {
  const now = Math.floor(Date.now() / 1000);
  const body = {
    ...payload,
    iat: now,
    exp: now + config.jwtExpiresInSeconds
  };
  const headerPart = base64url(JSON.stringify({ alg: "HS256", typ: "JWT" }));
  const payloadPart = base64url(JSON.stringify(body));
  const data = `${headerPart}.${payloadPart}`;
  const signature = crypto.createHmac("sha256", encoder.encode(config.jwtSecret)).update(data).digest();
  return `${data}.${base64url(signature)}`;
}

export function verifyJwt(token) {
  const parts = String(token ?? "").split(".");
  if (parts.length !== 3) return null;
  const [headerPart, payloadPart, signaturePart] = parts;
  const data = `${headerPart}.${payloadPart}`;
  const expected = base64url(
    crypto.createHmac("sha256", encoder.encode(config.jwtSecret)).update(data).digest()
  );
  const a = Buffer.from(signaturePart);
  const b = Buffer.from(expected);
  if (a.length !== b.length || !crypto.timingSafeEqual(a, b)) return null;
  const payload = JSON.parse(fromBase64url(payloadPart));
  if (payload.exp && payload.exp < Math.floor(Date.now() / 1000)) return null;
  return payload;
}
