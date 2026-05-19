#Requires -Version 5.1
<#
.SYNOPSIS
    dev-ai-utilities installer - idempotent bootstrap for AI development tools (Windows)

.DESCRIPTION
    Installs and configures AI development tools based on a profile.
    Idempotent: safe to run multiple times.

.PARAMETER Profile
    Profile name to install (required unless -List is specified)

.PARAMETER DryRun
    Preview changes without applying them

.PARAMETER SkipTools
    Skip tool installation, configure only

.PARAMETER Target
    Override the target repository path from the profile

.PARAMETER List
    List available profiles and exit

.EXAMPLE
    .\install.ps1 -Profile aok
    .\install.ps1 -Profile atlas -DryRun
    .\install.ps1 -List
#>

[CmdletBinding()]
param(
    [string]$Profile,
    [switch]$DryRun,
    [switch]$SkipTools,
    [string]$Target,
    [switch]$List
)

$ErrorActionPreference = "Stop"

$ScriptDir = Split-Path -Parent $MyInvocation.MyCommand.Path
$ProfilesDir = Join-Path $ScriptDir "profiles"
$ScriptsDir = Join-Path $ScriptDir "scripts"

# --- Output Helpers ---
function Write-Ok      { param([string]$Msg) Write-Host "  ✓  $Msg" -ForegroundColor Green }
function Write-Fail    { param([string]$Msg) Write-Host "  ✗  $Msg" -ForegroundColor Red }
function Write-Warn    { param([string]$Msg) Write-Host "  ⚠  $Msg" -ForegroundColor Yellow }
function Write-Info    { param([string]$Msg) Write-Host "  →  $Msg" -ForegroundColor Cyan }
function Write-Header  { param([string]$Msg) Write-Host "`n$Msg" -ForegroundColor White -NoNewline; Write-Host "" }

# --- Helper: Check if command exists ---
function Test-Command {
    param([string]$Name)
    $null -ne (Get-Command $Name -ErrorAction SilentlyContinue)
}

# --- Helper: Expand ~ in path ---
function Expand-HomePath {
    param([string]$Path)
    if ($Path.StartsWith("~/")) {
        return Join-Path $HOME $Path.Substring(2)
    }
    elseif ($Path -eq "~") {
        return $HOME
    }
    return $Path
}

# --- List Profiles ---
if ($List) {
    Write-Header "Available Profiles"
    Write-Host ""
    Get-ChildItem -Path $ProfilesDir -Filter "*.json" | Where-Object { $_.Name -ne "profile-schema.json" } | ForEach-Object {
        $profileData = Get-Content $_.FullName -Raw | ConvertFrom-Json
        $pName = $profileData.name.PadRight(15)
        Write-Host "  $pName $($profileData.description)"
    }
    Write-Host ""
    exit 0
}

# --- Validate Profile ---
if (-not $Profile) {
    Write-Fail "No profile specified. Use -Profile <name> or -List to see options."
    exit 1
}

$ProfileFile = Join-Path $ProfilesDir "$Profile.json"
if (-not (Test-Path $ProfileFile)) {
    Write-Fail "Profile not found: $ProfileFile"
    Write-Host ""
    Write-Host "Available profiles:"
    Get-ChildItem -Path $ProfilesDir -Filter "*.json" | Where-Object { $_.Name -ne "profile-schema.json" } | ForEach-Object {
        $profileData = Get-Content $_.FullName -Raw | ConvertFrom-Json
        Write-Host "  - $($profileData.name)"
    }
    exit 1
}

# --- Load Profile ---
$ProfileData = Get-Content $ProfileFile -Raw | ConvertFrom-Json
$ProfileName = $ProfileData.name
$ProfileDesc = $ProfileData.description

# --- Load target: -Target flag > profile field > prompt/error ---
if ($Target) {
    $TargetRepo = Expand-HomePath $Target
}
elseif ($ProfileData.PSObject.Properties['target_repo'] -and $ProfileData.target_repo) {
    $TargetRepo = Expand-HomePath $ProfileData.target_repo
}
else {
    $TargetRepo = $null
}

