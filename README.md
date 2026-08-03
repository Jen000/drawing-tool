# Draw the Topic

A single-file drawing game for presentation nights. You put a board on the big
screen, guests scan a QR code, draw the topic on their phone, and vote for a
favourite. No app, no login, no build step — `index.html` is the whole thing.

## Running it

Open `index.html?host=1` and follow the one-time setup to connect a free
Firebase Realtime Database. The board is at `?host=1&db=…`; the QR code points
guests at the same page without `host=1`.

## Sharing one deployment (recommended)

By default the database URL and API key travel in the URL, so every host needs
their own Firebase project and the links get very long. Fill in the `BUILT_IN`
block at the top of the script in `index.html` instead:

```js
const BUILT_IN = {
  dbUrl:  'https://yourproject-default-rtdb.firebaseio.com',
  apiKey: 'AIzaSy…'
};
```

Now nobody else needs a Firebase project, an API key or any setup at all — they
open your link, create an account and make a board. Links shrink to:

```
…/index.html?host=1          the host — sign in, pick or make a board
…/index.html?b=4FDY8R        a guest joining that board
```

Both values are public by design: they ship in the source of every Firebase web
app and identify the project without granting access. `firebase-rules.json` is
what protects the data, and it already keeps each presenter's boards separate.

A value in the URL still overrides the built-in one, so anyone who prefers their
own backend can keep using `?db=…&key=…`.

**It is your quota.** Everyone using your copy stores their drawings in your
Firebase project. The free Spark plan allows 1 GB stored and 10 GB/month of
downloads, and drawings are deleted at the end of each round, so ordinary use is
comfortable — but it is your project's allowance they are spending.

### Board codes

Boards get a six-character code like `4FDY8R`, drawn from an alphabet with no
`0/O` or `1/I/L` so it cannot be misread. It appears under the QR code on the
board, and guests who cannot scan can open the bare link and type it in. Codes
are accepted in any case.

## Two security modes

### Test mode (default)

Firebase "test mode" rules let anyone who has the database URL read, write and
delete anything, at any time. Fine for a one-off, but the URL is the only thing
protecting the board — including the day after your event.

### Locked down (recommended, and required for host accounts)

Guests still just scan and draw — nothing changes for them. Behind the scenes
they are signed in anonymously, and the rules only accept their drawings while
your board is actually open. Hosts sign in with an email and password, which is
what lets several presenters share one deployment.

Do these in order. Publishing the rules **last** matters: the moment they are
live, anything without a signed-in host is refused, so a page still running on
the old URL would lock itself out.

**In the Firebase console first**

1. **Build → Authentication → Get started**, and enable **both** sign-in
   providers: **Anonymous** (guests) and **Email/Password** (hosts). Without
   this you cannot create a host account in step 3.
2. **Project settings → General → Your apps**. If there is no app yet, click
   the web icon `</>`, give it any nickname and skip Hosting — until a web app
   is registered there is no Web API key to copy. Firebase then shows a
   `firebaseConfig` snippet; the key is the `apiKey` value, starting with
   `AIza`. (It also appears as **Web API Key** on that page once an app exists,
   and in Google Cloud Console → APIs & Services → Credentials.)

**Then one pass through the app** — steps 3 to 5 are screens it shows you in
sequence, not places to navigate to.

3. Add `&key=AIza…` to your host URL and load it:
   `…/index.html?host=1&db=https://YOURPROJECT-default-rtdb.firebaseio.com&key=AIza…`
   (The **Security & access** panel on an existing board has a field that
   builds this same URL for you — either way is fine.)
4. A **sign-in screen** appears. Choose *Create an account* and pick any email
   and a password of at least six characters. This is the host account; guests
   never see it.
5. A **Your boards** screen appears, empty. Name a board and create it. It
   opens, and the URL now ends with `&b=…`. Bookmark that URL — it is your host
   link, and its QR code is what guests scan.

**Back in Firebase, last**

6. Paste `firebase-rules.json` into **Realtime Database → Rules** and press
   Publish. The rules are the same for everyone; there is nothing to fill in.

