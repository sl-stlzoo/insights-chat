import { DefaultAzureCredential, getBearerTokenProvider } from '@azure/identity';
import { AzureOpenAI } from 'openai';

const DEFAULT_FOUNDRY_SCOPE = 'https://cognitiveservices.azure.com/.default';
const DEFAULT_FOUNDRY_API_VERSION = '2024-10-21';

export function createAzureFoundryClient() {
  const endpoint = process.env.AZURE_AI_FOUNDRY_ENDPOINT;

  if (!endpoint) {
    throw new Error('AZURE_AI_FOUNDRY_ENDPOINT environment variable is not set');
  }

  const credential = new DefaultAzureCredential();
  const azureADTokenProvider = getBearerTokenProvider(
    credential,
    process.env.AZURE_AI_FOUNDRY_SCOPE || DEFAULT_FOUNDRY_SCOPE,
  );

  return new AzureOpenAI({
    azureADTokenProvider,
    endpoint,
    apiVersion:
      process.env.AZURE_AI_FOUNDRY_API_VERSION || DEFAULT_FOUNDRY_API_VERSION,
  });
}
