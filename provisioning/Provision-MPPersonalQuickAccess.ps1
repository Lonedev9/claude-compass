<#
.SYNOPSIS
    ONE-TIME provisioning script for the "MP Personal Quick Access" list (Task G).

.DESCRIPTION
    Creates the "MP Personal Quick Access" list on the MP Intranet site (used
    exclusively by SPIntranet's personal, self-service Quick Access widget -
    max 5 shortcuts per user), with its fields, then configures SharePoint's
    native list-level item permissions so read/write are scoped to "items
    created by the user" - enforced by SharePoint itself, not just app logic.
    Site collection administrators keep full control regardless (SharePoint's
    creator-only restriction never applies to site admins).

    This is NOT called from any web part or page load - it is a manual,
    one-time setup step. (Flag, not fixed here: the existing codebase's
    provisionQuickAccessDataList()-style pattern apparently DOES provision
    on component mount for the older, page-scoped Quick Access list - that
    old pattern is out of scope for this task and is left as-is.)

.PARAMETER SiteUrl
    The site collection URL, e.g. https://msheirebproperties.sharepoint.com/sites/MPIntranet

.EXAMPLE
    Connect-PnPOnline -Url "https://msheirebproperties.sharepoint.com/sites/MPIntranet" -Interactive
    ./Provision-MPPersonalQuickAccess.ps1 -SiteUrl "https://msheirebproperties.sharepoint.com/sites/MPIntranet"
#>
[CmdletBinding()]
param(
    [Parameter(Mandatory = $true)]
    [string]$SiteUrl,

    [string]$ListName = "MP Personal Quick Access"
)

$ErrorActionPreference = "Stop"

Write-Host "Connecting to $SiteUrl ..." -ForegroundColor Cyan
# Assumes Connect-PnPOnline has already been called by the operator, per the
# usage example above.

# ---------------------------------------------------------------------------
# 1. Create the list (idempotent)
# ---------------------------------------------------------------------------
$existingList = Get-PnPList -Identity $ListName -ErrorAction SilentlyContinue
if (-not $existingList) {
    Write-Host "Creating list '$ListName'..." -ForegroundColor Green
    New-PnPList -Title $ListName -Template GenericList -OnQuickLaunch:$false | Out-Null
} else {
    Write-Host "List '$ListName' already exists - skipping creation (idempotent)." -ForegroundColor Yellow
}

# ---------------------------------------------------------------------------
# 2. Fields
# ---------------------------------------------------------------------------
Write-Host "Ensuring fields..." -ForegroundColor Green

function Ensure-Field {
    param($ListTitle, $InternalName, $DisplayName, $Type, [switch]$Required)

    $field = Get-PnPField -List $ListTitle -Identity $InternalName -ErrorAction SilentlyContinue
    if ($field) {
        Write-Host "  Field '$InternalName' already exists - skipping." -ForegroundColor DarkYellow
        return
    }

    switch ($Type) {
        "Text"   { Add-PnPField -List $ListTitle -InternalName $InternalName -DisplayName $DisplayName -Type Text   -AddToDefaultView -Required:$Required | Out-Null }
        "Number" { Add-PnPField -List $ListTitle -InternalName $InternalName -DisplayName $DisplayName -Type Number -AddToDefaultView -Required:$Required | Out-Null }
        "User"   { Add-PnPField -List $ListTitle -InternalName $InternalName -DisplayName $DisplayName -Type User   -AddToDefaultView -Required:$Required | Out-Null }
    }
    Write-Host "  Added field '$InternalName' ($Type)." -ForegroundColor Green
}

Ensure-Field -ListTitle $ListName -InternalName "URL"       -DisplayName "URL"       -Type Text -Required
Ensure-Field -ListTitle $ListName -InternalName "Icon"      -DisplayName "Icon"      -Type Text
Ensure-Field -ListTitle $ListName -InternalName "SortOrder" -DisplayName "Sort Order" -Type Number
Ensure-Field -ListTitle $ListName -InternalName "Owner"     -DisplayName "Owner"     -Type User -Required
Ensure-Field -ListTitle $ListName -InternalName "OwnerKey"  -DisplayName "Owner Key" -Type Text -Required

# ---------------------------------------------------------------------------
# 3. Item-level permissions: "read items that were created by the user" /
#    "create and edit items that were created by the user".
#    These correspond to SharePoint's List.ReadSecurity / List.WriteSecurity:
#      ReadSecurity  1 = all items (default), 2 = only items created by the user
#      WriteSecurity 1 = all items (default), 2 = only items created by the user
#    Not exposed as named Set-PnPList parameters, so set directly via CSOM.
# ---------------------------------------------------------------------------
Write-Host "Configuring item-level read/write permissions (creator-only)..." -ForegroundColor Green

$list = Get-PnPList -Identity $ListName
$ctx = Get-PnPContext
$list.ReadSecurity = 2   # Users can read only items they created (site admins unaffected).
$list.WriteSecurity = 2  # Users can edit/delete only items they created (site admins unaffected).
$list.Update()
$ctx.ExecuteQuery()

Write-Host "Done. Item-level 'creator-only' read/write is now enforced by SharePoint itself." -ForegroundColor Cyan
Write-Host "Reminder: the max-5-per-user cap and URL scheme validation are enforced in Service.ts (client) AND must be re-verified server-side (list validation / Power Automate flow) if you need a hard guarantee beyond the SPFx client - list item permissions alone do not enforce the count cap." -ForegroundColor Yellow
