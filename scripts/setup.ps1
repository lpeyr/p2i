[CmdletBinding()]
param(
    [switch]$ResetDb,
    [switch]$SkipSeed,
    [switch]$SkipServer,
    [int]$Port = 3000,
    [string]$Hostname = "127.0.0.1"
)

$ErrorActionPreference = "Stop"

function Write-Step([string]$Message) {
    Write-Host ""
    Write-Host "==> $Message" -ForegroundColor Cyan
}

function Read-DotEnv([string]$Path) {
    $values = @{}

    foreach ($line in Get-Content -Path $Path) {
        if ([string]::IsNullOrWhiteSpace($line)) {
            continue
        }

        if ($line.TrimStart().StartsWith("#")) {
            continue
        }

        $parts = $line -split "=", 2
        if ($parts.Count -eq 2) {
            $values[$parts[0].Trim()] = $parts[1].Trim()
        }
    }

    return $values
}

function Resolve-NodeTools {
    $node = Get-Command node -ErrorAction SilentlyContinue
    $npm = Get-Command npm.cmd -ErrorAction SilentlyContinue
    if ($node -and $npm) {
        return @{
            Node = $node.Source
            Npm = $npm.Source
            Bin = Split-Path -Path $node.Source -Parent
        }
    }

    $fallbackBin = "C:\Program Files\nodejs"
    $fallbackNode = Join-Path $fallbackBin "node.exe"
    $fallbackNpm = Join-Path $fallbackBin "npm.cmd"
    if ((Test-Path -Path $fallbackNode) -and (Test-Path -Path $fallbackNpm)) {
        return @{
            Node = $fallbackNode
            Npm = $fallbackNpm
            Bin = $fallbackBin
        }
    }

    throw "Node.js was not found. Install it or add it to PATH before running this script."
}

function Resolve-MariaDbCli {
    $mariadb = Get-Command mariadb.exe -ErrorAction SilentlyContinue
    if ($mariadb) {
        return $mariadb.Source
    }

    $candidates = Get-ChildItem -Path "C:\Program Files" -Directory -ErrorAction SilentlyContinue |
        Where-Object { $_.Name -like "MariaDB*" } |
        Sort-Object -Property Name -Descending

    foreach ($candidate in $candidates) {
        $cli = Join-Path $candidate.FullName "bin\mariadb.exe"
        if (Test-Path -Path $cli) {
            return $cli
        }
    }

    throw "mariadb.exe was not found. Install MariaDB or add the client to PATH before running this script."
}

function Get-MariaDbBaseArgs {
    $args = @("--skip-ssl", "-h", $script:DbHost, "-P", $script:DbPort, "-u", $script:DbUser)
    if (-not [string]::IsNullOrWhiteSpace($script:DbPassword)) {
        $args += "--password=$($script:DbPassword)"
    }

    return $args
}

function Invoke-MariaDbCommand([string]$Database, [string]$Sql, [switch]$Batch) {
    $args = Get-MariaDbBaseArgs
    if ($Batch) {
        $args += "--batch"
        $args += "--skip-column-names"
    }
    if (-not [string]::IsNullOrWhiteSpace($Database)) {
        $args += $Database
    }
    $args += "-e"
    $args += $Sql

    return & $script:MariaDbExe @args
}

function Invoke-MariaDbFile([string]$Database, [string]$Path) {
    $args = Get-MariaDbBaseArgs
    if (-not [string]::IsNullOrWhiteSpace($Database)) {
        $args += $Database
    }

    Get-Content -Raw -Path $Path | & $script:MariaDbExe @args
}

function Invoke-MariaDbScalar([string]$Database, [string]$Sql) {
    $result = Invoke-MariaDbCommand -Database $Database -Sql $Sql -Batch
    return [string]($result | Select-Object -First 1)
}

function Ensure-MariaDbServiceRunning {
    $service = Get-Service -Name "MariaDB" -ErrorAction SilentlyContinue
    if (-not $service) {
        Write-Warning "MariaDB service was not found. The script will assume the database is already reachable."
        return
    }

    if ($service.Status -eq "Running") {
        return
    }

    Write-Step "Starting MariaDB service"
    try {
        Start-Service -Name $service.Name -ErrorAction Stop
    } catch {
        throw "MariaDB is installed but could not be started. Run PowerShell as Administrator or start the service manually."
    }
}

