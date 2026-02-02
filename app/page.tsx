'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { AlertCircle, Download, Upload } from 'lucide-react';
import CSVUploadForm from '@/components/csv-upload-form';
import CSVTable from '@/components/csv-table';
import LogConsole from '@/components/log-console';

export default function Home() {
  const [csvData, setCsvData] = useState<Record<string, string>[]>([]);
  const [applyId, setApplyId] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Modal states
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [consentChecked, setConsentChecked] = useState(false);

  // CSV Upload handler
  const handleCsvUpload = (data: Record<string, string>[]) => {
    setCsvData(data);
    setError(null);
    setApplyId(null);
  };

  // Handle CSV data changes (bank column updates)
  const handleCsvDataChange = (updatedData: Record<string, string>[]) => {
    setCsvData(updatedData);
  };

  // Download CSV template
  const handleDownloadTemplate = () => {
    const template = 'name,dp,username,password,pin,crn,units,bank\nbasanta,13700,73058,password123,1234,12345678,100,';
    const blob = new Blob([template], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'ipo-template.csv';
    a.click();
    window.URL.revokeObjectURL(url);
  };

  // Download current CSV with updated bank selections
  const handleDownloadUpdatedCSV = () => {
    if (csvData.length === 0) {
      setError('No data to download');
      return;
    }

    // Get all columns
    const columns = Object.keys(csvData[0]);
    
    // Create CSV header
    const header = columns.join(',');
    
    // Create CSV rows
    const rows = csvData.map((row) => {
      return columns.map((col) => {
        const value = row[col] || '';
        // Escape quotes in values
        if (value.includes(',') || value.includes('"') || value.includes('\n')) {
          return `"${value.replace(/"/g, '""')}"`;
        }
        return value;
      }).join(',');
    });

    const csv = [header, ...rows].join('\n');
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `ipo-data-${new Date().toISOString().split('T')[0]}.csv`;
    a.click();
    window.URL.revokeObjectURL(url);
  };

  // Open consent modal instead of directly applying
  const handleApplyClick = () => {
    if (csvData.length === 0) {
      setError('Please upload a CSV file first');
      return;
    }
    setIsModalOpen(true);
  };

  // Actual API call triggered after consent
  const handleApplyIPO = async () => {
    setIsLoading(true);
    setError(null);

    try {
      const newApplyId = `apply_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
      setApplyId(newApplyId);

      // Trigger GitHub Actions workflow
      const response = await fetch('/api/dispatch', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          apply_id: newApplyId,
          csv_data: csvData,
        }),
      });

      if (!response.ok) {
        throw new Error('Failed to trigger workflow');
      }

      const result = await response.json();
      console.log('Workflow triggered:', result);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred');
      setApplyId(null);
    } finally {
      setIsLoading(false);
    }
  };

  const handleApplyIdChange = (newApplyId: string | null) => {
    setApplyId(newApplyId);
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-cyan-50 to-teal-50 p-4 md:p-8">
      <div className="max-w-6xl mx-auto">
        {/* Header */}
        <div className="mb-12 text-center">
          <div className="inline-block mb-4 px-4 py-2 bg-gradient-to-r from-blue-100 to-cyan-100 rounded-full border border-cyan-200">
            <span className="text-sm font-semibold text-cyan-700">Automated IPO Application</span>
          </div>
          <h1 className="text-5xl font-bold bg-gradient-to-r from-blue-600 to-teal-600 bg-clip-text text-transparent mb-3">
            IPO Automation System
          </h1>
          <p className="text-lg text-slate-600 max-w-2xl mx-auto">
            Streamline your IPO applications with intelligent automation. Upload your data and let our system handle the rest.
          </p>
        </div>

        {/* Error Alert */}
        {error && (
          <Alert variant="destructive" className="mb-6">
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Left Column - Upload & Controls */}
          <div className="lg:col-span-1 space-y-6">
            {/* CSV Upload */}
            <Card className="border-blue-200 bg-white shadow-lg hover:shadow-xl transition-shadow">
              <CardHeader className="bg-gradient-to-r from-blue-50 to-cyan-50 border-b border-blue-100">
                <CardTitle className="text-blue-900">Upload CSV</CardTitle>
                <CardDescription>Import your IPO application data</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4 pt-6">
                <CSVUploadForm onUpload={handleCsvUpload} />
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleDownloadTemplate}
                  className="w-full bg-blue-50 border-blue-200 text-blue-700 hover:bg-blue-100"
                >
                  <Download className="h-4 w-4 mr-2" />
                  Download Template
                </Button>
              </CardContent>
            </Card>

            {/* Apply IPO */}
            {csvData.length > 0 && (
              <Card className="border-teal-200 bg-gradient-to-br from-teal-50 to-cyan-50 shadow-lg hover:shadow-xl transition-shadow">
                <CardHeader className="bg-gradient-to-r from-teal-100 to-cyan-100 border-b border-teal-200">
                  <CardTitle className="text-teal-900">Start Application</CardTitle>
                  <CardDescription className="text-teal-700">
                    {csvData.length} row{csvData.length !== 1 ? 's' : ''} ready to process
                  </CardDescription>
                </CardHeader>
                <CardContent className="pt-6">
                  <Button
                    onClick={handleApplyClick}
                    disabled={isLoading}
                    className="w-full bg-gradient-to-r from-teal-500 to-cyan-500 hover:from-teal-600 hover:to-cyan-600 text-white font-semibold"
                  >
                    {isLoading ? 'Processing...' : 'Apply IPO'}
                    <Upload className="h-4 w-4 ml-2" />
                  </Button>
                </CardContent>
              </Card>
            )}
          </div>

          {/* Right Column - Data Display & Logs */}
          <div className="lg:col-span-2 space-y-6">
            {/* CSV Table */}
            {csvData.length > 0 && (
              <Card className="border-blue-200 shadow-lg">
                <CardHeader className="bg-gradient-to-r from-blue-50 to-cyan-50 border-b border-blue-100">
                  <div className="flex items-center justify-between">
                    <div>
                      <CardTitle className="text-blue-900">CSV Data Preview</CardTitle>
                      <CardDescription>Showing uploaded data (sensitive columns hidden) - Select banks from dropdown</CardDescription>
                    </div>
                    {csvData.length > 0 && (
                      <Button
                        onClick={handleDownloadUpdatedCSV}
                        variant="outline"
                        size="sm"
                        className="bg-blue-50 border-blue-200 text-blue-700 hover:bg-blue-100"
                      >
                        <Download className="h-4 w-4 mr-2" />
                        Download CSV
                      </Button>
                    )}
                  </div>
                </CardHeader>
                <CardContent className="pt-6">
                  <CSVTable data={csvData} onDataChange={handleCsvDataChange} />
                </CardContent>
              </Card>
            )}

            {/* Log Console */}
            {applyId && (
              <Card className="border-cyan-200 shadow-lg">
                <CardHeader className="bg-gradient-to-r from-cyan-50 to-teal-50 border-b border-cyan-100">
                  <CardTitle className="text-cyan-900">Live Logs</CardTitle>
                  <CardDescription>Apply ID: <span className="font-mono text-cyan-700">{applyId}</span></CardDescription>
                </CardHeader>
                <CardContent className="pt-6">
                  <LogConsole 
                    applyId={applyId} 
                    onApplyIdChange={handleApplyIdChange}
                    csvData={csvData}
                  />
                </CardContent>
              </Card>
            )}
          </div>
        </div>
      </div>

      {/* Consent Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
          <div className="bg-white rounded-lg shadow-xl max-w-lg w-full p-6 space-y-4">
            <h2 className="text-xl font-bold text-red-700">Notice & Consent</h2>
            <div className="rounded-md border-l-4 border-amber-500 bg-amber-50 p-4 shadow-sm">
              <div className="flex items-start">
                {/* Optional: Icon container */}
                <div className="flex-shrink-0">
                  <svg
                    className="h-5 w-5 text-amber-500"
                    xmlns="http://www.w3.org/2000/svg"
                    viewBox="0 0 20 20"
                    fill="currentColor"
                  >
                    <path
                      fillRule="evenodd"
                      d="M8.485 2.495c.673-1.167 2.357-1.167 3.03 0l6.28 10.875c.673 1.167-.17 2.625-1.516 2.625H3.72c-1.347 0-2.189-1.458-1.515-2.625l6.28-10.875zM10 5a.75.75 0 01.75.75v3.5a.75.75 0 01-1.5 0v-3.5A.75.75 0 0110 5zm0 9a1 1 0 100-2 1 1 0 000 2z"
                      clipRule="evenodd"
                    />
                  </svg>
                </div>

                {/* Text Content */}
                <div className="ml-3">
                  <p className="text-sm leading-relaxed text-amber-900">
                    <span className="font-semibold">Privacy Notice:</span> You are about to share sensitive
                    information. Although the system does not store any of your data, by clicking
                    Submit you acknowledge and consent that this platform may use the provided
                    information for processing your IPO application.
                  </p>
                </div>
              </div>
            </div>
            <div className="flex items-center space-x-2">
              <input
                type="checkbox"
                id="consent"
                checked={consentChecked}
                onChange={(e) => setConsentChecked(e.target.checked)}
              />
              <label htmlFor="consent" className="text-sm text-gray-700">
                I understand and consent
              </label>
            </div>
            <div className="flex justify-end space-x-2 mt-4">
              <Button
                variant="outline"
                onClick={() => setIsModalOpen(false)}
              >
                Cancel
              </Button>
              <Button
                disabled={!consentChecked || isLoading}
                onClick={async () => {
                  setIsModalOpen(false);
                  await handleApplyIPO();
                  setConsentChecked(false);
                }}
              >
                {isLoading ? 'Processing...' : 'Submit'}
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
