// Cloudflare Worker: σερβίρει το site και στέλνει τα μηνύματα της φόρμας επικοινωνίας
// στο email του Νίκου μέσω του Cloudflare Email Routing.
import { EmailMessage } from 'cloudflare:email';

const TO = 'nickofow@gmail.com';
const FROM = 'contact@nikospanagiotopoulos.com';
const DOMAIN = 'nikospanagiotopoulos.com';
const MIN_FILL_MS = 3000;

export default {
  async fetch(request, env) {
    const url = new URL(request.url);

    if (url.pathname === '/api/contact') {
      if (request.method !== 'POST') {
        return new Response('Method not allowed', { status: 405, headers: { Allow: 'POST' } });
      }
      return handleContact(request, env);
    }

    return env.ASSETS.fetch(request);
  },
};

async function handleContact(request, env) {
  const wantsJson = (request.headers.get('Accept') || '').includes('application/json');
  const reply = (ok, status) =>
    wantsJson
      ? Response.json({ ok }, { status })
      : Response.redirect(new URL(`/?${ok ? 'sent' : 'error'}=1#contact-page`, request.url), 303);

  let form;
  try {
    form = await request.formData();
  } catch {
    return reply(false, 400);
  }

  // Κρυφό πεδίο: το συμπληρώνουν μόνο τα bots, οπότε το μήνυμα αγνοείται σιωπηλά.
  if (field(form, 'website')) return reply(true, 200);

  // Πόση ώρα ήταν ανοιχτή η σελίδα πριν το Send (το μετράει το script της σελίδας).
  // Χωρίς αυτό, το μήνυμα δεν ήρθε από τη σελίδα αλλά απευθείας από bot.
  // Κάτω από 3 δευτερόλεπτα, κανένας άνθρωπος δεν προλαβαίνει να γράψει, οπότε αγνοείται σιωπηλά.
  const elapsed = field(form, 'elapsed');
  if (!/^\d+$/.test(elapsed)) return reply(false, 400);
  if (Number(elapsed) < MIN_FILL_MS) return reply(true, 200);

  // Cloudflare Turnstile: ελέγχει ότι ο επισκέπτης είναι άνθρωπος. Ενεργό μόλις οριστεί το
  // secret TURNSTILE_SECRET_KEY στις ρυθμίσεις του Worker στο Cloudflare.
  if (env.TURNSTILE_SECRET_KEY) {
    const human = await verifyTurnstile(
      env.TURNSTILE_SECRET_KEY,
      field(form, 'cf-turnstile-response'),
      request.headers.get('CF-Connecting-IP'),
    );
    if (!human) return reply(false, 403);
  }

  const name = singleLine(field(form, 'Name'), 100);
  const surname = singleLine(field(form, 'Surname'), 100);
  const email = singleLine(field(form, 'Email'), 254);
  const message = field(form, 'Message').trim().slice(0, 5000);

  if (!name || !surname || !message || !/^[^\s@<>"]+@[^\s@<>"]+\.[^\s@<>"]+$/.test(email)) {
    return reply(false, 400);
  }

  const fullName = `${name} ${surname}`;
  const body = `${message}\n\n—\n${fullName}\n${email}\n\nΑπό τη φόρμα επικοινωνίας του ${DOMAIN}`;
  const raw = [
    `From: ${encodeHeader('Nikos Panagiotopoulos website')} <${FROM}>`,
    `To: <${TO}>`,
    `Reply-To: ${encodeHeader(fullName)} <${email}>`,
    `Subject: ${encodeHeader(`New message from ${fullName}`)}`,
    `Date: ${new Date().toUTCString()}`,
    `Message-ID: <${crypto.randomUUID()}@${DOMAIN}>`,
    'MIME-Version: 1.0',
    'Content-Type: text/plain; charset=utf-8',
    'Content-Transfer-Encoding: base64',
    '',
    base64(body).replace(/.{1,76}/g, '$&\r\n'),
  ].join('\r\n');

  try {
    await env.SEND_EMAIL.send(new EmailMessage(FROM, TO, raw));
  } catch (err) {
    console.error('Contact form email failed:', err);
    return reply(false, 502);
  }

  return reply(true, 200);
}

async function verifyTurnstile(secret, token, ip) {
  if (!token) return false;
  const body = new FormData();
  body.append('secret', secret);
  body.append('response', token);
  if (ip) body.append('remoteip', ip);
  try {
    const response = await fetch('https://challenges.cloudflare.com/turnstile/v0/siteverify', { method: 'POST', body });
    const result = await response.json();
    if (!result.success) console.warn('Turnstile rejected:', result['error-codes']);
    return result.success === true;
  } catch (err) {
    console.error('Turnstile check failed:', err);
    return false;
  }
}

function field(form, name) {
  const value = form.get(name);
  return typeof value === 'string' ? value : '';
}

// Αφαιρεί αλλαγές γραμμής και χαρακτήρες ελέγχου, ώστε η τιμή να μπαίνει με ασφάλεια σε header.
function singleLine(value, max) {
  return value.replace(/[\u0000-\u001f\u007f]+/g, ' ').trim().slice(0, max);
}

function base64(text) {
  let binary = '';
  for (const byte of new TextEncoder().encode(text)) binary += String.fromCharCode(byte);
  return btoa(binary);
}

function encodeHeader(text) {
  return `=?UTF-8?B?${base64(text)}?=`;
}
