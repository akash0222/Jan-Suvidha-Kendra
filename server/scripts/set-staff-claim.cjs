const { applicationDefault, initializeApp } = require("firebase-admin/app");
const { getAuth } = require("firebase-admin/auth");

async function main() {
  const email = process.argv[2]?.trim().toLowerCase();
  if (!email || !email.includes("@")) {
    throw new Error("Usage: npm run set-staff-claim -- staff@example.com");
  }
  if (!process.env.GOOGLE_APPLICATION_CREDENTIALS) {
    throw new Error("Set GOOGLE_APPLICATION_CREDENTIALS to a protected service-account JSON path. Never commit the key.");
  }

  initializeApp({
    credential: applicationDefault(),
    projectId: process.env.FIREBASE_PROJECT_ID || "jan-suvidha-kendra-2f4f1"
  });

  const auth = getAuth();
  const user = await auth.getUserByEmail(email);
  await auth.setCustomUserClaims(user.uid, {
    ...(user.customClaims || {}),
    staff: true
  });

  console.log("Staff access granted to " + user.email + ". Ask them to sign out and sign in again.");
}

main().catch((error) => {
  console.error(error.message || error);
  process.exitCode = 1;
});
