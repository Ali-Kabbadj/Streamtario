# git_diagnostics.ps1
$OutputFile = Join-Path $PSScriptRoot "git_info.txt"

"" | Out-File $OutputFile -Encoding UTF8   # clear or create the file
Add-Content $OutputFile "===== Git Repo Diagnostic =====`n"

# 1. Current branch & tracking
Add-Content $OutputFile "[1] Current branch:`n"
git branch --show-current | Out-File $OutputFile -Append
Add-Content $OutputFile "`n[1b] Branch tracking info:`n"
git branch -vv | Out-File $OutputFile -Append

# 2. Remotes
Add-Content $OutputFile "`n[2] Remotes (fetch/push URLs):`n"
git remote -v | Out-File $OutputFile -Append

# 3. Last 3 commits
Add-Content $OutputFile "`n[3] Last 3 commits:`n"
git log -3 --pretty=format:"%h %an <%ae> | %ad | %s" --date=iso | Out-File $OutputFile -Append

# 4. Full Git config
Add-Content $OutputFile "`n[4] Full Git config (with origins):`n"
git config --list --show-origin | Out-File $OutputFile -Append

# 5. Repo status
Add-Content $OutputFile "`n[5] Repo status (uncommitted changes):`n"
git status --short | Out-File $OutputFile -Append

# 6. Default branch via gh CLI (if available)
Add-Content $OutputFile "`n[6] GitHub default branch (via gh CLI):`n"
if (Get-Command gh -ErrorAction SilentlyContinue) {
    gh repo view --json defaultBranchRef --template "{{ .defaultBranchRef.name }}" | Out-File $OutputFile -Append
} else {
    Add-Content $OutputFile "gh CLI not found; skipped default-branch check."
}

Add-Content $OutputFile "`nDone at $(Get-Date -Format o)`n"
Write-Host "✅ git_info.txt generated at $OutputFile"
