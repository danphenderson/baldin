# Browser Verification

Run the local browser smoke checks against the Compose frontend with:

```bash
cd /Users/doe/Desktop/baldin/frontend
npx playwright test e2e/browser-verification.smoke.spec.ts
```

Notes:

- The suite assumes the local frontend is already reachable at `http://127.0.0.1:5173`.
- The tests mock the app APIs in-browser, so they do not depend on seeded backend data.
- The suite uses the locally installed Google Chrome binary on this machine instead of the Playwright-managed Chromium bundle.
