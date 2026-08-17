Add-Type -AssemblyName UIAutomationClient
function Get-EdgeWindow($prefix) {
  $root = [System.Windows.Automation.AutomationElement]::RootElement
  $wins = $root.FindAll([System.Windows.Automation.TreeScope]::Children, [System.Windows.Automation.Condition]::TrueCondition)
  foreach ($w in $wins) {
    if ($w.Current.Name -like "$prefix*") { return $w }
  }
  return $null
}
$deadline = (Get-Date).AddSeconds(45)
$clicked = $false
while ((Get-Date) -lt $deadline) {
  $win = Get-EdgeWindow "Welcome"
  if (-not $win) { $win = Get-EdgeWindow "Aruba Central" }
  if ($win) {
    $all = $win.FindAll([System.Windows.Automation.TreeScope]::Descendants, [System.Windows.Automation.Condition]::TrueCondition)
    $want = $false
    foreach ($el in $all) {
      $n = $el.Current.Name
      if ($n -eq "Aruba Central") { $want = $true; continue }
      if ($want -and $n -eq "Allow & select") {
        try {
          $el.GetCurrentPattern([System.Windows.Automation.InvokePattern]::Pattern).Invoke()
          Write-Output "clicked Allow & select for Aruba Central on $($win.Current.Name)"
          $clicked = $true
          break
        } catch {
          Write-Output $_.Exception.Message
        }
      }
    }
  }
  if ($clicked) { break }
  Start-Sleep -Milliseconds 700
}
if (-not $clicked) { Write-Output "picker click timed out" }
echo "Command completed successfully"
