# Task: Migrate to Modular Firebase Admin SDK

- `[/]` Update `server/src/config/firebase.js`
    - `[x]` Use modular imports from `firebase-admin/firestore`, `firebase-admin/auth`, etc.
    - `[x]` Implement `getFirestore(app)`, `getAuth(app)`, etc.
- `[ ]` Deploy to all branches
- `[ ]` Verify with Cloud Run logs and `/api/ping`
