import { NextRequest } from 'next/server';
import { createMcpClient, getMcpTools, executeTool, closeMcpClient } from '@/lib/mcp-client';
import {
  BLENDED_MODEL,
  FAST_MODEL,
  STRONG_MODEL,
  createOpenAIClient,
  resolveChatModel,
  type LlmMessage,
  type LlmTool,
  type LlmToolCall,
  runTextCompletion,
  runToolAwareCompletion,
} from '@/lib/openai-provider';
import { readFileSync } from 'fs';
import { isAbsolute, join } from 'path';
import { query } from '@/lib/planetscale';
import { marked } from 'marked';

// Generate a random ID for content storage
function generateContentId(length: number = 64): string {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
  let result = '';
  const randomValues = new Uint8Array(length);
  crypto.getRandomValues(randomValues);
  for (let i = 0; i < length; i++) {
    result += chars[randomValues[i] % chars.length];
  }
  return result;
}

// Detect if text contains HTML content
function containsHtml(text: string): boolean {
  const trimmed = text.trim();
  const lowerTrimmed = trimmed.toLowerCase();

  // Check for HTML document markers
  if (lowerTrimmed.startsWith('<!doctype html')) return true;
  if (lowerTrimmed.startsWith('<html')) return true;

  // Check for markdown code block with html
  const htmlCodeBlockMatch = trimmed.match(/```html\s*([\s\S]*?)\n```/) || trimmed.match(/```html\s*([\s\S]*)```$/);
  if (htmlCodeBlockMatch) {
    const htmlContent = htmlCodeBlockMatch[1].trim().toLowerCase();
    if (htmlContent.startsWith('<!doctype html') || htmlContent.startsWith('<html')) {
      return true;
    }
  }

  // Check for raw HTML in text
  if (lowerTrimmed.includes('<!doctype html') && lowerTrimmed.includes('</html>')) {
    return true;
  }
  if (lowerTrimmed.includes('<html') && lowerTrimmed.includes('</html>')) {
    return true;
  }

  return false;
}

// Extract HTML content from text (handles markdown code blocks)
function extractHtmlContent(text: string): string | null {
  const trimmed = text.trim();

  // Check for markdown HTML code block
  const htmlCodeBlockMatch = trimmed.match(/```html\s*([\s\S]*?)\n```/) || trimmed.match(/```html\s*([\s\S]*)```$/);
  if (htmlCodeBlockMatch) {
    const htmlContent = htmlCodeBlockMatch[1].trim();
    const htmlLower = htmlContent.toLowerCase();
    if (htmlLower.startsWith('<!doctype html') || htmlLower.startsWith('<html')) {
      return htmlContent;
    }
  }

  // Check for direct HTML
  const lowerTrimmed = trimmed.toLowerCase();
  if (lowerTrimmed.startsWith('<!doctype html') || lowerTrimmed.startsWith('<html')) {
    return trimmed;
  }

  // Extract raw HTML from text
  const rawHtmlMatch = trimmed.match(/(<!DOCTYPE html[\s\S]*<\/html>)/i);
  if (rawHtmlMatch) {
    return rawHtmlMatch[1].trim();
  }

  const rawHtmlMatch2 = trimmed.match(/(<html[\s\S]*<\/html>)/i);
  if (rawHtmlMatch2) {
    return rawHtmlMatch2[1].trim();
  }

  return null;
}

// Metadata to include in saved HTML
interface HtmlMetadata {
  question: string;
  sqlQueries: Array<{ sql: string; result?: string }>;
  intermediateOutput: string[];
  model: string;
  timestamp: string;
  isMobile?: boolean;
}

// Escape HTML comment content to prevent breaking out of comments
function escapeHtmlComment(text: string): string {
  return text.replace(/-->/g, '--&gt;').replace(/<!--/g, '&lt;!--');
}

// Inject metadata as HTML comments into the HTML content
function injectMetadataComments(html: string, metadata: HtmlMetadata): string {
  const metadataComment = `
<!--
=== REPORT METADATA ===
Generated: ${metadata.timestamp}
Model: ${metadata.model}

=== USER QUESTION ===
${escapeHtmlComment(metadata.question)}

=== SQL QUERIES ===
${metadata.sqlQueries.map((q, i) => `
--- Query ${i + 1} ---
${escapeHtmlComment(q.sql)}
${q.result ? `\n--- Result ${i + 1} ---\n${escapeHtmlComment(q.result.slice(0, 2000))}${q.result.length > 2000 ? '\n... (truncated)' : ''}` : ''}`).join('\n')}

=== INTERMEDIATE OUTPUT ===
${metadata.intermediateOutput.map(o => escapeHtmlComment(o)).join('\n\n')}

=== END METADATA ===
-->
`;

  // Insert inside <head> tag so it's accessible via document.documentElement.outerHTML
  const headMatch = html.match(/(<head[^>]*>)/i);
  if (headMatch) {
    const headIndex = html.indexOf(headMatch[1]) + headMatch[1].length;
    return html.slice(0, headIndex) + metadataComment + html.slice(headIndex);
  }
  // Fallback: insert after <!DOCTYPE html>
  const doctypeMatch = html.match(/^(<!DOCTYPE[^>]*>)/i);
  if (doctypeMatch) {
    return doctypeMatch[1] + metadataComment + html.slice(doctypeMatch[1].length);
  }
  return metadataComment + html;
}

// Convert sparkline syntax to inline SVG
function sparklineToSvg(values: number[]): string {
  if (values.length === 0) return '';
  const width = 80;
  const height = 20;
  const padding = 2;
  const min = Math.min(...values);
  const max = Math.max(...values);
  const range = max - min || 1;

  const points = values.map((v, i) => {
    const x = padding + (i / (values.length - 1)) * (width - padding * 2);
    const y = height - padding - ((v - min) / range) * (height - padding * 2);
    return `${x},${y}`;
  }).join(' ');

  return `<svg width="${width}" height="${height}" style="vertical-align: middle;"><polyline fill="none" stroke="#666" stroke-width="1.5" points="${points}"/></svg>`;
}

// Process markdown text to convert sparkline syntax to SVG
function processSparklines(text: string): string {
  // First, remove backticks around sparkline syntax so it doesn't become <code> blocks
  let processed = text.replace(/`(sparkline\([^)]+\))`/g, '$1');
  // Then convert sparkline syntax to SVG
  processed = processed.replace(/sparkline\(([^)]+)\)/g, (match, values) => {
    const nums = values.split(',').map((v: string) => parseFloat(v.trim())).filter((n: number) => !isNaN(n));
    if (nums.length >= 2) {
      return sparklineToSvg(nums);
    }
    return match;
  });
  return processed;
}

