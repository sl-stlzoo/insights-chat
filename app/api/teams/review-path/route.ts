import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { evaluateTeamsAccess } from '@/lib/teams-access';
import { buildTeamsReviewPath } from '@/lib/teams-review-path';

interface ReviewPathRequest {
  diveId?: string;
  diveUrl?: string;
  title?: string;
  version?: number;
  query?: string;
  database?: string;
}

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    const accessDecision = evaluateTeamsAccess(session);
    if (!accessDecision.allowed) {
      const status = accessDecision.code === 'auth_required' ? 401 : 403;
      return NextResponse.json(
        {
          errorCode: accessDecision.code,
          error: accessDecision.userMessage,
        },
        { status },
      );
    }

    const payload = (await request.json()) as ReviewPathRequest;
    if (!payload.diveId?.trim()) {
      return NextResponse.json(
        {
          errorCode: 'missing_dive_id',
          error: 'A diveId is required to build the Teams review path.',
        },
        { status: 400 },
      );
    }

    const reviewPath = buildTeamsReviewPath({
      origin: request.nextUrl.origin,
      diveId: payload.diveId.trim(),
      diveUrl: payload.diveUrl?.trim(),
      title: payload.title?.trim(),
      version: payload.version,
      query: payload.query?.trim(),
      database: payload.database?.trim(),
    });

    return NextResponse.json({
      ...reviewPath,
      contextMode: 'bot-card-review-path',
    });
  } catch (error) {
    return NextResponse.json(
      {
        errorCode: 'review_path_generation_failed',
        error: error instanceof Error ? error.message : 'Unable to build Teams review path.',
      },
      { status: 500 },
    );
  }
}
