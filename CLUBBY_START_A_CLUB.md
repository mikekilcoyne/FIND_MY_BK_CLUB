# Clubby — Start a Club

The flow that replaces "here's the Starter Kit PDF."

Read with `CLUBBY_VOICE.md` (how he talks) and `CLUBBY.md` §2 (what exists).
This supersedes the "guided 3-question start-a-club flow ending in Starter Kit
+ drafted invite" described in `CLUBBY.md`.

**Last updated:** 2026-11-18.

---

## The point

> Make it as easy as possible for someone to start their own.

The PDF is not easy. It's a 25 MB download that ends with a person alone in a
document. This flow ends with a **date, a venue, a flyer, a post in the hosts
group and an invite they've already sent** — and Clubby did the typing.

Two rules hold it together:

1. **One question per turn.** Never ask for day, time and venue at once. Each
   answer is a small yes, and small yeses are what carry someone to the end.
2. **No step is a wall.** Every question has a "not sure yet" path that moves
   forward anyway. The one thing that must never happen is someone with real
   intent hitting a dead end because they haven't picked a café.

The Starter Kit doesn't disappear — it becomes the thing you get *afterwards*,
as reference, not the thing you get *instead of* help.

---

## The flow

### 0 · The opening

Arrives from the "no club in your city" moment or a "start a club" intent.

```
No club in <city> yet. Which is the bit where I ask whether you'd start one.
So. Would you?
```
`[ Yeah, go on ]` `[ Tell me what's involved ]` `[ Not me, sorry ]`

- **Tell me what's involved** → the §Rundown below, then back here.
- **Not me** → *"Fair enough. If you change your mind I'll be here, being an
  egg."* Offer the newsletter or a nudge when a club opens nearby. Never push.

---

### 1 · Location

```
Do you have a location in mind?
```
`[ Yes ]` `[ Not yet ]`

**Yes →**
```
Great. What is it?
```
Free text. Capture verbatim as `venue`. Don't make them format an address —
geocode later, or let Ben tidy it.

**Not yet →** this is the most common answer, so it gets real help, not a shrug:
```
That's the normal answer. What works: somewhere that can take six to ten people
at 8:30 on a weekday, with actual tables, and staff who won't mind a group
lingering. A café you already like is usually the right answer.
Got somewhere in mind now, or shall I park it?
```
`[ I've got one ]` `[ Park it for now ]`

Parking is allowed. `venue: null` and carry on — the flow still ends with a
date and a flyer, and Ben can chase the venue in the setup email.

---

### 2 · When

```
When were you thinking?
```
Free text, parsed loosely — "Friday mornings", "first Tuesday", "8:30".

```
And how often do you want to have 'em?
```
`[ Every week ]` `[ Every other week ]` `[ Monthly ]` `[ Pop-up, one for now ]`

**Capture into the shape the roster already uses.** `clubs-map.json` stores
`schedule: { type, ordinal, weekday }`, so collect exactly that and nothing
looser — a free-text "first Tuesday-ish" costs someone a manual fix later:

| Answer | `schedule` |
|---|---|
| Every Friday | `{ type: "weekly", weekday: 5 }` |
| Every other Thursday | `{ type: "fortnightly", weekday: 4 }` |
| First Monday | `{ type: "monthly", ordinal: 1, weekday: 1 }` |
| One-off | `{ type: "popup" }` |

Plus `time` as a plain string (`"8:30 am"`) — the roster keeps it human, and
half the clubs are legitimately "Time TBC".

### 3 · Play it back

```
So: <venue>, <recurrence>, <time>. That's a club. That's the whole thing.
```
`[ That's right ]` `[ Change something ]`

The play-back matters. It's the first moment it stops being an idea.

---

### 4 · Email

```
Cool, cool. I'll send you an email to get the club set up — what's the best
email for that?
```

Validate shape only. On capture, fire the setup email and tell them plainly:
```
Sent. It's from ben@breakfastclubbing.com, so check spam if it's shy.
```