// Convert markdown to styled HTML document with optional charts and maps
function markdownToHtml(
  markdown: string,
  metadata?: HtmlMetadata,
  charts?: Array<Record<string, unknown>>,
  maps?: Array<Record<string, unknown>>
): string {
  // Process sparklines before markdown rendering
  const processedMarkdown = processSparklines(markdown);

  // Render markdown to HTML
  const contentHtml = marked.parse(processedMarkdown) as string;

  // Generate chart containers and scripts
  const hasCharts = charts && charts.length > 0;
  const hasMaps = maps && maps.length > 0;

  const chartContainers = hasCharts
    ? charts.map((_, i) => `<div class="chart-container"><canvas id="chart-${i}"></canvas></div>`).join('\n')
    : '';

  const mapContainers = hasMaps
    ? maps.map((spec, i) => `<div class="map-container"><div class="map-title">${(spec as { title?: string }).title || ''}</div><div id="map-${i}" class="map-canvas"></div></div>`).join('\n')
    : '';

  // Chart.js rendering script
  const chartScript = hasCharts ? `
<script src="https://cdn.jsdelivr.net/npm/chart.js@4.4.1/dist/chart.umd.min.js"></script>
<script>
const chartData = ${JSON.stringify(charts)};
const COLORS = ['#FFDE00', '#6FC2FF', '#53DBC9', '#FF7169', '#2BA5FF', '#F4EFEA'];

chartData.forEach((spec, i) => {
  const ctx = document.getElementById('chart-' + i).getContext('2d');
  const labels = spec.data.map(d => d[spec.xKey]);
  const values = spec.data.map(d => d[spec.yKey]);

  let config;
  if (spec.type === 'pie') {
    config = {
      type: 'pie',
      data: {
        labels: labels,
        datasets: [{
          data: values,
          backgroundColor: COLORS,
          borderColor: '#383838',
          borderWidth: 1
        }]
      },
      options: {
        responsive: true,
        plugins: {
          title: { display: true, text: spec.title, font: { size: 14, family: 'Palatino, Georgia, serif' } },
          legend: { position: 'bottom' }
        }
      }
    };
  } else if (spec.type === 'bar') {
    config = {
      type: 'bar',
      data: {
        labels: labels,
        datasets: [{
          label: spec.yKey,
          data: values,
          backgroundColor: '#FFDE00',
          borderColor: '#383838',
          borderWidth: 1
        }]
      },
      options: {
        responsive: true,
        plugins: {
          title: { display: true, text: spec.title, font: { size: 14, family: 'Palatino, Georgia, serif' } },
          legend: { display: false }
        },
        scales: {
          y: { beginAtZero: true }
        }
      }
    };
  } else {
    // line chart (default)
    config = {
      type: 'line',
      data: {
        labels: labels,
        datasets: [{
          label: spec.yKey,
          data: values,
          borderColor: '#2BA5FF',
          backgroundColor: 'rgba(43, 165, 255, 0.1)',
          borderWidth: 2,
          tension: 0.1,
          fill: true
        }]
      },
      options: {
        responsive: true,
        plugins: {
          title: { display: true, text: spec.title, font: { size: 14, family: 'Palatino, Georgia, serif' } },
          legend: { display: false }
        },
        scales: {
          y: { beginAtZero: false }
        }
      }
    };
  }

  new Chart(ctx, config);
});
</script>` : '';

  // Leaflet map rendering script
  const mapScript = hasMaps ? `
<link rel="stylesheet" href="https://unpkg.com/leaflet@1.9.4/dist/leaflet.css" />
<script src="https://unpkg.com/leaflet@1.9.4/dist/leaflet.js"></script>
<script>
const mapData = ${JSON.stringify(maps)};

mapData.forEach((spec, i) => {
  const data = spec.data || [];
  const valueLabel = spec.valueLabel || 'Value';

  // Calculate center from data if not provided
  let center = spec.center;
  if (!center && data.length > 0) {
    const avgLat = data.reduce((sum, loc) => sum + loc.lat, 0) / data.length;
    const avgLng = data.reduce((sum, loc) => sum + loc.lng, 0) / data.length;
    center = [avgLat, avgLng];
  } else if (!center) {
    center = [39.8283, -98.5795]; // Default to center of USA
  }

  const zoom = spec.zoom || 4;
  const map = L.map('map-' + i).setView(center, zoom);

  L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
    attribution: '&copy; OpenStreetMap'
  }).addTo(map);

  // Calculate radius based on value relative to max
  const maxValue = Math.max(...data.map(d => d.value), 1);
  const getRadius = (value) => Math.min(Math.max((value / maxValue) * 25, 6), 35);

  data.forEach(loc => {
    const circle = L.circleMarker([loc.lat, loc.lng], {
      radius: getRadius(loc.value),
      fillColor: '#FFDE00',
      color: '#383838',
      weight: 2,
      fillOpacity: 0.8
    }).addTo(map);

    let popupContent = '<strong>' + loc.label + '</strong><hr style="margin:8px 0;border:none;border-top:1px solid #e2e8f0">';
    popupContent += '<div style="display:flex;justify-content:space-between"><span style="color:#718096">' + valueLabel + ':</span><strong>' + loc.value.toLocaleString() + '</strong></div>';

    if (loc.details) {
      Object.entries(loc.details).forEach(([key, val]) => {
        popupContent += '<div style="display:flex;justify-content:space-between"><span style="color:#718096">' + key + ':</span><span>' + (typeof val === 'number' ? val.toLocaleString() : val) + '</span></div>';
      });
    }

    circle.bindPopup(popupContent);
  });
});
</script>` : '';

  // Create full HTML document with Tufte-inspired styling
  const html = `<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <link href="https://fonts.googleapis.com/css2?family=Source+Sans+Pro:wght@400;600&display=swap" rel="stylesheet">
    <style>
        * { box-sizing: border-box; margin: 0; padding: 0; }
        body {
            font-family: Palatino, Georgia, serif;
            background: #fffff8;
            padding: 40px 60px;
            max-width: 900px;
            margin: 0 auto;
            color: #111;
            line-height: 1.6;
        }
        h1 { font-size: 2em; font-weight: normal; margin-bottom: 0.5em; border-bottom: 1px solid #ccc; padding-bottom: 0.3em; }
        h2 { font-size: 1.5em; font-weight: normal; margin-top: 1.5em; margin-bottom: 0.5em; color: #333; }
        h3 { font-size: 1.2em; font-weight: 600; margin-top: 1.2em; margin-bottom: 0.4em; }
        p { margin-bottom: 1em; }
        table { width: 100%; border-collapse: collapse; margin: 1.5em 0; font-size: 0.9em; }
        th { text-align: left; font-weight: 400; color: #666; font-size: 0.85em; text-transform: uppercase; letter-spacing: 0.5px; padding: 8px 12px 8px 0; border-bottom: 2px solid #ccc; }
        td { padding: 10px 12px 10px 0; border-bottom: 1px solid #eee; vertical-align: middle; }
        th:last-child, td:last-child { text-align: right; padding-right: 0; }
        tr:hover { background: rgba(0,0,0,0.02); }
        .num { font-family: 'Source Sans Pro', sans-serif; font-variant-numeric: tabular-nums; }
        code { background: #f5f5f5; padding: 2px 6px; border-radius: 3px; font-size: 0.9em; }
        pre { background: #f5f5f5; padding: 16px; border-radius: 4px; overflow-x: auto; margin: 1em 0; }
        pre code { background: none; padding: 0; }
        ul, ol { margin: 1em 0; padding-left: 1.5em; }
        li { margin-bottom: 0.5em; }
        strong { font-weight: 600; }
        blockquote { border-left: 3px solid #ccc; padding-left: 1em; margin: 1em 0; color: #666; }
        a { color: #a00; text-decoration: none; }
        a:hover { text-decoration: underline; }
        .chart-container { margin: 2em 0; width: 100%; }
        .map-container { margin: 2em 0; }
        .map-title { font-size: 1.1em; font-weight: 600; margin-bottom: 0.5em; }
        .map-canvas { height: 400px; border: 1px solid #ddd; border-radius: 4px; }
        @media (max-width: 600px) {
            body { padding: 20px; }
            table { font-size: 0.8em; }
            .map-canvas { height: 300px; }
        }
    </style>
</head>
<body>
${contentHtml}
${chartContainers}
${mapContainers}
${chartScript}
${mapScript}
</body>
</html>`;

  return html;
}

// Save HTML content to database and return ID
async function saveHtmlContent(html: string, metadata?: HtmlMetadata): Promise<string | null> {
  try {
    const id = generateContentId();
    const htmlWithMetadata = metadata ? injectMetadataComments(html, metadata) : html;
    const model = metadata?.model || null;
    const isMobile = metadata?.isMobile ?? false;
    await query(
      `INSERT INTO shares (id, html_content, model, is_mobile, created_at, expires_at)
       VALUES ($1, $2, $3, $4, NOW(), NOW() + INTERVAL '30 days')`,
      [id, htmlWithMetadata, model, isMobile]
    );
    return id;
  } catch (error) {
    console.error('[Chat API] Failed to save HTML content:', error);
    return null;
  }
}

