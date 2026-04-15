# RealDeal Entities

## Core entities

- **Pod**
  - A top-level relationship group.
  - Example: Investors, Advisors, Friends.
  - In Airtable, this is still stored as a "List".
  - Pods drive cadence, priority, color, and health scoring.

- **Category**
  - A subgroup inside a pod.
  - Helps break a pod into smaller buckets.
  - Example: a pod called "Investors" might have categories like "Warm" or "Active".

- **Contact**
  - A person relationship in the app.
  - Stores who they are, how you know them, where they belong, and what needs follow-up.
  - Contacts can belong to one or more pods and categories.

- **Company**
  - A company record connected to people.
  - Used when a relationship is tied to an organization, not just an individual.

- **Interaction**
  - A logged touchpoint with a contact.
  - Examples: call, email, text, meeting, intro, or note.
  - Interactions are what power relationship history and equity scoring.

- **System Event**
  - An app-generated timeline item instead of a human interaction.
  - Examples: pod change, field update, merge event, or categorization change.

- **Campaign**
  - A focused effort involving a group of contacts.
  - Examples: event outreach, fundraising, deal flow, talent search, or partnerships.
  - A campaign has a name, type, deadline, status, and connected contacts.

- **Campaign Stage**
  - A step inside a campaign flow.
  - Used to show where someone is in the process.
  - Example: pending, reached, responded, confirmed.

- **Campaign Contact**
  - The connection between one contact and one campaign.
  - Stores that person's stage, notes, owner, next step, and priority inside the campaign.

- **Project**
  - A broader initiative that can connect multiple relationships together.
  - Used for work that is more project-shaped than campaign-shaped.

- **Share Link**
  - A private link for sharing a pod externally.
  - Can hide certain contacts, limit visible columns, expire automatically, and require a PIN.

## App surfaces

- **Dashboard**
  - The daily home screen.
  - Shows overall relationship health, pod health, today's focus, upcoming moments, recent activity, and campaign progress.

- **Pods View**
  - The visual map of the network.
  - Lets you move from the center hub into pods and then into categories.

- **Pod Detail**
  - The deeper view for one pod.
  - Shows the pod's people, health, categories, settings, and quick actions.

- **People**
  - The list view for contacts.
  - Used for browsing, filtering, sorting, editing, and bulk actions.

- **Companies**
  - The company-side version of the People area.
  - Used for browsing organization records tied to relationships.

- **Contact Detail**
  - The full profile for one relationship.
  - Shows personal context, notes, timeline, follow-ups, and campaign ties.

- **Category Table**
  - The table view for one category.
  - Useful when you want to work through one slice of a pod in a structured list.

- **Campaigns**
  - The main campaign hub.
  - Shows all active and completed campaigns in grid or list form.

- **Campaign Detail**
  - The working view for one campaign.
  - Used to manage participants, stages, notes, activity, and progress.

- **Nurturing Hub**
  - The follow-up command center.
  - Pulls together today's focus, overdue relationships, stale connections, and upcoming key dates.

- **Search Palette**
  - Global search opened with Cmd+K.
  - Lets you jump quickly to people, companies, pods, and campaign actions.

- **Import Panel**
  - The intake flow for bringing new data into the app.
  - Used for CSV or paste-based imports.

- **Categorization Queue**
  - A review area for contacts that still need to be sorted into the right pod or category.

## Scoring and support concepts

- **Equity Score**
  - The app's relationship health score.
  - Based on interaction type, recency, and the rhythm expected for that relationship.

- **Today's Focus**
  - A short, prioritized list of people the app thinks deserve attention now.

- **Overdue**
  - A relationship that has gone past its expected touchpoint rhythm.

- **Dormant**
  - A colder relationship that has gone quiet for long enough to need cleanup or reactivation.

- **Cadence**
  - How often a pod or contact should ideally be touched.
  - Options include weekly, biweekly, monthly, and quarterly.

- **Priority Pod**
  - A pod marked as especially important.
  - Priority pods get more weight in the dashboard and overall health view.
