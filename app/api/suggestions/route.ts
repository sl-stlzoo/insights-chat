import { NextRequest, NextResponse } from 'next/server';
import {
  createOpenAIClient,
  resolveSuggestionsModel,
  runTextCompletion,
} from '@/lib/openai-provider';

interface SuggestionsRequest {
  question: string;
  context: string; // Narration, SQL queries, or summary of the answer
  model?: string;
}

export async function POST(request: NextRequest) {
  try {
    const body: SuggestionsRequest = await request.json();
    const { question, context, model } = body;

    if (!question || !context) {
      return NextResponse.json(
        { error: 'Missing required fields: question and context' },
        { status: 400 }
      );
    }

    const selectedModel = resolveSuggestionsModel(model);
    const openai = createOpenAIClient();

    const systemPrompt = `You are a helpful assistant that generates follow-up questions based on a data analysis conversation. Your task is to suggest 4 insightful follow-up questions that would help the user understand the data better or explore related aspects.

Guidelines:
- Questions should be specific and actionable
- Questions should build on what was already discussed
- Questions should help uncover deeper insights or related patterns
- Keep questions concise (under 15 words each)
- Focus on business value and actionable insights
- Vary the types of questions (trends, comparisons, breakdowns, anomalies)

Respond with ONLY a JSON array of 4 strings, no other text. Example:
["What is the trend over time?", "How does this compare to last year?", "Which region contributes most?", "Are there any outliers?"]`;

    const userPrompt = `Based on this data analysis conversation, suggest 4 follow-up questions:

**Original Question:**
${question}

**Analysis Context:**
${context}

Respond with only a JSON array of 4 question strings.`;

    const responseText = (await runTextCompletion({
      client: openai,
      model: selectedModel,
      systemPrompt,
      messages: [{ role: 'user', content: userPrompt }],
      maxCompletionTokens: 500,
      signal: request.signal,
    })).trim();

    let suggestions: string[] = [];
    try {
      suggestions = JSON.parse(responseText);
    } catch {
      const jsonMatch = responseText.match(/\[[\s\S]*\]/);
      if (jsonMatch) {
        suggestions = JSON.parse(jsonMatch[0]);
      }
    }

    if (!Array.isArray(suggestions) || suggestions.length === 0) {
      throw new Error('Invalid response format');
    }

    suggestions = suggestions
      .filter((suggestion): suggestion is string => typeof suggestion === 'string')
      .slice(0, 4);

    if (suggestions.length === 0) {
      throw new Error('No valid suggestions returned');
    }

    return NextResponse.json({ suggestions });
  } catch (error) {
    console.error('[Suggestions API] Error:', error);
    return NextResponse.json(
      { error: 'Failed to generate suggestions' },
      { status: 500 }
    );
  }
}
