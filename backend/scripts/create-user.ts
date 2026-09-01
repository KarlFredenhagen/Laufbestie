// Manual account creation — there is no public sign-up route by design, so new accounts are
// created by whoever runs the server: `npm run create-user -- someone@example.com "a good password"`
import { db } from "../src/db";
import { hashPassword } from "../src/auth/password";

const [, , emailArg, passwordArg] = process.argv;

if (!emailArg || !passwordArg) {
  console.error('Verwendung: npm run create-user -- <email> "<passwort>"');
  process.exit(1);
}

const email = emailArg.trim().toLowerCase();
if (passwordArg.length < 8) {
  console.error("Das Passwort sollte mindestens 8 Zeichen lang sein.");
  process.exit(1);
}

const existing = db.prepare("SELECT id FROM users WHERE email = ?").get(email);
if (existing) {
  console.error(`Es gibt bereits einen Account mit der E-Mail ${email}.`);
  process.exit(1);
}

const passwordHash = hashPassword(passwordArg);
const info = db.prepare("INSERT INTO users (email, password_hash) VALUES (?, ?)").run(email, passwordHash);

console.log(`Account angelegt: ${email} (id ${info.lastInsertRowid})`);
