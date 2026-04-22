# Email Templates

Canonical copy for Real Deal transactional email. Wire these into the auth/edge-function flow - do not rewrite them on the fly.

Tokens:
- `{{name}}` - recipient first name (fall back to "there" if null)
- `{{invite_url}}` - signed invite URL, 48h expiry

---

## 1. Waitlist Confirmation

Sent immediately after someone joins the waitlist via `/waitlist`.

**Subject:** You're on the list.

```
Hey {{name}} -

You're on the Real Deal waitlist.

We built this because we believe the most important health metric nobody's tracking is who you spend your time with. We're taking that seriously - which means we're not rushing it.

When your spot opens, you'll be the first to know.

Until then - who's one person you haven't talked to in too long?

Go reach out. That's literally the whole point.

- The Real Deal team
```

---

## 2. Invite / Off Waitlist

Sent when an operator moves someone off the waitlist and generates an invite link.

**Subject:** Your prescription is ready.

```
{{name}} -

Your spot in Real Deal is open.

You've been waiting. We've been building.

Come see what we made.

[Claim your spot -> {{invite_url}}]

This link is yours. It expires in 48 hours.

Real ones don't wait forever - but we gave you a little grace.
```

---

## 3. Bespoke Invite (Gwyneth)

Hand-sent, one-off. Do not templatize or reuse for others without explicit approval.

**Subject:** I built something I want you to try.

```
Gwyneth -

You've spent twenty years telling people that what you put in your body matters. That your environment matters. That the invisible things - the ones nobody's measuring - are often the ones that determine everything.

Real Deal is built on that same instinct.

But for your relationships.

I want you to be one of the first people inside it.

[You're already in. Come see it. -> {{invite_url}}]
```

---

## Manifesto (reference)

The voice these emails should sound like. Not an email itself - but if you're unsure whether a line fits, check it against this.

> We got obsessed with food as medicine. Sleep as medicine. Movement as medicine.
>
> And then we completely forgot what feeds us.
>
> Your people are medicine. The right ones lower your blood pressure. The wrong ones raise it.
>
> Real Deal isn't a network. It's a prescription.
>
> Curated for your nervous system. Built for your life.
