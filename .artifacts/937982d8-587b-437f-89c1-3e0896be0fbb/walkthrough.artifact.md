# Walkthrough: Securing .trim() calls

I have secured all identified calls to `.trim()` across the project to prevent `TypeError: Cannot read properties of undefined (reading 'trim')` crashes.

## Changes made

### [Shared Hooks]
- **[useMatchmaking.ts](file:///C:/Users/UTILISATEUR/galant-app/src/hooks/useMatchmaking.ts)**: Added robust checks for `filters.city` and `search` parameters before calling `.trim()`.

### [Web Application]
- **[AuthPage.tsx](file:///C:/Users/UTILISATEUR/galant-app/web/src/pages/AuthPage.tsx)**: Secured `email.trim()` in the password reset flow.
- **[LocationSetupPage.tsx](file:///C:/Users/UTILISATEUR/galant-app/web/src/pages/LocationSetupPage.tsx)**: Secured `manualCity.trim()` in the location selection form.
- **[PassportModal.tsx](file:///C:/Users/UTILISATEUR/galant-app/web/src/components/PassportModal.tsx)**: Secured `query.trim()` in the city search.

### [Mobile Application]
- **[AuthMethodStep.tsx](file:///C:/Users/UTILISATEUR/galant-app/src/screens/auth/components/AuthMethodStep.tsx)**: Secured `identifier.trim()` during login/signup.
- **[UserListScreen.tsx](file:///C:/Users/UTILISATEUR/galant-app/src/screens/admin/UserListScreen.tsx)**: Secured `query.trim()` in the admin search bar.
- **[DiscoverGridScreen.tsx](file:///C:/Users/UTILISATEUR/galant-app/src/screens/discover/DiscoverGridScreen.tsx)**: Secured `q.trim()` in the grid search function.
- **[PassportModal.tsx](file:///C:/Users/UTILISATEUR/galant-app/src/components/passport/PassportModal.tsx)**: Secured `query.trim()` in the passport city search.

## Verification

These changes eliminate the risk of a crash if a user leaves a search field empty or if an initial state is `undefined`. The application should now be more stable on both platforms.
