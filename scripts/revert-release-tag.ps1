#!/usr/bin/env pwsh

#Requires -Version 7.0

param(
    [string]$Tag,
    [switch]$DeleteRelease,
    [switch]$Yes
)

$ErrorActionPreference = 'Stop'

$Red = "`e[0;31m"
$Green = "`e[0;32m"
$Yellow = "`e[1;33m"
$Blue = "`e[0;34m"
$NC = "`e[0m"

function Write-Error-Color {
    param([string]$Message)
    Write-Host "${Red}${Message}${NC}"
}

function Write-Success-Color {
    param([string]$Message)
    Write-Host "${Green}${Message}${NC}"
}

function Write-Warning-Color {
    param([string]$Message)
    Write-Host "${Yellow}${Message}${NC}"
}

function Write-Info-Color {
    param([string]$Message)
    Write-Host "${Blue}${Message}${NC}"
}

function Ensure-GitRepo {
    & git rev-parse --is-inside-work-tree *> $null
    if ($LASTEXITCODE -ne 0) {
        Write-Error-Color "This script must be run inside a git repository."
        exit 1
    }
}

function Resolve-Tag {
    param([string]$InputTag)

    if ($InputTag) {
        return $InputTag
    }

    $latest = (& git tag --sort=-creatordate) |
        Where-Object { $_ -match '^v\d+\.\d+\.\d+$' } |
        Select-Object -First 1

    if (-not $latest) {
        Write-Error-Color "No semver release tag found (expected format vX.Y.Z)."
        exit 1
    }

    return $latest
}

function Remove-LocalTag {
    param([string]$TagName)

    & git show-ref --tags --verify --quiet "refs/tags/$TagName"
    if ($LASTEXITCODE -eq 0) {
        & git tag -d $TagName
        if ($LASTEXITCODE -ne 0) {
            Write-Error-Color "Failed to delete local tag $TagName"
            exit 1
        }
        Write-Success-Color "Deleted local tag: $TagName"
    } else {
        Write-Warning-Color "Local tag not found, skipping: $TagName"
    }
}

function Remove-RemoteTag {
    param([string]$TagName)

    & git ls-remote --exit-code --tags origin "refs/tags/$TagName" *> $null
    if ($LASTEXITCODE -eq 0) {
        & git push origin ":refs/tags/$TagName"
        if ($LASTEXITCODE -ne 0) {
            Write-Error-Color "Failed to delete remote tag $TagName on origin"
            exit 1
        }
        Write-Success-Color "Deleted remote tag from origin: $TagName"
    } else {
        Write-Warning-Color "Remote tag not found on origin, skipping: $TagName"
    }
}

function Remove-GitHubRelease {
    param([string]$TagName)

    $gh = Get-Command gh -ErrorAction SilentlyContinue
    if (-not $gh) {
        Write-Warning-Color "GitHub CLI (gh) not found. Skipping release deletion."
        Write-Info-Color "Install gh and run: gh release delete $TagName --yes"
        return
    }

    & gh release view $TagName *> $null
    if ($LASTEXITCODE -ne 0) {
        Write-Warning-Color "No GitHub release found for tag: $TagName"
        return
    }

    & gh release delete $TagName --yes
    if ($LASTEXITCODE -ne 0) {
        Write-Error-Color "Failed to delete GitHub release for tag $TagName"
        exit 1
    }

    Write-Success-Color "Deleted GitHub release for tag: $TagName"
}

Ensure-GitRepo
$resolvedTag = Resolve-Tag $Tag

Write-Info-Color "Release rollback target"
Write-Warning-Color "  Tag: $resolvedTag"
Write-Warning-Color "  Delete GitHub release: $DeleteRelease"

if (-not $Yes) {
    $confirm = Read-Host "Continue and delete this tag? (y/N)"
    if ($confirm -notmatch '^[Yy]$') {
        Write-Warning-Color "Aborted."
        exit 1
    }
}

if ($DeleteRelease) {
    Remove-GitHubRelease $resolvedTag
}

Remove-RemoteTag $resolvedTag
Remove-LocalTag $resolvedTag

Write-Success-Color "Rollback complete for $resolvedTag"
Write-Info-Color "Next steps:"
Write-Warning-Color "  1) Apply your patch"
Write-Warning-Color "  2) Rebuild and test"
Write-Warning-Color "  3) Re-tag and push (e.g. git tag -a $resolvedTag -m 'Release'; git push origin $resolvedTag)"
