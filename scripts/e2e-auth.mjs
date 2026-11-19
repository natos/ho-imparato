// End-to-end auth test with a software passkey — no browser or Touch ID needed.
// Usage: npm run dev   (in another terminal), then: npm run test:auth
// Creates throwaway "Tester…" players in your LOCAL dev database.
import { createHash, generateKeyPairSync, sign, randomBytes } from "node:crypto";
import { isoCBOR } from "@simplewebauthn/server/helpers";

const BASE = process.env.BASE_URL ?? "http://localhost:3000";
const ORIGIN = BASE;
const RP_ID = "localhost";
let jar = {};
const b64u = (b) => Buffer.from(b).toString("base64url");
const sha = (b) => createHash("sha256").update(b).digest();

async function call(path, body, method = "POST", raw = false) {
  const headers = { cookie: Object.entries(jar).map(([k, v]) => `${k}=${v}`).join("; ") };
  let payload;
  if (body instanceof FormData) payload = body;
  else if (body !== undefined) { payload = JSON.stringify(body); headers["content-type"] = "application/json"; }
  const res = await fetch(BASE + path, { method, headers, body: payload, redirect: "manual" });
  for (const c of res.headers.getSetCookie()) {
    const [kv, ...attrs] = c.split(";");
    const [k, v] = kv.split("=");
    if (attrs.some((a) => /max-age=0|expires=Thu, 01 Jan 1970/i.test(a)) || v === "") delete jar[k]; else jar[k] = v;
  }
  if (raw) return { status: res.status, text: await res.text() };
  const data = await res.json().catch(() => ({}));
  return { status: res.status, data };
}

const ok = (cond, label, extra = "") => { console.log(`${cond ? "PASS" : "FAIL"}  ${label} ${extra}`); if (!cond) process.exitCode = 1; };

const name = "Tester" + Math.floor(Math.random() * 1e4);
const { privateKey, publicKey } = generateKeyPairSync("ec", { namedCurve: "P-256" });
const jwk = publicKey.export({ format: "jwk" });
const credId = randomBytes(16);

// 1. register
let r = await call("/api/auth/register/options", { name, invite: "x" });
ok(r.status === 200 && r.data.challenge, "register options");
const cose = new Map([[1, 2], [3, -7], [-1, 1], [-2, Buffer.from(jwk.x, "base64url")], [-3, Buffer.from(jwk.y, "base64url")]]);
const authDataReg = Buffer.concat([
  sha(RP_ID), Buffer.from([0x45]), Buffer.from([0, 0, 0, 0]), Buffer.alloc(16),
  Buffer.from([0, credId.length]), credId, Buffer.from(isoCBOR.encode(cose)),
]);
const attObj = isoCBOR.encode(new Map([["fmt", "none"], ["attStmt", new Map()], ["authData", new Uint8Array(authDataReg)]]));
const cdReg = Buffer.from(JSON.stringify({ type: "webauthn.create", challenge: r.data.challenge, origin: ORIGIN }));
r = await call("/api/auth/register/verify", {
  id: b64u(credId), rawId: b64u(credId), type: "public-key", clientExtensionResults: {},
  response: { clientDataJSON: b64u(cdReg), attestationObject: b64u(attObj), transports: ["internal"] },
});
ok(r.status === 200 && r.data.recoveryCode, "register verify", JSON.stringify(r.data));
const recoveryCode = r.data.recoveryCode;

let page = await call("/", undefined, "GET", true);
ok(page.text.includes(`Ciao, <!-- -->${name}`) || page.text.includes(`Ciao, ${name}`), "home shows player after signup");

// 2. duplicate name rejected
const keep = { ...jar }; jar = {};
r = await call("/api/auth/register/options", { name: name.toLowerCase() });
ok(r.status === 409, "duplicate name (case-insensitive) rejected");
jar = keep;

// 3. logout → login with passkey
await call("/api/auth/logout");
page = await call("/", undefined, "GET", true);
ok(page.text.includes("New player"), "signed out shows welcome");
r = await call("/api/auth/login/options");
const cdAuth = Buffer.from(JSON.stringify({ type: "webauthn.get", challenge: r.data.challenge, origin: ORIGIN }));
const authData = Buffer.concat([sha(RP_ID), Buffer.from([0x05]), Buffer.from([0, 0, 0, 1])]);
const signature = sign("sha256", Buffer.concat([authData, sha(cdAuth)]), privateKey);
r = await call("/api/auth/login/verify", {
  id: b64u(credId), rawId: b64u(credId), type: "public-key", clientExtensionResults: {},
  response: { clientDataJSON: b64u(cdAuth), authenticatorData: b64u(authData), signature: b64u(signature) },
});
ok(r.status === 200, "passkey login", JSON.stringify(r.data));

// 4. replayed challenge rejected
r = await call("/api/auth/login/verify", {
  id: b64u(credId), rawId: b64u(credId), type: "public-key", clientExtensionResults: {},
  response: { clientDataJSON: b64u(cdAuth), authenticatorData: b64u(authData), signature: b64u(signature) },
});
ok(r.status !== 200, "replayed login rejected");

// 5. avatar upload
const png = Buffer.from("iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==", "base64");
const fd = new FormData(); fd.append("file", new File([png], "a.png", { type: "image/png" }));
r = await call("/api/avatar", fd);
ok(r.status === 200 && r.data.avatarUrl?.startsWith("data:image/png"), "avatar upload");
const fd2 = new FormData(); fd2.append("file", new File(["hi"], "a.txt", { type: "text/plain" }));
r = await call("/api/avatar", fd2);
ok(r.status === 400, "non-image rejected");

// 6. recovery code: wrong, right, then single-use
await call("/api/auth/logout");
r = await call("/api/auth/recover", { name, code: "AAAA-BBBB-CCCC" });
ok(r.status === 401, "wrong recovery code rejected");
r = await call("/api/auth/recover", { name: name.toUpperCase(), code: recoveryCode.toLowerCase().replace(/-/g, " ") });
ok(r.status === 200 && r.data.recoveryCode && r.data.recoveryCode !== recoveryCode, "recovery works + rotates code");
await call("/api/auth/logout");
r = await call("/api/auth/recover", { name, code: recoveryCode });
ok(r.status === 401, "old recovery code no longer works");

// 7. protected endpoints without session
jar = {};
r = await call("/api/auth/passkey/options");
ok(r.status === 401, "add-passkey requires session");
page = await call("/profile", undefined, "GET", true);
ok(!page.text.includes("Add a passkey on this device"), "profile hidden when signed out");
