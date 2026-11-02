# Local data design

This app stores financial data on the user's iPhone. It has no account system, remote database, cloud sync, or server-side functions. The Flutter data layer uses `sqflite` (SQLite).

## Records

### Paycheck

- `id`: locally generated stable identifier
- `label`: optional display name, such as "November paycheck"
- `payDate`: date received
- `currencyCode`: three-letter uppercase currency code
- `grossMinor`: gross salary in integer minor units
- `taxWithheldMinor`: tax already withheld, entered or confirmed by the user
- `createdAt` and `updatedAt`: local timestamps

Net pay is calculated as `grossMinor - taxWithheldMinor`. Tax is recorded as supplied by the user; the app does not infer a tax rate or tax liability.

### Money entry

- `id`: locally generated stable identifier
- `paycheckId`: paycheck this entry belongs to
- `kind`: `expense` or `saving`
- `category`: user-facing category
- `note`: optional short description
- `amountMinor`: positive integer amount
- `currencyCode`: same currency as the paycheck
- `occurredAt`, `createdAt`, and `updatedAt`: local timestamps

Remaining amount is calculated as net pay minus expense and savings entries. Expenses and savings remain separate in summaries.

## Storage and privacy

- Persist records in the app's private iOS container with SQLite.
- Use foreign keys so deleting a paycheck also deletes its entries.
- Store paycheck dates as calendar dates and event timestamps in UTC.
- Keep calculations and reads on-device; do not send financial records to analytics or crash reports.
- Do not add sign-in or network access for paycheck data.
- Use integer minor units for money to avoid floating-point rounding errors.
- Consider iOS device backups separately from app sync: device backups may include app data. The app can later offer a clear local export/import option if users need portability.

## Initial scope

The first version needs create, read, update, and delete operations for paychecks and money entries, plus local summaries by paycheck. Tax estimates, bank connections, accounts, and cloud synchronization are out of scope.
