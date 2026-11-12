# Aman Multi Works – Query API

This optional API is part of the Aman Multi Works mobile application project.

Run `npm install` then `npm start`. API listens on port 3000.
- POST `/api/queries`: accepts name, phone, optional email, serviceId and message.
- GET `/api/health`: health check.

Demo data is saved to `data/queries.json`. For public production deployment, replace JSON storage with a managed database and add rate limiting, validation, privacy notice, HTTPS and backups.
