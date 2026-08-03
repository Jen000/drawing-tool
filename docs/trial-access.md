# Trial access — agreed design

Notes for building the week-code tier. Nothing here is implemented yet except
the unlimited tier and the one-entry-per-round rule, both of which are live.

## The three tiers

| Tier | Who | What they get |
|---|---|---|
| **Unlimited** | accounts listed under `/hosts` | everything, no limits — *built* |
| **Trial** | anyone who claims a week code | 1 week, 6 boards, 90 drawings — *to build* |
| **Own backend** | anyone | unlimited, on their own Firebase — *works today via `?db=&key=`, wants a settings screen* |

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

## Still to build

1. Rules for `codes` and `grants`, and the expiry gate on `boards`.
2. Claiming a code during sign-up, and again to start a new week.
3. A quota panel: days left, boards left, drawings left, with a warning as the
   week runs down.
4. A settings screen for pasting your own Firebase details, replacing the
   current `?db=&key=` URL parameters.
5. Docs for both audiences.
