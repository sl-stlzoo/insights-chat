import fs from 'node:fs/promises';
import path from 'node:path';

const docsRoot = path.resolve(process.cwd());
const repoRoot = path.resolve(docsRoot, '..');
const docsContentRoot = path.join(docsRoot, 'src', 'content', 'docs');
const generatedRepositoryRoot = path.join(docsContentRoot, 'repository', 'generated');
const generatedSearchRoot = path.join(docsRoot, 'src', 'generated');
const generatedSearchPath = path.join(generatedSearchRoot, 'search-index.json');

const readmeDirectories = [
  '.',
  'app',
  'app/api',
  'app/components',
  'app/share',
  'app/tab',
  'docs',
  'infra',
  'lib',
  'prompts',
  'scripts',
  'teams',
];

const docFileExtensions = new Set(['.md', '.mdx']);

function titleFromDirectory(relativeDirectory) {
  if (relativeDirectory === '.') {
    return 'Repository Root';
  }

  return relativeDirectory
    .split(/[\\/]/)
    .map((segment) => segment.replace(/[-_]/g, ' '))
    .map((segment) => segment.charAt(0).toUpperCase() + segment.slice(1))
    .join(' / ');
}

function stripFrontmatter(content) {
  return content.replace(/^---[\s\S]*?---\s*/u, '');
}

function stripMarkdown(content) {
  return content
    .replace(/```[\s\S]*?```/gu, ' ')
    .replace(/`[^`]+`/gu, ' ')
    .replace(/!\[[^\]]*\]\([^)]+\)/g, ' ')
    .replace(/\[([^\]]+)\]\([^)]+\)/g, '$1')
    .replace(/^#+\s+/gmu, '')
    .replace(/<[^>]+>/gu, ' ')
    .replace(/\s+/gu, ' ')
    .trim();
}

function slugFromDocPath(relativePath) {
  const withoutExtension = relativePath.replace(/\.(md|mdx)$/u, '');
  return withoutExtension.endsWith('/index')
    ? withoutExtension.slice(0, -'/index'.length)
    : withoutExtension;
}

async function exists(targetPath) {
  try {
    await fs.access(targetPath);
    return true;
  } catch {
    return false;
  }
}

async function collectDocFiles(directory, results = []) {
  const entries = await fs.readdir(directory, { withFileTypes: true });

  for (const entry of entries) {
    if (entry.name.startsWith('.')) {
      continue;
    }

    const entryPath = path.join(directory, entry.name);
    if (entry.isDirectory()) {
      await collectDocFiles(entryPath, results);
      continue;
    }

    if (docFileExtensions.has(path.extname(entry.name))) {
      results.push(entryPath);
    }
  }

  return results;
}

async function buildRepositoryPages() {
  await fs.rm(generatedRepositoryRoot, { recursive: true, force: true });
  await fs.mkdir(generatedRepositoryRoot, { recursive: true });

  for (const relativeDirectory of readmeDirectories) {
    const readmePath = path.join(repoRoot, relativeDirectory, 'README.md');
    if (!(await exists(readmePath))) {
      continue;
    }

    const targetDirectory =
      relativeDirectory === '.'
        ? path.join(generatedRepositoryRoot, 'root')
        : path.join(generatedRepositoryRoot, relativeDirectory);

    const sourceContent = await fs.readFile(readmePath, 'utf8');
    const title = titleFromDirectory(relativeDirectory);
    const output = `---\ntitle: ${title}\ndescription: Rolled up from ${relativeDirectory === '.' ? './README.md' : `${relativeDirectory}/README.md`}.\n---\n\n> Source: \`${relativeDirectory === '.' ? './README.md' : `${relativeDirectory}/README.md`}\`\n\n${stripFrontmatter(sourceContent)}`.trim() + '\n';

    await fs.mkdir(targetDirectory, { recursive: true });
    await fs.writeFile(path.join(targetDirectory, 'index.md'), output, 'utf8');
  }
}

async function buildSearchIndex() {
  await fs.mkdir(generatedSearchRoot, { recursive: true });

  const docFiles = await collectDocFiles(docsContentRoot);
  const searchIndex = [];

  for (const docPath of docFiles) {
    const relativePath = path.relative(docsContentRoot, docPath).replace(/\\/gu, '/');
    const raw = await fs.readFile(docPath, 'utf8');
    const titleMatch = raw.match(/^title:\s*(.+)$/mu);
    const descriptionMatch = raw.match(/^description:\s*(.+)$/mu);
    const title = titleMatch ? titleMatch[1].trim() : path.basename(relativePath, path.extname(relativePath));
    const description = descriptionMatch ? descriptionMatch[1].trim() : '';

    searchIndex.push({
      id: slugFromDocPath(relativePath) || 'index',
      title,
      description,
      slug: `/${slugFromDocPath(relativePath) || ''}/`.replace(/\/\/+/gu, '/'),
      body: stripMarkdown(stripFrontmatter(raw)),
    });
  }

  await fs.writeFile(generatedSearchPath, `${JSON.stringify(searchIndex, null, 2)}\n`, 'utf8');
}

await buildRepositoryPages();
await buildSearchIndex();
