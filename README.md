# Jan Suvidha Kendra – Mobile App

Citizen-facing Android/iOS application built with Expo and React Native for development in VS Code.

## Current features
- Browse nine sample citizen services, search and filter by category.
- View service details and an indicative document checklist.
- Read general pre-application guidance. Official eligibility, fees, documents and timelines must be confirmed with the relevant authority.
- Submit a citizen query directly to Firebase Cloud Firestore without creating an account.
- Validate name, phone number, optional email, selected service and query message.
- Prevent rapid duplicate taps during an active submission.
- Display a submission confirmation and Firestore-based reference number.
- View locally cached query history in **My Queries**.

## Project structure
- `mobile/` – Expo React Native application.
- `firestore.rules` – Firestore client security rules.
- `server/` – optional demonstration API; the mobile app writes directly to Firestore and does not require this server.

## UI/UX update
The mobile experience uses a refined green visual system, improved card treatment, clearer service details, larger touch targets, rounded form controls and more legible query history. Android status-bar inset handling keeps the header below system icons.

The query flow writes the existing fields to the Firestore `citizenQueries` collection. Firestore success is handled separately from local device-history storage so a local-cache error does not misreport a successful server submission. Local query history remains device-only and is not a live server-side status tracker.

## Firebase / Firestore
The app uses the Firebase Web SDK configuration for project `jan-suvidha-kendra-2f4f1`. Queries are written to the `citizenQueries` collection.

1. Create Cloud Firestore in Firebase Console.
2. Publish the root `firestore.rules` file in Firestore → Rules.
3. The supplied rules allow anonymous query creation only and deny client read/update/delete.
4. The mobile app does not require the optional Node server for query submission.

**Important privacy limitation:** My Queries is a local device history, not a live server-side query lookup. Clearing app data or changing phones can remove this local history. A secure staff/admin workflow is not included.

## Expo SDK
This project targets Expo SDK 58, matching the Expo Go version reported during device testing.

## Run in VS Code
Open a terminal in the `mobile` directory and run:

```powershell
npm install
npx expo-doctor@latest
npx expo start -c
```

If Expo reports a package-version mismatch, run `npx expo install --fix`.

## Repository hygiene
Do not commit `node_modules`, `.expo`, build output, `.env` files or real citizen data. The root `.gitignore` excludes generated and local-only files.

## Android APK
For a standalone installable Android build, configure an Expo EAS account and build profile, then run an EAS Android preview build. This repository contains source code, not a prebuilt APK.

## Production-readiness checklist
- Verify each sample service's document checklist, eligibility, fees and timelines with the responsible authorities.
- Add a privacy notice, consent/retention policy and contact channel.
- Configure Firebase App Check and abuse/rate-limiting controls before public distribution. Anonymous public query creation can attract spam.
- Build a secure staff/admin workflow using authenticated access and trusted server-side authorization; do not open query reads to the public.
- Test on supported Android devices and review dependency/security advisories before release.

Never ask citizens to submit passwords, OTPs, bank PINs or other authentication secrets.
