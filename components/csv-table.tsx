'use client';

import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { ScrollArea } from '@/components/ui/scroll-area';
import { BankSelector } from '@/components/bank-selector';
import { useState, useEffect } from 'react';

interface CSVTableProps {
  data: Record<string, string>[];
  onDataChange?: (updatedData: Record<string, string>[]) => void;
}

export default function CSVTable({ data, onDataChange }: CSVTableProps) {
  const [tableData, setTableData] = useState<Record<string, string>[]>([]);

  // Initialize table data with bank column - only when data changes
  useEffect(() => {
    if (data.length === 0) {
      setTableData([]);
      return;
    }

    const newData = data.map((row) => {
      // Add bank column if it doesn't exist
      if (!row.bank) {
        return { ...row, bank: '' };
      }
      return row;
    });

    setTableData(newData);
  }, [data]);

  if (tableData.length === 0) {
    return <div className="text-sm text-slate-500 text-center py-4">No data to display</div>;
  }

  // Define sensitive columns to hide
  const sensitiveColumns = ['password', 'pin'];

  // Get all columns, always include bank
  const allColumns = Object.keys(tableData[0]);
  const visibleColumns = allColumns.filter(
    (col) => !sensitiveColumns.includes(col)
  );

  // Ensure 'bank' is the second to last visible column
  const bankIndex = visibleColumns.indexOf('bank');
  if (bankIndex > -1) {
    visibleColumns.splice(bankIndex, 1);
  }
  if (!visibleColumns.includes('bank')) {
    visibleColumns.push('bank');
  }

  const handleBankChange = (rowIndex: number, bank: string) => {
    const updatedData = [...tableData];
    updatedData[rowIndex] = { ...updatedData[rowIndex], bank };
    setTableData(updatedData);
    // Notify parent of changes without creating circular dependencies
    if (onDataChange) {
      onDataChange(updatedData);
    }
  };

  return (
    <ScrollArea className="w-full">
      <div className="overflow-x-auto">
        <Table>
          <TableHeader>
            <TableRow className="bg-slate-100">
              {visibleColumns.map((col) => (
                <TableHead key={col} className="capitalize whitespace-nowrap font-semibold">
                  {col === 'bank' ? '🏦 Bank' : col}
                </TableHead>
              ))}
            </TableRow>
          </TableHeader>
          <TableBody>
            {tableData.map((row, idx) => (
              <TableRow key={idx} className="hover:bg-slate-50">
                {visibleColumns.map((col) => (
                  <TableCell key={`${idx}-${col}`} className="whitespace-nowrap text-sm py-2">
                    {col === 'bank' ? (
                      <div className="min-w-48">
                        <BankSelector
                          value={row[col] || ''}
                          onChange={(value) => handleBankChange(idx, value)}
                          placeholder="Select Bank"
                        />
                      </div>
                    ) : (
                      row[col]
                    )}
                  </TableCell>
                ))}
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
    </ScrollArea>
  );
}