if (-not $TargetRepo -and -not $DryRun) {
    if ([Environment]::UserInteractive -and [Console]::In -is [System.IO.StreamReader]) {
        $UserTarget = Read-Host "  Enter the path to your $($ProfileData.name) repo"
        if (-not $UserTarget) {
            Write-Fail "No target path provided. Use -Target <path> or enter a path when prompted."
            exit 1
        }
        $TargetRepo = Expand-HomePath $UserTarget
    }
    else {
        Write-Fail "No target repo specified. Use -Target <path>."
        exit 1
    }
}
elseif (-not $TargetRepo -and $DryRun) {
    $TargetRepo = "<no target specified>"
}

# If target was provided but doesn't exist, offer to correct it
if ($TargetRepo -ne "<no target specified>" -and -not (Test-Path $TargetRepo) -and -not $DryRun) {
    if ([Environment]::UserInteractive -and [Console]::In -is [System.IO.StreamReader]) {
        Write-Warn "Target repo not found: $TargetRepo"
        $UserTarget = Read-Host "  Enter the correct path (or press Enter to use default)"
        if ($UserTarget) {
            $TargetRepo = Expand-HomePath $UserTarget
        }
    }
    else {
        Write-Warn "Target repo not found: $TargetRepo (using default, override with -Target)"
    }
}

$Plugins = @($ProfileData.plugins)
$CursorRules = @($ProfileData.cursor_rules)

Write-Header "dev-ai-utilities installer"
Write-Host ""
Write-Info "Profile:      $ProfileName"
Write-Info "Description:  $ProfileDesc"
Write-Info "Target repo:  $TargetRepo"
Write-Info "Plugins:      $($Plugins -join ', ')"
Write-Info "Cursor rules: $($CursorRules -join ', ')"
if ($DryRun) {
    Write-Warn "DRY RUN - no changes will be made"
}
Write-Host ""

# ============================================================
# STEP 1: Tool Installation
# ============================================================
if (-not $SkipTools) {
    Write-Header "Step 1: Tool Installation"

    # --- Node.js (needed for Codex CLI) ---
    if (Test-Command "node") {
        $nodeVersion = & node --version 2>$null
        Write-Ok "Node.js already installed ($nodeVersion)"
    }
    else {
        if ($DryRun) {
            Write-Info "Would install Node.js (winget install OpenJS.NodeJS.LTS)"
        }
        else {
            Write-Info "Installing Node.js..."
            & winget install OpenJS.NodeJS.LTS --accept-package-agreements --accept-source-agreements
            Write-Ok "Node.js installed"
        }
    }

    # --- Claude Code (native installer - recommended by Anthropic) ---
    if (Test-Command "claude") {
        Write-Ok "Claude Code already installed"
    }
    else {
        if ($DryRun) {
            Write-Info "Would install Claude Code (irm https://claude.ai/install.ps1 | iex)"
        }
        else {
            Write-Info "Installing Claude Code via native installer..."
            Invoke-Expression (Invoke-RestMethod -Uri "https://claude.ai/install.ps1")
            Write-Ok "Claude Code installed"
        }
    }

    # --- Codex (npm - primary method for Windows) ---
    if (Test-Command "codex") {
        Write-Ok "Codex already installed"
    }
    else {
        if ($DryRun) {
            Write-Info "Would install Codex (npm i -g @openai/codex)"
        }
        else {
            if (Test-Command "npm") {
                Write-Info "Installing Codex via npm..."
                & npm i -g @openai/codex
                Write-Ok "Codex installed"
            }
            else {
                Write-Warn "npm not found. Install Node.js first, then re-run to install Codex."
            }
        }
    }

    # --- Cursor (download from cursor.com) ---
    $cursorInstalled = (Test-Path "$env:LOCALAPPDATA\Programs\Cursor\Cursor.exe") -or (Test-Command "cursor")
    if ($cursorInstalled) {
        Write-Ok "Cursor already installed"
    }
    else {
        if ($DryRun) {
            Write-Info "Would install Cursor (download from https://cursor.com/download)"
        }
        else {
            Write-Info "Opening Cursor download page..."
            Start-Process "https://cursor.com/download"
            Write-Warn "Download and install Cursor from https://cursor.com/download"
        }
    }
}
else {
    Write-Header "Step 1: Tool Installation (skipped)"
    Write-Warn "Skipped via -SkipTools"
}