// Fetch HTML content from a shared report
async function fetchSharedReportHtml(shareId: string): Promise<string | null> {
  try {
    const result = await query<{ html_content: string }>(
      `SELECT html_content FROM shares WHERE id = $1 AND expires_at > NOW()`,
      [shareId]
    );
    if (result.rows.length === 0) {
      console.log('[Chat API] Shared report not found or expired:', shareId);
      return null;
    }
    return result.rows[0].html_content;
  } catch (error) {
    console.error('[Chat API] Failed to fetch shared report:', error);
    return null;
  }
}

// Retry configuration
const MAX_RETRIES = 3;
const RETRY_DELAY_MS = 1000;

// Check if an error is retryable (transient OpenAI issues)
function isRetryableError(error: unknown): boolean {
  if (error instanceof Error) {
    const msg = error.message.toLowerCase();
    return (
      msg.includes('network error') ||
      msg.includes('timeout') ||
      msg.includes('timed out') ||
      msg.includes('rate limit') ||
      msg.includes('overloaded') ||
      msg.includes('temporarily unavailable') ||
      msg.includes('econnreset') ||
      msg.includes('socket hang up')
    );
  }
  return false;
}

// Sleep helper
const sleep = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

const DEFAULT_MODEL = FAST_MODEL;

// Custom tool for chart generation
const chartTool: LlmTool = {
  type: 'function',
  function: {
    name: 'generate_chart',
    description: 'Generate a chart to visualize data. Use this after querying data to create visual representations. The chart will be displayed inline in the chat.',
    parameters: {
      type: 'object',
      properties: {
        type: {
          type: 'string',
          enum: ['line', 'bar', 'pie', 'xmr'],
          description: 'The type of chart to generate. Use line for trends over time, bar for comparisons, pie for proportions, xmr for statistical process control.',
        },
        title: {
          type: 'string',
          description: 'A descriptive title for the chart.',
        },
        data: {
          type: 'array',
          items: {
            type: 'object',
          },
          description: 'Array of data objects. Each object should have keys matching xKey and yKey.',
        },
        xKey: {
          type: 'string',
          description: 'The key in data objects to use for the x-axis (categories/labels).',
        },
        yKey: {
          type: 'string',
          description: 'The key in data objects to use for the y-axis (values).',
        },
      },
      required: ['type', 'title', 'data', 'xKey', 'yKey'],
    },
  },
};

// Custom tool for map generation
const mapTool: LlmTool = {
  type: 'function',
  function: {
    name: 'generate_map',
    description: 'Generate an interactive map to visualize geographic data. Use this when data has location information (latitude/longitude, cities, states, regions, countries). The map will display markers sized by value with popup details.',
    parameters: {
      type: 'object',
      properties: {
        title: {
          type: 'string',
          description: 'A descriptive title for the map.',
        },
        data: {
          type: 'array',
          items: {
            type: 'object',
            properties: {
              lat: { type: 'number', description: 'Latitude coordinate' },
              lng: { type: 'number', description: 'Longitude coordinate' },
              label: { type: 'string', description: 'Location name or label for the marker' },
              value: { type: 'number', description: 'Numeric value that determines marker size' },
              details: { type: 'object', description: 'Optional additional key-value pairs to show in popup' },
            },
            required: ['lat', 'lng', 'label', 'value'],
          },
          description: 'Array of location objects with coordinates and data.',
        },
        center: {
          type: 'array',
          items: { type: 'number' },
          description: 'Optional [lat, lng] center point for the map. If not provided, will be calculated from data.',
        },
        zoom: {
          type: 'number',
          description: 'Optional zoom level (1-18). Default is 4 for country-level view.',
        },
        valueLabel: {
          type: 'string',
          description: 'Label for the value field in popups (e.g., "Revenue", "Orders", "Sales").',
        },
      },
      required: ['title', 'data'],
    },
  },
};

interface ChatMessage {
  role: 'user' | 'assistant';
  content: string;
}

interface ChatRequest {
  messages: ChatMessage[];
  isMobile?: boolean;
  includeMetadata?: boolean;
  model?: string;
  shareId?: string; // ID of a shared report to use as context
}

type McpClient = Awaited<ReturnType<typeof createMcpClient>>;

const DEFAULT_ALLOWED_DATABASES = ['za_edw_pov'];
const DEFAULT_METADATA_FILE = 'metadata/za_edw_pov.md';

function parseAllowedDatabases(rawValue: string | undefined): string[] {
  if (!rawValue?.trim()) return [...DEFAULT_ALLOWED_DATABASES];
  const parsed = rawValue
    .split(',')
    .map((entry) => entry.trim())
    .filter(Boolean);
  return parsed.length > 0 ? parsed : [...DEFAULT_ALLOWED_DATABASES];
}

const ALLOWED_DATABASES = parseAllowedDatabases(process.env.MOTHERDUCK_ALLOWED_DATABASES);
const DEFAULT_DATABASE = process.env.MOTHERDUCK_DEFAULT_DATABASE?.trim() || ALLOWED_DATABASES[0] || '';
const METADATA_FILE = process.env.MOTHERDUCK_METADATA_FILE?.trim() || DEFAULT_METADATA_FILE;
const DEFAULT_CONTEXT_AUDIENCE = 'business stakeholders';
const CONTEXT_AUDIENCE = process.env.MOTHERDUCK_CONTEXT_AUDIENCE?.trim() || DEFAULT_CONTEXT_AUDIENCE;

function resolveMetadataFilePath(metadataFile: string): string {
  return isAbsolute(metadataFile) ? metadataFile : join(process.cwd(), metadataFile);
}

function getDatabaseConfigurationError(): string | undefined {
  if (ALLOWED_DATABASES.length === 0) {
    return 'MOTHERDUCK_ALLOWED_DATABASES resolved to an empty list.';
  }
  if (!DEFAULT_DATABASE) {
    return 'MOTHERDUCK_DEFAULT_DATABASE is empty and no allowed database fallback is available.';
  }
  if (!ALLOWED_DATABASES.some((db) => db.toLowerCase() === DEFAULT_DATABASE.toLowerCase())) {
    return `MOTHERDUCK_DEFAULT_DATABASE '${DEFAULT_DATABASE}' must be included in MOTHERDUCK_ALLOWED_DATABASES (${ALLOWED_DATABASES.join(', ')}).`;
  }
  return undefined;
}

// Load prompt files from disk
const promptsDir = join(process.cwd(), 'prompts');

function loadPromptFile(filename: string): string {
  try {
    return readFileSync(join(promptsDir, filename), 'utf-8');
  } catch (error) {
    console.error(`[Prompts] Failed to load ${filename}:`, error);
    return '';
  }
}

// Cache loaded prompts
const promptCache: Record<string, string> = {};

function getPrompt(filename: string): string {
  if (!promptCache[filename]) {
    promptCache[filename] = loadPromptFile(filename);
  }
  return promptCache[filename];
}

