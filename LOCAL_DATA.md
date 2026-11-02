# Local data design

This is a static web app. It has no account system, remote database, analytics, cloud sync, or server-side functions. Paycheck records are stored in the browser's `localStorage` under the `paycheck-tracker-data-v1` key.

## Records

### Paycheck

- `id`: locally generated stable numeric identifier
- `label`: optional display name
- `payDate`: calendar date received
- `currencyCode`: three-letter uppercase currency code
- `fractionDigits`: number of decimal places used by this currency (0–3)
- `grossMinor`: gross pay in integer minor units
- `taxWithheldMinor`: tax withheld, supplied by the user
- `createdAt` and `updatedAt`: local timestamps

### Money entry

- `id`: locally generated stable numeric identifier
- `kind`: `expense` or `saving`
- `category`: user-facing category
- `note`: optional short description
- `amountMinor`: positive integer amount
- `occurredAt`, `createdAt`, and `updatedAt`: local dates/timestamps

Net pay is gross pay minus tax withheld. Remaining pay is net pay minus expenses and savings. Tax is recorded as supplied by the user; the app does not estimate tax rates or liability. Amounts use integer minor units to avoid floating-point rounding errors.

## Storage and privacy

- All records stay in the current browser profile and site origin.
- GitHub Pages serves only the static app files and does not receive paycheck data from the app.
- Local storage is shared by all pages with the same origin. Standard GitHub Pages project sites under one account normally share the account's `github.io` origin, so other pages at that origin could read the saved key. Use a dedicated custom domain/origin before storing real financial records on a shared Pages origin.
- Browser storage is not encrypted by this app. Anyone with access to the same browser profile may be able to access its data.
- Clearing site data, changing browsers, or using another device removes access to these locally stored records. There is no backup, export, or synchronization yet.
- The app makes no network requests for app logic or data. The UI uses system fonts and ships without third-party runtime libraries.

## Scope

Create, read, update, and delete paychecks and money entries, plus summaries by paycheck. Tax estimates, bank connections, accounts, import/export, and cloud synchronization are out of scope.
