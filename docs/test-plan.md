# Test plan

Things worth checking by hand before an event. Everything here has automated
coverage against a mock database, so this is about the two gaps that testing
cannot close: **real devices** and **real Firebase**.

Work top-down. The first section is the one that matters most; if you only have
twenty minutes, do that and section 2.

---

## 1. The things I could not verify at all

These have never run against real hardware or Google's real rules engine.

### 1.1 The iPhone squash — the original bug

On a real iPhone, in Safari:

- [ ] Draw something detailed, then **tap the name field** so the keyboard opens.
      Dismiss it. The drawing must be unchanged — not squashed, stretched or
      shifted.
- [ ] Draw, then **scroll slightly** so the URL bar collapses. Unchanged.
- [ ] Draw, **rotate to landscape**, rotate back. Unchanged.
- [ ] Submit and check the board: the drawing is square and not distorted.

Repeat on the specific phone that showed the bug originally, if you can.

### 1.2 The database rules

In Firebase → Realtime Database → **Rules → Rules Playground**. Each of these
must be **denied**:

- [ ] Unauthenticated read of `/boards`.
- [ ] Authenticated read of `/grants/SOMEONE-ELSE`.
- [ ] Write to `/boards/<code>/owner` for a board that already has an owner.
- [ ] Write a drawing to a board whose session has closed.
- [ ] Write `/boards/<code>/board/<someone-else's-uid>` — the key must be your
      own uid.

And with the trial tier in use, these must also be **denied**:

- [ ] Creating a board **without** `grants/<uid>/boardsUsed` moving up by one in
      the same write.
- [ ] Moving `boardsUsed` up by **two**.
- [ ] Lowering `boardsUsed` or `imagesUsed`.
- [ ] Writing a drawing when the owner's `expiresAt` is in the past.
- [ ] Creating a `grant` with `expiresAt` more than a week out, `boardsMax` 7, or
      `imagesMax` 100.

> If any of these is *allowed*, stop and tell me the rule. This is the one part
> of the system I cannot test properly from here.

### 1.3 The projector

- [ ] Present mode: the join code is readable from the back of the room.
- [ ] A full board of drawings at your projector's resolution — nothing cut off.
- [ ] Nothing host-only is visible: no topic box, no buttons, no email address.

---

## 2. A full game

Two phones and a laptop. This is the run-through that catches most things.

- [ ] Sign in, create a board, note the code.
- [ ] **Present to the room.** QR and code appear.
- [ ] Phone A scans the QR → lands on a blank canvas.
- [ ] Phone B types the code by hand (try lowercase) → same.
- [ ] Set a topic; it reaches both phones within a few seconds.
- [ ] Change the topic mid-round — neither phone loses its drawing.
- [ ] Start a 2-minute timer. All three screens count down **together, one
      second at a time**.
- [ ] **Pause.** All three freeze. **Resume.** All three continue from the same
      number. **Clear.** It disappears everywhere.
- [ ] Both phones submit. Both appear on the board.
- [ ] Phone A tries to submit a second drawing — refused, one each per round.
- [ ] Let a timer run to zero — voting opens by itself.
- [ ] Both phones vote. Counts appear on the big screen.
- [ ] Phone A tries to change its vote — refused.
- [ ] **Show results.** Winner crowned on phones and the big screen.
- [ ] **New round.** Both phones get a blank canvas; the board is empty.
- [ ] Check Firebase: the previous round's drawings and votes are **gone**.

---

## 3. Drawing tools

On a phone:

- [ ] Pen draws; colours change; the three most recent appear above the palette.
- [ ] Eraser removes; brush sizes differ visibly.
- [ ] Shapes: line, rect, circle, triangle, star. Fill toggles for closed shapes.
- [ ] **Pinch to zoom in.** Draw. The ink lands under your finger, not offset.
- [ ] **Two-finger drag** pans while zoomed.
- [ ] **✋ Move** pans with one finger.
- [ ] The ⤢ button returns to the whole canvas.
- [ ] Clear asks first, then empties the canvas.
- [ ] **Landscape**: controls move to the side, canvas stays big and square.
- [ ] **Save my drawing** after submitting downloads a picture.

---

## 4. Hosting and access

- [ ] **Download drawings** gives one image of the round with names, and no page
      furniture.
- [ ] **Hide drawings** blurs the board — including on a second screen.
- [ ] **Second screen** opens a window with no controls in it.
- [ ] **Close session**: a guest's page goes to "This session is closed".
- [ ] Reopening the board lets them back in.
- [ ] **Switch board** lists your boards with their codes.
- [ ] **Copy host link** puts the right board URL on the clipboard.
- [ ] Sign out, sign back in on a **different browser** — your boards are there.
- [ ] The bare address offers both "Joining a game?" and "Running the game?"
- [ ] **Help** opens from the landing page, the board list and the board.

---

## 5. Access control

Only if you have turned on `/hosts` or minted codes.

- [ ] An account not on the list is refused, and shown its own ID with a copy
      button.
- [ ] Adding that ID under `/hosts` and pressing **Try again** lets them in.
- [ ] A trial code works once; the same code fails for a second person.
- [ ] A wrong code and a used code give the *same* message.
- [ ] Six boards can be created; the seventh is refused with an explanation.
- [ ] The warning appears as drawings run low and as the week nears its end.
- [ ] Set `expiresAt` to the past in the console: guests are shut out and the
      host sees "Your week is up".
- [ ] A second code starts a fresh week with counters reset.

---

## 6. Your own database

- [ ] **Settings** shows which backend is in use, and whether it is yours.
- [ ] Pasting a bad URL is rejected with a clear reason.
- [ ] Saving a real one signs you out and takes you to that project's sign-in.
- [ ] A board created there appears in **your** Firebase, not the shared one.
- [ ] No limits or codes apply on your own backend.
- [ ] "Go back to the shared one" reverts cleanly.

---

## 7. Awkward conditions

- [ ] **Aeroplane mode mid-drawing**, then back on: the drawing is still there
      and submits.
- [ ] Reload mid-round: you are back on a blank canvas, nothing else breaks.
- [ ] Two guests submit at the same instant — both land.
- [ ] Ten-plus guests on one board: the board keeps up and stays readable.
- [ ] Leave a board open for half an hour without touching it, then draw — the
      session should still be open.
- [ ] Open yesterday's link after the session lapsed: "This session is closed",
      and it recovers on its own once you reopen the board.

---

## What is already covered automatically

For context, so you know where not to spend your time. All of this runs against
a mock database that enforces the same rules as the real one:

canvas invariants under viewport changes · eraser · zoom accuracy at 200% ·
pan clamping · square canvas from 360×560 to 1280×900 · landscape layout ·
recent colours · timer ticking, pausing and clearing across three screens ·
topic editing without clobbering · round cleanup and the stale sweep ·
cross-board isolation · ownership claims · one entry per person per round ·
the six-board and ninety-drawing ceilings · expiry · code claiming ·
presentation mode hiding host controls · the second screen · bandwidth ·
zero-setup deployment · settings and backend switching.
