# Fix API Failure during Onboarding

The "API request failed" error occurs when the server rejects the request without a specific error message. Analysis reveals a "chicken-and-egg" bug in the authentication middleware and a potential configuration issue with the API Base URL.

## Root Causes
1. **Middleware Block**: The `/api/profiles/complete-onboarding` route is protected by `requireAuth`, which requires a profile to already exist in Firestore. However, for new users, the profile is only created *by* this endpoint.
2. **Generic Error Message**: The `apiRequest` utility hides the HTTP status code, making it hard to distinguish between a 404 (wrong URL), 403 (middleware block), or 500 (server crash).

## Proposed Changes

### [Server] Onboarding Logic

#### [MODIFY] [profileRoutes.js](file:///C:/Users/UTILISATEUR/galant-app/server/src/routes/profileRoutes.js)
- Change `/complete-onboarding` from `requireAuth` to `requireBaseAuth`. This allows users without a profile document to reach the controller.

#### [MODIFY] [profileController.js](file:///C:/Users/UTILISATEUR/galant-app/server/src/controllers/profileController.js)
- Update `completeOnboarding` to use `req.authUser.uid` instead of `req.user.id`.
- Manually fetch the profile inside the controller to handle the reward logic (`onboarding_reward_granted`).

### [Shared] Diagnostics

#### [MODIFY] [api.ts](file:///C:/Users/UTILISATEUR/galant-app/src/lib/api.ts)
- Enhance the error message to include the HTTP status code and the attempted URL. This will help diagnose if `VITE_API_BASE_URL` is missing.

## Verification Plan

### Manual Verification
1. Push changes to `staging`.
2. Attempt to create a new profile on the web.
3. If it still fails, the new error message will show something like `API Error 404 on https://...` or `API Error 403`.
    - **If 404**: Check `VITE_API_BASE_URL` in your deployment settings (GitHub Secrets or Firebase App Hosting).
    - **If 403**: The middleware fix should have resolved this.
