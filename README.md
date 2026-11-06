# Jan Suvidha Kendra – Mobile App

Citizen-facing Android/iOS application built with Expo and React Native for development in VS Code.

## Current features
- Browse nine sample citizen services, search and filter by category.
- View service details and an indicative document checklist.
- Read general pre-application guidance. Official eligibility, fees, documents and timelines must be confirmed with the relevant authority.
- Submit a citizen query directly to Firebase Cloud Firestore without creating an account.
- Validate name, phone number, optional email, selected service and query message before submission.
- Display a submission confirmation and reference number.
- View locally cached query history in **My Queries**.

## Firebase / Firestore
The app uses the Firebase Web SDK configuration supplied for project `jan-suvidha-kendra-2f4f1`. Queries are written to the `citizenQueries` collection.

1. Create the Cloud Firestore database in Firebase Console.
2. Publish the root `firestore.rules` file in Firestore → Rules.
3. Do not enable public reads. The supplied rules allow public query creation only and deny client read/update/delete.
4. The app does not require the optional Node server for query submission.

**Important privacy limitation:** My Queries is a local device history, not a live server-side query lookup. Clearing app data or changing phones can remove this local history. A secure staff/admin workflow is not included.

## Expo SDK
This updated project targets Expo SDK 58 to match the Expo Go version reported by the project owner during setup.

## Run in VS Code
Open a terminal in the `mobile` directory and run:

```powershell
npm install
npx expo-doctor@latest
npx expo start -c
```

Scan the QR code using the matching Expo Go app. If Expo reports a package-version mismatch, run:

```powershell
npx expo install --fix
```

## Android APK (later step)
For a standalone installable Android build, configure an Expo EAS account and build profile, then run an EAS Android preview build. This ZIP is source code; it is not a prebuilt APK.

## Production-readiness checklist
- Verify every sample service's document checklist, eligibility, fees and timelines with the responsible authorities.
- Add a privacy notice, consent/retention policy and a contact channel.
- Configure Firebase App Check and abuse/rate-limiting controls before public distribution. Public anonymous query creation can attract spam.
- Build a secure staff/admin workflow using authenticated access and trusted server-side authorization; do not open query reads to the public.
- Test on supported Android devices and review dependency/security advisories before release.

Never ask citizens to submit passwords, OTPs, bank PINs or other authentication secrets.
