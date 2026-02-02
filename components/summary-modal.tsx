'use client';

import React from "react"

import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { CheckCircle2, AlertCircle, XCircle, Info, Download, Copy, X } from 'lucide-react';
import { useState } from 'react';

interface SummaryResult {
  name: string;
  status: 'success' | 'error' | 'failed' | 'already_applied';
}

interface SummaryModalProps {
  isOpen: boolean;
  onClose: () => void;
  results: SummaryResult[];
}

interface Result {
  name: string;
}

const toTitleCase = (text: string | null | undefined): string => {
  if (!text) return "";

  return text
    .toLowerCase()
    .split(' ')
    .map((word: string) => {
      // Handle potential double spaces by returning empty strings as-is
      if (word.length === 0) return "";
      return word.charAt(0).toUpperCase() + word.slice(1);
    })
    .join(' ');
};

export default function SummaryModal({
  isOpen,
  onClose,
  results,
}: SummaryModalProps) {
  const [copied, setCopied] = useState(false);

  const getStatusIcon = (status: string) => {
    const iconMap: Record<string, { icon: React.ComponentType<any>; color: string; label: string }> = {
      success: {
        icon: CheckCircle2,
        color: 'text-green-600',
        label: 'Success',
      },
      error: {
        icon: AlertCircle,
        color: 'text-red-600',
        label: 'Error',
      },
      failed: {
        icon: XCircle,
        color: 'text-red-600',
        label: 'Failed',
      },
      already_applied: {
        icon: Info,
        color: 'text-blue-600',
        label: 'Already Applied',
      },
    };
    return iconMap[status] || iconMap.failed;
  };

  const handleCopySummary = () => {
    const summary = results
      .map((r) => `${r.name}\t${getStatusIcon(r.status).label}`)
      .join('\n');
    navigator.clipboard.writeText(summary);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleDownloadSummary = () => {
    const summary = results
      .map((r) => `${r.name}\t${getStatusIcon(r.status).label}`)
      .join('\n');
    const blob = new Blob([summary], { type: 'text/plain' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'ipo-summary.txt';
    a.click();
    window.URL.revokeObjectURL(url);
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Application Summary</DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          {/* Summary Table */}
          <div className="border rounded-lg overflow-hidden">
            <table className="w-full">
              <thead>
                <tr className="bg-slate-100 border-b">
                  <th className="px-4 py-2 text-left text-sm font-semibold text-slate-700">Name</th>
                  <th className="px-4 py-2 text-left text-sm font-semibold text-slate-700">Status</th>
                </tr>
              </thead>
              <tbody>
                {results
                  .filter((result) => result.name && result.name.trim() && result.name !== 'Account 0' && result.name !== 'Unknown')
                  .map((result, idx) => {
                    const statusConfig = getStatusIcon(result.status);
                    const Icon = statusConfig.icon;
                    return (
                      <tr key={idx} className="border-b hover:bg-slate-50 last:border-b-0">
                        <td className="px-4 py-2 text-sm text-slate-900">{toTitleCase(result.name)}</td>
                        <td className="px-4 py-2">
                          <div className="flex items-center gap-2">
                            <Icon className={`h-4 w-4 ${statusConfig.color}`} />
                            <span className={`text-sm font-medium ${statusConfig.color}`}>
                              {statusConfig.label}
                            </span>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
              </tbody>
            </table>
          </div>

          {/* Actions */}
          <div className="flex gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={handleCopySummary}
              className="flex-1 bg-transparent"
            >
              <Copy className="h-4 w-4 mr-2" />
              Copy
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={handleDownloadSummary}
              className="flex-1 bg-transparent"
            >
              <Download className="h-4 w-4 mr-2" />
              Download
            </Button>
            <Button
              size="sm"
              onClick={onClose}
              className="flex-1"
            >
              Close
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
