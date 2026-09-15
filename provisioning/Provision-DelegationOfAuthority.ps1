<#
.SYNOPSIS
    ONE-TIME provisioning script for the "Delegation of Authority" list (Task F).

.DESCRIPTION
    Creates the "Delegation of Authority" list on the MP Intranet site with its
    fields, then breaks role inheritance and grants:
      - Edit  -> Site Collection Administrators (always) and the
                 "MP Compass Administrators" group (ONLY if it already exists -
                 see the verification step below).
      - Read  -> Everyone Else (site visitors/members).

    This is NOT called from any web part or page load. Run it once, manually,
    by a site/tenant administrator, using PnP.PowerShell.

    "Delegation of Authority" here is the NEW leave-coverage feature
    (Designation / Employee / Leave From / Leave To). This is a deliberately
    accepted naming overlap with the existing, unrelated "Delegation of
    Authority" approval-limit policy PDFs filed under Document Center >
    "Governance Policies, DoA, Procedures and Processes" - the name is kept
    as-is by explicit decision; do not rename it.

.PARAMETER SiteUrl
    The site collection URL, e.g. https://msheirebproperties.sharepoint.com/sites/MPIntranet

.EXAMPLE
    Connect-PnPOnline -Url "https://msheirebproperties.sharepoint.com/sites/MPIntranet" -Interactive
    ./Provision-DelegationOfAuthority.ps1 -SiteUrl "https://msheirebproperties.sharepoint.com/sites/MPIntranet"
#>
[CmdletBinding()]
param(
    [Parameter(Mandatory = $true)]
    [string]$SiteUrl,

    [string]$ListName = "Delegation of Authority",

    # UNVERIFIED (flagged in Task F): whether this group already exists in the
    # tenant has NOT been checked against the live tenant. This script verifies
    # it itself and REFUSES to silently create or rename a group if missing.
    [string]$AdminGroupName = "MP Compass Administrators"
)

$ErrorActionPreference = "Stop"

Write-Host "Connecting to $SiteUrl ..." -ForegroundColor Cyan
# Assumes Connect-PnPOnline has already been called by the operator (interactive
# or app-only), per the usage example above. Intentionally not re-connecting
# here so credentials are never embedded in this script.

# ---------------------------------------------------------------------------
# 1. Create the list (idempotent - skips creation if it already exists)
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
    param($ListTitle, $InternalName, $DisplayName, $Type, [string]$Choices, [switch]$Required)

    $field = Get-PnPField -List $ListTitle -Identity $InternalName -ErrorAction SilentlyContinue
    if ($field) {
        Write-Host "  Field '$InternalName' already exists - skipping." -ForegroundColor DarkYellow
        return
    }

    switch ($Type) {
        "Text" {
            Add-PnPField -List $ListTitle -InternalName $InternalName -DisplayName $DisplayName -Type Text -AddToDefaultView -Required:$Required | Out-Null
        }
        "Note" {
            Add-PnPField -List $ListTitle -InternalName $InternalName -DisplayName $DisplayName -Type Note -AddToDefaultView -Required:$Required | Out-Null
        }
        "DateTime" {
            Add-PnPField -List $ListTitle -InternalName $InternalName -DisplayName $DisplayName -Type DateTime -AddToDefaultView -Required:$Required | Out-Null
        }
        "Number" {
            Add-PnPField -List $ListTitle -InternalName $InternalName -DisplayName $DisplayName -Type Number -AddToDefaultView -Required:$Required | Out-Null
        }
        "Boolean" {
            Add-PnPField -List $ListTitle -InternalName $InternalName -DisplayName $DisplayName -Type Boolean -AddToDefaultView -Required:$Required | Out-Null
        }
        "User" {
            Add-PnPField -List $ListTitle -InternalName $InternalName -DisplayName $DisplayName -Type User -AddToDefaultView -Required:$Required | Out-Null
        }
        "Choice" {
            Add-PnPFieldFromXml -List $ListTitle -FieldXml "<Field Type='Choice' Name='$InternalName' StaticName='$InternalName' DisplayName='$DisplayName' Format='Dropdown' Required='$([bool]$Required)'><Default>Draft</Default><CHOICES>$Choices</CHOICES></Field>" | Out-Null
        }
    }
    Write-Host "  Added field '$InternalName' ($Type)." -ForegroundColor Green
}

