# Artice Rooted - Unblocked Entertainment

The premier destination for unblocked entertainment. Built for speed, designed for gamers.

## Features
- **Unblocked Proxy:** Browse any site through our secure proxy.
- **Game Library:** A curated collection of unblocked games.
- **Request System:** Request new games directly through the app.
- **Responsive Design:** Works on desktop and mobile.

## Deployment Instructions

### 1. Requirements
- Node.js 22.6.0 or higher.
- A hosting provider that supports Node.js (e.g., Cloud Run, Render, Railway, Heroku).
- **Note:** This application includes a backend proxy server and will NOT work on static-only hosting like GitHub Pages.

### 2. Setup
1. Clone the repository.
2. Install dependencies:
   ```bash
   npm install
   ```
3. Create a `.env` file based on `.env.example` and set your `APP_URL`.

### 3. Build and Start
1. Build the frontend:
   ```bash
   npm run build
   ```
2. Start the server:
   ```bash
   npm start
   ```

### 4. Deployment to Cloud Run (Recommended)
If you are using AI Studio, you can deploy directly to Cloud Run using the "Deploy" button. The application is already configured with the correct `start` script.

## Proxy Configuration
The proxy server handles link rewriting and frame-busting protection. It is accessible at `/api/proxy/{targetUrl}`.
