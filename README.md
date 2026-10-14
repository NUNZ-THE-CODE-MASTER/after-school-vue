# After School Classes — Vue.js App

CST3144 front-end: Vue 3 (CDN), Bootstrap, Font Awesome, and `fetch` with Promises (no axios).

## Links (fill these in before submission)

- GitHub repository: `https://github.com/NUNZ-THE-CODE-MASTER/after-school-vue`
- GitHub Pages: `https://NUNZ-THE-CODE-MASTER.github.io/after-school-vue/`

## Local setup

1. Start the Express API on port 3000.
2. Open `index.html` in a browser, or serve this folder:

```
npx --yes serve -l 8080
```

3. For GitHub Pages, set `API_BASE_URL` in `js/config.js` to your Render URL:

```
const API_BASE_URL = "https://M00956871-after-school.onrender.com";
```

## GitHub Pages

1. Push this folder to its own GitHub repository (at least 10 commits).
2. Settings → Pages → Deploy from branch `main`, folder `/ (root)`.
3. Confirm `js/config.js` points at the hosted API, not localhost.

## Features

- Lesson list with `v-for` (subject, location, price, spaces, image, Font Awesome icon)
- Sort by subject, location, price, or spaces, ascending or descending
- Add to cart / remove from cart
- Checkout on the cart page with name (letters) and phone (numbers) regex checks
- GET lessons, POST order, PUT remaining spaces
- Backend search, teacher filter, enrolment count