Ensure-Field -ListTitle $ListName -InternalName "Employee"               -DisplayName "Employee"                -Type User     -Required
Ensure-Field -ListTitle $ListName -InternalName "Designation"            -DisplayName "Designation"             -Type Text     -Required
Ensure-Field -ListTitle $ListName -InternalName "Department"             -DisplayName "Department"              -Type Text
Ensure-Field -ListTitle $ListName -InternalName "Delegate"                -DisplayName "Delegate"                -Type User     -Required
Ensure-Field -ListTitle $ListName -InternalName "DelegateDesignation"    -DisplayName "Delegate Designation"    -Type Text
Ensure-Field -ListTitle $ListName -InternalName "LeaveFrom"              -DisplayName "Leave From"              -Type DateTime -Required
Ensure-Field -ListTitle $ListName -InternalName "LeaveTo"                -DisplayName "Leave To"                -Type DateTime -Required
Ensure-Field -ListTitle $ListName -InternalName "DelegationFrom"         -DisplayName "Delegation From"         -Type DateTime
Ensure-Field -ListTitle $ListName -InternalName "DelegationTo"           -DisplayName "Delegation To"           -Type DateTime
Ensure-Field -ListTitle $ListName -InternalName "ScopeResponsibilities"  -DisplayName "Scope / Responsibilities" -Type Note
Ensure-Field -ListTitle $ListName -InternalName "ContactInformation"     -DisplayName "Contact Information"     -Type Text
Ensure-Field -ListTitle $ListName -InternalName "Status"                 -DisplayName "Status"                  -Type Choice -Choices "<CHOICE>Draft</CHOICE><CHOICE>Active</CHOICE><CHOICE>Expired</CHOICE><CHOICE>Cancelled</CHOICE>" -Required
Ensure-Field -ListTitle $ListName -InternalName "SortOrder"              -DisplayName "Sort Order"              -Type Number
Ensure-Field -ListTitle $ListName -InternalName "IsActive"               -DisplayName "Is Active"               -Type Boolean

# ---------------------------------------------------------------------------
# 3. Permissions
# ---------------------------------------------------------------------------
Write-Host "Breaking role inheritance on '$ListName'..." -ForegroundColor Green
Set-PnPList -Identity $ListName -BreakRoleInheritance -CopyRoleAssignments:$false -ClearSubscopes:$true

$list = Get-PnPList -Identity $ListName

# Site Collection Administrators always get Edit, regardless of the group check below.
Write-Host "Granting Edit to Site Collection Administrators..." -ForegroundColor Green
$siteAdmins = Get-PnPSiteCollectionAdmin
foreach ($admin in $siteAdmins) {
    try {
        Set-PnPListPermission -Identity $list -User $admin.LoginName -AddRole "Edit" -ErrorAction Stop
    } catch {
        Write-Warning "Could not grant Edit to site admin $($admin.LoginName): $_"
    }
}

# --- MP Compass Administrators group: VERIFY, do not create or rename ------
Write-Host "Checking whether the '$AdminGroupName' group exists..." -ForegroundColor Cyan
$adminGroup = Get-PnPGroup | Where-Object { $_.Title -eq $AdminGroupName }

if ($adminGroup) {
    Write-Host "Found group '$AdminGroupName' - granting Edit." -ForegroundColor Green
    Set-PnPListPermission -Identity $list -Group $AdminGroupName -AddRole "Edit"
} else {
    Write-Warning @"
The group '$AdminGroupName' does NOT exist on this site (or is a hidden/
tenant-level group not visible via Get-PnPGroup on this site). Per Task F
this script deliberately does NOT create or rename a group on your behalf.

ACTION NEEDED: decide whether to
  (a) create '$AdminGroupName' as a SharePoint group and re-run this script, or
  (b) grant Edit to a different, already-existing group/set of users.

Until that is resolved, only Site Collection Administrators can edit
Delegation of Authority content.
"@
}

# Everyone else: Read only.
Write-Host "Granting Read to the default member/visitor groups..." -ForegroundColor Green
$webTitle = (Get-PnPWeb).Title
$visitorsGroup = "$webTitle Visitors"
$membersGroup = "$webTitle Members"
foreach ($grp in @($visitorsGroup, $membersGroup)) {
    $g = Get-PnPGroup | Where-Object { $_.Title -eq $grp }
    if ($g) {
        Set-PnPListPermission -Identity $list -Group $grp -AddRole "Read"
    } else {
        Write-Warning "Default group '$grp' not found - grant Read manually to the appropriate group(s)."
    }
}

Write-Host "Done. Remember: hiding admin buttons in the UI is a convenience only - the permissions set above are the real enforcement boundary." -ForegroundColor Cyan
