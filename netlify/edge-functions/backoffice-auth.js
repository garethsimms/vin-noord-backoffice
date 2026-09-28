const COOKIE = "vn_backoffice";
const MAX_AGE = 60 * 60 * 24 * 90;

const encoder = new TextEncoder();

function html(body, status = 200) {
  return new Response(body, {
    status,
    headers: {
      "content-type": "text/html; charset=utf-8",
      "cache-control": "no-store",
      "x-robots-tag": "noindex, nofollow, noarchive",
    },
  });
}

function bytesToBase64Url(bytes) {
  let binary = "";
  for (const byte of bytes) binary += String.fromCharCode(byte);
  return btoa(binary).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/g, "");
}

async function hmac(value, secret) {
  const key = await crypto.subtle.importKey(
    "raw",
    encoder.encode(secret),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"]
  );
  return bytesToBase64Url(new Uint8Array(await crypto.subtle.sign("HMAC", key, encoder.encode(value))));
}

async function validSession(cookie, secret) {
  if (!cookie) return false;
  const [expires, signature] = cookie.split(".");
  if (!expires || !signature || Number(expires) < Date.now()) return false;
  return signature === await hmac(expires, secret);
}

function loginPage(error = "") {
  return `<!doctype html>
<html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<meta name="robots" content="noindex,nofollow"><meta name="theme-color" content="#F4F1ED">
<title>Vin Noord Backoffice</title><style>
:root{--cream:#F4F1ED;--blue:#10359B;--coral:#F16748}*{box-sizing:border-box}body{margin:0;min-height:100vh;background:var(--cream);color:var(--blue);font-family:Arial,Helvetica,sans-serif;display:grid;place-items:center;padding:24px}.login{width:min(430px,100%)}.mark{font-size:2.4rem;font-weight:900;letter-spacing:-.06em;margin-bottom:48px}.eyebrow{font-size:.75rem;font-weight:800;letter-spacing:.16em;margin-bottom:12px}.login h1{font-size:2.4rem;line-height:1;margin:0 0 12px;letter-spacing:-.04em}.login p{margin:0 0 24px;line-height:1.5}.pin{width:100%;font:inherit;font-size:2rem;letter-spacing:.35em;text-align:center;color:var(--blue);background:#fff;border:2px solid var(--blue);border-radius:14px;padding:14px 10px;outline:none}.pin:focus{box-shadow:0 0 0 4px #84A5F3}.button{width:100%;margin-top:12px;border:0;border-radius:14px;padding:16px;background:var(--blue);color:#fff;font:inherit;font-weight:800;cursor:pointer}.error{color:#b42a14;font-weight:700;margin-bottom:14px!important}
</style></head><body><main class="login"><div class="mark">VIN NOORD</div><div class="eyebrow">BACKOFFICE</div><h1>Enter PIN</h1><p>For Vin Noord staff.</p>${error ? '<p class="error">That PIN isn’t right. Try again.</p>' : ''}
<form method="post"><input class="pin" name="pin" type="password" inputmode="numeric" pattern="[0-9]{6}" maxlength="6" autocomplete="one-time-code" autofocus required aria-label="Six digit PIN"><button class="button" type="submit">Unlock</button></form></main></body></html>`;
}

export default async (request, context) => {
  const pin = Netlify.env.get("BACKOFFICE_PIN");
  const secret = Netlify.env.get("BACKOFFICE_SESSION_SECRET");
  if (!pin || !/^\d{6}$/.test(pin) || !secret) {
    return html("<h1>Backoffice security is not configured.</h1><p>Ask an owner to configure the Netlify environment variables.</p>", 503);
  }

  const url = new URL(request.url);
  if (url.pathname === "/__lock") {
    context.cookies.delete({ name: COOKIE, path: "/" });
    return Response.redirect(new URL("/", request.url), 302);
  }

  if (await validSession(context.cookies.get(COOKIE), secret)) {
    return new URL("/index.html", request.url);
  }

  if (request.method === "POST") {
    const form = await request.formData();
    const submitted = String(form.get("pin") || "");
    if (submitted === pin) {
      const expires = String(Date.now() + MAX_AGE * 1000);
      const signature = await hmac(expires, secret);
      context.cookies.set({
        name: COOKIE, value: expires + "." + signature, path: "/",
        httpOnly: true, secure: true, sameSite: "Strict", maxAge: MAX_AGE
      });
      return Response.redirect(new URL("/", request.url), 303);
    }
    return loginPage(true);
  }

  return loginPage(false);
};

export const config = { path: "/*" };
