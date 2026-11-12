# Aman Multi Works – Mobile App

**Aman Multi Works** is a multi-service consultancy and citizen-assistance app. Its catalogue brings together business registrations, tax and compliance support, digital and e-governance services, business advisory, insurance and fleet support, and public-facing citizen services. The app also includes the HUNERTECH CONSULTANCY profile and contact shortcuts supplied for the business.

## Citizen app
- Browse 37 services across business registration, tax and compliance, digital and e-governance, business advisory, insurance and fleet support, certificates, government schemes, education, utilities and identity services.
- Use English or Hindi; the language preference is stored on the device.
- View service details and a preparation reminder. Business-service document requirements are confirmed after review; the app does not present an unofficial list as a statutory checklist.
- Submit queries directly to Cloud Firestore without a citizen login.
- Receive a Firestore-based reference number and a confirmation screen.
- My Queries is a device-local history, not a live server-side status tracker.

## Business profile and contact

The services screen displays the profile supplied in the HUNERTECH CONSULTANCY document:

- **Hindi line:** विश्वास और सेवा का संगम
- **Slogan:** START FROM ZERO AND MAKE NINES!
- **Office:** Ram Mahesh ji market, Tirwa Kannauj Road, Faguha, Kannauj - 209732
- **Phone / WhatsApp:** 9120549544
- **Email:** sggs2025byaman@gmail.com

Phone, WhatsApp and email shortcuts open the corresponding device app. Confirm that these details remain current before publishing a public build.

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

The mobile app uses Firebase JS SDK 13 for Firestore and persistent staff authentication. Keep `mobile/package.json` and `mobile/package-lock.json` synchronized when dependencies change.

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
- Service document lists, eligibility, fees and timelines are indicative and must be confirmed with the relevant authority or a qualified professional. Tax, company, legal and compliance filings may require a suitably qualified or authorised professional.
- Never ask citizens for passwords, OTPs or bank PINs.

## Production checklist
- Configure Firebase App Check and abuse controls for anonymous public submissions.
- Add a privacy notice, consent and data-retention policy.
- Keep service-account key access restricted and rotate/revoke keys if exposed.
- Test Firestore rules in the Firebase Emulator or Rules Playground before production use.
- Test the staff workflow on physical devices and verify that unapproved accounts cannot read citizen records.

## Automated checks
GitHub Actions runs the mobile Android export and server syntax checks for pushes and pull requests. The workflow refreshes the mobile and server npm lockfiles from their package manifests, verifies clean installs with `npm ci`, and commits lockfile changes on pushes to `main` when needed.
