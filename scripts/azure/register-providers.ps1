param(
    [Parameter(Mandatory)][string]$SubscriptionId
)

$providers = @(
    'Microsoft.App',
    'Microsoft.ContainerRegistry',
    'Microsoft.DBforPostgreSQL',
    'Microsoft.Insights',
    'Microsoft.KeyVault',
    'Microsoft.OperationalInsights'
)

foreach ($provider in $providers) {
    Write-Host "Registering provider $provider in subscription $SubscriptionId..."
    az provider register --namespace $provider --subscription $SubscriptionId --wait | Out-Null
}

Write-Host "Provider registration complete."
