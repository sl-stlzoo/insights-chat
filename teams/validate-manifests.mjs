import { readFileSync } from 'node:fs';
import path from 'node:path';

const manifestFiles = [
  'manifest.template.json',
  'manifest.dev.json',
  'manifest.pilot.json',
  'manifest.prod.json',
];

const manifestDirectory = path.resolve(process.cwd(), 'teams');

function assertManifest(condition, message) {
  if (!condition) {
    throw new Error(message);
  }
}

function validateManifest(manifestFile) {
  const manifestPath = path.join(manifestDirectory, manifestFile);
  const manifest = JSON.parse(readFileSync(manifestPath, 'utf8'));

  assertManifest(Array.isArray(manifest.permissions), `${manifestFile}: permissions must be an array.`);
  assertManifest(manifest.permissions.includes('identity'), `${manifestFile}: permissions must include identity.`);
  assertManifest(
    manifest.permissions.length === 1 && manifest.permissions[0] === 'identity',
    `${manifestFile}: permissions must stay least-privilege (identity only).`,
  );

  assertManifest(Array.isArray(manifest.validDomains), `${manifestFile}: validDomains must be an array.`);
  assertManifest(manifest.validDomains.length > 0, `${manifestFile}: validDomains must not be empty.`);
  assertManifest(
    manifest.validDomains.every(domain => typeof domain === 'string' && !domain.includes('*')),
    `${manifestFile}: validDomains must not use wildcard entries.`,
  );

  assertManifest(
    manifest.webApplicationInfo && typeof manifest.webApplicationInfo.id === 'string' && manifest.webApplicationInfo.id.length > 0,
    `${manifestFile}: webApplicationInfo.id is required.`,
  );
  assertManifest(
    manifest.webApplicationInfo &&
      typeof manifest.webApplicationInfo.resource === 'string' &&
      manifest.webApplicationInfo.resource.length > 0,
    `${manifestFile}: webApplicationInfo.resource is required.`,
  );

  assertManifest(Array.isArray(manifest.staticTabs), `${manifestFile}: staticTabs must be an array.`);
  assertManifest(manifest.staticTabs.length > 0, `${manifestFile}: staticTabs must not be empty.`);

  for (const tab of manifest.staticTabs) {
    assertManifest(typeof tab.contentUrl === 'string', `${manifestFile}: staticTabs[].contentUrl is required.`);
    assertManifest(tab.contentUrl.includes('/tab/explorer'), `${manifestFile}: contentUrl must target /tab/explorer.`);
    assertManifest(tab.contentUrl.startsWith('https://') || tab.contentUrl.includes('${PUBLIC_APP_URL}'), `${manifestFile}: contentUrl must be HTTPS.`);
  }

  assertManifest(Array.isArray(manifest.bots), `${manifestFile}: bots must be an array.`);
  assertManifest(manifest.bots.length > 0, `${manifestFile}: at least one bot definition is required.`);
  assertManifest(
    manifest.bots.every(bot => Array.isArray(bot.scopes) && bot.scopes.includes('personal')),
    `${manifestFile}: bots must include personal scope.`,
  );
}

for (const manifestFile of manifestFiles) {
  validateManifest(manifestFile);
}

console.log(`Teams manifest validation passed for ${manifestFiles.length} files.`);
