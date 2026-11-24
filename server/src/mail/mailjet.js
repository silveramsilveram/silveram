// Mailjet REST (v3) client for the marketing contact list. Only used for people who opted in.
const API = 'https://api.mailjet.com/v3/REST';

export function marketingConfigured(config) {
  return Boolean(config.mailjetApiKey && config.mailjetSecretKey && config.mailjetContactListId);
}

async function call(config, path, body) {
  const response = await fetch(`${API}${path}`, {
    method: 'POST',
    headers: {
      Authorization: `Basic ${Buffer.from(`${config.mailjetApiKey}:${config.mailjetSecretKey}`).toString('base64')}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(body),
    signal: AbortSignal.timeout(10_000),
  });
  if (!response.ok) throw new Error(`Mailjet ${path} responded ${response.status}`);
  return response.json();
}

// Creates the contact if needed and subscribes it to the marketing list. "addnoforce" never
// re-subscribes someone who previously unsubscribed.
export async function subscribeContact(config, email, name, { explicitResubscribe = false } = {}) {
  await call(config, '/contactslist/' + config.mailjetContactListId + '/managecontact', {
    Email: email,
    ...(name && { Name: name }),
    Action: explicitResubscribe ? 'addforce' : 'addnoforce',
  });
}

export async function unsubscribeContact(config, email) {
  await call(config, '/contactslist/' + config.mailjetContactListId + '/managecontact', {
    Email: email,
    Action: 'unsub',
  });
}
