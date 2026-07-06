param location string
param logAnalyticsName string
param applicationInsightsName string
@description('Log Analytics retention in days.')
@minValue(30)
@maxValue(730)
param logAnalyticsRetentionDays int = 30
@description('Daily ingestion cap in GB for Log Analytics workspace.')
@minValue(0)
param logAnalyticsDailyQuotaGb int = 1
@description('Application Insights ingestion sampling percentage (1-100).')
@minValue(1)
@maxValue(100)
param appInsightsSamplingPercentage int = 25
param tags object = {}

resource logAnalyticsWorkspace 'Microsoft.OperationalInsights/workspaces@2022-10-01' = {
  name: logAnalyticsName
  location: location
  tags: tags
  properties: {
    sku: {
      name: 'PerGB2018'
    }
    retentionInDays: logAnalyticsRetentionDays
    workspaceCapping: {
      dailyQuotaGb: logAnalyticsDailyQuotaGb
    }
    features: {
      searchVersion: 1
      legacy: 0
      enableLogAccessUsingOnlyResourcePermissions: true
    }
  }
}

resource applicationInsights 'Microsoft.Insights/components@2020-02-02' = {
  name: applicationInsightsName
  location: location
  tags: tags
  kind: 'web'
  properties: {
    Application_Type: 'web'
    WorkspaceResourceId: logAnalyticsWorkspace.id
    SamplingPercentage: appInsightsSamplingPercentage
  }
}

output logAnalyticsWorkspaceId string = logAnalyticsWorkspace.id
output logAnalyticsCustomerId string = logAnalyticsWorkspace.properties.customerId
output applicationInsightsConnectionString string = applicationInsights.properties.ConnectionString