A note on the word *board*. Before you lock down there is one shared board and
"your board" just means the host page. Afterwards a board is a named thing you
create and own, identified by `&b=…` in the URL, and you can have several.

## The shared screen

The board page is split in two, so the room never sees your controls.

- **Present to the room** covers your screen with the audience view: topic,
  timer, how to join, the drawings, and the winner at the end. No topic box, no
  phase buttons, no account, no rules. It goes fullscreen; `Esc` or the faint
  corner button brings your controls back.
- **Second screen** opens the same view in its own window at `&screen=1`, for
  when the projector is a second display and you want your controls on the
  laptop. That URL needs no host account, so it also works on a spare tablet.

The join QR and code show only while people can still draw, and the drawings
size themselves to fill whatever screen they land on. **Hide drawings** is
shared through the board, so the projector and your laptop hide and reveal
together.

## Multiple presenters

Each host signs in and gets their own boards. Create one per event, and the QR
code carries that board's id (`&b=…`), so two presenters can run their nights
side by side without ever seeing each other's drawings, topics or rounds.

- **Your boards travel with your account**, not with a browser — sign in on the
  laptop plugged into the projector and your boards are there.
- **Switch board** returns to the picker; **Sign out** clears the account from
  that browser.
- Deleting a board removes its drawings and votes from Firebase.

Hosting is invite-based on purpose: whoever you give the QR code to can join.

### What the rules enforce

- **The session window.** Your board writes `session/openUntil` every few
  minutes while it is on screen. Guests can only read or write while that
  timestamp is in the future, so an old QR code stops working roughly half an
  hour after you close the board — and `Close session` shuts it immediately.
- **Boards are owned.** The first account to claim a board owns it for good, and
  ownership cannot be transferred or stolen. Only the owner can set the topic,
  change phase, open or close the session, or delete anything.
- **Guests add, they never edit.** A drawing can be created but not overwritten
  or deleted, so nobody can vandalise or wipe the board.
- **Shape and size limits.** A drawing must be a JPEG data URL under 400 KB with
  a name of 24 characters or less, tagged with the current round, and no extra
  fields.
- **One vote each.** Votes are keyed by the voter's own uid, must point at a
  drawing that exists, and cannot be changed once cast.
- **Board lists are private.** Only you can read or write the list of boards
  your account owns.

### What this does not do

Anonymous sign-in identifies a client, it does not vet one. The Web API key is
public by design (it ships in every Firebase web app), so someone who has your
QR link could still sign in and add a drawing *while your session is open* —
the same as anyone in the room. That is the intended model: you hand out the QR
code to the people you want drawing.

Board isolation is about ownership and writes, not secrecy. A board id is a
random string that only travels in that board's QR link, but anyone who has an
id can read that board while it is open. Treat the drawings as public to
whoever you gave the link to.

## What happens to the drawings — for whoever runs this

Nothing is meant to outlive the evening, and the app deliberately does not
explain this on screen: presenters only need to know they are starting a new
round. Here is what actually happens underneath.

- **New round deletes.** Starting a round removes every drawing and vote for
  the previous one from the database, then re-reads it to confirm the delete
  took and retries once. Only if that still fails does the host see a warning.
- **A sweep catches leftovers.** Drawings and votes are tagged with their
  round, and anything from an earlier round is deleted in the background. Reads
  also filter by round, so a stale drawing can never appear even if a delete
  failed.
- **Clear everything** removes all drawings, votes and the topic in one go.
- **Deleting a board** takes its drawings and votes with it.
- **Sessions expire.** A board that nobody is presenting stops accepting reads
  and writes about half an hour later, so an abandoned link goes dead.
- Uploads are downscaled to 800×800 JPEG (roughly 10 KB) before being stored,
  and each drawing is fetched once and cached, not re-downloaded on every poll.

So a drawing lives, at most, from the moment it is submitted until the host
starts the next round. If you need something kept, save it: guests get **Save
my drawing** after submitting, and the host can **Download drawings** to get
the whole round as one image.
