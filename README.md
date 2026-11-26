# After School Classes - Vue.js App

CST3144 front-end: Vue 3 (CDN), Bootstrap 5, Font Awesome, and `fetch` with Promises (no axios, no XMLHttpRequest).

## Links

- GitHub repository: https://github.com/NUNZ-THE-CODE-MASTER/after-school-vue
- GitHub Pages (live app): https://NUNZ-THE-CODE-MASTER.github.io/after-school-vue/
- Back-end API (Render): https://m00956871-after-school.onrender.com/lessons
- Back-end repository: https://github.com/NUNZ-THE-CODE-MASTER/after-school-express

## Project structure

- `index.html` - page layout and Vue templates (`v-for`, `v-on`, `v-model`, `v-if`)
- `js/app.js` - Vue app: state, computed properties, methods and all `fetch` calls
- `js/config.js` - `API_BASE_URL`, the address of the Express API
- `css/style.css` - small style tweaks on top of Bootstrap
- `favicon.svg` - tab icon
- `.nojekyll` - stops GitHub Pages from processing the site with Jekyll

## Running the app

The app is a static site, so no build step is needed.

1. `js/config.js` points at the hosted API on Render, so the live site and a local copy both use the deployed back-end:

```
const API_BASE_URL = "https://m00956871-after-school.onrender.com";
```

2. To run locally, serve this folder:

```
npx --yes serve -l 8080
```

3. To test against a local Express API instead, change `API_BASE_URL` to `http://localhost:3000` and change it back before pushing.

The Render free tier sleeps when idle, so the first load can take about a minute.

## GitHub Pages

1. Push this folder to its own GitHub repository.
2. Settings -> Pages -> Deploy from a branch -> `main`, folder `/ (root)`.
3. Confirm `js/config.js` points at the Render URL, not localhost.

## Features

- Lesson list built with `v-for`: subject, location, price, spaces left, teacher, enrolment count, image and Font Awesome icon
- Sort by subject, location, price or spaces, ascending or descending
- Add to cart: each click reduces the lesson's spaces by one; the button stays visible and is disabled at 0 spaces
- Cart page with remove buttons (a removed space returns to the lesson) and a running total
- Checkout on the cart page: the button is enabled only for a valid name (letters only, first and last name) and phone (digits only, at least 7), checked with regular expressions
- Checkout sends `POST /orders`, then `PUT /lessons/:id` for each lesson to save the remaining spaces
- Challenge tasks: back-end search (`GET /search?q=`), teacher filter, enrolment count (`GET /enrolment/:lessonid`)