function Ensure-NpmDependencies {
    $nodeModulesPath = Join-Path $script:AppDir "node_modules"
    if (Test-Path -Path $nodeModulesPath) {
        return
    }

    Write-Step "Installing npm dependencies"
    Push-Location $script:AppDir
    try {
        & $script:NpmExe install
    } finally {
        Pop-Location
    }
}

function Ensure-DatabaseSchema {
    if ($script:DbName -notmatch "^[A-Za-z0-9_]+$") {
        throw "DB_NAME '$($script:DbName)' contains unsupported characters for this setup script."
    }

    Write-Step "Ensuring database '$($script:DbName)' exists"
    Invoke-MariaDbCommand -Database "" -Sql "CREATE DATABASE IF NOT EXISTS $($script:DbName) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;"

    $tableCount = 0
    try {
        $tableCount = [int](Invoke-MariaDbScalar -Database "" -Sql "SELECT COUNT(*) FROM information_schema.tables WHERE table_schema = '$($script:DbName)' AND table_name IN ('Utilisateur', 'Semelle', 'Session', 'MesureGPS', 'MesureFlexi', 'MesureAccel');")
    } catch {
        $tableCount = 0
    }

    if (-not $ResetDb -and $tableCount -eq 6) {
        Write-Step "Database schema already present"
        return
    }

    Write-Step "Applying schema from bdd/creation.sql"
    Invoke-MariaDbFile -Database $script:DbName -Path $script:SchemaPath
}

function Seed-SampleData {
    $seedSql = @"
INSERT INTO Utilisateur (nom, prenom, role, age, poids, taille)
VALUES ('Doe', 'Rayane', 'patient', 24, 72, 178);

INSERT INTO Semelle (idUser, devEUI, side)
VALUES
    (1, 'ABCDEF1234567890', 'left'),
    (1, '1234567890ABCDEF', 'right');

INSERT INTO Session (dateDebut, dateFin, semelle1, semelle2, step, averageStepTime)
VALUES ('2026-05-27 08:15:00', '2026-05-27 08:47:00', 1, 2, 2840, 0.68);

INSERT INTO MesureGPS (time, lattitude, longitude, idSession, idSemelle)
VALUES
    ('2026-05-27 08:15:00', 45.782562, 4.872407, 1, 1),
    ('2026-05-27 08:20:00', 45.783100, 4.873210, 1, 1),
    ('2026-05-27 08:27:00', 45.784020, 4.874500, 1, 1),
    ('2026-05-27 08:34:00', 45.784880, 4.875410, 1, 1),
    ('2026-05-27 08:41:00', 45.785640, 4.876020, 1, 1),
    ('2026-05-27 08:47:00', 45.786100, 4.876880, 1, 1),
    ('2026-05-27 08:15:05', 45.782560, 4.872409, 1, 2),
    ('2026-05-27 08:20:05', 45.783102, 4.873215, 1, 2),
    ('2026-05-27 08:27:05', 45.784025, 4.874505, 1, 2),
    ('2026-05-27 08:34:05', 45.784885, 4.875415, 1, 2),
    ('2026-05-27 08:41:05', 45.785645, 4.876025, 1, 2),
    ('2026-05-27 08:47:05', 45.786105, 4.876885, 1, 2);

INSERT INTO MesureFlexi (time, flexi1, flexi2, flexi3, idSession, idSemelle)
VALUES
    ('2026-05-27 08:16:00', 1, 0, 1, 1, 1),
    ('2026-05-27 08:18:00', 1, 1, 1, 1, 1),
    ('2026-05-27 08:22:00', 0, 1, 1, 1, 1),
    ('2026-05-27 08:29:00', 1, 1, 0, 1, 1),
    ('2026-05-27 08:36:00', 1, 0, 0, 1, 1),
    ('2026-05-27 08:43:00', 1, 1, 1, 1, 1),
    ('2026-05-27 08:16:05', 0, 1, 1, 1, 2),
    ('2026-05-27 08:18:05', 1, 1, 0, 1, 2),
    ('2026-05-27 08:22:05', 1, 0, 1, 1, 2),
    ('2026-05-27 08:29:05', 1, 1, 1, 1, 2),
    ('2026-05-27 08:36:05', 0, 1, 0, 1, 2),
    ('2026-05-27 08:43:05', 1, 1, 1, 1, 2);

INSERT INTO MesureAccel (time, accel, idSession, idSemelle)
VALUES
    ('2026-05-27 08:16:00', 0.92, 1, 1),
    ('2026-05-27 08:18:00', 1.08, 1, 1),
    ('2026-05-27 08:22:00', 0.88, 1, 1),
    ('2026-05-27 08:29:00', 1.12, 1, 1),
    ('2026-05-27 08:36:00', 0.95, 1, 1),
    ('2026-05-27 08:43:00', 1.04, 1, 1),
    ('2026-05-27 08:16:05', 0.90, 1, 2),
    ('2026-05-27 08:18:05', 1.02, 1, 2),
    ('2026-05-27 08:22:05', 0.93, 1, 2),
    ('2026-05-27 08:29:05', 1.10, 1, 2),
    ('2026-05-27 08:36:05', 0.97, 1, 2),
    ('2026-05-27 08:43:05', 1.01, 1, 2);
"@

    Invoke-MariaDbCommand -Database $script:DbName -Sql $seedSql
}

