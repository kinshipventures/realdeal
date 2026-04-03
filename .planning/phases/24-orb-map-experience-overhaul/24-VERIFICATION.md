---
phase: 24-orb-map-experience-overhaul
verified: 2026-04-02T00:00:00Z
status: gaps_found
score: 7/9 must-haves verified
re_verification: false
gaps:
  - truth: "Hub-to-pod edges are visible on the map, with thickness and opacity reflecting pod health"
    status: failed
    reason: "buildHomeEdges() at OrbMap.tsx:206-208 still returns []. GradientEdge component is fully implemented with health encoding but is never instantiated - no edges reach the canvas."
    artifacts:
      - path: "src/components/map/OrbMap.tsx"
        issue: "buildHomeEdges(_pods, _equityByPod) { return [] } - parameters prefixed with _ and unused, function body unchanged from pre-phase state"
    missing:
      - "buildHomeEdges must build spoke edges from MOJ_ID to each pod.id using equityByPod[pod.id] as healthPercent"
      - "Return pods.map(pod => ({ id: 'moj-${pod.id}', type: 'gradient', source: MOJ_ID, target: pod.id, data: { color: 'rgba(255,255,255,0.9)', healthPercent: equityByPod[pod.id] ?? 0 } }))"
  - truth: "MRM hub orb displays overall network health score and total contact count"
    status: partial
    reason: "Hub orb renders userName/RealDeal as the primary text instead of the health score prominently. Health score and label appear as secondary text at 10px in muted white (rgba 0.50). The plan specified health score large in Fraunces at ~28px as the primary display element. Current render prioritizes name over health."
    artifacts:
      - path: "src/components/map/MojNode.tsx"
        issue: "Hub mode renders userName || 'RealDeal' at 14px/700 weight as primary display, with health score as small secondary text. Plan spec was health score large (28px) as primary with scoreLabel beneath it."
    missing:
      - "Redesign hub mode rendering to show health score prominently (large Fraunces number) with scoreLabel beneath and contact count as tertiary. Name/userName is not part of the original plan spec."
human_verification:
  - test: "Edge thickness variation on hub view"
    expected: "Spoke lines from hub to each pod orb, visually thicker for healthy pods and thinner for fading ones"
    why_human: "Cannot verify visual rendering of CSS stroke widths from static analysis - requires browser render"
  - test: "Drill-in animation smoothness and timing"
    expected: "Clicking a pod triggers smooth ~400-600ms zoom-in with categories appearing in orbital positions"
    why_human: "Animation timing and easing quality requires live observation"
  - test: "Cmd+K search highlight pulse"
    expected: "Selecting a contact from search pulses matching pod orbs 3 times with brightness glow, auto-clears in 2.5s"
    why_human: "Animation behavior requires live browser interaction to verify"
---

# Phase 24: Orb Map Experience Overhaul Verification Report

**Phase Goal:** Transform the orb map from a static pod picker into a full network exploration tool with in-canvas navigation, visual health indicators, map-native interactions, and animated state transitions.
**Verified:** 2026-04-02
**Status:** gaps_found
**Re-verification:** No - initial verification

## Goal Achievement

### Observable Truths