function buildDatabaseRulesPrompt(): string {
  const template = getPrompt('database-rules.md').replace(/^# .*\n+/, '');
  return composePrompt(template, {
    ALLOWED_DATABASES: ALLOWED_DATABASES.join(', '),
    DEFAULT_DATABASE,
  });
}

// Dynamic content generators
const getMobileLayoutInstructions = (isMobile: boolean) => isMobile ? `**MOBILE LAYOUT**: The user is on a mobile device. Generate reports with a single-column layout optimized for narrow screens (max-width: 400px). Use stacked sections instead of grids, larger touch-friendly text, and avoid wide tables. Keep visualizations simple and vertically oriented.

` : '';

const getMetadataSection = (metadata?: string) => metadata ? `**DATABASE METADATA**:
${metadata}

` : '';

const getMetadataUsageInstructions = (metadata?: string) => metadata ? `**USE THE PROVIDED METADATA**: The DATABASE METADATA section above contains complete table schemas. DO NOT use list_tables or list_columns tools - you already have all table and column information. Go directly to running SQL queries.

` : '';

// Compose a prompt by replacing placeholders with actual content
function composePrompt(template: string, replacements: Record<string, string>): string {
  let result = template;
  for (const [key, value] of Object.entries(replacements)) {
    result = result.replace(new RegExp(`\\{\\{${key}\\}\\}`, 'g'), value);
  }
  // Remove any unreplaced placeholders
  result = result.replace(/\{\{[A-Z_]+\}\}/g, '');
  return result;
}

// Build the shared data gathering prompt component
const buildDataGatheringPromptComponent = (metadata?: string) => {
  const template = getPrompt('system-prompt-data-gathering.md').replace(/^# .*\n+/, '');

  return composePrompt(template, {
    'DATABASE_METADATA': getMetadataSection(metadata),
    'METADATA_USAGE_INSTRUCTIONS': getMetadataUsageInstructions(metadata),
    'NARRATION_DATABASE': getPrompt('narration-database.md').replace(/^# .*\n+/, ''),
    'DATABASE_RULES': buildDatabaseRulesPrompt(),
    'SCHEMA_EXPLORATION_STEP': metadata ? 'Review the DATABASE METADATA above' : 'Use list_tables and list_columns tools',
  });
};

// Build the shared report generation prompt component
const buildReportGenerationPromptComponent = (isMobile: boolean) => {
  const template = getPrompt('system-prompt-report-generation.md').replace(/^# .*\n+/, '');

  return composePrompt(template, {
    'MOBILE_LAYOUT_INSTRUCTIONS': getMobileLayoutInstructions(isMobile),
    'NARRATION_REPORT': getPrompt('narration-report.md').replace(/^# .*\n+/, ''),
    'TUFTE_STYLE_GUIDE': getPrompt('tufte-style-guide.md').replace(/^# .*\n+/, ''),
    'HTML_TEMPLATE': getPrompt('html-template.md').replace(/^# .*\n+/, ''),
  });
};

// Build the system prompt for standalone mode (any model)
const getSystemPrompt = (isMobile: boolean, metadata?: string) => {
  const template = getPrompt('standalone-system-prompt.md').replace(/^# .*\n+/, '');

  return composePrompt(template, {
    'ALLOWED_DATABASES': ALLOWED_DATABASES.join(', '),
    'DEFAULT_DATABASE': DEFAULT_DATABASE,
    'DATA_GATHERING_PROMPT': buildDataGatheringPromptComponent(metadata),
    'REPORT_GENERATION_PROMPT': buildReportGenerationPromptComponent(isMobile),
  });
};

// Build the data gathering prompt for Gemini in blended mode
const getDataGatheringPrompt = (metadata?: string) => {
  const template = getPrompt('blended-data-gathering-prompt.md').replace(/^# .*\n+/, '');

  return composePrompt(template, {
    'ALLOWED_DATABASES': ALLOWED_DATABASES.join(', '),
    'DEFAULT_DATABASE': DEFAULT_DATABASE,
    'DATA_GATHERING_PROMPT': buildDataGatheringPromptComponent(metadata),
    'SKIP_SCHEMA_INSTRUCTION': metadata ? 'DO NOT waste time exploring schema - use the metadata provided. ' : '',
  });
};

// Build the report generation prompt for Opus in blended mode
const getReportGenerationPrompt = (isMobile: boolean) => {
  const template = getPrompt('blended-report-generation-prompt.md').replace(/^# .*\n+/, '');

  return composePrompt(template, {
    'ALLOWED_DATABASES': ALLOWED_DATABASES.join(', '),
    'DEFAULT_DATABASE': DEFAULT_DATABASE,
    'DATABASE_RULES': buildDatabaseRulesPrompt(),
    'REPORT_GENERATION_PROMPT': buildReportGenerationPromptComponent(isMobile),
  });
};

async function runDatabaseAccessPreflight(mcpClient: McpClient, mcpTools: LlmTool[]): Promise<void> {
  const availableTools = new Set(mcpTools.map((tool) => tool.function.name));
  const defaultDbLower = DEFAULT_DATABASE.toLowerCase();

  if (availableTools.has('list_databases')) {
    const dbListRaw = await executeTool(mcpClient, 'list_databases', {});
    if (!dbListRaw.toLowerCase().includes(defaultDbLower)) {
      throw new Error(
        `Configured database '${DEFAULT_DATABASE}' was not returned by list_databases. Ensure the MotherDuck token can access this database.`,
      );
    }
  }

  if (availableTools.has('list_tables')) {
    await executeTool(mcpClient, 'list_tables', { database: DEFAULT_DATABASE });
    return;
  }

  if (availableTools.has('query')) {
    await executeTool(mcpClient, 'query', { sql: 'SELECT 1 AS connectivity_check' });
    return;
  }

  throw new Error('MCP preflight failed: neither list_tables nor query tools are available.');
}

// Check if a database reference is allowed
function isDatabaseAllowed(dbName: string): boolean {
  const normalized = dbName.toLowerCase().trim();
  return ALLOWED_DATABASES.some(allowed =>
    normalized === allowed.toLowerCase() ||
    normalized.startsWith(allowed.toLowerCase() + '.')
  );
}

// Validate tool arguments for database access
function validateToolAccess(toolName: string, args: Record<string, unknown>): { allowed: boolean; message?: string } {
  // Check database parameter in list_tables, list_columns, query tools
  if (args.database && typeof args.database === 'string') {
    if (!isDatabaseAllowed(args.database)) {
      return {
        allowed: false,
        message: `Access denied: Database '${args.database}' is not in the allowed list. You can only access: ${ALLOWED_DATABASES.join(', ')}`
      };
    }
  }

  // Check SQL queries for unauthorized database references
  // Only look for explicit three-part names (database.schema.table) or two-part (database.table)
  // Be careful not to match table aliases, function calls, or EXTRACT(...FROM...) patterns
  if (args.sql && typeof args.sql === 'string') {
    const sql = args.sql;
    // Look for patterns like: FROM database.table or JOIN database.table
    // Must be at the start of a clause (not inside parentheses like EXTRACT(... FROM ...))
    // Negative lookbehind for open paren to avoid matching function syntax
    // Use a simpler approach: only flag explicit database.schema.table patterns with known non-allowed databases
    const dbRefPattern = /\b(?:FROM|JOIN|INTO)\s+([a-zA-Z_][a-zA-Z0-9_]{2,})\.([a-zA-Z_][a-zA-Z0-9_]*)/gi;
    let match;
    while ((match = dbRefPattern.exec(sql)) !== null) {
      const potentialDb = match[1];
      const afterDot = match[2];
      // Skip common schema names (main, public, etc.) - these aren't database references
      if (['main', 'public', 'information_schema', 'pg_catalog'].includes(potentialDb.toLowerCase())) continue;
      // Skip if it looks like a table.column reference (afterDot is a column-like name)
      // Only flag if the first part looks like a database name and is NOT allowed
      if (!isDatabaseAllowed(potentialDb)) {
        return {
          allowed: false,
          message: `Access denied: Query references unauthorized database '${potentialDb}'. You can only access: ${ALLOWED_DATABASES.join(', ')}`
        };
      }
    }
  }

  return { allowed: true };
}

function convertToLlmMessages(messages: ChatMessage[]): LlmMessage[] {
  return messages.map(msg => ({
    role: msg.role,
    content: msg.content,
  }));
}

function parseToolArguments(toolCall: LlmToolCall): Record<string, unknown> {
  try {
    return JSON.parse(toolCall.function.arguments || '{}') as Record<string, unknown>;
  } catch {
    return {};
  }
}

function createAssistantToolMessage(text: string, toolCalls: LlmToolCall[]): LlmMessage {
  return {
    role: 'assistant',
    content: text || null,
    tool_calls: toolCalls,
  };
}

function createToolResultMessage(toolCallId: string, content: string): LlmMessage {
  return {
    role: 'tool',
    tool_call_id: toolCallId,
    content,
  };
}

function parseJsonObject(text: string): Record<string, unknown> | null {
  try {
    const parsed = JSON.parse(text);
    return parsed && typeof parsed === 'object' ? parsed as Record<string, unknown> : null;
  } catch {
    const objectMatch = text.match(/\{[\s\S]*\}/);
    if (!objectMatch) {
      return null;
    }

    try {
      const parsed = JSON.parse(objectMatch[0]);
      return parsed && typeof parsed === 'object' ? parsed as Record<string, unknown> : null;
    } catch {
      return null;
    }
  }
}

function extractDivePreview(toolName: string, input: Record<string, unknown>, toolResult: string) {
  if (!['create_dive', 'save_dive', 'update_dive', 'share_dive_data'].includes(toolName)) {
    return null;
  }

  const parsed = parseJsonObject(toolResult);
  const diveRecord =
    parsed?.dive && typeof parsed.dive === 'object'
      ? parsed.dive as Record<string, unknown>
      : null;

  const diveUrl =
    typeof parsed?.dive_url === 'string'
      ? parsed.dive_url
      : typeof parsed?.url === 'string'
        ? parsed.url
        : toolResult.match(/https:\/\/app\.motherduck\.com\/dives\/[0-9a-f-]+/i)?.[0];

  const diveId =
    typeof diveRecord?.id === 'string'
      ? diveRecord.id
      : typeof input.diveId === 'string'
        ? input.diveId
        : diveUrl?.split('/').pop();

  if (!diveId) {
    return null;
  }

  return {
    diveId,
    diveUrl,
    title:
      typeof diveRecord?.title === 'string'
        ? diveRecord.title
        : typeof input.title === 'string'
          ? input.title
          : 'Live Dive preview',
    version:
      typeof diveRecord?.version === 'number'
        ? diveRecord.version
        : typeof diveRecord?.current_version === 'number'
          ? diveRecord.current_version
          : undefined,
  };
}

// Helper to check if request was aborted
function isAborted(signal: AbortSignal): boolean {
  return signal.aborted;
}

export async function POST(request: NextRequest) {
  // Get abort signal from request for cancellation support
  const abortSignal = request.signal;
  const requestStartTime = Date.now();
  let llmCallCount = 0;
  let toolCallCount = 0;

  // Helper for timing logs
  const logTiming = (label: string, startTime: number) => {
    const duration = Date.now() - startTime;
    console.log(`[Chat API] ⏱️  ${label}: ${duration}ms`);
    return duration;
  };

  try {
    const body: ChatRequest = await request.json();
    const { messages, isMobile = false, includeMetadata = true, model, shareId } = body;

    const selectedModel = resolveChatModel(model || DEFAULT_MODEL);
    const databaseConfigError = getDatabaseConfigurationError();
    if (databaseConfigError) {
      return new Response(JSON.stringify({ error: `Database configuration error: ${databaseConfigError}` }), {
        status: 500,
        headers: { 'Content-Type': 'application/json' },
      });
    }
    console.log(`\n${'='.repeat(80)}`);
    console.log(`[Chat API] 🚀 REQUEST STARTED at ${new Date().toISOString()}`);
    console.log(`[Chat API] Model: ${model || DEFAULT_MODEL} -> ${selectedModel}, Mobile: ${isMobile}, Metadata: ${includeMetadata}`);
    console.log(`[Chat API] Allowed DBs: ${ALLOWED_DATABASES.join(', ')}, Default DB: ${DEFAULT_DATABASE}`);
    console.log(`${'='.repeat(80)}`);
    if (shareId) {
      console.log('[Chat API] shareId provided:', shareId);
    }

    if (!messages || messages.length === 0) {
      return new Response(JSON.stringify({ error: 'No messages provided' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    // If shareId is provided, fetch the shared report HTML and prepend as context
    const processedMessages = [...messages];
    if (shareId) {
      const sharedHtml = await fetchSharedReportHtml(shareId);
      if (sharedHtml) {
        console.log('[Chat API] Fetched shared report HTML, length:', sharedHtml.length);
        const lastUserMessageIndex = processedMessages.findLastIndex(m => m.role === 'user');
        if (lastUserMessageIndex !== -1) {
          const originalMessage = processedMessages[lastUserMessageIndex].content;
          const template = getPrompt('user-shared-report-context.md').replace(/^# .*\n+/, '');
          processedMessages[lastUserMessageIndex] = {
            ...processedMessages[lastUserMessageIndex],
            content: composePrompt(template, {
              'SHARED_HTML': sharedHtml,
              'ORIGINAL_MESSAGE': originalMessage,
            }),
          };
        }
      }
    }

    // Read metadata file if requested
    let metadata: string | undefined;
    try {
      const metadataPath = resolveMetadataFilePath(METADATA_FILE);
      metadata = readFileSync(metadataPath, 'utf-8');
      console.log(`[Chat API] Loaded metadata file '${metadataPath}', length: ${metadata.length}`);
    } catch {
      console.log(`[Chat API] Metadata file '${METADATA_FILE}' not found, continuing without it`);
    }

    const openai = createOpenAIClient();

    // Create MCP client and get tools
    let mcpClient;
    let mcpTools: LlmTool[] = [];
    try {
      mcpClient = await createMcpClient();
      mcpTools = await getMcpTools(mcpClient);
      console.log(`[Chat API] Got ${mcpTools.length} tools from MCP server`);
      await runDatabaseAccessPreflight(mcpClient, mcpTools);
      console.log(`[Chat API] MCP preflight succeeded for database '${DEFAULT_DATABASE}'`);
    } catch (error) {
      console.error('[Chat API] Failed to connect to MCP server:', error);
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      return new Response(JSON.stringify({ error: `Failed to connect to MotherDuck or access database '${DEFAULT_DATABASE}': ${errorMessage}` }), {
        status: 500,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    const filteredMcpTools = mcpTools.filter(tool => tool.function.name !== 'list_databases');
    const tools: LlmTool[] = [...filteredMcpTools, chartTool, mapTool];
    const dataGatheringTools: LlmTool[] = [...filteredMcpTools];
    const isBlendedMode = selectedModel === BLENDED_MODEL;

    const encoder = new TextEncoder();

    const stream = new ReadableStream({
      async start(controller) {
        const send = (event: Record<string, unknown>) => {
          controller.enqueue(encoder.encode(`data: ${JSON.stringify(event)}\n\n`));
        };
        const closeStream = () => {
          try {
            controller.close();
          } catch {
            // stream already closed
          }
        };

        const handleCancellation = async (message: string) => {
          console.log(message);
          try {
            send({ type: 'cancelled' });
          } catch {
            // ignore disconnected client
          }
          closeStream();
        };

        const executeToolCalls = async ({
          toolCalls,
          sqlQueries,
          chartSpecs,
          mapSpecs,
          logPrefix,
        }: {
          toolCalls: LlmToolCall[];
          sqlQueries: Array<{ sql: string; result?: string }>;
          chartSpecs?: Array<Record<string, unknown>>;
          mapSpecs?: Array<Record<string, unknown>>;
          logPrefix: string;
        }): Promise<LlmMessage[]> => {
          const preparedCalls = toolCalls.map(toolCall => ({
            toolCall,
            input: parseToolArguments(toolCall),
          }));

          for (const { toolCall, input } of preparedCalls) {
            const sql = input.sql as string | undefined;
            send({ type: 'tool_start', tool: toolCall.function.name, sql: sql || undefined });
          }

          const toolMessages = await Promise.all(preparedCalls.map(async ({ toolCall, input }) => {
            toolCallCount++;
            const toolStartTime = Date.now();
            const toolName = toolCall.function.name;

            console.log(`[Chat API] 🔧 ${logPrefix} TOOL START #${toolCallCount}: ${toolName}`);
            console.log(`[Chat API]    Input: ${JSON.stringify(input, null, 2).slice(0, 500)}${JSON.stringify(input).length > 500 ? '...' : ''}`);

            try {
              if (toolName === 'generate_chart') {
                const chartSpec = input as Record<string, unknown>;
                send({ type: 'chart', spec: chartSpec });
                chartSpecs?.push(chartSpec);
                logTiming(`Tool ${toolName}`, toolStartTime);
                console.log(`[Chat API] 🔧 ${logPrefix} TOOL END #${toolCallCount}: ${toolName} - Chart generated`);
                return createToolResultMessage(toolCall.id, 'Chart generated and displayed to user.');
              }

              if (toolName === 'generate_map') {
                const mapSpec = input as Record<string, unknown>;
                send({ type: 'map', spec: mapSpec });
                mapSpecs?.push(mapSpec);
                logTiming(`Tool ${toolName}`, toolStartTime);
                console.log(`[Chat API] 🔧 ${logPrefix} TOOL END #${toolCallCount}: ${toolName} - Map generated`);
                return createToolResultMessage(toolCall.id, 'Map generated and displayed to user.');
              }

              const validation = validateToolAccess(toolName, input);
              if (!validation.allowed) {
                logTiming(`Tool ${toolName} (denied)`, toolStartTime);
                console.log(`[Chat API] 🔧 ${logPrefix} TOOL END #${toolCallCount}: ${toolName} - ACCESS DENIED`);
                return createToolResultMessage(toolCall.id, `Error: ${validation.message || 'Access denied'}`);
              }

              const sql = input.sql as string | undefined;
              const toolResult = await executeTool(mcpClient!, toolName, input);
              const toolDuration = logTiming(`Tool ${toolName}`, toolStartTime);
              console.log(`[Chat API] 🔧 ${logPrefix} TOOL END #${toolCallCount}: ${toolName} (${toolDuration}ms, ${toolResult.length} chars)`);
              console.log(`[Chat API]    Output: ${toolResult.slice(0, 500)}${toolResult.length > 500 ? '... [truncated]' : ''}`);

              if (sql && toolName === 'query') {
                sqlQueries.push({ sql, result: toolResult });
              }

              const divePreview = extractDivePreview(toolName, input, toolResult);
              if (divePreview) {
                send({
                  type: 'dive_saved',
                  diveId: divePreview.diveId,
                  diveUrl: divePreview.diveUrl,
                  title: divePreview.title,
                  version: divePreview.version,
                });
              }

              return createToolResultMessage(toolCall.id, toolResult);
            } catch (error) {
              const toolDuration = logTiming(`Tool ${toolName} (error)`, toolStartTime);
              console.error(`[Chat API] 🔧 ${logPrefix} TOOL ERROR #${toolCallCount}: ${toolName} (${toolDuration}ms)`, error);
              return createToolResultMessage(toolCall.id, `Error executing tool: ${error instanceof Error ? error.message : 'Unknown error'}`);
            }
          }));

          for (const { toolCall } of preparedCalls) {
            send({ type: 'tool_end', tool: toolCall.function.name });
          }

          return toolMessages;
        };

        try {
          let chatMessages = convertToLlmMessages(processedMessages);

          if (isBlendedMode) {
            console.log('[Chat API] Starting BLENDED mode - Phase 1: GPT-4.1 mini data gathering');
            send({ type: 'text', content: 'Gathering data with GPT-4.1 mini...\n\n' });

            let fastMessages = convertToLlmMessages(processedMessages);
            let collectedData = '';
            let continueGathering = true;
            let gatherIteration = 0;
            let fastRetryCount = 0;
            const blendedUserQuestion = messages[messages.length - 1]?.content || '';
            const blendedSqlQueries: Array<{ sql: string; result?: string }> = [];
            const blendedIntermediateOutput: string[] = [];

            while (continueGathering) {
              if (isAborted(abortSignal)) {
                await handleCancellation('[Chat API] Request aborted by client during GPT-4.1 mini data gathering');
                return;
              }

              gatherIteration++;
              llmCallCount++;

              const dataGatheringSystemPrompt = getDataGatheringPrompt(metadata);
              console.log(`\n${'─'.repeat(60)}`);
              console.log(`[Chat API] 📤 BLENDED PHASE 1 - GPT-4.1 MINI CALL #${llmCallCount} (iteration ${gatherIteration})`);
              console.log(`${'─'.repeat(60)}`);

              if (gatherIteration === 1) {
                console.log(`[Chat API] 📋 SYSTEM PROMPT (${dataGatheringSystemPrompt.length} chars):`);
                console.log(dataGatheringSystemPrompt.slice(0, 2000) + (dataGatheringSystemPrompt.length > 2000 ? '\n... [truncated]' : ''));
              }

              console.log(`[Chat API] 💬 MESSAGES (${fastMessages.length} total):`);
              for (const msg of fastMessages) {
                const contentStr = msg.content ?? JSON.stringify(msg.tool_calls ?? []);
                const truncated = contentStr.length > 1000 ? contentStr.slice(0, 1000) + '\n... [truncated]' : contentStr;
                console.log(`[Chat API]   [${msg.role}]: ${truncated}`);
              }

              const fastLlmStartTime = Date.now();
              console.log(`[Chat API] ⏳ Starting GPT-4.1 mini call at ${new Date().toISOString()}`);

              let completion;
              try {
                completion = await runToolAwareCompletion({
                  client: openai,
                  model: FAST_MODEL,
                  systemPrompt: dataGatheringSystemPrompt,
                  tools: dataGatheringTools,
                  messages: fastMessages,
                  maxCompletionTokens: 8192,
                  signal: abortSignal,
                });
              } catch (error) {
                console.error('[Chat API] Blended GPT-4.1 mini error:', error);

                if (isAborted(abortSignal) || (error instanceof Error && error.name === 'AbortError')) {
                  await handleCancellation('[Chat API] Request aborted by client during GPT-4.1 mini data gathering');
                  return;
                }

                if (isRetryableError(error) && fastRetryCount < MAX_RETRIES) {
                  fastRetryCount++;
                  console.log(`[Chat API] Blended GPT-4.1 mini retryable error, attempt ${fastRetryCount}/${MAX_RETRIES}. Retrying...`);
                  send({ type: 'text', content: `\n[Retrying GPT-4.1 mini ${fastRetryCount}/${MAX_RETRIES}...]\n` });
                  await sleep(RETRY_DELAY_MS * fastRetryCount);
                  continue;
                }

                const errMsg = error instanceof Error ? error.message : 'Request error';
                send({ type: 'error', message: `GPT-4.1 mini error: ${errMsg}` });
                send({ type: 'done' });
                closeStream();
                return;
              }

              fastRetryCount = 0;
              const fastResponseText = completion.text;
              const toolCalls = completion.toolCalls;
              const fastLlmDuration = logTiming(`GPT-4.1 mini LLM call #${llmCallCount}`, fastLlmStartTime);
              console.log(`[Chat API] 📥 GPT-4.1 MINI RESPONSE #${llmCallCount} (${fastResponseText.length} chars, ${fastLlmDuration}ms):`);
              console.log(fastResponseText.slice(0, 1000) + (fastResponseText.length > 1000 ? '\n... [truncated]' : ''));

              if (fastResponseText) {
                send({ type: 'text', content: fastResponseText });
                collectedData += fastResponseText + '\n';
                blendedIntermediateOutput.push(fastResponseText);
              }

              if (toolCalls.length > 0) {
                console.log(`\n[Chat API] 🔧 GPT-4.1 MINI TOOL CALLS: ${toolCalls.length} tool(s) to execute`);
                const toolMessages = await executeToolCalls({
                  toolCalls,
                  sqlQueries: blendedSqlQueries,
                  logPrefix: 'GPT-4.1 MINI',
                });

                fastMessages = [
                  ...fastMessages,
                  createAssistantToolMessage(fastResponseText, toolCalls),
                  ...toolMessages,
                ];

                for (const toolMessage of toolMessages) {
                  collectedData += `\n**Tool Result**\n${toolMessage.content || ''}\n`;
                }
              } else {
                continueGathering = false;
              }
            }

            console.log(`\n[Chat API] ✅ BLENDED PHASE 1 COMPLETE - Data collected: ${collectedData.length} chars`);

            if (isAborted(abortSignal)) {
              await handleCancellation('[Chat API] Request aborted by client before GPT-4.1 report generation');
              return;
            }

            console.log(`\n${'─'.repeat(60)}`);
            console.log('[Chat API] 📤 BLENDED PHASE 2 - GPT-4.1 REPORT GENERATION');
            console.log(`${'─'.repeat(60)}`);
            send({ type: 'text', content: '\nGenerating report with GPT-4.1...\n\n' });

            const reportTemplate = getPrompt('user-blended-opus-input.md').replace(/^# .*\n+/, '');
            const reportUserMessage = composePrompt(reportTemplate, {
              'USER_QUESTION': blendedUserQuestion,
              'COLLECTED_DATA': collectedData,
            });
            const reportMessages: LlmMessage[] = [
              {
                role: 'user',
                content: reportUserMessage,
              },
            ];

            const reportGenSystemPrompt = getReportGenerationPrompt(isMobile);
            console.log(`[Chat API] 📋 REPORT SYSTEM PROMPT (${reportGenSystemPrompt.length} chars):`);
            console.log(reportGenSystemPrompt.slice(0, 2000) + (reportGenSystemPrompt.length > 2000 ? '\n... [truncated]' : ''));
            console.log(`[Chat API] 💬 REPORT USER MESSAGE (${reportUserMessage.length} chars):`);
            console.log(reportUserMessage.slice(0, 2000) + (reportUserMessage.length > 2000 ? '\n... [truncated]' : ''));

            let reportRetryCount = 0;
            let reportSuccess = false;
            let reportFullResponse = '';

            while (!reportSuccess && reportRetryCount <= MAX_RETRIES) {
              if (isAborted(abortSignal)) {
                await handleCancellation('[Chat API] Request aborted by client during GPT-4.1 generation');
                return;
              }

              llmCallCount++;
              const reportLlmStartTime = Date.now();
              console.log(`[Chat API] ⏳ Starting GPT-4.1 call #${llmCallCount} at ${new Date().toISOString()}`);

              try {
                reportFullResponse = await runTextCompletion({
                  client: openai,
                  model: STRONG_MODEL,
                  systemPrompt: reportGenSystemPrompt,
                  messages: reportMessages,
                  maxCompletionTokens: 16384,
                  signal: abortSignal,
                });

                if (reportFullResponse) {
                  send({ type: 'text', content: reportFullResponse });
                }

                const reportLlmDuration = logTiming(`GPT-4.1 LLM call #${llmCallCount}`, reportLlmStartTime);
                console.log(`[Chat API] 📥 GPT-4.1 RESPONSE #${llmCallCount} (${reportFullResponse.length} chars, ${reportLlmDuration}ms)`);
                console.log(reportFullResponse.slice(0, 1000) + (reportFullResponse.length > 1000 ? '\n... [truncated]' : ''));

                reportSuccess = true;
              } catch (error) {
                console.error('[Chat API] Blended GPT-4.1 error:', error);

                if (isAborted(abortSignal) || (error instanceof Error && error.name === 'AbortError')) {
                  await handleCancellation('[Chat API] Request aborted by client during GPT-4.1 generation');
                  return;
                }

                if (isRetryableError(error) && reportRetryCount < MAX_RETRIES) {
                  reportRetryCount++;
                  console.log(`[Chat API] Blended GPT-4.1 retryable error, attempt ${reportRetryCount}/${MAX_RETRIES}. Retrying...`);
                  send({ type: 'text', content: `\n[Retrying GPT-4.1 ${reportRetryCount}/${MAX_RETRIES}...]\n` });
                  await sleep(RETRY_DELAY_MS * reportRetryCount);
                  continue;
                }

                const errMsg = error instanceof Error ? error.message : 'Request error';
                send({ type: 'error', message: `GPT-4.1 error: ${errMsg}` });
                send({ type: 'done' });
                closeStream();
                return;
              }
            }

            if (containsHtml(reportFullResponse)) {
              const htmlContent = extractHtmlContent(reportFullResponse);
              if (htmlContent) {
                const htmlMetadata: HtmlMetadata = {
                  question: blendedUserQuestion,
                  sqlQueries: blendedSqlQueries,
                  intermediateOutput: blendedIntermediateOutput,
                  model: BLENDED_MODEL,
                  timestamp: new Date().toISOString(),
                  isMobile,
                };
                const contentId = await saveHtmlContent(htmlContent, htmlMetadata);
                if (contentId) {
                  send({ type: 'content_saved', contentId });
                  console.log('[Chat API] Blended mode: Saved HTML content with ID:', contentId);
                }
              }
            }

            send({ type: 'done' });
            closeStream();

            const totalDuration = Date.now() - requestStartTime;
            console.log(`\n${'='.repeat(80)}`);
            console.log(`[Chat API] ✅ BLENDED MODE REQUEST COMPLETED at ${new Date().toISOString()}`);
            console.log(`[Chat API] 📊 Summary: ${llmCallCount} LLM calls, ${toolCallCount} tool calls`);
            console.log(`[Chat API] ⏱️  Total duration: ${totalDuration}ms (${(totalDuration / 1000).toFixed(2)}s)`);
            console.log(`${'='.repeat(80)}\n`);
            return;
          }

          const userQuestion = messages[messages.length - 1]?.content || '';

          if (!shareId) {
            const lastUserIndex = chatMessages.findLastIndex(m => m.role === 'user');
            if (lastUserIndex !== -1) {
              const originalQuestion = chatMessages[lastUserIndex].content || '';

              let conversationContext = '';
              if (messages.length > 1) {
                const previousMessages = messages.slice(0, -1);
                const contextSummary = previousMessages
                  .filter(m => m.role === 'user' || m.role === 'assistant')
                  .slice(-4)
                  .map(m => `${m.role}: ${m.content.slice(0, 200)}`)
                  .join('\n');
                if (contextSummary) {
                  conversationContext = `**Conversation Context:**\n${contextSummary}\n`;
                }
              }

              const standaloneTemplate = getPrompt('user-standalone-query.md').replace(/^# .*\n+/, '');
              const wrappedMessage = composePrompt(standaloneTemplate, {
                'USER_QUESTION': originalQuestion,
                'CONVERSATION_CONTEXT': conversationContext,
                'ALLOWED_DATABASES': ALLOWED_DATABASES.join(', '),
                'DEFAULT_DATABASE': DEFAULT_DATABASE,
                'CONTEXT_AUDIENCE': CONTEXT_AUDIENCE,
              });

              chatMessages[lastUserIndex] = {
                ...chatMessages[lastUserIndex],
                content: wrappedMessage,
              };
            }
          }

          let continueLoop = true;
          let isFirstResponse = true;
          let loopIteration = 0;
          let retryCount = 0;
          const sqlQueries: Array<{ sql: string; result?: string }> = [];
          const intermediateOutput: string[] = [];
          const chartSpecs: Array<Record<string, unknown>> = [];
          const mapSpecs: Array<Record<string, unknown>> = [];

          while (continueLoop) {
            if (isAborted(abortSignal)) {
              await handleCancellation('[Chat API] Request aborted by client during standard mode');
              return;
            }

            loopIteration++;
            llmCallCount++;
            if (!isFirstResponse) {
              send({ type: 'text', content: '\n\n' });
            }
            isFirstResponse = false;

            const systemPrompt = getSystemPrompt(isMobile, metadata);
            console.log(`\n${'─'.repeat(60)}`);
            console.log(`[Chat API] 📤 LLM CALL #${llmCallCount} (iteration ${loopIteration})`);
            console.log(`${'─'.repeat(60)}`);

            if (loopIteration === 1) {
              console.log(`[Chat API] 📋 SYSTEM PROMPT (${systemPrompt.length} chars):`);
              console.log(systemPrompt.slice(0, 2000) + (systemPrompt.length > 2000 ? '\n... [truncated]' : ''));
            }

            console.log(`[Chat API] 💬 MESSAGES (${chatMessages.length} total):`);
            for (const msg of chatMessages) {
              const contentStr = msg.content ?? JSON.stringify(msg.tool_calls ?? []);
              const truncated = contentStr.length > 1000 ? contentStr.slice(0, 1000) + '\n... [truncated]' : contentStr;
              console.log(`[Chat API]   [${msg.role}]: ${truncated}`);
            }

            const llmStartTime = Date.now();
            console.log(`[Chat API] ⏳ Starting LLM call at ${new Date().toISOString()}`);

            let completion;
            try {
              completion = await runToolAwareCompletion({
                client: openai,
                model: selectedModel,
                systemPrompt,
                tools,
                messages: chatMessages,
                maxCompletionTokens: 16384,
                signal: abortSignal,
              });
            } catch (error) {
              console.error('[Chat API] Request error during iteration:', error);

              if (isAborted(abortSignal) || (error instanceof Error && error.name === 'AbortError')) {
                await handleCancellation('[Chat API] Request aborted by client during standard mode');
                return;
              }

              if (isRetryableError(error) && retryCount < MAX_RETRIES) {
                retryCount++;
                console.log(`[Chat API] Retryable error detected, attempt ${retryCount}/${MAX_RETRIES}. Retrying in ${RETRY_DELAY_MS}ms...`);
                send({ type: 'text', content: `\n[Retrying request ${retryCount}/${MAX_RETRIES}...]\n` });
                await sleep(RETRY_DELAY_MS * retryCount);
                continue;
              }

              const errMsg = error instanceof Error ? error.message : 'Request error';
              try {
                send({ type: 'error', message: errMsg });
                send({ type: 'done' });
              } catch {
                // ignore disconnected client
              }
              closeStream();
              return;
            }

            retryCount = 0;
            const fullResponseText = completion.text;
            const toolCalls = completion.toolCalls;

            if (fullResponseText) {
              send({ type: 'text', content: fullResponseText });
            }

            const llmDuration = logTiming(`LLM call #${llmCallCount} completed`, llmStartTime);
            console.log(`[Chat API] 📥 RESPONSE #${llmCallCount} (${fullResponseText.length} chars, ${llmDuration}ms):`);
            const responseLines = fullResponseText.split('\n').slice(0, 50);
            console.log(responseLines.join('\n'));
            if (fullResponseText.split('\n').length > 50) {
              console.log(`[Chat API] ... (${fullResponseText.split('\n').length - 50} more lines)`);
            }

            if (toolCalls.length > 0) {
              console.log(`\n[Chat API] 🔧 TOOL CALLS: ${toolCalls.length} tool(s) to execute`);
              const toolMessages = await executeToolCalls({
                toolCalls,
                sqlQueries,
                chartSpecs,
                mapSpecs,
                logPrefix: 'STANDARD',
              });

              if (fullResponseText.trim()) {
                intermediateOutput.push(fullResponseText);
              }

              chatMessages = [
                ...chatMessages,
                createAssistantToolMessage(fullResponseText, toolCalls),
                ...toolMessages,
              ];
            } else {
              if (containsHtml(fullResponseText)) {
                const htmlContent = extractHtmlContent(fullResponseText);
                if (htmlContent) {
                  const htmlMetadata: HtmlMetadata = {
                    question: userQuestion,
                    sqlQueries,
                    intermediateOutput,
                    model: selectedModel,
                    timestamp: new Date().toISOString(),
                    isMobile,
                  };
                  const contentId = await saveHtmlContent(htmlContent, htmlMetadata);
                  if (contentId) {
                    send({ type: 'content_saved', contentId });
                    console.log('[Chat API] Saved HTML content with ID:', contentId);
                  }
                }
              } else if (fullResponseText.trim() && userQuestion.toLowerCase().includes('motherduck')) {
                const markdownMetadata: HtmlMetadata = {
                  question: userQuestion,
                  sqlQueries,
                  intermediateOutput,
                  model: selectedModel,
                  timestamp: new Date().toISOString(),
                  isMobile,
                };
                const htmlFromMarkdown = markdownToHtml(fullResponseText, markdownMetadata, chartSpecs, mapSpecs);
                const contentId = await saveHtmlContent(htmlFromMarkdown, markdownMetadata);
                if (contentId) {
                  send({ type: 'content_saved', contentId });
                  console.log('[Chat API] Saved markdown-to-HTML content with ID:', contentId, `(${chartSpecs.length} charts, ${mapSpecs.length} maps)`);
                }
              }
              continueLoop = false;
            }
          }

          send({ type: 'done' });
          closeStream();

          const totalDuration = Date.now() - requestStartTime;
          console.log(`\n${'='.repeat(80)}`);
          console.log(`[Chat API] ✅ REQUEST COMPLETED at ${new Date().toISOString()}`);
          console.log(`[Chat API] 📊 Summary: ${llmCallCount} LLM calls, ${toolCallCount} tool calls`);
          console.log(`[Chat API] ⏱️  Total duration: ${totalDuration}ms (${(totalDuration / 1000).toFixed(2)}s)`);
          console.log(`${'='.repeat(80)}\n`);
        } catch (error) {
          console.error('[Chat API] Stream error:', error);
          const errorMessage = error instanceof Error ? error.message : 'Unknown error';
          console.error('[Chat API] Error details:', errorMessage);
          try {
            send({ type: 'error', message: `Error: ${errorMessage}` });
          } catch {
            // ignore disconnected client
          }
          closeStream();

          const totalDuration = Date.now() - requestStartTime;
          console.log(`\n${'='.repeat(80)}`);
          console.log(`[Chat API] ❌ REQUEST FAILED at ${new Date().toISOString()}`);
          console.log(`[Chat API] ⏱️  Total duration: ${totalDuration}ms`);
          console.log(`${'='.repeat(80)}\n`);
        } finally {
          if (mcpClient) {
            await closeMcpClient(mcpClient);
          }
        }
      },
    });

    return new Response(stream, {
      headers: {
        'Content-Type': 'text/event-stream',
        'Cache-Control': 'no-cache',
        'Connection': 'keep-alive',
      },
    });
  } catch (error) {
    console.error(`[Chat API] Error:`, error);
    return new Response(JSON.stringify({ error: 'Failed to process chat request' }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    });
  }
}
