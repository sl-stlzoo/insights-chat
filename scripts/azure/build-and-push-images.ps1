param(
    [Parameter(Mandatory)][string]$AcrName,
    [string]$Tag = 'latest'
)

$ErrorActionPreference = 'Stop'
[Console]::OutputEncoding = [System.Text.UTF8Encoding]::UTF8
$OutputEncoding = [System.Text.UTF8Encoding]::UTF8

$loginServer = az acr show --name $AcrName --query loginServer -o tsv
if (-not $loginServer) {
    throw "Unable to resolve login server for ACR '$AcrName'."
}

function Wait-ForAcrRun {
    param(
        [Parameter(Mandatory)][string]$RegistryName,
        [Parameter(Mandatory)][string]$RunId
    )

    while ($true) {
        $status = az acr task show-run --registry $RegistryName --run-id $RunId --query status -o tsv
        if ($status -in @('Succeeded', 'Failed', 'Canceled', 'Error')) {
            return $status
        }

        Start-Sleep -Seconds 10
    }
}

Write-Host "Building web image..."
$webRunId = az acr build `
    --registry $AcrName `
    --image "maude-web:$Tag" `
    --file Dockerfile `
    --no-logs `
    --query runId -o tsv `
    .
if ($LASTEXITCODE -ne 0 -or -not $webRunId) {
    throw "Web image build failed."
}
$webStatus = Wait-ForAcrRun -RegistryName $AcrName -RunId $webRunId
if ($webStatus -ne 'Succeeded') {
    throw "Web image build failed with status '$webStatus'."
}

Write-Host "Building docs image..."
$docsRunId = az acr build `
    --registry $AcrName `
    --image "maude-docs:$Tag" `
    --file docs/Dockerfile `
    --no-logs `
    --query runId -o tsv `
    .\docs
if ($LASTEXITCODE -ne 0 -or -not $docsRunId) {
    throw "Docs image build failed."
}
$docsStatus = Wait-ForAcrRun -RegistryName $AcrName -RunId $docsRunId
if ($docsStatus -ne 'Succeeded') {
    throw "Docs image build failed with status '$docsStatus'."
}

[pscustomobject]@{
    webImage = "$loginServer/maude-web:$Tag"
    docsImage = "$loginServer/maude-docs:$Tag"
} | ConvertTo-Json -Depth 4
