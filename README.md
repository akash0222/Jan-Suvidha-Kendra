# Jan Suvidha Kendra – Mobile App

## Citizen app
- Browse nine citizen services, search and filter by category.
- Use English or Hindi; the language preference is stored on the device.
- View service details and an interactive document-preparation checklist.
- Submit queries directly to Cloud Firestore without a citizen login.
- Receive a Firestore-based reference number and a confirmation screen.
- My Queries is a device-local history, not a live server-side status tracker.

## Staff query inbox
Open **My Queries → Staff access**. Only Firebase Authentication users carrying the server-assigned custom claim `staff: true` can read citizen records.

Authorised staff can:
- Sign in using an approved email/password account.
- Review the latest 100 citizen queries.
- Search by reference, name, phone, service or message.
- Filter by All, Received, In Review, Resolved and Rejected.
- Update status to Received, In Review, Resolved or Rejected.

Staff cannot edit original citizen-submitted details or delete records. Firestore Security Rules enforce these restrictions.

### 1. Enable staff sign-in
In Firebase Console:
1. Open **Authentication → Sign-in method**.
2. Enable **Email/Password**.
3. Open **Authentication → Users → Add user** and create each approved staff account.
4. Do not enable public staff registration.

### 2. Grant or revoke staff access
The custom claim is assigned only by the trusted Firebase Admin SDK. Never place a service-account private key in the mobile app or commit it to GitHub.

1. In Firebase Console → Project settings → Service accounts, generate a private key and save it outside this repository in a protected folder.
2. Open PowerShell in `server/` and run:

```powershell
npm install
```

3. Set the key path for the current PowerShell session (replace the example path):

```powershell
$env:GOOGLE_APPLICATION_CREDENTIALS="C:\SecureKeys\jan-suvidha-kendra-admin.json"
```

4. Grant the role to an account already created in Firebase Authentication:

```powershell
npm run set-staff-claim -- staff@example.com
```

5. Revoke access when required:

```powershell
npm run remove-staff-claim -- staff@example.com
```

A staff member must sign out and sign in again after a role change so the refreshed ID token includes the latest claim.

The Firebase Admin SDK is installed only in the trusted `server/` environment. Version 14 requires Node.js 22 or later; Node 24 is supported.

### 3. Publish Firestore rules
Copy the root `firestore.rules` file into Firebase Console → Firestore Database → Rules and publish it.

The rules:
- Allow anonymous citizens to create valid query records.
- Allow reads only to authenticated users with the server-assigned `staff: true` claim.
- Allow staff to update only `status`, `updatedAt` and `updatedBy`.
- Deny all client deletes and public reads.

### 4. Run the mobile app
Open a terminal in `mobile/`:

```powershell
npm install
npx expo-doctor@latest
npx expo start -c
```

Expo SDK requires Firebase JS SDK 12 or later; `mobile/package.json` is aligned to Firebase 12. Run `npm install` so the local package lock is refreshed for the new version.

## Project structure
- `mobile/` – Expo React Native application.
- `mobile/StaffPortal.js` – staff-only query inbox.
- `firestore.rules` – citizen submission and staff authorization rules.
- `server/scripts/` – trusted Admin SDK utilities to grant/revoke staff claims.
- `server/` – optional demonstration API and staff-role tools; not used for citizen query submission.

## Data and privacy notes
- Firestore collection remains `citizenQueries`; the citizen-submitted fields are unchanged.
- My Queries is stored locally on the device. Clearing app data or changing phones may remove that history.
- Staff can view citizen contact details. Grant access only to trusted personnel who need it and handle records confidentially.
- Service document lists, eligibility, fees and timelines are indicative and must be confirmed with the relevant authority.
- Never ask citizens for passwords, OTPs or bank PINs.

## Production checklist
- Configure Firebase App Check and abuse controls for anonymous public submissions.
- Add a privacy notice, consent and data-retention policy.
- Keep service-account key access restricted and rotate/revoke keys if exposed.
- Test Firestore rules in the Firebase Emulator or Rules Playground before production use.
- Test the staff workflow on physical devices and verify that unapproved accounts cannot read citizen records.

## Automated checks
GitHub Actions runs the mobile Android export and server syntax checks for pushes and pull requests. The workflow refreshes the mobile and server npm lockfiles from their package manifests, verifies clean installs with `npm ci`, and commits lockfile changes on pushes to `main` when needed.
