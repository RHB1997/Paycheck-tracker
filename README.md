<div align="center">

# paycheck.

**Your pay, clearly accounted for.**

A local-first web app for tracking paychecks, expenses, savings, and USD equivalents, with English and Arabic support.

</div>

## Run it locally

Serve the project folder with any static file server, then open its local address in a modern browser. The app has no runtime dependencies or financial-data backend. For non-USD records it requests the selected currency's latest published daily reference rate from [Frankfurter](https://frankfurter.dev); only the currency code is sent. The app caches a rate locally for up to 24 hours and stores a snapshot with each new paycheck and entry. The rate source date and submission time are recorded, so later rates never revise earlier conversions. These are daily reference rates, not live trading quotes. Frankfurter describes the rates as public reference data, supports local caching, and provides the API without a key.

Run the automated checks with:

```sh
npm test
```

## What it does

- Create, edit, and delete paycheck records.
- Record the amount received, currency, pay date, and currency decimal precision.
- Add, edit, and delete expense and savings entries for each paycheck.
- See paycheck, expense, savings, and remaining balances update immediately.
- Categorize expenses automatically from descriptions in English or Arabic.
- Save the USD rate and equivalent with each paycheck and entry; earlier records keep their original conversions.
- Switch between English and Arabic, including a right-to-left Arabic layout.
- Keep records in the browser's local storage without an account or financial-data server.
- Use a responsive layout on desktop and mobile browsers.

## Hosting on GitHub

The GitHub Actions workflow tests the app and publishes the static site to GitHub Pages when changes reach `main`. In the repository, set **Settings → Pages → Build and deployment → Source** to **GitHub Actions**. After the first successful deployment, GitHub will show the public Pages address in that settings screen.

## Privacy and data

Paycheck records are stored in local storage for the browser and site origin being used. They are not sent to GitHub Pages. Clearing browser data or using another browser/device will not carry those records over, so use a trusted personal device and browser. Hosting the static app publicly does not make any stored financial records public.

On GitHub Pages, repositories under one account normally use the same `account.github.io` origin. Browser storage is shared by origin, so other pages served from that same origin could technically access this app's local storage. For real financial records, use a dedicated custom domain/origin or run the app on `localhost` until that is configured.

See [LOCAL_DATA.md](LOCAL_DATA.md) for the data model and limitations.
