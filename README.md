# Draw the Topic

A single-file drawing game for presentation nights. You put a board on the big
screen, guests scan a QR code, draw the topic on their phone, and vote for a
favourite. No app, no login, no build step — `index.html` is the whole thing.

## Running it

Open `index.html?host=1` and follow the one-time setup to connect a free
Firebase Realtime Database. The board is at `?host=1&db=…`; the QR code points
guests at the same page without `host=1`.

## Two security modes

### Test mode (default)

Firebase "test mode" rules let anyone who has the database URL read, write and
delete anything, at any time. Fine for a one-off, but the URL is the only thing
protecting the board — including the day after your event.

### Locked down (recommended for recurring nights)

Guests still just scan and draw — nothing changes for them. Behind the scenes
they are signed in anonymously, and the rules only accept their drawings while
your board is actually open.

1. Firebase → **Build → Authentication → Get started → Anonymous → Enable**.
2. Firebase → **Project settings → General** → copy the **Web API key**.
3. Open your board, expand **Security & access**, paste the key, and press
   *Turn on locked-down mode*. Your board URL gains a `&key=…` parameter — use
   that URL from now on, and re-generate your QR code from it.
4. Copy the rules shown there (they already contain your host ID) into
   **Realtime Database → Rules**, and press Publish.

`firebase-rules.json` in this repo is the same policy with a `__HOST_UID__`
placeholder, if you would rather paste it by hand.

#### What the rules enforce

- **The session window.** Your board writes `session/openUntil` every few
  minutes while it is on screen. Guests can only read or write while that
  timestamp is in the future, so an old QR code stops working roughly half an
  hour after you close the board — and `Close session` shuts it immediately.
- **Guests add, they never edit.** A drawing can be created but not overwritten
  or deleted, so nobody can vandalise or wipe the board.
- **Shape and size limits.** A drawing must be a JPEG data URL under 400 KB with
  a name of 24 characters or less, tagged with the current round, and no extra
  fields.
- **One vote each.** Votes are keyed by the voter's own uid, must point at a
  drawing that exists, and cannot be changed once cast.
- **The host owns everything else.** Only your host ID can set the topic, change
  phase, open or close the session, and delete drawings.

Your host ID is tied to the browser you host from. If you present from a
different laptop, open the board there and copy the rules again from that
device.

#### What this does not do

Anonymous sign-in identifies a client, it does not vet one. The Web API key is
public by design (it ships in every Firebase web app), so someone who has your
QR link could still sign in and add a drawing *while your session is open* —
the same as anyone in the room. The protections above are about what they can
do and when, not about proving who they are.

## Data retention

Nothing is meant to outlive the evening. Drawings and votes are tagged with
their round; starting a new round deletes them from Firebase and verifies the
delete took, a background sweep removes anything left over from an earlier
round, and **Erase all data now** clears drawings, votes and the topic outright.
Uploads are downscaled to 800×800 JPEG before they are stored.
