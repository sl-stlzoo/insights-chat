param location string
param containerAppName string
param managedEnvironmentId string
param containerRegistryServer string
param webContainerImage string
param docsContainerImage string
param publicAppUrl string
param applicationInsightsConnectionString string
param keyVaultUri string
param azureAdTenantId string
param azureAdClientId string
param motherDuckDiveServiceAccountUsername string
param tags object = {}

param nextAuthSecretUri string
param azureAdClientSecretUri string
param openAiApiKeyUri string
param motherDuckTokenUri string
param motherDuckDiveAdminTokenUri string
param postgresConnectionStringUri string

resource containerApp 'Microsoft.App/containerApps@2024-03-01' = {
  name: containerAppName
  location: location
  tags: tags
  identity: {
    type: 'SystemAssigned'
  }
  properties: {
    environmentId: managedEnvironmentId
    configuration: {
      activeRevisionsMode: 'single'
      registries: [
        {
          server: containerRegistryServer
          identity: 'system'
        }
      ]
      ingress: {
        external: true
        targetPort: 3000
        transport: 'auto'
      }
      secrets: [
        {
          name: 'nextauth-secret'
          identity: 'system'
          keyVaultUrl: nextAuthSecretUri
        }
        {
          name: 'azure-ad-client-secret'
          identity: 'system'
          keyVaultUrl: azureAdClientSecretUri
        }
        {
          name: 'openai-api-key'
          identity: 'system'
          keyVaultUrl: openAiApiKeyUri
        }
        {
          name: 'motherduck-token'
          identity: 'system'
          keyVaultUrl: motherDuckTokenUri
        }
        {
          name: 'motherduck-dive-admin-token'
          identity: 'system'
          keyVaultUrl: motherDuckDiveAdminTokenUri
        }
        {
          name: 'postgres-connection-string'
          identity: 'system'
          keyVaultUrl: postgresConnectionStringUri
        }
      ]
    }
    template: {
      scale: {
        minReplicas: 0
        maxReplicas: 3
        rules: [
          {
            name: 'http-requests'
            http: {
              metadata: {
                concurrentRequests: '50'
              }
            }
          }
          {
            name: 'business-hours-central'
            custom: {
              type: 'cron'
              metadata: {
                timezone: 'America/Chicago'
                start: '0 8 * * *'
                end: '0 20 * * *'
                desiredReplicas: '1'
              }
            }
          }
        ]
      }
      containers: [
        {
          name: 'web'
          image: webContainerImage
          resources: {
            cpu: json('0.75')
            memory: '1.5Gi'
          }
          env: [
            {
              name: 'NODE_ENV'
              value: 'production'
            }
            {
              name: 'PORT'
              value: '3000'
            }
            {
              name: 'NEXTAUTH_URL'
              value: publicAppUrl
            }
            {
              name: 'NEXTAUTH_SECRET'
              secretRef: 'nextauth-secret'
            }
            {
              name: 'AZURE_AD_TENANT_ID'
              value: azureAdTenantId
            }
            {
              name: 'AZURE_AD_CLIENT_ID'
              value: azureAdClientId
            }
            {
              name: 'AZURE_AD_CLIENT_SECRET'
              secretRef: 'azure-ad-client-secret'
            }
            {
              name: 'OPENAI_API_KEY'
              secretRef: 'openai-api-key'
            }
            {
              name: 'MOTHERDUCK_TOKEN'
              secretRef: 'motherduck-token'
            }
            {
              name: 'MOTHERDUCK_DIVE_ADMIN_TOKEN'
              secretRef: 'motherduck-dive-admin-token'
            }
            {
              name: 'MOTHERDUCK_DIVE_SERVICE_ACCOUNT_USERNAME'
              value: motherDuckDiveServiceAccountUsername
            }
            {
              name: 'POSTGRES_DATABASE_URL'
              secretRef: 'postgres-connection-string'
            }
            {
              name: 'PLANETSCALE_DATABASE_URL'
              secretRef: 'postgres-connection-string'
            }
            {
              name: 'DOCS_PROXY_ORIGIN'
              value: 'http://127.0.0.1:4321'
            }
            {
              name: 'KEY_VAULT_URI'
              value: keyVaultUri
            }
            {
              name: 'APPLICATIONINSIGHTS_CONNECTION_STRING'
              value: applicationInsightsConnectionString
            }
          ]
          probes: [
            {
              type: 'Liveness'
              httpGet: {
                path: '/api/health'
                port: 3000
                httpHeaders: []
              }
              initialDelaySeconds: 30
              periodSeconds: 20
            }
            {
              type: 'Readiness'
              httpGet: {
                path: '/api/health'
                port: 3000
                httpHeaders: []
              }
              initialDelaySeconds: 15
              periodSeconds: 15
            }
          ]
        }
        {
          name: 'docs'
          image: docsContainerImage
          resources: {
            cpu: json('0.25')
            memory: '0.5Gi'
          }
        }
      ]
    }
  }
}

output id string = containerApp.id
output principalId string = containerApp.identity.principalId
output fqdn string = containerApp.properties.configuration.ingress.fqdn
