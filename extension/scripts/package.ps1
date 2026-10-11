$ErrorActionPreference = 'Stop'
$project = (Resolve-Path (Join-Path $PSScriptRoot '..')).Path
$dist = Join-Path $project 'dist'
$package = Get-Content -LiteralPath (Join-Path $project 'package.json') -Raw | ConvertFrom-Json
$version = $package.version
$out = Join-Path $dist 'packages'
if (-not (Test-Path -LiteralPath (Join-Path $dist 'manifest.json'))) { throw 'Build the extension first with npm run build.' }
New-Item -ItemType Directory -Path $out -Force | Out-Null
foreach ($browser in @('chromium', 'firefox')) {
  $source = if ($browser -eq 'chromium') { $dist } else { Join-Path $dist 'firefox' }
  if (-not (Test-Path -LiteralPath (Join-Path $source 'manifest.json'))) { throw "Missing $browser build. Run npm run build again." }
  $destination = Join-Path $out "tiktok-repost-remover-$browser-v$version.zip"
  Remove-Item -LiteralPath $destination -Force -ErrorAction SilentlyContinue
  $stage = Join-Path $out (".stage-" + [guid]::NewGuid().ToString('N'))
  $resolvedStage = [IO.Path]::GetFullPath($stage)
  if (-not $resolvedStage.StartsWith([IO.Path]::GetFullPath($out), [StringComparison]::OrdinalIgnoreCase)) { throw 'Unsafe temporary package path.' }
  try {
    New-Item -ItemType Directory -Path (Join-Path $stage 'icons') -Force | Out-Null
    foreach ($file in @('manifest.json','background.js','content.js','popup.js','popup.html','popup.css','options.js','options.html','options.css','review.js','review.html','review.css')) {
      $sourceFile = Join-Path $source $file
      if (-not (Test-Path -LiteralPath $sourceFile)) { throw "Missing required install file: $sourceFile" }
      Copy-Item -LiteralPath $sourceFile -Destination $stage
    }
    Get-ChildItem -LiteralPath (Join-Path $source 'icons') -File | Copy-Item -Destination (Join-Path $stage 'icons')
    Copy-Item -LiteralPath (Join-Path $project 'LICENSE') -Destination $stage
    Copy-Item -LiteralPath (Join-Path $project 'INSTALLATION.md') -Destination $stage
    Compress-Archive -Path (Join-Path $stage '*') -DestinationPath $destination -CompressionLevel Optimal
  } finally {
    if (Test-Path -LiteralPath $stage) { Remove-Item -LiteralPath $stage -Recurse -Force }
  }
  Write-Output "Created $destination"
}
