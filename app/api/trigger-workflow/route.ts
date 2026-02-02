import { NextRequest, NextResponse } from 'next/server';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { apply_id, csv_data } = body;

    if (!apply_id || !csv_data) {
      return NextResponse.json(
        { error: 'Missing required fields: apply_id, csv_data' },
        { status: 400 }
      );
    }

    if (!Array.isArray(csv_data)) {
      return NextResponse.json(
        { error: 'csv_data must be an array of objects' },
        { status: 400 }
      );
    }

    // Get environment variables
    const githubToken = process.env.GITHUB_TOKEN;
    let githubRepo = process.env.GITHUB_REPOSITORY;

    // In preview mode, these might not be set - provide a helpful message
    if (!githubRepo || !githubToken) {
      const missingVars = [];
      if (!githubRepo) missingVars.push('GITHUB_REPOSITORY');
      if (!githubToken) missingVars.push('GITHUB_TOKEN');
      
      console.warn('[v0] Missing environment variables:', missingVars.join(', '));
      return NextResponse.json(
        {
          error: 'GitHub environment variables not configured',
          details: `Missing: ${missingVars.join(', ')}. Please add these to your Vercel project settings.`,
          status: 'ENV_NOT_SET'
        },
        { status: 503 }
      );
    }

    // Handle both full URL (https://github.com/owner/repo.git) and short format (owner/repo)
    let repoPath = githubRepo;
    if (githubRepo.startsWith('http')) {
      // Extract owner/repo from full URL
      repoPath = githubRepo.replace(/^https?:\/\/github\.com\//, '').replace(/\.git$/, '');
    } else {
      // Remove .git suffix if present from short format
      repoPath = githubRepo.replace(/\.git$/, '');
    }

    const [owner, repo] = repoPath.split('/');

    console.log('[v0] Parsed owner:', owner, 'repo:', repo);

    // Convert CSV data to JSON string
    const csvDataJson = JSON.stringify(csv_data);

    console.log('[v0] Triggering workflow for apply_id:', apply_id);
    console.log('[v0] CSV data rows:', csv_data.length);

    // Trigger GitHub Actions using repository dispatch
    const dispatchResponse = await fetch(
      `https://api.github.com/repos/${owner}/${repo}/dispatches`,
      {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${githubToken}`,
          'Content-Type': 'application/json',
          'X-GitHub-Api-Version': '2022-11-28',
        },
        body: JSON.stringify({
          event_type: 'ipo_bot',
          client_payload: {
            apply_id,
            accounts: csv_data,
          },
        }),
      }
    );

    const workflowResponse = dispatchResponse;

    if (!workflowResponse.ok) {
      const errorData = await workflowResponse.text();
      console.error('[v0] Workflow trigger failed:', errorData);
      return NextResponse.json(
        {
          error: 'Failed to trigger workflow',
          details: errorData,
        },
        { status: workflowResponse.status }
      );
    }

    console.log('[v0] Workflow triggered successfully');

    return NextResponse.json({
      success: true,
      message: 'Workflow triggered successfully',
      apply_id,
    });
  } catch (error) {
    console.error('[v0] Error in trigger-workflow:', error);
    return NextResponse.json(
      {
        error: error instanceof Error ? error.message : 'Internal server error',
      },
      { status: 500 }
    );
  }
}
