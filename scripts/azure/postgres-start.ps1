[CmdletBinding()]
param(
    [Parameter(Mandatory)][string]$ResourceGroupName,
    [Parameter(Mandatory)][string]$ServerName
)

$ErrorActionPreference = 'Stop'

az postgres flexible-server start `
    --resource-group $ResourceGroupName `
    --name $ServerName `
    --only-show-errors | Out-Null

Write-Host "Started PostgreSQL server '$ServerName' in resource group '$ResourceGroupName'."
