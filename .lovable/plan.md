

## Plan: Social Proof + App Preview for Landing Page

### 1. App preview mockup in hero section

Replace the decorative orbs with a faux browser-window mockup containing an SVG illustration of the app's dashboard/orb map. The mockup will have:
- macOS-style window chrome (traffic light dots, title bar)
- An SVG rendering of the orb map view - hub orb in center, pod orbs around it with connecting lines and health rings
- Subtle drop shadow and rounded corners
- Sits below the CTA buttons where the orbs currently are

### 2. Social proof / testimonials section

Insert between Features and How It Works. Two parts:

**a) "Trusted by" logo bar** - A horizontal row of names/logos referencing Kinship Ventures:
- "As used by Moj Mahdara, Gwyneth Paltrow, and Trina Spear at Kinship Ventures"
- Link to kinshipventures.co

**b) Testimonial cards** - 2-3 quote cards with:
- Moj Mahdara, Co-Founder & Managing Partner, Kinship Ventures: quote about relationship management and staying connected across 150+ cap tables
- Gwyneth Paltrow: quote about the power of nurturing your network
- Trina Spear: quote about high-agency relationship building

Cards styled with `--surface-panel` background, serif quote text, small avatar placeholder circles with initials.

### 3. Files to modify

- `src/components/landing/LandingPage.tsx` - all changes in this single file:
  - Replace decorative orbs div (lines 138-158) with SVG app preview mockup
  - Add `TESTIMONIALS` array constant
  - Add social proof section between Features and How It Works sections

### Technical details

- SVG mockup: inline SVG with browser chrome (rect for title bar, three colored circles for traffic lights), then simplified orb map illustration (circles + lines mimicking the real app)
- Testimonial quotes will be hardcoded strings - these are real people from kinshipventures.co
- No new dependencies or files needed

