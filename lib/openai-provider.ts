import OpenAI from 'openai';

export const FAST_MODEL = 'gpt-4.1-mini';
export const STRONG_MODEL = 'gpt-4.1';
export const BLENDED_MODEL = 'blended';

const FAST_MODEL_ALIASES = new Set([
  FAST_MODEL,
  'fast',
  'openai-fast',
  'gemini',
  'haiku',
  'google/gemini-3-flash-preview',
  'claude-haiku-4-20250514',
]);

const STRONG_MODEL_ALIASES = new Set([
  STRONG_MODEL,
  'pro',
  'openai-pro',
  'opus',
  'sonnet',
  'head-to-head',
  'anthropic/claude-opus-4.5',
  'claude-opus-4-20250514',
  'claude-sonnet-4-20250514',
]);

export interface LlmTool {
  type: 'function';
  function: {
    name: string;
    description?: string;
    parameters: {
      type: string;
      properties?: Record<string, unknown>;
      required?: string[];
      items?: unknown;
      enum?: string[];
      description?: string;
    };
  };
}

export interface LlmToolCall {
  id: string;
  type: 'function';
  function: {
    name: string;
    arguments: string;
  };
}

export interface LlmMessage {
  role: 'system' | 'user' | 'assistant' | 'tool';
  content: string | null;
  tool_calls?: LlmToolCall[];
  tool_call_id?: string;
}

interface CompletionParams {
  client: OpenAI;
  model: string;
  systemPrompt: string;
  messages: LlmMessage[];
  maxCompletionTokens: number;
  tools?: LlmTool[];
  signal?: AbortSignal;
}

function extractTextContent(content: unknown): string {
  if (typeof content === 'string') {
    return content;
  }

  if (Array.isArray(content)) {
    return content
      .map(part => {
        if (typeof part === 'string') {
          return part;
        }

        if (
          part &&
          typeof part === 'object' &&
          'type' in part &&
          part.type === 'text' &&
          'text' in part &&
          typeof part.text === 'string'
        ) {
          return part.text;
        }

        return '';
      })
      .join('');
  }

  return '';
}

function normalizeToolCalls(toolCalls: unknown): LlmToolCall[] {
  if (!Array.isArray(toolCalls)) {
    return [];
  }

  return toolCalls
    .map((toolCall) => {
      const id = typeof toolCall?.id === 'string' ? toolCall.id : crypto.randomUUID();
      const name = typeof toolCall?.function?.name === 'string' ? toolCall.function.name : '';
      const args = typeof toolCall?.function?.arguments === 'string'
        ? toolCall.function.arguments
        : JSON.stringify(toolCall?.function?.arguments ?? {});

      if (!name) {
        return null;
      }

      return {
        id,
        type: 'function' as const,
        function: {
          name,
          arguments: args,
        },
      };
    })
    .filter((toolCall): toolCall is LlmToolCall => toolCall !== null);
}

export function createOpenAIClient(): OpenAI {
  const apiKey = process.env.OPENAI_API_KEY;

  if (!apiKey) {
    throw new Error('OPENAI_API_KEY environment variable is not set');
  }

  return new OpenAI({ apiKey });
}

export function resolveChatModel(model?: string): string {
  const normalized = model?.trim().toLowerCase();

  if (!normalized || FAST_MODEL_ALIASES.has(normalized)) {
    return FAST_MODEL;
  }

  if (normalized === BLENDED_MODEL) {
    return BLENDED_MODEL;
  }

  if (STRONG_MODEL_ALIASES.has(normalized)) {
    return STRONG_MODEL;
  }

  return model ?? FAST_MODEL;
}

export function resolveSuggestionsModel(model?: string): string {
  const resolved = resolveChatModel(model);
  return resolved === BLENDED_MODEL ? FAST_MODEL : resolved;
}

export async function runToolAwareCompletion({
  client,
  model,
  systemPrompt,
  messages,
  maxCompletionTokens,
  tools = [],
  signal,
}: CompletionParams): Promise<{ text: string; toolCalls: LlmToolCall[] }> {
  const response = await client.chat.completions.create(
    {
      model,
      messages: [
        { role: 'system', content: systemPrompt },
        ...messages,
      ] as OpenAI.Chat.Completions.ChatCompletionMessageParam[],
      max_completion_tokens: maxCompletionTokens,
      tools: tools.length > 0 ? tools as OpenAI.Chat.Completions.ChatCompletionTool[] : undefined,
      tool_choice: tools.length > 0 ? 'auto' : undefined,
      parallel_tool_calls: tools.length > 1 ? true : undefined,
    } as OpenAI.Chat.Completions.ChatCompletionCreateParamsNonStreaming,
    { signal }
  );

  const message = response.choices[0]?.message;

  return {
    text: extractTextContent(message?.content),
    toolCalls: normalizeToolCalls(message?.tool_calls),
  };
}

export async function runTextCompletion({
  client,
  model,
  systemPrompt,
  messages,
  maxCompletionTokens,
  signal,
}: CompletionParams): Promise<string> {
  const response = await client.chat.completions.create(
    {
      model,
      messages: [
        { role: 'system', content: systemPrompt },
        ...messages,
      ] as OpenAI.Chat.Completions.ChatCompletionMessageParam[],
      max_completion_tokens: maxCompletionTokens,
    } as OpenAI.Chat.Completions.ChatCompletionCreateParamsNonStreaming,
    { signal }
  );

  return extractTextContent(response.choices[0]?.message?.content);
}
