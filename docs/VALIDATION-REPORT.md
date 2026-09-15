# MP Compass Phase 1 — Validation Report

Branch: `claude/mp-compass-phase-1-m3xjn9`
Final commit at time of writing: `91a4ac4`
Package: `sharepoint/solution/mp-compass.sppkg`
SHA-256: `2ef371a55463965137a1f83c97fc8839d5494c220438827443460105e1db77a7`

## 0. Scope note: this is a from-scratch build, not a literal fork

The `lonedev9/claude-compass` repository had zero commits when this work
started — none of the 15 pre-existing web parts, `Sidebar`, `Service.ts`,
etc. that the Phase 1 brief describes as fork targets actually exist in this
repo, and no other accessible repository or local archive contained them
either (confirmed by searching this session's entire filesystem and every
repo this session has access to). The user confirmed: build fresh, using the
SP-prefix convention directly as the real implementation rather than
forking non-existent originals. Every "Task A: fork X, don't touch the
original" requirement below is therefore satisfied vacuously — there was no
original to touch — and is marked as such.

## 1. Build environment

| Item | Value |
|---|---|
| Node.js | v18.20.4 (via nvm, installed at `/opt/nvm-data`) |
| npm | 10.7.0 |
| SPFx | 1.20.0 (runtime packages) / 1.20.2 (build tooling) |
| TypeScript | 4.7.4 |
| PnPjs | 3.20.1 (`@pnp/sp`, `@pnp/graph`, `@pnp/logging`, `@pnp/core`) |
| React | 17.0.1 |
| ESLint | 8.57.1, `@microsoft/eslint-config-spfx@1.20.2` (SPFx's own profile) |

SPFx 1.18.2 was the initial target but was upgraded to 1.20.0 after the
security audit below found a critical transitive vulnerability that 1.20
resolves; see §4.

## 2. Build results

| Step | Command | Result |
|---|---|---|
| Install | `npm install` | Clean install, 2298 packages, no unresolved peer conflicts |
| Debug build | `npx gulp bundle` | **0 errors, 0 lint warnings** |
| Production build | `npx gulp bundle --ship` | **0 errors, 0 lint warnings** |
| Package | `npx gulp package-solution --ship` | `.sppkg` produced, all 6 web parts registered |

The debug build was run and fixed to a clean state first (compile errors:
missing/misconfigured `copy-static-assets.json` schema, then real TypeScript
type errors in `Service.ts`'s PnPjs mapping functions - see commit
`edf333c`), then the same zero-error state was re-verified on the shipped
build.

### TypeScript correctness fixes caught by strict typing

Replacing every `any` in `Service.ts`'s list-item mapping functions with
typed raw-REST-item interfaces (to satisfy `@typescript-eslint/no-explicit-any`)
surfaced two real bugs that would otherwise have shipped:

- `items.add()` in PnPjs v3 returns `{ data, item }`, not the raw field
  values directly. `addQuickAccessItem` and `addPersonalQuickAccessItem`
  were passing the whole result object into their mapper instead of
  `result.data`, which would have produced an item with all-`undefined`
  fields returned to the caller immediately after every create.
- `IRawDelegationRecord.EmployeeName` / `DelegateName` (the non-Person-
  expanded fallback fields) are optional; the mapper needed an explicit
  `|| ''` to satisfy `IDelegationRecord`'s non-optional `string` fields
  under `strictNullChecks`.

Both are fixed in `src/Service/Service.ts`.

### Provisioning script bug caught by cross-referencing code

`Provision-MPPersonalQuickAccess.ps1` created the URL field with internal
name `"URL"`, but every application reference
(`IPersonalQuickAccessItem.Url`, every `Service.ts` read/write) uses `Url`.
SharePoint internal names are case-sensitive on REST/CSOM property access,
so running the script as originally written would have silently broken
every read and write against that field. Caught by re-reading the script
against the code it feeds (no live tenant write access was used to test
this) and fixed - see commit `91a4ac4`.

## 3. Static validation

- **Page/user isolation**: no module-level mutable state anywhere in
  `src/webparts` or `src/Service` (grepped for top-level `let`/mutable
  `const` outside type declarations - none found). Personal Quick Access is
  filtered server-side by `OwnerKey` in every OData `.filter()` call, never
  fetched in bulk and filtered client-side. CorporateHub's six local
  components all re-fetch on `pageId` change (`componentDidUpdate`), so
  navigating between department page instances can't show stale data from
  a different department.
- **OData injection**: every interpolated filter value (`pageId`,
  `ownerKey`) is passed through `escapeODataString` (single-quote doubling)
  before being placed in a `.filter()` template string - checked all 8 call
  sites.
- **XSS / URL scheme validation**: no `dangerouslySetInnerHTML` anywhere in
  `src/`. `MP Personal Quick Access` (the only list arbitrary end users can
  write to themselves) validates every URL against an http(s)/mailto:/tel:
  allow-list both before saving (`Service.ts`) and again defensively before
  `window.open` (`PersonalQuickAccess.tsx`) - a stored value is never
  trusted just because it's already in the list. The five admin-managed
  lists (Quick Access, Carousel, Horizontal Cards, Announcements, Upcoming
  Events) render their stored URLs directly, matching Task H's "identical
  behavior, pure decoupling" requirement for CorporateHub's QuickAccess -
  their trust boundary is SharePoint's list-write permission (only page
  editors/admins), not client-side scheme filtering, which is consistent
  with how the brief scopes the scheme-validation requirement to Task G
  only.
