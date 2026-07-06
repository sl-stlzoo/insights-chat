targetScope = 'resourceGroup'

@description('Short workload prefix used in resource names.')
@minLength(3)
param prefix string = 'maude'

@description('Deployment environment name.')
@minLength(2)
param environmentName string = 'dev'

@description('Azure region for all deployed resources.')
param location string = resourceGroup().location

@description('Public URL for the main application. This is used for NEXTAUTH_URL and should match the Entra app registration redirect URI.')
param publicAppUrl string

@description('Microsoft Entra tenant ID for the web app registration.')
param azureAdTenantId string

@description('Microsoft Entra client ID for the web app registration.')
param azureAdClientId string

@secure()
@description('Microsoft Entra client secret for the web app registration.')
param azureAdClientSecret string

@secure()
@description('Random secret used by NextAuth to sign session cookies.')
param nextAuthSecret string

@secure()
@description('OpenAI API key for the current deployment.')
param openAiApiKey string

@secure()
@description('MotherDuck MCP token used by the application runtime.')
param motherDuckToken string

@secure()
@description('MotherDuck Business-plan admin token used only to create embed sessions for Dives.')
param motherDuckDiveAdminToken string

@description('Dedicated MotherDuck service-account username used for embedded Dive sessions.')
param motherDuckDiveServiceAccountUsername string

@description('Administrator username for the Azure Database for PostgreSQL Flexible Server.')
param postgresAdminUsername string = 'maudeadmin'

@secure()
@description('Administrator password for the Azure Database for PostgreSQL Flexible Server.')
param postgresAdminPassword string

@description('Database name used for report persistence.')
param postgresDatabaseName string = 'maude'

@description('Container image for the main web app.')
param webContainerImage string = 'mcr.microsoft.com/azuredocs/containerapps-helloworld:latest'

@description('Container image for the docs sidecar.')
param docsContainerImage string = 'nginx:alpine'

@description('Optional tags applied to all resources.')
param tags object = {}

@description('Log Analytics retention in days.')
@minValue(7)
@maxValue(730)
param logAnalyticsRetentionDays int = 14

@description('Daily ingestion cap in GB for Log Analytics.')
@minValue(0)
param logAnalyticsDailyQuotaGb int = 1

@description('Application Insights ingestion sampling percentage.')
@minValue(1)
@maxValue(100)
param appInsightsSamplingPercentage int = 25

var normalizedPrefix = toLower(prefix)
var logAnalyticsName = '${normalizedPrefix}-${environmentName}-law'
var appInsightsName = '${normalizedPrefix}-${environmentName}-appi'
var keyVaultName = take('${normalizedPrefix}-${environmentName}-kv', 24)
var containerRegistryName = take(replace('${normalizedPrefix}${environmentName}acr', '-', ''), 50)
var postgresServerName = take('${normalizedPrefix}-${environmentName}-pg', 63)
var managedEnvironmentName = '${normalizedPrefix}-${environmentName}-acae'
var containerAppName = '${normalizedPrefix}-${environmentName}-web'

module monitoring './modules/monitoring.bicep' = {
  name: 'monitoring'
  params: {
    location: location
    logAnalyticsName: logAnalyticsName
    applicationInsightsName: appInsightsName
    logAnalyticsRetentionDays: logAnalyticsRetentionDays
    logAnalyticsDailyQuotaGb: logAnalyticsDailyQuotaGb
    appInsightsSamplingPercentage: appInsightsSamplingPercentage
    tags: tags
  }
}

module keyVault './modules/key-vault.bicep' = {
  name: 'keyVault'
  params: {
    location: location
    keyVaultName: keyVaultName
    tenantId: azureAdTenantId
    tags: tags
  }
}

module containerRegistry './modules/container-registry.bicep' = {
  name: 'containerRegistry'
  params: {
    location: location
    registryName: containerRegistryName
    tags: tags
  }
}

module postgres './modules/postgres-flex.bicep' = {
  name: 'postgres'
  params: {
    location: location
    serverName: postgresServerName
    databaseName: postgresDatabaseName
    adminUsername: postgresAdminUsername
    adminPassword: postgresAdminPassword
    tags: tags
  }
}

module managedEnvironment './modules/container-apps-environment.bicep' = {
  name: 'managedEnvironment'
  params: {
    location: location
    environmentName: managedEnvironmentName
    logAnalyticsWorkspaceId: monitoring.outputs.logAnalyticsWorkspaceId
    tags: tags
  }
}

resource keyVaultResource 'Microsoft.KeyVault/vaults@2023-07-01' existing = {
  name: keyVaultName
}

