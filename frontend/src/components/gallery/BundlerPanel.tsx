'use client';

import { Panel } from './Panel';

interface TokenBundling {
  address: string;
  name: string;
  bundlerLevel: number;
  timestamp: string;
}

interface BundlerPanelProps {
  maxHeight?: string;
  tokenAddress?: string;
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

export function BundlerPanel({ maxHeight, tokenAddress }: BundlerPanelProps) {
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
    <Panel maxHeight={maxHeight}>
      <table className="w-full border-separate border-spacing-0">
        <thead>
          <tr>
            <th className="sticky top-0 z-10 border-b border-white/10 px-2 py-1 text-left w-[30%]">
              <div className="text-xs font-medium text-white/40 uppercase tracking-wider">
                Ticker
              </div>
            </th>
            <th className="sticky top-0 z-10 border-b border-white/10 px-2 py-1 text-left w-[35%]">
              <div className="text-xs font-medium text-white/40 uppercase tracking-wider">
                Risk
              </div>
            </th>
            <th className="sticky top-0 z-10 border-b border-white/10 px-2 py-1 text-right w-[15%]">
              <div className="text-xs font-medium text-white/40 uppercase tracking-wider">
                Bundled
              </div>
            </th>
            <th className="sticky top-0 z-10 border-b border-white/10 px-2 py-1 text-right w-[20%]">
              <div className="text-xs font-medium text-white/40 uppercase tracking-wider">
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
                  <span className="uppercase font-bold text-white/90">
                    {token.name.toLowerCase()}
                  </span>
                </td>
                <td className="px-2 py-1 text-xs border-b border-white/5 group-hover:border-white/10">
                  <span
                    className={`px-2 py-0.5 rounded-full ${getRiskColor(
                      token.bundlerLevel,
                    )}`}
                  >
                    {getRiskLabel(token.bundlerLevel)}
                  </span>
                </td>
                <td className="px-2 py-1 text-xs border-b border-white/5 group-hover:border-white/10 text-right font-medium text-white">
                  {token.bundlerLevel.toFixed(1)}%
                </td>
                <td className="px-2 py-1 text-xs border-b border-white/5 group-hover:border-white/10 text-right text-white/40">
                  {token.timestamp}
                </td>
              </tr>
            ))}
        </tbody>
      </table>
    </Panel>
  );
}
