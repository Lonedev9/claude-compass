# Web part conventions

## The SP-prefix convention

Every web part built or migrated from here on uses the **`SP` prefix** on:

- the **class name** (e.g. `SPNewsWebPart`), and
- the **manifest `alias`** (must match the class name), and
- (by convention) the web part **folder name** under `src/webparts/` in
  camelCase with the same prefix (e.g. `src/webparts/spNews/`).

This applies whether the web part is a fork of a pre-existing one or a
brand-new one — `SPDelegationDetailsWebPart` (Task F) is brand new and still
follows the convention.

Every manifest must also:
- get its own **newly generated GUID** for `"id"` — never copy an existing
  web part's id, to avoid colliding with anything already registered in the
  app catalog.
- set `"supportsFullBleed": true`.

## Phase 1 web parts (this migration)

| Original | SP-prefixed fork | Folder |
|---|---|---|
| `intranet` | `SPIntranetWebPart` | `src/webparts/spIntranet/` |
| `corporateHub` | `SPCorporateHubWebPart` | `src/webparts/spCorporateHub/` |
| `services` | `SPServicesWebPart` | `src/webparts/spServices/` |
| `applications` | `SPApplicationsWebPart` | `src/webparts/spApplications/` |
| `directoratePage` | `SPDirectoratePageWebPart` | `src/webparts/spDirectoratePage/` |

Two entirely new pieces were added alongside the fork, both under Task F:

- **`SPDelegationDetailsWebPart`** (`src/webparts/spDelegationDetails/`) — a
  standalone new web part, not a fork of anything, reading `delegationId`
  from the query string.
- SPIntranet's new **Delegation of Authority card** is *not* a separate web
  part — it's a component (`DelegationCard.tsx`) rendered inside
  `SPIntranetWebPart`, replacing the old "Business Applications" card.

Originals (`intranet`, `corporateHub`, `services`, `applications`,
`directoratePage`, plus `src/components/Sidebar` and the six components
`CorporateHub.tsx` used to import directly — `CarouselWithButton`,
`QuickAccess`, `HorizontalCards`, `Announcement`, `UpcomingEvents`,
`ExecutiveMessage`) remain deployed and unchanged; the currently-live pages
built on them keep working throughout this migration.

## Shared code

- `src/Service/Service.ts` and `src/Service/models/IDataProvider.ts` are
  **reused**, not copied, by every SP-prefixed web part. New methods are
  appended only — an existing method's signature is never changed or
  removed, because the un-forked, still-live web parts depend on it as-is.
- `src/components/SidebarSP/` is a fork of `src/components/Sidebar/`, used
  only by the 5 SP-prefixed web parts.
- `src/styles/breakpoints.scss` is the single shared responsive tier system
  (mobile / tablet / desktop / wide) every SP-prefixed web part's SCSS
  imports, replacing ad hoc `@media` values.

## Provisioning

Any new SharePoint list a web part depends on gets a **documented, one-time**
PnP PowerShell provisioning script under `provisioning/`, run manually by an
administrator — never invoked automatically from a component's mount/page
load.