# ============================================================
# STEP 2: Claude Code Configuration
# ============================================================
Write-Header "Step 2: Claude Code Configuration"

$ClaudeDir = Join-Path $HOME ".claude"
$ClaudeSettings = Join-Path $ClaudeDir "settings.json"

# Ensure directory exists
if (-not (Test-Path $ClaudeDir)) {
    if ($DryRun) {
        Write-Info "Would create $ClaudeDir"
    }
    else {
        New-Item -ItemType Directory -Path $ClaudeDir -Force | Out-Null
        Write-Ok "Created $ClaudeDir"
    }
}

# Ensure settings.json exists
if (-not (Test-Path $ClaudeSettings)) {
    if ($DryRun) {
        Write-Info "Would create $ClaudeSettings"
    }
    else {
        "{}" | Out-File -FilePath $ClaudeSettings -Encoding utf8
        Write-Ok "Created $ClaudeSettings"
    }
}

# Build plugin paths
$PluginDirMap = @{
    "core-superpowers"          = $ScriptDir
    "aok-fe-superpowers"        = Join-Path $ScriptDir "plugins/aok-fe"
    "aok-be-superpowers"        = Join-Path $ScriptDir "plugins/aok-be"
    "atlas-superpowers"         = Join-Path $ScriptDir "plugins/atlas-superpowers"
    "atlas-infra-superpowers"   = Join-Path $ScriptDir "plugins/atlas-infra-superpowers"
}

if ($DryRun) {
    Write-Info "Would merge plugin paths into $ClaudeSettings"
    foreach ($plugin in $Plugins) {
        Write-Info "  Plugin: $plugin"
    }
}
else {
    $settings = Get-Content $ClaudeSettings -Raw | ConvertFrom-Json

    # Ensure projects structure
    if (-not $settings.projects) {
        $settings | Add-Member -NotePropertyName "projects" -NotePropertyValue ([PSCustomObject]@{}) -Force
    }

    # Get or create project entry
    $projectEntry = $settings.projects.$TargetRepo
    if (-not $projectEntry) {
        $projectEntry = [PSCustomObject]@{
            plugins = @()
            allowedTools = @()
        }
        $settings.projects | Add-Member -NotePropertyName $TargetRepo -NotePropertyValue $projectEntry -Force
    }

    if (-not $projectEntry.plugins) {
        $projectEntry | Add-Member -NotePropertyName "plugins" -NotePropertyValue @() -Force
    }

    $existingPlugins = [System.Collections.Generic.HashSet[string]]::new()
    foreach ($p in $projectEntry.plugins) { [void]$existingPlugins.Add($p) }

    $added = @()
    foreach ($plugin in $Plugins) {
        $pluginPath = $PluginDirMap[$plugin]
        if (-not $pluginPath) {
            $pluginPath = Join-Path $ScriptDir "plugins/$plugin"
        }
        if (-not $existingPlugins.Contains($pluginPath)) {
            $added += $pluginPath
            [void]$existingPlugins.Add($pluginPath)
        }
    }

    $projectEntry.plugins = @($existingPlugins | Sort-Object)

    $settings | ConvertTo-Json -Depth 10 | Out-File -FilePath $ClaudeSettings -Encoding utf8

    if ($added.Count -eq 0) {
        Write-Ok "Claude Code plugins already configured"
    }
    else {
        foreach ($a in $added) {
            Write-Ok "Added plugin: $a"
        }
    }
}

# ============================================================
# STEP 3: Cursor Rules
# ============================================================
Write-Header "Step 3: Cursor Rules"

