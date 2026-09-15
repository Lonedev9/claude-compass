# MP Compass Phase 1 — Deployment & Rollback

This solution (`sharepoint/solution/mp-compass.sppkg`) is built with
`skipFeatureDeployment: true` and `IsDomainIsolated: false`, and every
component ID is new (see `docs/VALIDATION-REPORT.md` §3 for the full GUID
list). It installs as a **separate app package alongside** whatever is
already in the tenant's app catalog - it does not touch, replace, or
version-bump any existing package.

## Pre-deployment checklist

1. Read `docs/VALIDATION-REPORT.md` in full, especially §6–7 (live-tenant
   findings and open items).
2. Run both provisioning scripts under `provisioning/` **before** deploying
   the app (see `provisioning/PROVISIONING.md`) - the web parts will still
   render an empty/loading state if the lists don't exist yet, but the
   Delegation and Personal Quick Access features need their lists to be
   useful.
3. Resolve the "MP Compass Administrators" group question (§6 of the
   validation report) - either confirm it exists or decide on an
   alternative before running `Provision-DelegationOfAuthority.ps1`, since
   that script will only warn, not fail, if the group is missing.
4. Confirm the actual internal list names in the target tenant match the
   constants at the top of `src/Service/Service.ts`
   (`QUICK_ACCESS_LIST`, `CAROUSEL_LIST`, `HORIZONTAL_CARDS_LIST`,
   `ANNOUNCEMENTS_LIST`, `EVENTS_LIST`, `EXECUTIVE_MESSAGE_LIST`) - update
   and rebuild if they differ (see §7.2 of the validation report).

## Deployment steps (staged, reversible)

### Stage 1 — Isolated validation (recommended first step)

1. Upload `mp-compass.sppkg` to a **test/dev site collection's** App
   Catalog (not the tenant App Catalog, and not the production MP Intranet
   site), or use a sandboxed site collection app catalog if available.
2. Click "Deploy" - do **not** check "Make this solution available to all
   sites in the organization".
3. Add each of the 6 web parts to a throwaway test page and click through
   the matrix in `docs/VALIDATION-REPORT.md` §3's responsive checklist
   (1920/1440/1024/768/480/360px).
4. Confirm the SPIntranet Photo Gallery renders the real 3 latest albums
   from `/sites/MPIntranet/Photo Albums` and the lightbox opens/closes/
   navigates correctly.
5. Confirm SPCorporateHub on two different `pageId` values shows
   completely independent Quick Access / Carousel / Announcements content
   (Task D/H's isolation requirement) - this is the single most
   important manual check, since a page-scoping bug would leak one
   department's content onto another's page.

### Stage 2 — Production App Catalog (only after Stage 1 passes)

1. Upload `mp-compass.sppkg` to the **tenant App Catalog**
   (`https://msheirebproperties.sharepoint.com/sites/appcatalog` or
   equivalent).
2. Click "Deploy". Because `skipFeatureDeployment: true` and every
   component ID is new, this action **cannot** collide with, overwrite, or
   redeploy any existing package - SharePoint treats it as an entirely
   separate app.
3. The 6 new web parts become available to add to pages
   tenant-wide, but nothing changes on any existing page until an editor
   explicitly adds one.
4. Add the new web parts to new or existing pages as needed (e.g. drop
   `SPCorporateHub` onto a new department page, configure its `pageId`
   property in the property pane).

### Stage 3 — Cutover (only when explicitly decided, out of scope here)

Replacing a currently-deployed original web part instance with its
SP-prefixed counterpart on a live page is a **content/page-editing
decision**, not a code-deployment one, and is intentionally not automated
by this package. It means: on the specific page, remove the old web part
and add the new one, re-entering its property-pane configuration
(`pageId`, title/subtitle, etc.). Do this page by page, only once Stage 2's
new web parts have been spot-checked on that specific site.

## Rollback

Because this package never modifies any existing app, page, list, or
web part:

- **To remove the Phase 1 web parts from a page**: just remove them via
  the page's edit mode, same as any web part. No data loss beyond that
  page's own content.
- **To fully retract the app**: in the App Catalog, select
  `mp-compass-client-side-solution` and click "Retract", then "Delete" if
  desired. Because `skipFeatureDeployment: true`, retracting removes the
  app registration; any page that still has one of these web parts placed
  on it will show a "web part can't be displayed" placeholder until the
  page is edited to remove it - this is standard SPFx retraction behavior,
  not specific to this package.
- **To roll back a bad update** (if a future version of this package is
  deployed on top of this one): re-upload this exact `mp-compass.sppkg`
  (SHA-256 in `docs/VALIDATION-REPORT.md`) and click "Replace" in the App
  Catalog - SPFx versions are tracked by the `version` field in
  `config/package-solution.json` (currently `1.0.0.0`), so redeploying an
  older package is a supported, ordinary App Catalog operation.
- **Provisioned lists are never deleted by any script here.** If a list
  needs to be removed as part of a rollback, that is a manual, deliberate
  admin action (`Remove-PnPList`) - intentionally not scripted, since an
  automated list-deletion path in a "one-time provisioning" script would
  be a destructive-by-accident risk.

## What this deployment does *not* do (by design)

- Does not touch, upgrade, or redeploy any existing app package.
- Does not modify any existing page, web part instance, or its
  configuration.
- Does not modify `src/components/Sidebar` or any of the 6 original
  CorporateHub sibling components referenced in the brief - `SidebarSP` and
  the 6 local copies under `src/webparts/spCorporateHub/components/` are
  the only implementations that exist in this repository (see
  `docs/VALIDATION-REPORT.md` §0 for why - there was no pre-existing
  original codebase in this repo to avoid touching).
- Does not run any provisioning logic automatically - both new lists
  require the operator to run their script by hand first.
