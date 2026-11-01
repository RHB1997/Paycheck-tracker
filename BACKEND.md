# Paycheck Tracker backend

The first backend version uses Firebase Authentication and Cloud Firestore. The Flutter app talks to Firebase through the official Dart plugins; Firestore Security Rules scope each user's records to their authenticated Firebase UID.

## Data model

All user data lives under `users/{uid}`:

- `paychecks/{paycheckId}` stores the pay date, currency, gross amount, tax withheld, and net pay.
- `entries/{entryId}` stores an expense or savings contribution and references its paycheck with `paycheckId`.
- `settings/{settingId}` stores private preferences such as locale and tax jurisdiction.

Amounts use integer minor units (for example, cents or fils), never floating-point values. `currencyCode` uses a three-letter uppercase currency code. Net pay is gross pay minus tax withheld. Expenses and savings are tracked separately as entries so they can be edited and categorized without changing the recorded paycheck.

Tax withholding is recorded as an amount supplied or confirmed by the user. The schema does not guess tax rates or calculate tax liability; that depends on the user's jurisdiction and circumstances.

## Security

`firestore.rules` requires Firebase Authentication and allows each account to access only its own data. It validates the shape and basic constraints of paycheck and entry records. Deploy rules and indexes with the Firebase CLI after connecting this project to a Firebase project.

## Next app integration

Add `firebase_core`, `firebase_auth`, and `cloud_firestore` to the Flutter app, initialize Firebase for the iOS bundle, then build Dart models and repository methods around these collections. Add Firebase App Check before a public release. Cloud Functions has experimental Dart support for HTTP and callable functions, but scheduled and Firestore-triggered Dart functions are not deployable in this preview. If server-only work is needed later, we can use the experimental Dart HTTP functions or a generally supported Cloud Functions runtime for background jobs.
