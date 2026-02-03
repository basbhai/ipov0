'use client';

import { useState } from 'react';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { BANKS } from '@/lib/banks';
import { Input } from '@/components/ui/input';

interface BankSelectorProps {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
}

export function BankSelector({
  value,
  onChange,
  placeholder = 'Select Bank',
}: BankSelectorProps) {
  const [searchTerm, setSearchTerm] = useState('');

  // Filter banks based on search term
  const filteredBanks = BANKS.filter((bank) =>
    bank.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <Select value={value} onValueChange={onChange}>
      <SelectTrigger className="w-full">
        <SelectValue placeholder={placeholder} />
      </SelectTrigger>
      <SelectContent className="max-h-60">
        {/* Search input in the dropdown */}
        <div className="sticky top-0 z-10 px-2 py-2 bg-white border-b">
          <Input
            placeholder="Search banks..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="h-8 text-xs"
            autoFocus
          />
        </div>

        {/* Bank options */}
        {filteredBanks.length > 0 ? (
          filteredBanks.map((bank) => (
            <SelectItem key={bank} value={bank} className="text-xs">
              {bank}
            </SelectItem>
          ))
        ) : (
          <div className="px-2 py-4 text-xs text-center text-slate-500">
            No banks found
          </div>
        )}
      </SelectContent>
    </Select>
  );
}
