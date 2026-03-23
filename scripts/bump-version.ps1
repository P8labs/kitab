#!/usr/bin/env pwsh

#Requires -Version 7.0

param(
    [Parameter(Mandatory=$true)]
    [ValidateSet('major', 'minor', 'patch')]
    [string]$BumpType,

    [switch]$NoCommit
)

$ErrorActionPreference = 'Stop'

# Color codes
$Red = "`e[0;31m"
$Green = "`e[0;32m"
$Yellow = "`e[1;33m"
$Blue = "`e[0;34m"
$NC = "`e[0m"

# File paths
$PackageFile = "package.json"
$TauriConfFile = "src-tauri/tauri.conf.json"

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

function Get-Version {
    if (-not (Test-Path $PackageFile)) {
        Write-Error-Color "Missing $PackageFile"
        exit 1
    }

    $content = Get-Content $PackageFile -Raw | ConvertFrom-Json
    $version = $content.version.Trim()

    if ($version -notmatch '^\d+\.\d+\.\d+$') {
        Write-Error-Color "package.json version is not valid semver (x.y.z): $version"
        exit 1
    }

    return $version
}

function Parse-Version {
    param([string]$Version)
    
    $parts = $Version -split '\.'
    return @{
        Major = [int]$parts[0]
        Minor = [int]$parts[1]
        Patch = [int]$parts[2]
    }
}

function Bump-Version {
    param(
        [string]$CurrentVersion,
        [string]$BumpType
    )
    
    $version = Parse-Version $CurrentVersion
    
    switch ($BumpType) {
        'major' {
            $version.Major++
            $version.Minor = 0
            $version.Patch = 0
        }
        'minor' {
            $version.Minor++
            $version.Patch = 0
        }
        'patch' {
            $version.Patch++
        }
    }
    
    return "$($version.Major).$($version.Minor).$($version.Patch)"
}

function Update-PackageJson {
    param([string]$NewVersion)
    
    if (-not (Test-Path $PackageFile)) {
        Write-Error-Color "Missing $PackageFile"
        exit 1
    }
    
    $content = Get-Content $PackageFile -Raw | ConvertFrom-Json
    $content.version = $NewVersion
    $content | ConvertTo-Json -Depth 10 | Set-Content $PackageFile
    
    Write-Success-Color "Updated $PackageFile version to $NewVersion"
}

function Update-TauriConf {
    param([string]$NewVersion)
    
    if (-not (Test-Path $TauriConfFile)) {
        Write-Error-Color "Missing $TauriConfFile"
        exit 1
    }
    
    $content = Get-Content $TauriConfFile -Raw | ConvertFrom-Json
    $content.version = $NewVersion
    $content | ConvertTo-Json -Depth 10 | Set-Content $TauriConfFile
    
    Write-Success-Color "Updated $TauriConfFile version to $NewVersion"
}

function Create-Tag {
    param([string]$Version)
    
    $tag = "v$Version"
    
    Write-Warning-Color "Creating commit and git tag: $tag"
    
    & git add .
    if ($LASTEXITCODE -ne 0) {
        Write-Error-Color "Failed to stage changes"
        exit 1
    }
    
    & git commit -m "chore: bump version to $Version"
    if ($LASTEXITCODE -ne 0) {
        Write-Error-Color "Failed to create commit"
        exit 1
    }
    
    & git tag -a $tag -m "Release $Version"
    if ($LASTEXITCODE -ne 0) {
        Write-Error-Color "Failed to create tag"
        exit 1
    }
    
    Write-Success-Color "Tag created: $tag`n"
    Write-Info-Color "To push and trigger release workflow:"
    Write-Warning-Color "  git push origin main && git push origin $tag`n"
}

function Show-Info {
    param([string]$Version)
    
    Write-Host ""
    Write-Info-Color "=============================================="
    Write-Success-Color "Kitab Release Info"
    Write-Info-Color "=============================================="
    Write-Warning-Color "Version:   $Version"
    Write-Warning-Color "Binary:    kitab.exe"
    Write-Warning-Color "Tag:       v$Version"
    Write-Info-Color "===============================================`n"
}

# Main logic
$CurrentVersion = Get-Version
Write-Info-Color "Current version: $CurrentVersion"

$NewVersion = Bump-Version $CurrentVersion $BumpType
Write-Success-Color "New version:     $NewVersion"

$response = Read-Host "Continue with version bump? (y/N)"
if ($response -notmatch '^[Yy]$') {
    Write-Error-Color "Aborted."
    exit 1
}

Update-PackageJson $NewVersion
Update-TauriConf $NewVersion

Show-Info $NewVersion

if ($NoCommit) {
    Write-Warning-Color "Version bumped without commit/tag."
    Write-Info-Color "Run when ready:"
    Write-Warning-Color "  git add ."
    Write-Warning-Color "  git commit -m 'chore: bump version to $NewVersion'"
    Write-Warning-Color "  git tag -a v$NewVersion -m 'Release $NewVersion'"
    Write-Warning-Color "  git push origin main && git push origin v$NewVersion`n"
    exit 0
}

$response = Read-Host "Create git commit and tag now? (y/N)"
if ($response -match '^[Yy]$') {
    Create-Tag $NewVersion
} else {
    Write-Warning-Color "Version bumped without commit/tag."
    Write-Info-Color "Run when ready:"
    Write-Warning-Color "  git add ."
    Write-Warning-Color "  git commit -m 'chore: bump version to $NewVersion'"
    Write-Warning-Color "  git tag -a v$NewVersion -m 'Release $NewVersion'"
    Write-Warning-Color "  git push origin main && git push origin v$NewVersion`n"
}
