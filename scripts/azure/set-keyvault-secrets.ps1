[CmdletBinding()]
param(
    [Parameter(Mandatory)][string]$KeyVaultName
)

$ErrorActionPreference = 'Stop'

function Set-SecretValue {
    param(
        [Parameter(Mandatory)][string]$SecretName,
        [Parameter(Mandatory)][string]$Prompt
    )

    $value = Read-Host -Prompt $Prompt -AsSecureString
    $bstr = [Runtime.InteropServices.Marshal]::SecureStringToBSTR($value)
    try {
        $plain = [Runtime.InteropServices.Marshal]::PtrToStringBSTR($bstr)
        if ([string]::IsNullOrWhiteSpace($plain)) {
            throw "No value provided for secret '$SecretName'."
        }

        az keyvault secret set `
            --vault-name $KeyVaultName `
            --name $SecretName `
            --value $plain `
            --only-show-errors | Out-Null
    }
    finally {
        [Runtime.InteropServices.Marshal]::ZeroFreeBSTR($bstr)
    }
}

Write-Host "Setting required application secrets in Key Vault '$KeyVaultName'..."

Set-SecretValue -SecretName 'azure-ad-client-secret' -Prompt 'Enter Azure AD client secret'
Set-SecretValue -SecretName 'nextauth-secret' -Prompt 'Enter NEXTAUTH secret'
Set-SecretValue -SecretName 'openai-api-key' -Prompt 'Enter OpenAI API key'
Set-SecretValue -SecretName 'motherduck-token' -Prompt 'Enter MotherDuck token'
Set-SecretValue -SecretName 'motherduck-dive-admin-token' -Prompt 'Enter MotherDuck Dive admin token'
Set-SecretValue -SecretName 'postgres-admin-password' -Prompt 'Enter PostgreSQL admin password'

Write-Host "All required secrets were written to Key Vault '$KeyVaultName'."
