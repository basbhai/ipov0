import { NextRequest, NextResponse } from 'next/server';

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const apply_id = searchParams.get('apply_id');

    if (!apply_id) {
      return NextResponse.json(
        { error: 'Missing apply_id parameter' },
        { status: 400 }
      );
    }

    // Get environment variables
    const githubToken = process.env.GITHUB_TOKEN;
    let githubRepo = process.env.GITHUB_REPOSITORY;

    console.log(' GITHUB_REPOSITORY env:', githubRepo);

    if (!githubRepo) {
      console.error(' GITHUB_REPOSITORY not set');
      return NextResponse.json(
        { error: 'GITHUB_REPOSITORY environment variable not configured' },
        { status: 500 }
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

    console.log(' Parsed owner:', owner, 'repo:', repo);

    if (!githubToken) {
      console.error(' GITHUB_TOKEN not set');
      return NextResponse.json(
        { error: 'GitHub token not configured' },
        { status: 500 }
      );
    }

    console.log(' Fetching logs for apply_id:', apply_id);

    // List artifacts to find the one matching apply_id with name filter
    const artifactName = `log-${apply_id}`;
    console.log(' Searching for artifact:', artifactName);
    
    const artifactsResponse = await fetch(
      `https://api.github.com/repos/${owner}/${repo}/actions/artifacts?name=${encodeURIComponent(artifactName)}`,
      {
        headers: {
          Authorization: `Bearer ${githubToken}`,
          Accept: 'application/vnd.github+json',
          'X-GitHub-Api-Version': '2022-11-28',
        },
      }
    );

    if (!artifactsResponse.ok) {
      const errorData = await artifactsResponse.text();
      console.error(' Failed to list artifacts:', errorData);
      return NextResponse.json(
        { error: 'Failed to list artifacts' },
        { status: artifactsResponse.status }
      );
    }

    const artifactsData = (await artifactsResponse.json()) as {
      artifacts: Array<{
        id: number;
        name: string;
        archive_download_url: string;
      }>;
    };

    console.log(' Found', artifactsData.artifacts.length, 'artifacts');

    // Find artifact matching the apply_id
    const artifact = artifactsData.artifacts.find((a) => a.name === artifactName);

    if (!artifact) {
      console.log(' Artifact not found yet for apply_id:', apply_id);
      return NextResponse.json(
        { error: 'Logs not available yet' },
        { status: 404 }
      );
    }

    console.log(' Found artifact:', artifact.name, 'with archive_download_url');

    // Use the archive_download_url directly from the API response
    let downloadUrl = artifact.archive_download_url;
    console.log(' Downloading artifact zip file from:', downloadUrl);
    
    // First fetch to get the redirect
    let downloadResponse = await fetch(downloadUrl, {
      headers: {
        Authorization: `Bearer ${githubToken}`,
        'X-GitHub-Api-Version': '2022-11-28',
      },
      redirect: 'manual', // Don't auto-follow, we'll handle it manually
    });

    console.log(' First response status:', downloadResponse.status);

    // If we got a redirect (302), follow it
    if (downloadResponse.status === 302 || downloadResponse.status === 301) {
      const redirectUrl = downloadResponse.headers.get('Location');
      console.log(' Got redirect to:', redirectUrl ? 'redirect URL' : 'no location header');

      if (redirectUrl) {
        // Follow the redirect without auth headers (the redirect URL is temporary and auth-free)
        downloadResponse = await fetch(redirectUrl, {
          redirect: 'follow',
        });
        console.log(' Redirect response status:', downloadResponse.status);
      }
    }

    console.log(' Final response status:', downloadResponse.status);
    console.log(' Content-type:', downloadResponse.headers.get('content-type'));

    if (!downloadResponse.ok) {
      const errorData = await downloadResponse.text();
      console.error(' Failed to download artifact, status:', downloadResponse.status);
      console.error(' Error response length:', errorData.length);
      return NextResponse.json(
        { error: 'Failed to download artifact', status: downloadResponse.status },
        { status: downloadResponse.status }
      );
    }

    // The artifact is a zip file, we need to extract it
    console.log(' Reading response as arrayBuffer');
    let buffer: ArrayBuffer;
    
    try {
      buffer = await downloadResponse.arrayBuffer();
      console.log(' Downloaded artifact successfully, size:', buffer.byteLength, 'bytes');
    } catch (bufferError) {
      console.error(' Failed to read response as buffer:', bufferError);
      return NextResponse.json(
        { error: 'Failed to read artifact buffer' },
        { status: 500 }
      );
    }

    // Extract zip file using JSZip (pure JavaScript, works in serverless)
    console.log(' Extracting zip file with JSZip');
    
    try {
      // Import JSZip - pure JavaScript implementation
      const JSZipModule = await import('jszip');
      const JSZip = JSZipModule.default;

      console.log(' JSZip imported');

      const zip = new JSZip();
      await zip.loadAsync(buffer);

      console.log(' Zip file loaded');

      // List all files in the zip
      const fileList: string[] = [];
      zip.forEach((relativePath) => {
        fileList.push(relativePath);
      });
      console.log(' Files in zip archive:', fileList);

      // Try to find and extract the log file
      const logFilenames = ['ipo-application.log', 'logs/ipo-application.log'];
      let logContent: string | null = null;

      for (const filename of logFilenames) {
        console.log(' Trying to find:', filename);
        const file = zip.file(filename);
        
        if (file) {
          console.log(' Found file:', filename);
          logContent = await file.async('text');
          console.log(' Extracted log content, length:', logContent.length);
          break;
        }
      }

      if (logContent) {
        return NextResponse.json({
          logs: logContent,
          apply_id,
        });
      } else {
        console.warn(' Log file not found in expected locations');
        console.log(' Available files:', fileList);
        return NextResponse.json({
          logs: `[Artifact found but log file not found. Files in artifact: ${fileList.join(', ')}]`,
          apply_id,
        });
      }
    } catch (zipError) {
      console.error('Error extracting zip:', zipError);
      console.error('Error details:', zipError instanceof Error ? zipError.message : String(zipError));

      return NextResponse.json(
        {
          logs: '[Artifact downloaded but could not be extracted. Workflow may still be running.]',
          apply_id,
        },
        { status: 202 }
      );
    }
  } catch (error) {
    console.error(' Error in fetch-logs:', error);
    return NextResponse.json(
      {
        error: error instanceof Error ? error.message : 'Internal server error',
      },
      { status: 500 }
    );
  }
}
