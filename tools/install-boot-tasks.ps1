<#
.SYNOPSIS
Start the site and its Cloudflare tunnel at boot, so wardogs.dudgy.net comes
back after a reboot without anyone signing in.

.DESCRIPTION
Registers two Scheduled Tasks in the root folder:

  \WardogRange    tools\run-site.cmd    serve.py on 127.0.0.1:4120
  \WardogsTunnel  tools\run-tunnel.cmd  cloudflared, tunnel `wardogs`

From an elevated shell they run as the current user without a stored password
(S4U), as the ollama-gateway task already does: they start at boot and keep
running while signed out. A logon trigger sits beside the boot one for a
machine that was up before the tasks existed; with MultipleInstances IgnoreNew
it does nothing when the boot run is already going.

Windows only lets an elevated shell register that. From a normal one the
script falls back to tasks that start at sign-in and stop at sign-out, like
UsageHub, and says so. Run it elevated once to upgrade them.

Either way both restart a minute after a crash, without limit, and run under
a headless console so no window appears. Re-running replaces the tasks: a
running copy is stopped first, including the server and tunnel it started,
so the new definition can take the port. -Start starts them afterwards.

    powershell -NoProfile -ExecutionPolicy Bypass -File tools\install-boot-tasks.ps1 -Start
#>
[CmdletBinding(SupportsShouldProcess)]
param([switch] $Start)

$ErrorActionPreference = "Stop"
$root = Split-Path -Parent $PSScriptRoot
$user = "$env:USERDOMAIN\$env:USERNAME"
$port = 4120      # ports get wardog-range; serve.py's default

$settings = New-ScheduledTaskSettingsSet `
    -AllowStartIfOnBatteries `
    -DontStopIfGoingOnBatteries `
    -StartWhenAvailable `
    -MultipleInstances IgnoreNew `
    -ExecutionTimeLimit ([TimeSpan]::Zero) `
    -RestartCount 999 `
    -RestartInterval (New-TimeSpan -Minutes 1)
$atLogOn = New-ScheduledTaskTrigger -AtLogOn -User $user
$boot = @{
    Principal = New-ScheduledTaskPrincipal -UserId $user -LogonType S4U -RunLevel Limited
    Trigger   = @((New-ScheduledTaskTrigger -AtStartup), $atLogOn)
    Label     = "at startup and logon, signed in or not (S4U)"
}
$logon = @{
    Principal = New-ScheduledTaskPrincipal -UserId $user -LogonType Interactive -RunLevel Limited
    Trigger   = @($atLogOn)
    Label     = "at logon only -- run this script elevated to start at boot"
}

# What each task leaves running, matched on its own command line so that
# nothing else on the machine is touched.
function Stop-Leftovers([string] $name) {
    if ($name -eq "WardogRange") {
        $pids = Get-NetTCPConnection -LocalAddress 127.0.0.1 -LocalPort $port -State Listen `
            -ErrorAction SilentlyContinue | Select-Object -ExpandProperty OwningProcess
        $procs = foreach ($id in $pids) {
            Get-CimInstance Win32_Process -Filter "ProcessId=$id" |
                Where-Object { $_.CommandLine -like "*serve.py*" }
        }
    } else {
        $procs = Get-CimInstance Win32_Process -Filter "Name='cloudflared.exe'" |
            Where-Object { $_.CommandLine -like "*wardogs-config.yml*" }
    }
    foreach ($p in $procs) {
        Stop-Process -Id $p.ProcessId -Force
        Write-Host "  stopped $($p.Name) $($p.ProcessId)"
    }
}

$tasks = @(
    @{ Name = "WardogRange"; Script = "run-site.cmd";
       Description = "Wardog Range static site (serve.py) on 127.0.0.1:$port." },
    @{ Name = "WardogsTunnel"; Script = "run-tunnel.cmd";
       Description = "Cloudflare tunnel wardogs: https://wardogs.dudgy.net/ to serve.py." }
)

foreach ($task in $tasks) {
    $script = Join-Path $PSScriptRoot $task.Script
    if (-not (Test-Path $script)) { throw "missing $script" }
    $action = New-ScheduledTaskAction -Execute "$env:SystemRoot\System32\conhost.exe" `
        -Argument "--headless $env:SystemRoot\System32\cmd.exe /d /c `"$script`"" `
        -WorkingDirectory $root
    if (-not $PSCmdlet.ShouldProcess("\$($task.Name)", "register Scheduled Task")) { continue }

    $old = Get-ScheduledTask -TaskName $task.Name -TaskPath "\" -ErrorAction SilentlyContinue
    if ($old -and $old.State -eq "Running") {
        Stop-ScheduledTask -TaskName $task.Name -TaskPath "\"
        Write-Host "Stopped the running \$($task.Name)."
    }
    Stop-Leftovers $task.Name

    $mode = $boot
    try {
        Register-ScheduledTask -TaskName $task.Name -TaskPath "\" -Action $action `
            -Trigger $mode.Trigger -Principal $mode.Principal -Settings $settings `
            -Description $task.Description -Force | Out-Null
    } catch [Microsoft.Management.Infrastructure.CimException] {
        if ($_.Exception.HResult -ne -2147024891 -and $_.Exception.Message -notlike "*Access is denied*") { throw }
        $mode = $logon
        Register-ScheduledTask -TaskName $task.Name -TaskPath "\" -Action $action `
            -Trigger $mode.Trigger -Principal $mode.Principal -Settings $settings `
            -Description $task.Description -Force | Out-Null
    }
    Write-Host "Registered \$($task.Name) as $user, $($mode.Label)."
    if ($Start) {
        Start-ScheduledTask -TaskName $task.Name -TaskPath "\"
        Write-Host "Started \$($task.Name)."
    }
}
