# One-time provisioning (Phase 1: Tasks F & G)

Two new SharePoint lists are required by Phase 1 and are **not** created automatically
by any web part. Both are set up by running a PnP PowerShell script **once**, by hand,
as a site/tenant administrator. Neither script is called from component mount or page
load — that pattern exists in the older `provisionQuickAccessDataList()`-style code
elsewhere in the solution, and this doc deliberately does not touch or replicate it.

## Prerequisites

- [PnP.PowerShell](https://pnp.github.io/powershell/) module installed:
  `Install-Module -Name PnP.PowerShell -Scope CurrentUser`
- An account with **Site Collection Administrator** rights on the target site
  (`https://msheirebproperties.sharepoint.com/sites/MPIntranet`, or your tenant's
  equivalent).

## 1. Delegation of Authority (Task F)

```powershell
Connect-PnPOnline -Url "https://msheirebproperties.sharepoint.com/sites/MPIntranet" -Interactive
./Provision-DelegationOfAuthority.ps1 -SiteUrl "https://msheirebproperties.sharepoint.com/sites/MPIntranet"
```

Creates the **Delegation of Authority** list (leave-coverage records — distinct
from the unrelated, pre-existing "Delegation of Authority" approval-limit PDF
matrices in Document Center; the naming overlap is a deliberate, accepted
decision, not a bug) with these fields:

| Field | Type |
|---|---|
| Title | Single line of text |
| Employee | Person |
| Designation | Text |
| Department | Text |
| Delegate | Person |
| DelegateDesignation | Text |
| LeaveFrom / LeaveTo | Date |
| DelegationFrom / DelegationTo | Date |
| ScopeResponsibilities | Multiple lines of text |
| ContactInformation | Text |
| Status | Choice: Draft / Active / Expired / Cancelled |
| SortOrder | Number |
| IsActive | Yes/No |

**Permissions.** The script breaks role inheritance and grants:
- **Edit** → Site Collection Administrators (always), plus the **"MP Compass
  Administrators"** SharePoint group — **only if that group already exists**.
- **Read** → the site's default Visitors/Members groups.

> ⚠️ **Unverified before this task**: whether "MP Compass Administrators" already
> exists in the tenant was not checked (no tenant/group-listing access was
> available while writing this). The script itself calls `Get-PnPGroup` and
> checks — if the group is missing, it **does not create or rename anything**;
> it prints a warning and leaves Edit access restricted to site admins only
> until someone decides how to proceed. Watch the script's console output for
> that warning the first time you run it.

The UI hides admin controls (the Delegation card's edit affordances) from
non-admins for convenience only. The real security boundary is this list's
SharePoint permissions — verify a non-admin test account genuinely cannot
write to the list via the REST API before considering this done.

## 2. MP Personal Quick Access (Task G)

```powershell
Connect-PnPOnline -Url "https://msheirebproperties.sharepoint.com/sites/MPIntranet" -Interactive
./Provision-MPPersonalQuickAccess.ps1 -SiteUrl "https://msheirebproperties.sharepoint.com/sites/MPIntranet"
```

Creates the **MP Personal Quick Access** list (SPIntranet's personal,
self-service Quick Access — max 5 shortcuts per user; entirely separate from
SPCorporateHub's page-scoped Quick Access, which is untouched) with fields:

| Field | Type |
|---|---|
| Title | Single line of text |
| URL | Text |
| Icon | Text |
| SortOrder | Number |
| Owner | Person |
| OwnerKey | Text |

**Permissions.** The script sets the list's native item-level security
(`ReadSecurity` / `WriteSecurity` = 2 — "items created by the user") so a user
can only read and write their own rows, enforced by SharePoint itself, not
just client-side filtering. Site collection administrators are unaffected and
retain full access.

The 5-shortcut cap and the http(s)/mailto:/tel:-only URL validation are
enforced in `src/Service/Service.ts` (both client-side, for UX, and
server-round-trip-side, by re-checking the current count/re-validating the
URL before every write) — SharePoint's item-level permissions don't express a
"max N items" rule on their own, so that cap is an application-layer
guarantee, not a list-schema one. If a hard, un-bypassable-by-any-client
guarantee is required, add a Power Automate flow or Azure Function validating
writes server-side in addition.

## Verifying success

1. As a non-admin user, confirm you can only see/edit your own rows in each
   list (test via the SharePoint list UI and via `/_api/web/lists/...`
   directly — not just through the web part).
2. As a non-admin, non-"MP Compass Administrators" user, confirm a direct
   REST `POST`/`PATCH`/`DELETE` against the Delegation of Authority list is
   rejected with 403.
3. Re-running either script is safe — both are idempotent (list/field
   creation is skipped if it already exists).
