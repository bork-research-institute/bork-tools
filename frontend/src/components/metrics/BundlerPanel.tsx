import { Box, Filter } from 'lucide-react';
import { useState } from 'react';
import { Button } from '../ui/button';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '../ui/dialog';
import { Input } from '../ui/input';
import { Panel } from './Panel';

interface BundlerPanelProps {
  onClose: () => void;
}

interface TokenBundling {
  address: string;
  name: string;
  bundlerLevel: number;
  timestamp: string;
}

const mockBundlerData: TokenBundling[] = [
  {
    address: '0x1234...5678',
    name: 'PWEASE',
    bundlerLevel: 12.5,
    timestamp: '2024-03-20 14:30',
  },
  {
    address: '0x2345...6789',
    name: 'SHEF',
    bundlerLevel: 7.2,
    timestamp: '2024-03-20 14:25',
  },
  {
    address: '0x3456...7890',
    name: 'PEPE',
    bundlerLevel: 3.1,
    timestamp: '2024-03-20 14:20',
  },
  {
    address: '0x4567...8901',
    name: 'WOJAK',
    bundlerLevel: 15.8,
    timestamp: '2024-03-20 14:15',
  },
  {
    address: '0x5678...9012',
    name: 'BONK',
    bundlerLevel: 4.2,
    timestamp: '2024-03-20 14:10',
  },
  {
    address: '0x6789...0123',
    name: 'DOGE',
    bundlerLevel: 9.5,
    timestamp: '2024-03-20 14:05',
  },
];

export function BundlerPanel({ onClose }: BundlerPanelProps) {
  const [tokenAddress, setTokenAddress] = useState('');
  const [isDialogOpen, setIsDialogOpen] = useState(false);

  const getRiskColor = (bundlerLevel: number) => {
    if (bundlerLevel > 10) {
      return 'bg-red-500/20 border-red-500 text-red-400';
    }
    if (bundlerLevel > 5) {
      return 'bg-yellow-500/20 border-yellow-500 text-yellow-400';
    }
    return 'bg-green-500/20 border-green-500 text-green-400';
  };

  const getRiskLabel = (bundlerLevel: number) => {
    if (bundlerLevel > 10) {
      return 'High';
    }
    if (bundlerLevel > 5) {
      return 'Medium';
    }
    return 'Low';
  };

  return (
    <Panel
      title="Bundler Analysis"
      icon={<Box className="h-3.5 w-3.5" />}
      className="border border-white/[0.08] bg-black/40 backdrop-blur-sm hover:border-white/[0.12] transition-colors"
      onClose={onClose}
      headerContent={
        <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
          <DialogTrigger asChild={true}>
            <Button
              variant="ghost"
              size="icon"
              className="h-8 w-8 p-0 text-gray-400 hover:text-white"
            >
              <Filter className="h-4 w-4" />
            </Button>
          </DialogTrigger>
          <DialogContent className="bg-black/90 border-white/10">
            <DialogHeader>
              <DialogTitle className="text-white">
                Set Token Address
              </DialogTitle>
            </DialogHeader>
            <div className="space-y-4 py-4">
              <Input
                placeholder="Enter token address (0x...)"
                value={tokenAddress}
                onChange={(e) => setTokenAddress(e.target.value)}
                className="bg-white/5 border-white/10 text-white"
              />
              <Button className="w-full" onClick={() => setIsDialogOpen(false)}>
                Apply
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      }
    >
      <div className="absolute inset-x-0 bottom-0 top-[2.5rem] overflow-auto">
        <div className="relative">
          <table className="w-full border-separate border-spacing-0">
            <thead>
              <tr>
                <th className="sticky top-0 z-10 bg-black border-b border-white/10 px-2 py-1 text-left w-[30%]">
                  <div className="text-xs font-medium text-gray-400 uppercase tracking-wider">
                    Ticker
                  </div>
                </th>
                <th className="sticky top-0 z-10 bg-black border-b border-white/10 px-2 py-1 text-left w-[35%]">
                  <div className="text-xs font-medium text-gray-400 uppercase tracking-wider">
                    Risk
                  </div>
                </th>
                <th className="sticky top-0 z-10 bg-black border-b border-white/10 px-2 py-1 text-right w-[15%]">
                  <div className="text-xs font-medium text-gray-400 uppercase tracking-wider">
                    Bundled
                  </div>
                </th>
                <th className="sticky top-0 z-10 bg-black border-b border-white/10 px-2 py-1 text-right w-[20%]">
                  <div className="text-xs font-medium text-gray-400 uppercase tracking-wider">
                    Time
                  </div>
                </th>
              </tr>
            </thead>
            <tbody>
              {mockBundlerData
                .filter(
                  (token) =>
                    !tokenAddress ||
                    token.address
                      .toLowerCase()
                      .includes(tokenAddress.toLowerCase()),
                )
                .map((token) => (
                  <tr
                    key={token.address}
                    className="hover:bg-white/5 transition-colors group"
                  >
                    <td className="px-2 py-1 text-xs border-b border-white/5 group-hover:border-white/10 font-medium text-white">
                      {token.name}
                    </td>
                    <td className="px-2 py-1 text-xs border-b border-white/5 group-hover:border-white/10">
                      <span
                        className={`px-2 py-0.5 rounded-full ${getRiskColor(token.bundlerLevel)}`}
                      >
                        {getRiskLabel(token.bundlerLevel)}
                      </span>
                    </td>
                    <td className="px-2 py-1 text-xs border-b border-white/5 group-hover:border-white/10 text-right font-medium text-white">
                      {token.bundlerLevel.toFixed(1)}%
                    </td>
                    <td className="px-2 py-1 text-xs border-b border-white/5 group-hover:border-white/10 text-right text-gray-500">
                      {token.timestamp}
                    </td>
                  </tr>
                ))}
            </tbody>
          </table>
        </div>
      </div>
    </Panel>
  );
}
