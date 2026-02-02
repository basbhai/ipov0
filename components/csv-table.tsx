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

interface CSVTableProps {
  data: Record<string, string>[];
}

export default function CSVTable({ data }: CSVTableProps) {
  if (data.length === 0) {
    return <div className="text-sm text-slate-500 text-center py-4">No data to display</div>;
  }

  // Define sensitive columns to hide
  const sensitiveColumns = ['password', 'pin'];

  // Get all columns except sensitive ones
  const allColumns = Object.keys(data[0]);
  const visibleColumns = allColumns.filter((col) => !sensitiveColumns.includes(col));

  return (
    <ScrollArea className="w-full">
      <div className="overflow-x-auto">
        <Table>
          <TableHeader>
            <TableRow>
              {visibleColumns.map((col) => (
                <TableHead key={col} className="capitalize whitespace-nowrap">
                  {col}
                </TableHead>
              ))}
            </TableRow>
          </TableHeader>
          <TableBody>
            {data.map((row, idx) => (
              <TableRow key={idx}>
                {visibleColumns.map((col) => (
                  <TableCell key={`${idx}-${col}`} className="whitespace-nowrap text-sm">
                    {row[col]}
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
