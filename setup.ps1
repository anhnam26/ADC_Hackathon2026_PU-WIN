$ErrorActionPreference = 'Stop'
Set-Location -LiteralPath $PSScriptRoot
$venvPath = [IO.Path]::GetFullPath((Join-Path $PSScriptRoot '.venv'))
if ((Split-Path -Parent $venvPath) -ne [IO.Path]::GetFullPath($PSScriptRoot)) { throw 'Invalid venv path' }
if ((Test-Path -LiteralPath $venvPath) -and -not (Test-Path -LiteralPath (Join-Path $venvPath 'Scripts\python.exe'))) {
    # Rebuild only the incomplete project-owned environment, never global Python.
    Remove-Item -LiteralPath $venvPath -Recurse -Force
}
uv python install 3.13
if ($LASTEXITCODE -ne 0) { throw 'Python installation failed' }
if (-not (Test-Path -LiteralPath $venvPath)) {
    uv venv --managed-python --python 3.13 .venv
    if ($LASTEXITCODE -ne 0) { throw 'Virtual environment creation failed' }
}
uv sync --locked
if ($LASTEXITCODE -ne 0) { throw 'Dependency installation failed' }
Write-Host 'Setup complete. Run .\run.ps1 to open the app.'