| # | Truth | Status | Evidence |
|---|-------|--------|---------|
| 1 | Hub-to-pod edges visible with health-encoded thickness/opacity | FAILED | `buildHomeEdges` returns `[]` at OrbMap.tsx:207 - GradientEdge implemented but never emitted |
| 2 | MRM hub orb displays health score and contact count | PARTIAL | Health data present but userName rendered as primary (14px bold) with health as secondary (10px muted) |
| 3 | Pod hover tooltip shows health/count/overdue/last interaction | VERIFIED | hoveredPod state, tooltip JSX with all 4 data rows, lastInteractedByPodRef computed in init |
| 4 | Clicking pod zooms in with categories orbiting | VERIFIED | drillIntoPod, buildDrillNodes, setNodes/setEdges([]), fitView all present and wired |
| 5 | Breadcrumb "Hub > Pod Name" with back arrow | VERIFIED | mapView === 'pod' conditional at OrbMap.tsx:747, drillBackToHub wired to button onClick |
| 6 | Drill-in/out are smooth animated sequences | VERIFIED | isAnimating ref guards, setTimeout sequences, fitView({ duration: 250 }) in both directions |
| 7 | Category orbs navigate to PodDetailPage on click | VERIFIED | buildDrillNodes sets onClick: () => navigateFn('/pod/${pod.id}') for each category node |
| 8 | Center orb in drill-down shows pod name/color, not clickable | VERIFIED | MojNode podName/podColor fields render in isDrillDown mode, cursor: 'default' |
| 9 | Cmd+K search highlights matching pod orbs with pulse animation | VERIFIED | window event bridge in App.tsx:269, listener in OrbMap, activeHighlights -> highlighted prop -> orb-highlight-pulse class |

**Score:** 7/9 truths verified (2 failed/partial)

---

## Required Artifacts

| Artifact | Expected | Status | Details |
|----------|----------|--------|---------|
| `src/components/map/GradientEdge.tsx` | Health-encoded edge with dynamic strokeWidth and opacity | VERIFIED | getStraightPath, healthPercent in GradientEdgeData, strokeWidth = 1.5 + (health/100)*3.5, stopOpacity computed |
| `src/components/map/MojNode.tsx` | Network stats display in hub orb | PARTIAL | overallHealth/totalContacts/podName/podColor all in type; hub render de-prioritizes health score visually |
| `src/components/map/OrbMap.tsx` | Edge building, tooltip state, hub data passing, drill-down state machine | PARTIAL | All drill/tooltip/highlight features wired; buildHomeEdges body never emits edges |
| `src/components/map/ListNode.tsx` | onDrillIn, onHoverEnter/Leave, highlighted, fading props | VERIFIED | All props in ListNodeData, all wired in JSX |
| `src/components/map/CategoryNode.tsx` | fading prop for drill-out animation | VERIFIED | fading prop in CategoryNodeData, orb-fading class applied |
| `src/index.css` | .orb-fading, .orbit-start-skip, .orb-highlight-pulse | VERIFIED | All three classes present with correct keyframes |
| `src/App.tsx` | map:highlight-pods custom event dispatch on map route | VERIFIED | window.dispatchEvent with contact.list_ids when isMap at App.tsx:269 |

---

## Key Link Verification

| From | To | Via | Status | Details |
|------|----|-----|--------|---------|
| OrbMap.tsx | GradientEdge.tsx | buildHomeEdges returns edges with healthPercent in data | FAILED | buildHomeEdges returns [] - edge type 'gradient' is registered but no edges are created |
| OrbMap.tsx | MojNode.tsx | mojNode data includes overallHealth and totalContacts | VERIFIED | OrbMap.tsx:164 passes overallHealth, totalContacts, userName to mojNode.data |
| ListNode.tsx | OrbMap.tsx | onDrillIn callback in node data | VERIFIED | buildHomeNodes passes onDrillIn, ListNode prefers it over navigate |
| OrbMap.tsx | CategoryNode.tsx | buildDrillNodes creates category nodes with onClick -> navigate('/pod/${pod.id}') | VERIFIED | OrbMap.tsx:246 sets onClick: () => navigateFn('/pod/${pod.id}') |
| App.tsx | OrbMap.tsx | map:highlight-pods custom event | VERIFIED | App.tsx dispatches, OrbMap.tsx listens with window.addEventListener |
| SearchPalette | App.tsx | onSelectContact callback with contact.list_ids | VERIFIED | App.tsx:266-273, conditional on isMap before dispatching vs navigating |

---

## Requirements Coverage

MAP-01 through MAP-09 are phase-internal IDs not present in REQUIREMENTS.md. They serve as internal milestone markers for this phase only.