function Ensure-SeedData {
    if ($SkipSeed) {
        Write-Step "Skipping sample data seed"
        return
    }

    $userCount = [int](Invoke-MariaDbScalar -Database $script:DbName -Sql "SELECT COUNT(*) FROM Utilisateur;")
    if ($userCount -gt 0) {
        $user1Count = [int](Invoke-MariaDbScalar -Database $script:DbName -Sql "SELECT COUNT(*) FROM Utilisateur WHERE idUser = 1;")
        if ($user1Count -eq 0) {
            Write-Warning "The database is not empty, but user 1 is missing. The current app expects idUser = 1 on the home page."
        } else {
            Write-Step "Seed data already present"
        }
        return
    }

    Write-Step "Seeding sample data"
    Seed-SampleData
}

function Start-DevServer {
    if ($SkipServer) {
        Write-Step "Skipping dev server start"
        return
    }

    Write-Step "Starting semelle on http://$Hostname`:$Port"
    Push-Location $script:AppDir
    try {
        & $script:NpmExe run dev -- --hostname $Hostname --port $Port
    } finally {
        Pop-Location
    }
}

$script:RepoRoot = (Resolve-Path (Join-Path $PSScriptRoot "..")).Path
$script:AppDir = Join-Path $script:RepoRoot "semelle"
$script:SchemaPath = Join-Path $script:RepoRoot "bdd\creation.sql"
$envPath = Join-Path $script:AppDir ".env.local"

if (-not (Test-Path -Path $script:AppDir)) {
    throw "The semelle app directory was not found at '$script:AppDir'."
}

if (-not (Test-Path -Path $script:SchemaPath)) {
    throw "The database schema file was not found at '$script:SchemaPath'."
}

if (-not (Test-Path -Path $envPath)) {
    throw "The app env file was not found at '$envPath'. Create semelle/.env.local first."
}

$nodeTools = Resolve-NodeTools
$env:PATH = "$($nodeTools.Bin);$env:PATH"
$script:NpmExe = $nodeTools.Npm
$script:MariaDbExe = Resolve-MariaDbCli

$envValues = Read-DotEnv -Path $envPath
$script:DbHost = if ($envValues.ContainsKey("DB_HOST") -and $envValues["DB_HOST"]) { $envValues["DB_HOST"] } else { "127.0.0.1" }
$script:DbPort = if ($envValues.ContainsKey("DB_PORT") -and $envValues["DB_PORT"]) { $envValues["DB_PORT"] } else { "3306" }
$script:DbUser = if ($envValues.ContainsKey("DB_USER") -and $envValues["DB_USER"]) { $envValues["DB_USER"] } else { "root" }
$script:DbPassword = if ($envValues.ContainsKey("DB_PASSWORD")) { $envValues["DB_PASSWORD"] } else { "" }
$script:DbName = if ($envValues.ContainsKey("DB_NAME") -and $envValues["DB_NAME"]) { $envValues["DB_NAME"] } else { "semelle" }

Ensure-MariaDbServiceRunning
Ensure-NpmDependencies
Ensure-DatabaseSchema
Ensure-SeedData
Start-DevServer
