<p align="center">
  <img src="assets/brand/banner.png" alt="Rivet — a focused GitHub client for desktop and mobile" width="100%" />
</p>

Rivet brings your repositories, pull requests, issues, and GitHub profiles into a focused desktop and mobile app. Browse a README, expand folders in place, open files beside the tree, and review changes without leaving the app.

The interface is inspired by [T3 Code](https://github.com/pingdotgg/t3code).

## Desktop

Arcaine's repository README.

![Arcaine repository in Rivet](docs/images/desktop-arcaine.png)

Avenire's native desktop overlay pull request.

![Avenire PR 14 description in Rivet](docs/images/desktop-avenire-pr.png)

## Mobile

Captured from the native Android app on a USB-connected phone.

<p>
  <img src="docs/images/mobile-arcaine.png" alt="Arcaine README in Rivet on Android" width="49%" />
  <img src="docs/images/mobile-avenire-pr.png" alt="Avenire native desktop overlay PR in Rivet on Android" width="49%" />
</p>

## Run locally

Requires Node.js 24 and npm 11.

```sh
git clone https://github.com/thedamod/rivet.git
cd rivet
npm install
```

```sh
npm run desktop   # Desktop app
npm run mobile    # Mobile app
```

Sign in with GitHub from the app. Rivet is in active development.
