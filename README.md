# Jan Suvidha Kendra – Mobile App

Citizen-facing Android/iOS application built with Expo and React Native for development in VS Code.

## Current features
- Browse nine sample citizen services, search and filter by category.
- View service details and indicative document guidance.
- Submit a citizen query directly to Firebase Cloud Firestore without creating an account.
- Validate the name, phone number, optional email, selected service and query message.
- Prevent repeated taps while a query is being submitted.
- Display a Firestore-based reference number after successful submission.
- View locally cached query history in **My Queries**.

## Project structure
- `mobile/` – Expo React Native application.
- `firestore.rules` – Firestore client security rules.
- `server/` – optional demonstration API; the mobile app writes directly to Firestore and does not require this server.

## UI and reliability
The app uses a refreshed green visual theme, rounded service cards and controls, clearer spacing and typography, and a more prominent welcome panel. Android status-bar inset handling keeps the header below system icons.

Firestore submission is handled separately from local device-history storage. A local-cache failure after a successful Firestore write does not report the server submission as failed. The email validator accepts standard email addresses.

The app writes the existing fields to the Firestore `citizenQueries` collection. Local query history remains device-only and is not a live server-side status tracker.

## Firebase / Firestore
The app uses the Firebase Web SDK configuration for project `jan-suvidha-kendra-2f4f1`. Queries are written to the `citizenQueries` collection.

1. Create Cloud Firestore in Firebase Console.
2. Publish the root `firestore.rules` file in Firestore → Rules.
3. The supplied rules allow anonymous query creation only and deny client read/update/delete.
4. The mobile app does not require the optional Node server for query submission.

**Important privacy limitation:** Clearing app data or changing phones can remove local query history. A secure staff/admin workflow is not included.

## Expo SDK
This project targets Expo SDK 58.

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
- Verify sample document guidance, eligibility, fees and timelines with the responsible authorities.
- Add a privacy notice, consent/retention policy and a contact channel.
- Configure Firebase App Check and abuse/rate-limiting controls before public distribution. Anonymous public query creation can attract spam.
- Build secure staff/admin access using authenticated access and trusted server-side authorization; do not open query reads to the public.
- Test on supported Android devices and review dependency/security advisories before release.

Never ask citizens to submit passwords, OTPs, bank PINs or other authentication secrets.