var postgresConnectionString = 'postgresql://${postgresAdminUsername}:${postgresAdminPassword}@${postgres.outputs.serverFqdn}:5432/${postgres.outputs.databaseName}?sslmode=require'

resource nextAuthSecretResource 'Microsoft.KeyVault/vaults/secrets@2023-07-01' = {
  name: 'nextauth-secret'
  parent: keyVaultResource
  dependsOn: [
    keyVault
  ]
  properties: {
    value: nextAuthSecret
  }
}

resource azureAdClientSecretResource 'Microsoft.KeyVault/vaults/secrets@2023-07-01' = {
  name: 'azure-ad-client-secret'
  parent: keyVaultResource
  dependsOn: [
    keyVault
  ]
  properties: {
    value: azureAdClientSecret
  }
}

resource openAiApiKeyResource 'Microsoft.KeyVault/vaults/secrets@2023-07-01' = {
  name: 'openai-api-key'
  parent: keyVaultResource
  dependsOn: [
    keyVault
  ]
  properties: {
    value: openAiApiKey
  }
}

resource motherDuckTokenResource 'Microsoft.KeyVault/vaults/secrets@2023-07-01' = {
  name: 'motherduck-token'
  parent: keyVaultResource
  dependsOn: [
    keyVault
  ]
  properties: {
    value: motherDuckToken
  }
}

resource motherDuckDiveAdminTokenResource 'Microsoft.KeyVault/vaults/secrets@2023-07-01' = {
  name: 'motherduck-dive-admin-token'
  parent: keyVaultResource
  dependsOn: [
    keyVault
  ]
  properties: {
    value: motherDuckDiveAdminToken
  }
}

resource postgresConnectionStringResource 'Microsoft.KeyVault/vaults/secrets@2023-07-01' = {
  name: 'postgres-connection-string'
  parent: keyVaultResource
  dependsOn: [
    keyVault
    postgres
  ]
  properties: {
    value: postgresConnectionString
  }
}

module containerApp './modules/container-app.bicep' = {
  name: 'containerApp'
  params: {
    location: location
    containerAppName: containerAppName
    managedEnvironmentId: managedEnvironment.outputs.id
    webContainerImage: webContainerImage
    docsContainerImage: docsContainerImage
    publicAppUrl: publicAppUrl
    applicationInsightsConnectionString: monitoring.outputs.applicationInsightsConnectionString
    keyVaultUri: keyVault.outputs.vaultUri
    azureAdTenantId: azureAdTenantId
    azureAdClientId: azureAdClientId
    motherDuckDiveServiceAccountUsername: motherDuckDiveServiceAccountUsername
    nextAuthSecretUri: nextAuthSecretResource.properties.secretUriWithVersion
    azureAdClientSecretUri: azureAdClientSecretResource.properties.secretUriWithVersion
    openAiApiKeyUri: openAiApiKeyResource.properties.secretUriWithVersion
    motherDuckTokenUri: motherDuckTokenResource.properties.secretUriWithVersion
    motherDuckDiveAdminTokenUri: motherDuckDiveAdminTokenResource.properties.secretUriWithVersion
    postgresConnectionStringUri: postgresConnectionStringResource.properties.secretUriWithVersion
    tags: tags
  }
}

resource keyVaultSecretsUserRoleAssignment 'Microsoft.Authorization/roleAssignments@2022-04-01' = {
  name: guid(resourceGroup().id, keyVaultName, containerAppName, 'keyvault-secrets-user')
  scope: keyVaultResource
  properties: {
    roleDefinitionId: subscriptionResourceId(
      'Microsoft.Authorization/roleDefinitions',
      '4633458b-17de-408a-b874-0445c86b69e6'
    )
    principalId: containerApp.outputs.principalId
    principalType: 'ServicePrincipal'
  }
}

resource containerRegistryResource 'Microsoft.ContainerRegistry/registries@2023-07-01' existing = {
  name: containerRegistryName
}

resource acrPullRoleAssignment 'Microsoft.Authorization/roleAssignments@2022-04-01' = {
  name: guid(resourceGroup().id, containerRegistryName, containerAppName, 'acrpull')
  scope: containerRegistryResource
  properties: {
    roleDefinitionId: subscriptionResourceId(
      'Microsoft.Authorization/roleDefinitions',
      '7f951dda-4ed3-4680-a7ca-43fe172d538d'
    )
    principalId: containerApp.outputs.principalId
    principalType: 'ServicePrincipal'
  }
}

output containerAppFqdn string = containerApp.outputs.fqdn
output containerRegistryLoginServer string = containerRegistry.outputs.loginServer
output keyVaultUri string = keyVault.outputs.vaultUri
output postgresServerFqdn string = postgres.outputs.serverFqdn