**Backend:** this is a new `submit-new-club` function alongside the existing
`submit-club-update.js`, reusing its SendGrid setup and its pattern — write a
ticket, email it, let a human approve. A new club **must not** write straight
into `clubs-map.json`. Same moderation gate as everything else.

---

### 5 · Flyer

```
Do you have a flyer? If not, I can make you one you can make your own.
```
`[ I've got one ]` `[ Make me one ]`

**The bar — revised 2026-11-19, and lowered on purpose for V1.**

| | What comes out | Canva is |
|---|---|---|
| **V1 (ship this)** | info, text and texture, laid out properly — roughly **80%** of a poster | where it gets **finished**, expected and normal |
| **V1.1** | **90–95%** — postable as-is for most clubs | an escape hatch again, for people who want to fiddle |

The earlier bar was *"oh, that's rad", good enough to post with no edits*, with
Canva as an escape hatch rather than the finishing step. That is the V1.1 goal
now, not the V1 goal. Trying to hit it first time is what keeps this feature
from shipping at all, and a host with a real flyer they finished themselves
beats a host with no flyer.

**What this changes in practice:** Clubby must be straight about the hand-off
rather than presenting the output as done. Something like *"here's the bones of
it — the details are right, the look is yours. Open it in Canva and make it
yours."* Honest framing is the difference between a useful 80% and a
disappointing one; promise "rad" and deliver 80% and it reads as broken.

**What V1 must still get right**, because these are the parts a host cannot
easily fix in Canva and the parts that are actually wrong on a bad flyer:

- the city, venue, day, time and cadence, correct and legible
- *"Everyone's invited, especially you."* on every poster — non-negotiable
- a stock texture that suits the locale (§Q1), since that is the thing that
  makes it look like Breakfast Club rather than a generic template

Getting those three right at 80% is worth more than a prettier 80% that has the
wrong Thursday on it.

Three questions, one per turn, same as everywhere else.

#### Q1 · Stock

```
What's it printed on?
```
`[ Paper ]` `[ Fabric ]` `[ Sandstone ]`

Clubby **suggests by locale** rather than offering a flat menu — a beach club
on sandstone and a Milano club on fabric each look like where they came from:

| Stock | Feels like | Suggest for |
|---|---|---|
| **Paper** | creased, printed, pinned up | the default; anywhere urban — NY, London, Berlin, Chicago |
| **Fabric** | woven, warm, interior | café cities — Paris, Milano, Vienna, Lugano, Copenhagen |
| **Sandstone** | sun-bleached, grainy | coastal — Torquay, Perth, Biarritz, Ibiza, Honolulu, Sydney, Newcastle |

```
<City>'s a beach town, so I've put it on sandstone. Want paper instead?
```

Paper is the house default because the wall already says so — the Barcelona
flyer is printed on visibly creased paper and it's the best thing in the
gallery. All three are procedural CSS (`zany-kit.css` §13), so there are no
image assets to ship or colour-manage.

#### Q2 · Vibe

```
What's the vibe?
```
`[ Simple ]` `[ Cinematic ]` `[ Handcrafted ]`

Named for the feeling, not the technique — a non-designer can answer this,
where "photo-led vs type-led" makes them guess. Each one already exists on the
wall, so nothing new is being invented:

| Vibe | What it is | On the wall |
|---|---|---|
| **Simple** | big type, one flat colour, nothing else | Copenhagen, Denver |
| **Cinematic** | full-bleed photo, type sitting over it | Paris, Milano |
| **Handcrafted** | marker, line art, scrappy and warm | Houston, Barcelona |

**Cinematic needs an actual photograph** — a pastry, a cup, the room. Point it
at another poster and the two sets of type fight. Offer the club's own photo
first, then a small house set.

#### Q3 · Anything personal

```
Want to put something of your own on it? A drawing, a photo, anything.
```
`[ A photo ]` `[ A drawing ]` `[ Keep it clean ]`

**The rule that keeps this safe:** a personal element goes on **taped to** the
flyer, never composited into it. A snapshot dropped into a layout wrecks it; the
same snapshot as a polaroid at a slight angle with a strip of tape reads as
charming, whatever the photo is. That's `.bc-snap` and `.bc-tape` in
`zany-kit.css` §14, and an uploaded drawing runs through `.bc-doodle-in`, which
knocks it back to ink so any scribble lands in palette.

