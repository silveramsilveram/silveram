import { createApp } from './src/app.js';
import { loadConfig } from './src/config.js';
import { connectDatabase } from './src/platform/appwrite.js';

// Vercel entrypoint. Nothing heavy runs at import time: a missing env var or an
// unreachable database must not crash the function before it can answer.
// Initialisation happens on the first request and is cached for warm invocations;
// a failed attempt is not cached, so the next request retries.
let appPromise;

function init() {
  if (!appPromise) {
    appPromise = (async () => {
      const config = loadConfig();
      await connectDatabase(config);
      return createApp(config);
    })().catch((error) => {
      appPromise = undefined;
      throw error;
    });
  }
  return appPromise;
}

export default async function handler(req, res) {
  try {
    const app = await init();
    return app(req, res);
  } catch (error) {
    // Message is logged for "View Logs" in Vercel; the client only gets a generic body.
    console.error('Silveram API failed to start:', error?.message || error);
    res.statusCode = 503;
    res.setHeader('Content-Type', 'application/json');
    res.end(JSON.stringify({ error: 'The API is not configured correctly.' }));
  }
}
