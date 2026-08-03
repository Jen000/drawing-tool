# Setting up your own copy

For anyone who wants to run this with their own database rather than depend on
someone else's copy. It takes about fifteen minutes, costs nothing, and assumes
you can copy and paste rather than that you can code.

If you only want to *host a game* on a copy that already exists, you do not need
any of this — see [Running a game](running-a-game.md).

---

## What you are actually setting up

The game is one HTML file. It has no server of its own; it talks directly to a
**Firebase Realtime Database**, which is Google's free hosted database. So there
are two things to arrange:

1. **A database** to hold the drawings while a game is running.
2. **Somewhere to serve the HTML file** so people can open it.

Everything below is free. Nothing here needs a credit card.

> **You will not need Firebase Hosting or App Hosting.** App Hosting asks for a
> paid plan and is for a completely different kind of app. Ignore it.

---

## Step 1 — Make a Firebase project

1. Go to [console.firebase.google.com](https://console.firebase.google.com) and
   sign in with any Google account.
2. **Add project**, give it any name, and skip Google Analytics.

## Step 2 — Create the database

1. In the sidebar: **Build → Realtime Database → Create Database**.
2. Pick any location.
3. Choose **Start in test mode** for now. You will replace this in step 6.
4. Copy the URL shown at the top. It looks like
   `https://yourproject-default-rtdb.firebaseio.com`.

## Step 3 — Turn on the two sign-in methods

**Build → Authentication → Get started**, then enable **both**:

- **Anonymous** — how players are identified without ever logging in.
- **Email/Password** — how hosts sign in.

Miss either one and half the game stops working.

## Step 4 — Get the API key

**Project settings** (the gear) **→ General → Your apps**.

If there are no apps listed, click the web icon `</>`, give it any nickname, do
**not** tick Firebase Hosting, and register it. Firebase shows you a snippet:

```js
const firebaseConfig = {
  apiKey: "AIzaSy…",     // ← this is the one you want
  authDomain: "…",
};
```

Copy the `apiKey` value.

> **Is it safe to publish?** Yes. This key identifies your project; it does not
> grant access to anything. It ships in the source of every Firebase web app on
> the internet. The database rules in step 6 are what actually protect the data.

## Step 5 — Put both values in the file

Near the top of `index.html`:

```js
const BUILT_IN = {
  dbUrl:  'https://yourproject-default-rtdb.firebaseio.com',
  apiKey: 'AIzaSy…',
  docsUrl: ''   // optional: a link to these guides, shown in the app's Help
};
```

Fill those in and save. This is what makes the links short and means nobody else
has to set anything up — they just open your link and sign in.

Leave them blank and each host has to pass `?db=…&key=…` in the URL instead,
which works but is unpleasant to share.

## Step 6 — Publish the security rules

**Realtime Database → Rules**, replace everything with the contents of
[`firebase-rules.json`](../firebase-rules.json), and press **Publish**.

The rules are identical for everyone — there is nothing to fill in.

**Do this last.** Once they are live, anything that is not a signed-in host is
refused, so a page still running on an old link locks itself out. Get through
step 7 first if you can, then publish.

While you are there, open the **Rules Playground** and confirm a read of
`/boards` is denied for an unauthenticated user.

## Step 7 — Serve the file

Any static host works. The simplest, if the code is already on GitHub:

**Settings → Pages → Deploy from a branch → `main` → `/ (root)` → Save.**

A minute later it is live at `https://yourname.github.io/drawing-tool/`. HTTPS
is included, which phones want.

Netlify, Cloudflare Pages and Vercel all work the same way, as does dropping the
file on any web host.

Finally, back in Firebase under **Authentication → Settings → Authorized
domains**, add your domain. Not strictly required for this app, but it costs
nothing and avoids a confusing failure later.

---

## Check it works

1. Open your address. You should see the landing page with **Joining a game?**
   and **Running the game?**
2. Sign in as host, create a board, and confirm you get a six-character code.
3. On your phone, open the same address and type the code. You should land on a
   blank canvas.
4. Draw something and submit. It should appear on the board within a few
   seconds.

---

## What it costs

The free Firebase plan gives you 1 GB stored and 10 GB of downloads a month.

Drawings are stored as ~10 KB images and deleted when the next round starts, so
storage stays near zero. Downloads are the number to watch, and each drawing is
fetched once per device and cached rather than re-downloaded, so a normal
evening uses a few megabytes.

If you share your copy with other presenters, their games use your allowance.

---

## Deciding who may host

By default, anyone who can reach your address can create a host account and run
boards on your database. To restrict it, add a `hosts` node listing the accounts
you approve:

```json
{
  "hosts": {
    "SoMeUsErId1234": true,
    "AnOtHeRuSeRiD56": true
  }
}
```

**Realtime Database → Data → ⋮ → Import JSON**, or add the keys by hand.

The rule is opt-in: while `/hosts` does not exist, anybody may host, exactly as
before. The moment it has one entry, only the accounts listed can create boards
— so **add your own ID first**, or you will lock yourself out.

To find an ID: sign in on the site and try to create a board. You will be told
hosting is not switched on for your account, and shown your ID with a copy
button. That is the string to paste. Anyone asking for access can send you
theirs the same way.

Playing is never affected. Guests join boards with a code as usual.

Removing someone's line revokes them. Boards they already made keep working
until you delete them.

## A note on "hiding" the config

You cannot. The browser has to know the database URL and API key to reach
Firebase, so whatever you do they end up in the page and anyone can read them
with View Source. Repository variables and the deploy workflow keep them out of
your *source*, which is tidy and makes rotating them easier, but it is not a
secret and should not be relied on as one.

The `hosts` allowlist above is the real control. It is enforced by the database,
not by obscurity.

## Deploying with the config injected

`.github/workflows/deploy.yml` builds the page with the config filled in at
deploy time, so you do not commit it. Set these under **Settings → Secrets and
variables → Actions** — **Secrets and Variables both work**, and either naming
is accepted:

| Name | Value |
|---|---|
| `DB_URL` or `FIREBASE_DB_URL` | `https://yourproject-default-rtdb.firebaseio.com` |
| `API_KEY` or `FIREBASE_API_KEY` | `AIzaSy…` |
| `DOCS_URL` | optional, a link shown in the app's Help |

Then set **Settings → Pages → Source → GitHub Actions**. Every push to `main`
redeploys. The workflow fails loudly if the values are missing rather than
publishing a broken page.

Storing them as Secrets is harmless and masks them in the build log, but that
masking is cosmetic — see the note above. It does mean the log will show `***`
instead of your database URL, which is worth knowing when a deploy misbehaves.

## Letting people bring their own database

Anyone can point the app at their own Firebase from **Settings**, reached from
the board list or at `?settings=1`. It is stored on their device only, and while
it is set, none of your limits apply — it is their database and their allowance.
A URL with `?db=…&key=…` still overrides it, for one-off links.

## Other things worth knowing

**Anyone holding a board code can read that board while it is open.** Codes only
travel in that board's QR and on its screen, but treat the drawings as visible
to whoever you handed the code to.

---

## Trouble

**"Firebase refused this account"** — the rules are published but something is
off. Confirm you pasted `firebase-rules.json` whole, and that you are signed in
as a host rather than a guest.

**Sign-in fails with `OPERATION_NOT_ALLOWED`** — the sign-in method from step 3
is not enabled.

**The board loads but nothing saves** — you published the rules while the page
was on an old link. Reload the page.

**No Web API key anywhere** — you have not registered a web app yet. Back to
step 4.
