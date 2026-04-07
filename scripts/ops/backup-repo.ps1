param(
    [string]$Message,
    [switch]$SkipPush,
    [switch]$AllowEmpty
)

$ErrorActionPreference = 'Stop'
Set-StrictMode -Version Latest

$repoRoot = Resolve-Path (Join-Path $PSScriptRoot '..\..')
Set-Location $repoRoot

if (-not (Test-Path '.git')) {
    throw 'Current directory is not a Git repository.'
}

$branch = git branch --show-current
if (-not $branch) {
    throw 'Unable to detect the current branch.'
}

$remoteUrl = git remote get-url origin 2>$null
if (-not $remoteUrl) {
    throw 'Remote origin is not configured.'
}

$status = git status --porcelain

if (-not $Message) {
    $timestamp = Get-Date -Format 'yyyy-MM-dd HH:mm:ss'
    $Message = "backup: snapshot $timestamp"
}

if (-not $status -and -not $AllowEmpty) {
    Write-Host 'No changes detected. Skipping commit.'
    if (-not $SkipPush) {
        $upstream = git rev-parse --abbrev-ref --symbolic-full-name '@{u}' 2>$null
        if ($LASTEXITCODE -eq 0 -and $upstream) {
            Write-Host "Current branch already tracks $upstream."
        } else {
            Write-Host 'Current branch has no upstream and there is nothing to push.'
        }
    }
    exit 0
}

git add -A

if ($status) {
    git commit -m $Message
} elseif ($AllowEmpty) {
    git commit --allow-empty -m $Message
}

if ($SkipPush) {
    Write-Host 'Local commit created. Push skipped by request.'
    exit 0
}

$upstream = git rev-parse --abbrev-ref --symbolic-full-name '@{u}' 2>$null
if ($LASTEXITCODE -eq 0 -and $upstream) {
    git push
} else {
    git push -u origin $branch
}

Write-Host "Repository backup completed: $branch -> $remoteUrl"