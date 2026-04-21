# Real Deal - Phase 1 Build Map

## Purpose

Map the design work to the real app files before implementation starts.

## 1. Shared Shell

### Main files

- [src/App.tsx](/Users/gabrielmurray/dev/realdeal/src/App.tsx)
- [src/components/nav/Sidebar.tsx](/Users/gabrielmurray/dev/realdeal/src/components/nav/Sidebar.tsx)
- [src/index.css](/Users/gabrielmurray/dev/realdeal/src/index.css)

### What changes here

- left rail surface
- active nav state
- shared page opening frame
- page padding and content width rules

## 2. Dashboard

### Main files

- [src/components/dashboard/Dashboard.tsx](/Users/gabrielmurray/dev/realdeal/src/components/dashboard/Dashboard.tsx)
- dashboard widgets under [src/components/dashboard/widgets](/Users/gabrielmurray/dev/realdeal/src/components/dashboard/widgets)

### What changes here

- top strip and thesis merge
- clearer primary vs support areas
- section order and spacing

## 3. Record Detail

### Main files

- [src/components/records/RecordPage.tsx](/Users/gabrielmurray/dev/realdeal/src/components/records/RecordPage.tsx)
- [src/components/records/RecordHeader.tsx](/Users/gabrielmurray/dev/realdeal/src/components/records/RecordHeader.tsx)
- [src/components/records/RecordWidgets.tsx](/Users/gabrielmurray/dev/realdeal/src/components/records/RecordWidgets.tsx)
- [src/components/records/RecordTimeline.tsx](/Users/gabrielmurray/dev/realdeal/src/components/records/RecordTimeline.tsx)

### What changes here

- stronger identity band
- calmer signal treatment
- better grouping in the left column
- more premium timeline shell

## 4. Campaign Detail

### Main files

- [src/components/campaigns/CampaignDetailRoute.tsx](/Users/gabrielmurray/dev/realdeal/src/components/campaigns/CampaignDetailRoute.tsx)
- board and table files under [src/components/campaigns](/Users/gabrielmurray/dev/realdeal/src/components/campaigns)

### What changes here

- unified top frame
- cleaner control grouping
- stronger workspace shell around board and table

## Rule

Do phase 1 in this order:

1. shell
2. dashboard
3. record detail
4. campaign detail
