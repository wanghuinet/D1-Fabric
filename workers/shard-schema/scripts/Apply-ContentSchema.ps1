$ErrorActionPreference = 'Stop'
Set-StrictMode -Version Latest

$Root = Split-Path -Parent $PSScriptRoot
Set-Location $Root

$Databases = @(
  'd1-fabric-shard-01',
  'd1-fabric-shard-02',
  'd1-fabric-shard-03',
  'd1-fabric-shard-04',
  'd1-fabric-shard-05',
  'd1-fabric-shard-06',
  'd1-fabric-shard-07',
  'd1-fabric-shard-08'
)

Write-Host 'D1-Fabric Content Platform Schema V2' -ForegroundColor Cyan
Write-Host 'Migration chain: 0001 .. 0012'
Write-Host 'Target: all configured physical shards'
Write-Host ''

if (-not (Get-Command npx -ErrorAction SilentlyContinue)) {
  throw 'npx was not found. Install Node.js first.'
}

Write-Host 'Checking Wrangler authentication...' -ForegroundColor Yellow
& npx wrangler whoami
if ($LASTEXITCODE -ne 0) {
  throw 'Wrangler authentication check failed. Run: npx wrangler login'
}

Write-Host ''
Write-Host 'Applying complete migration chain to every shard...' -ForegroundColor Yellow

$failed = @()
foreach ($db in $Databases) {
  Write-Host "[$db] APPLY" -ForegroundColor Cyan
  & npx wrangler d1 migrations apply $db --remote
  if ($LASTEXITCODE -ne 0) {
    Write-Host "[$db] FAILED" -ForegroundColor Red
    $failed += $db
    break
  }
  Write-Host "[$db] OK" -ForegroundColor Green
}

if ($failed.Count -gt 0) {
  Write-Host ''
  Write-Host 'Migration stopped after the first failure.' -ForegroundColor Red
  Write-Host 'The script does not guess or modify the failed shard.' -ForegroundColor Red
  Write-Host ('Failed shard: ' + ($failed -join ', ')) -ForegroundColor Red
  exit 1
}

Write-Host ''
Write-Host 'Verifying schema on every shard...' -ForegroundColor Yellow

$expected = @(
  'platform_users',
  'platform_authors',
  'platform_content',
  'platform_content_stats',
  'platform_media',
  'platform_content_tags',
  'platform_content_topics',
  'platform_content_channels',
  'platform_follows',
  'platform_comments',
  'platform_reactions',
  'platform_shares',
  'platform_events',
  'platform_feed_candidates',
  'platform_moderation',
  'platform_publish_operations',
  'platform_publish_assets',
  'platform_publish_failures',
  'platform_schema_meta',
  'platform_user_sessions',
  'platform_user_devices',
  'platform_oauth_bindings',
  'platform_categories',
  'platform_tags',
  'platform_topics',
  'platform_drafts',
  'platform_content_versions',
  'platform_comment_reactions',
  'platform_notifications',
  'platform_notification_settings',
  'platform_search_index',
  'platform_search_history',
  'platform_outbox',
  'platform_impressions',
  'platform_content_completions',
  'platform_user_interests',
  'platform_reports'
)

$sql = "SELECT name FROM sqlite_master WHERE type='table' AND name LIKE 'platform_%' ORDER BY name;"

foreach ($db in $Databases) {
  Write-Host "[$db] VERIFY" -ForegroundColor Cyan
  $output = & npx wrangler d1 execute $db --remote --command $sql --json
  if ($LASTEXITCODE -ne 0) {
    throw "Verification failed for $db"
  }

  $joined = ($output | Out-String)
  foreach ($table in $expected) {
    if ($joined -notmatch [regex]::Escape($table)) {
      throw "Verification failed for $db: missing table $table"
    }
  }
  Write-Host "[$db] VERIFIED" -ForegroundColor Green
}

Write-Host ''
Write-Host 'Schema V2 deployment completed and verified on all 8 shards.' -ForegroundColor Green
Write-Host 'Publication atomicity, idempotency, auth, search, outbox, and analytics tables are present.' -ForegroundColor Green
Write-Host 'No destructive ALTER/DROP operation is performed by this migration chain.' -ForegroundColor Green
