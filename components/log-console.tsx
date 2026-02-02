'use client';

import { useEffect, useRef, useState } from 'react';
import { Button } from '@/components/ui/button';
import { AlertCircle, Copy, RotateCcw, Download } from 'lucide-react';
import { Alert, AlertDescription } from '@/components/ui/alert';
import SummaryModal from '@/components/summary-modal';

interface LogConsoleProps {
  applyId: string;
  onApplyIdChange: (id: string | null) => void;
  csvData?: Record<string, string>[];
}

export default function LogConsole({ applyId, onApplyIdChange, csvData = [] }: LogConsoleProps) {
  const [logs, setLogs] = useState<string[]>([]);
  const [isPolling, setIsPolling] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [status, setStatus] = useState<'polling' | 'completed' | 'error'>('polling');
  const [showSummary, setShowSummary] = useState(false);
  const [summaryResults, setSummaryResults] = useState<{
    name: string;
    status: 'success' | 'error' | 'failed' | 'already_applied';
  }[]>([]);
  const [summaryData, setSummaryData] = useState<{
    name: string;
    status: 'success' | 'error' | 'failed' | 'already_applied';
  }>({ name: '', status: 'failed' });
  const scrollRef = useRef<HTMLDivElement>(null);
  const pollIntervalRef = useRef<NodeJS.Timeout | null>(null);

  const scrollToBottom = () => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  };

  const determineStatus = (
    logLines: string[]
  ): 'success' | 'error' | 'failed' | 'already_applied' => {
    const fullLog = logLines.join('\n').toLowerCase();

    // Check for already applied
    if (fullLog.includes('already applied') || fullLog.includes('record already')) {
      return 'already_applied';
    }

    // Check for critical errors
    if (
      fullLog.includes('error') ||
      fullLog.includes('critical') ||
      fullLog.includes('traceback')
    ) {
      return 'error';
    }

    // Check for success message
    if (fullLog.includes('applied successfully')) {
      return 'success';
    }

    // Check for failed message
    if (fullLog.includes('failed')) {
      return 'failed';
    }

    // Default to failed if no success indicator
    return 'failed';
  };

  const parseAccountResults = (
    logLines: string[]
  ): Array<{ name: string; status: 'success' | 'error' | 'failed' | 'already_applied' }> => {
    const results: Array<{ name: string; status: 'success' | 'error' | 'failed' | 'already_applied' }> = [];
    const fullLog = logLines.join('\n');

    // Split log by account sections (--- Account X/Y ---)
    const accountSections = fullLog.split(/--- Account \d+\/\d+ ---/);

    // Process each account section
    accountSections.forEach((section, index) => {
      if (!section.trim()) return;

      // Extract username from "PROCESSING: {username}" line
      const processingMatch = section.match(/PROCESSING:\s*(\d+)/);
      const username = processingMatch ? processingMatch[1] : `Account ${index}`;

      // Find corresponding account name from csvData
      let accountName = username;
      if (csvData.length > index - 1 && index > 0) {
        accountName = csvData[index - 1]?.name || username;
      }

      // Determine status for this account section
      let status: 'success' | 'error' | 'failed' | 'already_applied' = 'failed';
      const sectionLower = section.toLowerCase();

        if (sectionLower.includes('already applied') || sectionLower.includes('record already')) {
          status = 'already_applied';
        } else if (sectionLower.includes('applied successfully')) {
          status = 'success';
        } else if (sectionLower.includes('failed')) {
          status = 'failed';
        } else if (
          sectionLower.includes('critical error') ||
          sectionLower.includes('traceback')
        ) {
          status = 'error';
        }


      results.push({
        name: accountName,
        status,
      });
    });

    return results;
  };

      const fetchLogs = async () => {
    try {
      const response = await fetch(`/api/fetch-logs?apply_id=${applyId}`);
      const data = await response.json();

      if (!response.ok) {
        if (response.status === 404) {
          // Logs not ready yet, keep polling - don't add text messages
          // The loader animation will be shown in the UI
        } else if (response.status === 202) {
          // Artifact found but still processing - don't add text messages
        } else {
          throw new Error(data.error || `Failed to fetch logs (${response.status})`);
        }
      } else {
        // Logs received
        const logLines = data.logs.split('\n').filter((line: string) => line.trim());
        setLogs(logLines);
        setStatus('completed');
        setIsPolling(false);

        // Parse all accounts from logs and show summary
        const accountResults = parseAccountResults(logLines);
        setSummaryResults(accountResults);
        setShowSummary(true);

        if (pollIntervalRef.current) {
          clearInterval(pollIntervalRef.current);
        }
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred');
      setStatus('error');
      setIsPolling(false);

      if (pollIntervalRef.current) {
        clearInterval(pollIntervalRef.current);
      }
    }
  };

  useEffect(() => {
    scrollToBottom();
  }, [logs]);

  useEffect(() => {
    if (!isPolling) return;

    // Initial fetch
    fetchLogs();

    // Poll every 10 seconds (give GitHub Actions time to run and upload artifacts)
    pollIntervalRef.current = setInterval(fetchLogs, 10000);

    return () => {
      if (pollIntervalRef.current) {
        clearInterval(pollIntervalRef.current);
      }
    };
  }, [applyId, isPolling]);

  const handleCopyLogs = () => {
    const logsText = logs.join('\n');
    navigator.clipboard.writeText(logsText);
  };

  const handleDownloadLogs = () => {
    const logsText = logs.join('\n');
    const blob = new Blob([logsText], { type: 'text/plain' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `logs-${applyId}.txt`;
    a.click();
    window.URL.revokeObjectURL(url);
  };

  const handleReset = () => {
    setLogs([]);
    setError(null);
    setStatus('polling');
    setIsPolling(true);
    setShowSummary(false);
    onApplyIdChange(null);
  };

  const handleCloseSummary = () => {
    setShowSummary(false);
    // Just close the modal, keep logs visible
  };

  return (
    <>
      <div className="space-y-4">
        {error && (
          <Alert variant="destructive">
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}

        {/* Log Display */}
        <div
          ref={scrollRef}
          className="bg-slate-900 text-slate-100 rounded-lg p-4 font-mono text-sm h-96 overflow-y-auto border border-slate-800"
        >
          {logs.length === 0 ? (
            <div className="flex items-center justify-center h-full">
              <style>{`
                .loader {
                  height: 30px;
                  aspect-ratio: 2;
                  display: grid;
                  background:
                    radial-gradient(farthest-side, #06b6d4 15%, #0000 18%) 0 0/50% 100%,
                    radial-gradient(50% 100% at 50% 160%, #fff 95%, #0000) 0 0/50% 50%,
                    radial-gradient(50% 100% at 50% -60%, #fff 95%, #0000) 0 100%/50% 50%;
                  background-repeat: repeat-x;
                  animation: l2 1.5s infinite linear;
                }
                @keyframes l2 {
                  0%, 15% { background-position: 0 0, 0 0, 0 100%; }
                  20%, 40% { background-position: 5px 0, 0 0, 0 100%; }
                  45%, 55% { background-position: 0 0, 0 0, 0 100%; }
                  60%, 80% { background-position: -5px 0, 0 0, 0 100%; }
                  85%, 100% { background-position: 0 0, 0 0, 0 100%; }
                }
              `}</style>
              <div className="text-center space-y-4">
                <div className="text-cyan-400 font-semibold text-lg">Processing your IPOs</div>
                <div className="loader mx-auto"></div>
                <div className="text-slate-400 text-sm">Applying, please wait 3-5 minutes.</div>
              </div>
            </div>
          ) : (
            logs.map((log, idx) => (
              <div key={idx} className="whitespace-pre-wrap break-words">
                {log}
              </div>
            ))
          )}
        </div>

        {/* Status */}
        <div className="flex items-center justify-between text-xs">
          <div className="flex items-center gap-2">
            <div
              className={`w-2 h-2 rounded-full ${
                status === 'completed'
                  ? 'bg-green-500'
                  : status === 'error'
                  ? 'bg-red-500'
                  : 'bg-blue-500 animate-pulse'
              }`}
            />
            <span className="text-slate-600">
              {status === 'completed' ? 'Completed' : status === 'error' ? 'Error' : 'Polling...'}
            </span>
          </div>
          <span className="text-slate-600">{logs.length} lines</span>
        </div>

        {/* Actions */}
        <div className="flex gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={handleCopyLogs}
            disabled={logs.length === 0}
            className="flex-1 bg-transparent"
          >
            <Copy className="h-4 w-4 mr-2" />
            Copy
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={handleDownloadLogs}
            disabled={logs.length === 0}
            className="flex-1 bg-transparent"
          >
            <Download className="h-4 w-4 mr-2" />
            Download
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={handleReset}
            className="flex-1 bg-transparent"
          >
            <RotateCcw className="h-4 w-4 mr-2" />
            Reset
          </Button>
        </div>
      </div>

      <SummaryModal
        isOpen={showSummary}
        onClose={handleCloseSummary}
        results={summaryResults}
      />
    </>
  );
}
