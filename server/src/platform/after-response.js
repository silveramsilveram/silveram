import { waitUntil } from '@vercel/functions';

export async function afterResponse(label, work) {
  const task = Promise.resolve().then(async () => {
    const startedAt = Date.now();
    try {
      await work();
    } finally {
      const duration = Date.now() - startedAt;
      if (duration >= 3000) console.warn(`${label} took ${duration}ms`);
    }
  }).catch((error) => {
    console.error(`${label} failed:`, error?.code ?? '', error?.type ?? '', error?.message || error);
  });

  if (process.env.VERCEL === '1') {
    waitUntil(task);
    return;
  }

  await task;
}
