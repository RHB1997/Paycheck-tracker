# Local data design

This is a static web app. It has no account system, remote database, analytics, cloud sync, or server-side functions. Paycheck records are stored in the browser's `localStorage` under the `paycheck-tracker-data-v1` key. Old records are migrated to an amount-received model; an old paycheck is migrated using gross pay minus the previously recorded withholding.

## Records

### Paycheck

- `id`: locally generated stable numeric identifier
- `label`: optional display name
- `payDate`: calendar date received
- `currencyCode`: three-letter uppercase currency code
- `fractionDigits`: number of decimal places used by this currency (0–3)
- `payMinor`: amount received in integer minor units
- `usdMinor`: USD equivalent, rounded to cents using the saved rate
- `usdRate`: USD per one unit of the paycheck currency
- `usdRateAsOf`: provider's published update time for the rate
- `usdRateCapturedAt`: time the app attached the rate to this record
- `createdAt` and `updatedAt`: local timestamps

### Money entry

- `id`: locally generated stable numeric identifier
- `kind`: `expense` or `saving`
- `category`: automatically inferred category key, such as `housing`, `food`, or `transport`
- `note`: description used for automatic categorization
- `amountMinor`: positive integer amount
- `currencyCode` and `fractionDigits`: currency and precision used when the entry was saved
- `usdMinor`, `usdRate`, `usdRateAsOf`, and `usdRateCapturedAt`: the entry's saved USD conversion snapshot
- `occurredAt`, `createdAt`, and `updatedAt`: local dates/timestamps

Remaining pay is the amount received minus expenses and savings. Amounts use integer minor units to avoid floating-point rounding errors. Category suggestions run locally from English and Arabic description keywords; entries that do not match a known group use `other`.

## Exchange rates

For non-USD records the app uses Frankfurter's public daily reference-rate API. The app caches each currency rate locally for up to 24 hours, and saves the USD amount, rate, rate date, and submission timestamp with each record. Later rates never change earlier conversions. The selected currency code is sent in the request; paycheck amounts and descriptions remain in browser storage. Rates are daily reference values, not live quotes, and may lag or be revised by source providers. See [Frankfurter's license and data terms](https://frankfurter.dev/license/).

## Storage and privacy

- All records stay in the current browser profile and site origin.
- GitHub Pages serves only the static app files and does not receive paycheck data from the app.
- Local storage is shared by all pages with the same origin. Standard GitHub Pages project sites under one account normally share the account's `github.io` origin, so other pages at that origin could read the saved key. Use a dedicated custom domain/origin before storing real financial records on a shared Pages origin.
- Browser storage is not encrypted by this app. Anyone with access to the same browser profile may be able to access its data.
- Clearing site data, changing browsers, or using another device removes access to these locally stored records. There is no backup, export, or synchronization yet.
- Apart from fetching exchange rates by currency code, the app makes no network requests for app logic or financial data. It does not send amounts or descriptions to the rate provider. The UI uses system fonts and ships without third-party runtime libraries.

## Scope

Create, read, update, and delete paychecks and money entries, plus summaries by paycheck. Tax withholding, bank connections, accounts, import/export, and cloud synchronization are out of scope.
