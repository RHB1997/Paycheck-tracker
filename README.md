# Paycheck-tracker

An iOS app built with Flutter and Dart to track paychecks, taxes withheld, expenses, and savings.

## Data approach

The app is local-only. Financial records stay on the device in a local database; the app does not require an account or sync paycheck data to a server. See [LOCAL_DATA.md](LOCAL_DATA.md) for the initial data model and privacy decisions.

## Current features

- Add, edit, and delete paychecks.
- Record gross pay and tax withheld, then view net pay.
- Add, edit, and delete expenses and savings entries for each paycheck.
- Review paycheck totals and remaining balance.
- Choose the currency code and its decimal precision per paycheck.

The SQLite repository is in `lib/data`, domain models are in `lib/models`, and screens are in `lib/screens`. Tests cover amount handling, totals, repository updates, database migration, and edit dialogs.

## iOS checks

`.github/workflows/ios.yml` runs on every push and pull request. GitHub Actions uses a macOS runner to check formatting, analyze Dart code, run tests, and build an unsigned iOS Simulator app. The generated iOS bundle identifier is a development placeholder and must be replaced before App Store submission.