| Requirement | Source Plan | Status | Evidence |
|-------------|------------|--------|---------|
| MAP-01 (navigation depth) | 24-02 | VERIFIED | Two-level hub > pod > PodDetailPage drill-down implemented |
| MAP-02 (health-encoded edges) | 24-01 | FAILED | buildHomeEdges returns [] - no edges emitted |
| MAP-03 (contact presence) | 24-03 | DEFERRED | Explicitly deferred per CONTEXT.md D-13, documented in 24-03-SUMMARY |
| MAP-04 (health glanceability) | 24-01 | FAILED | Edge-based glanceability not working (edges not emitted); health ring on orbs still works |
| MAP-05 (hub interactivity) | 24-01 | PARTIAL | Hub shows health data but userName dominates visually over health score |
| MAP-06 (search/filter bridge) | 24-03 | VERIFIED | Cmd+K -> map:highlight-pods event -> pulse animation |
| MAP-07 (state transitions) | 24-02 | VERIFIED | drillIntoPod/drillBackToHub with isAnimating guard and fitView animations |
| MAP-08 (map interactions) | 24-01 | VERIFIED | Hover tooltip with all required data fields |
| MAP-09 (mobile) | 24-03 | NO WORK NEEDED | React Flow touch events handle basic tap per D-18, documented in 24-03-SUMMARY |

---

## Anti-Patterns Found

| File | Line | Pattern | Severity | Impact |
|------|------|---------|----------|--------|
| `src/components/map/OrbMap.tsx` | 206-208 | `buildHomeEdges(_pods, _equityByPod): Edge[] { return [] }` | BLOCKER | Parameters accepted but prefixed _ and unused. Function was never updated from pre-phase stub. GradientEdge component fully implemented but unreachable. Blocks MAP-02 and MAP-04. |

---

## Human Verification Required

### 1. Edge Visibility (after gap fix)

**Test:** Load the map in the browser after buildHomeEdges is fixed.
**Expected:** Spoke lines connect the hub orb to each pod orb. Lines are visibly thicker for high-health pods and thinner/more transparent for low-health pods.
**Why human:** Visual stroke width difference requires browser render to confirm.

### 2. Drill-in Animation Quality

**Test:** Click any pod orb on the hub view.
**Expected:** Smooth ~400-600ms transition - other pods fade, selected pod becomes center, categories orbit outward.
**Why human:** Animation timing, easing feel, and spatial continuity require live observation.

### 3. Search Highlight Pulse

**Test:** Press Cmd+K on the map route, search for a contact, select one with list_ids.
**Expected:** Matching pod orbs pulse with brightness/glow 3 times over ~2.25s then return to normal.
**Why human:** CSS animation behavior requires live browser interaction.

---

## Gaps Summary

Two gaps block full goal achievement:

**Gap 1 (Blocker) - Health-encoded edges never emitted:**
`buildHomeEdges` at OrbMap.tsx:206 was refactored to accept `(pods, equityByPod)` parameters but the body was never updated - it still returns `[]`. The GradientEdge component is complete with health encoding (strokeWidth, stopOpacity computed from healthPercent), registered in edgeTypes, but zero edges reach the canvas. Every call site passes the correct data. The fix is a 5-line body replacement in buildHomeEdges. This blocks MAP-02 and MAP-04 entirely.

**Gap 2 (Partial) - Hub orb health display de-prioritized:**
The plan specified health score prominently displayed in large Fraunces serif (~28px) as the primary visual element of the hub orb. The implementation instead renders `userName || 'RealDeal'` as the 14px bold primary element, with health score as small secondary text at 10px/rgba(0.50). Health data is present and wired correctly but visually subordinated. MAP-05 is partially satisfied - the data is there, but glanceability at hub level is reduced.

Gap 1 is the critical regression. Gap 2 is a design fidelity issue.

---

_Verified: 2026-04-02_
_Verifier: Claude (gsd-verifier)_