This is the step that makes it *theirs*, so offer it — but "keep it clean" is a
real answer and the output must be good without it.

#### Output

```
There you go. <City>, <recurrence>, <venue>.
```
`[ Download ]` `[ Tweak it in Canva ]` `[ Try another vibe ]`

**Canva hand-off.** One shared Canva template per vibe — three in all, brand
set up, their details already filled in. They hit "Use template", get their own
copy, and edit nothing they don't want to.

Worth knowing before this is scoped: you **cannot** pre-fill an arbitrary Canva
design through a plain URL. Either (a) three shared templates they duplicate and
retype into, which works today with no integration, or (b) the Canva Connect
API, which creates the design programmatically with their details in place but
needs a registered app and OAuth. Start with (a). Only build (b) if hosts
actually use the escape hatch — if the generated flyer is landing, most won't.

### 6 · The hosts group

```
Alright — ready to post it in the WhatsApp group?
```
`[ Yes ]` `[ Later ]`

Send the invite link. Be straight about what happens next:
```
Here's the link. Ben approves the request, so it might be a few hours, not
seconds. He's one man and several time zones.
```

**Note:** `WHATSAPP_GROUP_URL` in `clubby.html` is still an empty const
(`CLUBBY.md` flags this) — paste the link from the BC Master doc before this
step ships, or Clubby offers a button that goes nowhere.

---

### 7 · Share it

```
Cool! Now share it with some folks.
```

Hand them a drafted message they can paste into WhatsApp, Signal or a DM.
Draft it — never say "tell your friends" and leave them staring at a blank box:

```
I'm starting a Breakfast Club in <city>. First one's <date> at <venue>,
<time>. No agenda, no pitch, just breakfast and good conversation.
Come, and bring someone if you like.
```

`[ Copy ]` `[ Write me a different one ]`

Three invitations from the host is the single best predictor of a first
breakfast that isn't just the host. Say that, once, lightly:
```
Three people is plenty to aim for. Clubs that start with three keep going.
```

---

### 8 · The rundown

Last beat. Set expectations so a quiet first one doesn't read as failure:

```
Here's how it tends to go.

The first one is usually small. Three or four people is a normal, good first
breakfast — most of the clubs on the map started exactly there.

You don't host, really. You turn up, you get a table, you put the flyer where
people can see it. There's no agenda and nobody presents anything.

Say hello to whoever comes, including the person who turns up alone and looks
unsure. That's the whole job, and it's the reason the thing works.

Then you do it again next <recurrence>. That's it. That's the format.
```

```
I'll nudge you the week before. Good luck — genuinely, I'm pleased about this.
```

The sign-off is the one place he's allowed to be straightforwardly warm with no
wobble. He's been awkward for eight steps; landing it sincerely is the payoff.

---

## What gets captured

```json
{
  "city": "Houston, TX",
  "venue": "Agora, 1712 Westheimer Rd",
  "schedule": { "type": "monthly", "ordinal": 3, "weekday": 2 },
  "time": "8:30 am",
  "host": { "name": "…", "email": "…" },
  "flyerStyle": "handwritten",
  "rsvpURL": null,
  "status": "pending",
  "source": "clubby",
  "createdAt": "2026-11-18T…"
}
```

`status: "pending"` until Ben approves. Mirrors the field names in
`clubs-map.json` so approval is a move, not a translation.

---

## Open threads

- **Partial completion.** Someone who quits at step 4 has still given a city
  and a date. Capture it as a lead rather than dropping it; the existing
  `log-clubby-miss` Blobs store is the obvious home.
- **Flyer generation** is the one step needing real work (image generation or a
  template renderer). Until it exists, step 5 can hand over three editable
  templates and still be a long way ahead of the PDF.
- **"I'll nudge you the week before"** is a promise. Either wire it to the
  existing `weekly-host-reminder.js` cron or cut the line — Clubby must not
  promise mail that never arrives.
