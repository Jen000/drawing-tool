# Trial access

Letting people run games on your database without setting up their own, without
handing them your whole allowance.

## The three tiers

| Tier | Who | What they get |
|---|---|---|
| **Unlimited** | accounts listed under `/hosts` | everything, no limits |
| **Trial** | anyone who claims a week code | 1 week, 6 boards, 90 drawings |
| **Own backend** | anyone | unlimited, on their own Firebase, via `?db=&key=` |

## Decisions taken

- **90 drawings is per account for the week**, not per board, so a quiet night
  leaves more for a busy one.
- **A guest may submit one drawing per round.** This is already live and applies
  to every game, not just trials. It also closes the hole that made a
  per-account cap risky: without it, one guest could have spent another host's
  entire allowance.
- **At expiry, everything stops.** Boards owned by a lapsed account refuse reads
  and writes. Accepted knowing a week can lapse mid-event — the app should warn
  the host as the date approaches so it is never a surprise.
- **Codes are minted by hand**, using `tools/mint-codes.mjs`, which prints JSON
  to paste into the console. The number in circulation is however many are
  unclaimed, so minting a handful is how supply is controlled.

## Data

```
codes/<CODE>    { mintedAt, note?, claimedBy?, claimedAt? }
grants/<uid>    { code, expiresAt, boardsUsed, boardsMax, imagesUsed, imagesMax }
hosts/<uid>     true
```

## How the limits get enforced without a server

Rules cannot count children, so counters live in the data and every write that
consumes quota must increment its counter **in the same atomic update**. A
multi-path write is evaluated per path, and `newData.parent()` walks the *new*
root, so a rule on the board can require that the counter moved:

```
boards/$b/owner .write:
  unlimited(auth.uid)
  || ( grantValid(auth.uid)
       && newData.parent().parent().parent()
            .child('grants').child(auth.uid).child('boardsUsed').val()
          === root.child('grants').child(auth.uid).child('boardsUsed').val() + 1 )
```

The counters themselves accept **only** `data.val() + 1`, so nobody can reset
one — including its owner. The grant is created once, when a code is claimed,
and the rules validate its *values* (`expiresAt <= now + 7 days`,
`boardsMax <= 6`, `imagesMax <= 90`) rather than trusting what the client sends.

Claiming is blind: `codes/$code` is not readable, and the write succeeds only if
the code exists and is unclaimed. A wrong code and a used code fail
identically, so the pool cannot be enumerated.

## Known limits of the approach

- **A second signup gets a second trial**, if a code is free. Email signup is
  open, so the code pool is the real limiter.
- **The remaining code count cannot be shown in the app** without making the
  pool readable, which would let anyone claim them all.
- **Trial hosts share your Firebase allowance.** Six boards and ninety drawings
  is roughly 1 MB stored and a few MB transferred, so the free tier absorbs a
  lot of trials — but it is your quota they spend.

## Running it

Mint codes with `node tools/mint-codes.mjs 10`, and paste the JSON into
**Realtime Database → Data → /codes → Import JSON**. How many are unclaimed is
how many trials are available; when they run out, nobody new can start one until
you mint again.

To give somebody unlimited access instead, add their account ID under `/hosts`.
They can find it on the screen they are shown when hosting is refused.

A claimed code shows who took it and when, so you can see where they went.

## Warnings

A host is told when their week is nearly up, when drawings are running low, and
when boards are running out — on the board and in the board list, so a week
never lapses mid-event without notice. Running out of boards says so plainly
rather than failing silently.

## Bringing your own

**Settings**, from the board list or `?settings=1`, takes a database URL and API
key and stores them on that device. From then on the app talks to that project
instead, so no code, allowance or limit applies. Reverting is one button.
