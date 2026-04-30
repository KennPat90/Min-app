import crypto from "crypto";

export function randomToken(byteLength = 32) {
  // base64url is filesystem/cookie friendly (ingen + / =)
  return crypto.randomBytes(byteLength).toString("base64url");
}

