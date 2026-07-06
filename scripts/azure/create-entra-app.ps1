param(
    [string]$DisplayName = 'Maude Web App',
    [Parameter(Mandatory)][string]$RedirectUri,
    [int]$SecretYears = 1
)

$tenantId = az account show --query tenantId -o tsv

$app = az ad app create `
    --display-name $DisplayName `
    --web-redirect-uris $RedirectUri `
    --enable-id-token-issuance true `
    --query "{appId:appId,id:id}" `
    -o json | ConvertFrom-Json

$secret = az ad app credential reset `
    --id $app.appId `
    --append `
    --display-name 'container-app-secret' `
    --years $SecretYears `
    --query "{password:password}" `
    -o json | ConvertFrom-Json

[pscustomobject]@{
    tenantId = $tenantId
    clientId = $app.appId
    clientSecret = $secret.password
    redirectUri = $RedirectUri
} | ConvertTo-Json -Depth 4
