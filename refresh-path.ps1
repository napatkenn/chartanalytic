# Refresh PATH so Node/npm are found after install (run once per terminal)
$env:Path = [System.Environment]::GetEnvironmentVariable("Path","Machine") + ";" + [System.Environment]::GetEnvironmentVariable("Path","User")
Write-Host "PATH refreshed. Checking Node/npm..."
node -v
npm -v