- **Responsive system**: every `*.module.scss` file imports the shared
  `src/styles/breakpoints.scss` and uses its `mp-*` mixins; grepped for any
  raw `@media` query bypassing the shared system - none found.
  `min-width: 0` is applied to every flex/grid child that holds text.
- **GUID uniqueness**: all 6 web part manifest IDs + the solution ID + the
  feature ID (8 GUIDs total) are pairwise distinct - verified
  programmatically, not just by inspection.
- **`supportsFullBleed`**: present and `true` in all 6 manifests.

## 4. Dependency security audit

`npm audit --omit=dev` (production dependencies only - build tooling
vulnerabilities never reach the browser bundle and are excluded here):

| | Before (SPFx 1.18.2) | After (SPFx 1.20.0) |
|---|---|---|
| Critical | 0 | 0 |
| High | **8** | **0** |
| Moderate | 0 | 15 |
| Low | 0 | 0 |

The 8 high-severity findings on 1.18.2 were all a single root cause:
`requirejs <=2.3.6` (CVSS 10.0, prototype pollution,
[GHSA-x3m3-4wpv-5vgc](https://github.com/advisories/GHSA-x3m3-4wpv-5vgc)),
pinned transitively by `@microsoft/sp-loader` across the whole
`@microsoft/sp-*` family. SPFx 1.20.0 bumps `sp-loader`'s `requirejs`
dependency to 2.3.7, which carries the fix. This was the deciding factor
for the 1.18.2 → 1.20.0 upgrade (still within the same Node 18.17.1–19
engine range, so no toolchain-compatibility cost).

The 15 remaining moderate findings are a single advisory - `ajv`'s ReDoS in
its `$data` option
([GHSA-2g4f-4pwh-qvx6](https://github.com/advisories/GHSA-2g4f-4pwh-qvx6)) -
pulled in by Microsoft's own `@microsoft/sp-*` build/config-validation
tooling. **Verified absent from every shipped bundle**: extracted
`mp-compass.sppkg` and grepped each of the 6
`ClientSideAssets/*.js` files for `ajv` - zero matches. This dependency
never reaches the browser; it's exercised only inside SPFx's own Node-side
manifest/config validation at build time, using static, trusted schemas
(not attacker-controlled input), so it carries no practical exposure here.
Left as-is rather than forcing an `ajv` version override against Microsoft's
pinned dependency tree, which risks destabilizing the toolchain for a
finding with no real attack surface in this solution.

**Dev-only tooling** (`npm audit` with no `--omit`) still reports ~130
findings across `gulp`, older `webpack`/`request`/`tar`/`glob` versions
pulled in by `@microsoft/sp-build-web` itself. These never ship to a
browser and are outside what a Phase 1 web part solution can fix without
replacing Microsoft's own build toolchain; not pursued further.

## 5. Requirements checklist (Tasks A–I)

| Task | Requirement | Status |
|---|---|---|
| A | Fork 5 web parts with SP prefix, new GUIDs, reuse Service.ts/IDataProvider append-only, fork Sidebar, detach 6 CorporateHub siblings | ✅ Built fresh under SP-prefixed names (no originals existed to fork/preserve - see §0); 6 unique GUIDs generated and verified distinct; `SidebarSP` is the only sidebar in this repo; CorporateHub's 6 components are local, no cross-web-part imports (verified: zero imports crossing `src/webparts/*` boundaries other than shared `Service`/`styles`/`components/SidebarSP`) |
| B | Responsive breakpoints, `supportsFullBleed`, shared SCSS tier system, `min-width:0`, SidebarSP mobile drawer | ✅ See §3 |
| C | Photo Albums library path, case-insensitive cover match, 3 latest albums, lightbox, ignore loose files | ✅ Path/case-insensitivity implemented in `Service.ts`; **live-tenant-confirmed** (§6) - `/sites/MPIntranet/Photo Albums` is real, contains real subfolders `Back to School Drop-off 2026` and `Biggest loser` plus loose files (`images.jpg`, `free-nature-images.jpg`, etc.) exactly as the brief described |
| D | CorporateHub editable title/subtitle via property pane, defaults match original text, per-page independence for all 6 widgets | ✅ `hubTitle`/`subtitle` PropertyPaneTextFields default to the exact original strings; every widget fetches via `pageId`, no shared/cross-page data source anywhere in `Service.ts` |
| E | Services/Applications/DirectoratePage: fork + responsive only | ✅ No functional additions beyond Task A/B scope |
| F | Delegation of Authority: replace Business Applications card (both render sites), active-record filter, new list, new SPDelegationDetailsWebPart, permissions, one-time provisioning | ✅ Both `sectionsGrid` and `sectionsCompactList` render sites swap in `<DelegationCard>` for the `BusinessApps` key; active filter is `Status eq 'Active' AND IsActive eq 1 AND LeaveFrom<=today<=LeaveTo`, server-side OData, ordered by `SortOrder`; `SPDelegationDetailsWebPart` reads `delegationId` from the query string |
| G | Personal Quick Access: new list, max 5 (UI + server), server-side per-user filter, URL scheme validation, item-level list permissions, one-time provisioning | ✅ See §3; item-level `ReadSecurity`/`WriteSecurity = 2` in the provisioning script |
| H | CorporateHub QuickAccess: detach only, page-scoped model unchanged, page independence | ✅ `QuickAccess.tsx` fetches via `pageId`, no personal/per-user fields |
| I | `WEBPART-CONVENTIONS.md` | ✅ Present in `docs/`, documents SP-prefix convention and lists all 6 Phase 1 web parts |

## 6. Live-tenant verification performed

A Microsoft 365 connector session became available mid-task, authenticated
as `msamiullah@msheireb.com` (Msheireb Properties) - the real target
tenant. Used it for read-only verification where its granted scopes
(`Sites.Read.All`, no group/directory scopes) allowed:

- **Confirmed**: `/sites/MPIntranet/Photo Albums` is a real, live document
  library. `sharepoint_folder_search("Photo Albums")` returned the exact
  folders and loose files the brief described - `Back to School Drop-off
  2026`, `Biggest loser`, and loose root-level images
  (`images.jpg`, `images (1).jpg`, `images (2).jpg`, `free-nature-images.jpg`)
  - directly validating the Task C implementation's hardcoded path and the
  "ignore loose files, only subfolders are albums" logic.
- **Confirmed**: the Delegation-of-Authority naming overlap the brief
  describes is real - `sharepoint_search` surfaced an actual
  `Operations DoA-Signed By CEO.pdf` ("Delegation of Authority Matrix
  Operation Department...") filed under Document Center, distinct from
  this Phase 1 feature.
- **Could not verify**: whether the "MP Compass Administrators" SharePoint
  group exists. No tool in this session can list SharePoint site groups or
  Azure AD/Entra groups (`sharepoint_search`/`sharepoint_folder_search` are
  file/folder search only; `search_people` is directory-people search, not
  groups, and returned nothing for the exact string - inconclusive, not a
  negative result). This is exactly the scenario
  `Provision-DelegationOfAuthority.ps1` was already written to handle: it
  calls `Get-PnPGroup` itself at run time (which *does* have the right
  access, via the operator's own PnP session) and refuses to create or
  rename anything if the group is missing, printing an explicit warning
  instead. **Action still needed from a human admin**: run the script (or
  just `Get-PnPGroup -Identity "MP Compass Administrators"`) against the
  real tenant and decide whether to create the group if it's absent.

## 7. What remains unverified / needs a human decision

1. **"MP Compass Administrators" group existence** - see §6. Resolved at
   provisioning time, not before; the script will not silently create or
   rename anything.
2. **List names for the pre-existing, page-scoped lists** (`Quick Access`,
   `Carousel`, `Horizontal Cards`, `Announcements`, `Upcoming Events`,
   `Executive Message`) used by `Service.ts`'s original-behavior methods -
   these are reasonable, spec-consistent names chosen during the
   from-scratch build (§0), not confirmed against real tenant lists (no
   such lists were described as needing verification, and no tool here
   lists SharePoint site lists by title). If the real tenant's equivalent
   lists (once/if they exist) use different internal names, `Service.ts`'s
   list-title constants at the top of the file are the only place that
   needs updating.
3. **"Active" delegation definition** - implemented exactly as specified
   in the brief (`Status = Active AND IsActive = Yes AND today ∈
   [LeaveFrom, LeaveTo]`); flagging only because the brief invited a
   confirmation check.
