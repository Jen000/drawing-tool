# How it works

The reasoning behind the code, for anyone changing it.

## Shape of the thing

One HTML file, no build step, no dependencies except a QR code library loaded
from a CDN. It talks to a Firebase Realtime Database over plain REST — no
Firebase SDK — which is why the whole app is a single file you can open from
disk.

Four views live in the same file, chosen by URL:

| URL | View |
|---|---|
| `?` | landing — join by code, or sign in to host |
| `?b=CODE` | the drawing canvas, then voting, then results |
| `?host=1` | sign in → board picker → host controls |
| `?b=CODE&screen=1` | the shared screen for the room |

## Data model

```
users/<uid>/boards/<code>       {name, createdAt}      private board list
boards/<code>/owner             <uid>                  claimed once, never changes
boards/<code>/meta              {name, createdAt}
boards/<code>/session/openUntil <timestamp>            the write gate
boards/<code>/state             {topic, phase, round, timerEnd, …}
boards/<code>/board/<id>        {name, dataUrl, ts, round}
boards/<code>/votes/<uid>       {choice, ts, round}
```

Board codes are six characters from an alphabet with no `0/O` or `1/I/L`, so
they survive being read off a screen.

## Decisions worth knowing

**The canvas is a fixed 1200×1200 bitmap that is never resized.** The original
code resized the backing store on every window resize and rescaled the contents
into it. On iOS the URL bar collapsing or the keyboard opening changes the
viewport height, so that resize quietly squashed people's drawings mid-session.
Now only the CSS box changes; the pixels are never touched. It also means every
submission has the same aspect ratio.

**Zoom is a CSS transform, not a redraw.** Pointer positions are mapped through
`getBoundingClientRect`, which already accounts for the transform, so drawing
stays accurate at any zoom with no extra maths. Two fingers always pan and
zoom whatever tool is selected; the move tool exists for mice.

**Timers are absolute deadlines painted by a local ticker.** Painting them from
the poll made them jump in four-second steps. The clock offset against the
server is measured *once* — `Date` headers only carry whole seconds, so
re-measuring made the offset wobble and the countdown stutter. Deadlines are
written in server time so every device counts the same seconds. Pausing stores
the remaining milliseconds and clears the deadline; resuming rebuilds it.

**Drawings are immutable, so they are fetched once.** The rules refuse any
overwrite. Each poll asks for the key list with `?shallow=true` and downloads
only what it has not seen. Before this, the voting screen re-downloaded every
image every four seconds on every phone — about 1.2 GB per phone per hour with
twenty drawings, against a 10 GB monthly allowance.

**Views only re-render when something changed**, compared with a cheap signature
of keys, vote counts and phase. Otherwise the board rebuilt its markup and
re-decoded every image on every tick.

**The session window is what closes the board.** The host page rewrites
`session/openUntil` to *now + 30 minutes* every five minutes while it is open.
The rules only accept guest reads and writes while that timestamp is in the
future, so an abandoned code goes dead on its own. It is a rolling window rather
than a fixed length, so a long night never times out mid-game.

## What the rules enforce

- **Boards are owned.** The first account to claim a board owns it permanently;
  ownership cannot be transferred or stolen. Only the owner can set the topic,
  change phase, open or close the session, or delete anything.
- **Guests add, never edit.** A drawing can be created but not overwritten or
  deleted, so nobody can vandalise the board.
- **Shape and size limits.** A JPEG data URL under 400 KB, a name of 24
  characters or less, tagged with the current round, no extra fields.
- **One vote each**, keyed by uid, pointing at a drawing that exists, and
  unchangeable once cast.
- **Board lists are private** to the account that owns them.

Anonymous sign-in identifies a client, it does not vet one — the API key is
public by design. The protections are about *what* someone can do and *when*,
not about proving who they are.

## Retention

Nothing is meant to outlive the evening, and the app deliberately does not
explain that on screen — presenters only need to know they are starting a new
round.

- Starting a round deletes the previous round's drawings and votes, re-reads to
  confirm, and retries once. Only a second failure surfaces a warning.
- Everything is tagged with its round, and a background sweep deletes anything
  older. Reads filter by round too, so stale data cannot appear even if a delete
  failed.
- **Clear everything** wipes drawings, votes and topic. Deleting a board takes
  its contents with it.
- Uploads are downscaled to 800×800 JPEG, roughly 10 KB, before storage.

A drawing therefore lives from submission until the next round starts. **Save my
drawing** and **Download drawings** exist because of that.

## Testing

There is no test runner in the repo. Changes are driven in a real browser with
Playwright against a mock database that enforces the same policy as the shipped
rules, which is how the cross-board and permission checks are verified. The
things worth re-checking by hand after any canvas change:

- Draw, open the keyboard, rotate — the drawing must not distort.
- Zoom in, draw, and confirm the ink lands under the cursor.
- Run a full round on two phones and confirm the board empties afterwards.