if (-not (Test-Path $TargetRepo)) {
    Write-Warn "Target repo does not exist yet: $TargetRepo"
    Write-Warn "Skipping cursor rules sync. Run again after creating the repo."
}
else {
    $CursorRulesSrc = Join-Path $ScriptDir "cursor-rules"
    $TargetRulesDir = Join-Path $TargetRepo ".cursor/rules"

    if ($DryRun) {
        Write-Info "Would sync cursor rules to $TargetRulesDir"
        foreach ($rule in $CursorRules) {
            Write-Info "  Rule set: $rule"
        }
    }
    else {
        # Create target directory
        if (-not (Test-Path $TargetRulesDir)) {
            New-Item -ItemType Directory -Path $TargetRulesDir -Force | Out-Null
        }

        $synced = 0
        $skipped = 0

        foreach ($ruleDir in $CursorRules) {
            $srcDir = Join-Path $CursorRulesSrc $ruleDir
            if (-not (Test-Path $srcDir)) {
                Write-Warn "Rule directory not found, skipping: $srcDir"
                continue
            }

            Get-ChildItem -Path $srcDir -Filter "*.mdc" -ErrorAction SilentlyContinue | ForEach-Object {
                $targetFile = Join-Path $TargetRulesDir $_.Name
                if ((Test-Path $targetFile) -and ((Get-FileHash $_.FullName).Hash -eq (Get-FileHash $targetFile).Hash)) {
                    Write-Ok "Already current: $($_.Name)"
                    $skipped++
                }
                else {
                    Copy-Item $_.FullName -Destination $targetFile -Force
                    Write-Ok "Synced: $($_.Name) (from $ruleDir/)"
                    $synced++
                }
            }
        }

        Write-Info "Cursor rules sync complete: $synced synced, $skipped already current"
    }
}

# ============================================================
# STEP 4: Codex Configuration
# ============================================================
Write-Header "Step 4: Codex Configuration"

$AgentsSrc = Join-Path $ScriptDir ".agents"

if (-not (Test-Path $AgentsSrc)) {
    Write-Warn "No .agents/ directory found in dev-ai-utilities. Skipping Codex config."
}
elseif (-not (Test-Path $TargetRepo)) {
    Write-Warn "Target repo does not exist: $TargetRepo. Skipping Codex config."
}
else {
    $CodexTargetAgents = Join-Path $TargetRepo ".agents"

    if ($DryRun) {
        Write-Info "Would copy .agents/ to $CodexTargetAgents"
    }
    else {
        # Copy skills
        $skillsSrc = Join-Path $AgentsSrc "skills"
        if (Test-Path $skillsSrc) {
            $skillsTarget = Join-Path $CodexTargetAgents "skills"
            if (-not (Test-Path $skillsTarget)) {
                New-Item -ItemType Directory -Path $skillsTarget -Force | Out-Null
            }

            $changed = $false
            Get-ChildItem -Path $skillsSrc -File | ForEach-Object {
                $targetFile = Join-Path $skillsTarget $_.Name
                if ((Test-Path $targetFile) -and ((Get-FileHash $_.FullName).Hash -eq (Get-FileHash $targetFile).Hash)) {
                    return
                }
                Copy-Item $_.FullName -Destination $targetFile -Force
                $changed = $true
            }

            if ($changed) {
                Write-Ok "Synced Codex agent skills"
            }
            else {
                Write-Ok "Codex agent skills already current"
            }
        }

        # Copy AGENTS.md
        $agentsMd = Join-Path $AgentsSrc "AGENTS.md"
        if (Test-Path $agentsMd) {
            $targetAgentsMd = Join-Path $CodexTargetAgents "AGENTS.md"
            if (-not (Test-Path $CodexTargetAgents)) {
                New-Item -ItemType Directory -Path $CodexTargetAgents -Force | Out-Null
            }
            if ((Test-Path $targetAgentsMd) -and ((Get-FileHash $agentsMd).Hash -eq (Get-FileHash $targetAgentsMd).Hash)) {
                Write-Ok "AGENTS.md already current"
            }
            else {
                Copy-Item $agentsMd -Destination $targetAgentsMd -Force
                Write-Ok "Synced AGENTS.md"
            }
        }
    }
}

# ============================================================
# Summary
# ============================================================
Write-Header "Installation Complete"
Write-Host ""
Write-Ok "Profile:     $ProfileName"
Write-Ok "Target repo: $TargetRepo"
if ($DryRun) {
    Write-Warn "This was a dry run. No changes were made."
    Write-Host ""
    Write-Info "Run without -DryRun to apply changes."
}
Write-Host ""
