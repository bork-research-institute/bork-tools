import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import {
  formatCurrency,
  formatPrice,
  formatSupply,
} from '@/lib/utils/format-number';
import type { TokenSnapshot } from '@/types/token-monitor/token';
import { CheckCircle2, Copy, XCircle } from 'lucide-react';

interface TokenInfoPanelProps {
  selectedToken: TokenSnapshot | null;
  onClose?: () => void;
}

export function TokenInfoPanel({
  selectedToken,
  onClose,
}: TokenInfoPanelProps) {
  if (!selectedToken) {
    return null;
  }

  const icon = selectedToken.data?.icon;
  const links = selectedToken.data?.links as unknown[] | undefined;
  const description = selectedToken.data?.description;
  const freezable = selectedToken.data?.isFreezable;
  const mintable = selectedToken.data?.isMintable;

  return (
    <div className="relative mt-4 p-4 bg-[#0f172a] rounded-lg border border-emerald-400/10">
      {onClose && (
        <button
          type="button"
          className="absolute top-2 right-2 text-emerald-400 hover:text-emerald-300 focus:outline-none focus:ring-2 focus:ring-emerald-400 rounded p-1"
          aria-label="Close info panel"
          tabIndex={0}
          onClick={onClose}
          onKeyDown={(e) => {
            if (e.key === 'Enter' || e.key === ' ') {
              e.preventDefault();
              onClose();
            }
          }}
        >
          <XCircle className="w-5 h-5" />
        </button>
      )}
      {/* Ticker and Name header */}
      <div className="flex items-center gap-2 mb-2">
        {icon && (
          <img
            src={icon}
            alt="Token icon"
            className="w-8 h-8 rounded-full bg-white/10"
            style={{ objectFit: 'contain' }}
          />
        )}
        <span className="text-xl font-bold text-emerald-400">
          {selectedToken.data?.ticker ? `${selectedToken.data.ticker} - ` : ''}
          {selectedToken.data?.name || ''}
        </span>
      </div>
      {/* Description */}
      {description && (
        <div className="mb-2 text-xs text-white/80 whitespace-pre-line">
          {description}
        </div>
      )}
      {/* Token address */}
      <div className="flex items-center justify-between mb-2">
        <div className="flex items-center gap-2">
          <span className="font-mono text-xs text-white/80 break-all">
            {selectedToken.token_address}
          </span>
        </div>
        <button
          type="button"
          className="text-xs text-emerald-400 bg-emerald-900/30 px-2 py-1 rounded hover:bg-emerald-400/20 focus:outline-none focus:ring-2 focus:ring-emerald-400 flex items-center"
          onClick={() => {
            navigator.clipboard.writeText(selectedToken.token_address);
          }}
          aria-label="Copy token address"
        >
          <Copy className="w-4 h-4" />
        </button>
      </div>
      {/* Links */}
      {Array.isArray(links) && links.length > 0 && (
        <div className="flex flex-wrap gap-2 mb-2">
          {links.map((link, idx) => {
            let keyStr = String(idx); // fallback
            if (typeof link === 'object' && link && 'url' in link) {
              keyStr = String((link as { url: string }).url || idx);
            } else if (typeof link === 'string') {
              keyStr = link;
            }
            if (typeof link === 'string') {
              return (
                <a
                  key={keyStr}
                  href={link}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-emerald-400 underline text-xs hover:text-emerald-300"
                >
                  {link}
                </a>
              );
            }
            if (typeof link === 'object' && link !== null && 'url' in link) {
              return (
                <a
                  key={keyStr}
                  href={(link as { url: string }).url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-emerald-400 underline text-xs hover:text-emerald-300"
                >
                  {(link as { label?: string; url: string }).label ||
                    (link as { url: string }).url}
                </a>
              );
            }
            return null;
          })}
        </div>
      )}
      {/* Safety checkmarks */}
      <div className="flex gap-4 mb-2">
        <TooltipProvider>
          <Tooltip>
            <TooltipTrigger asChild={true}>
              <div className="flex items-center gap-1 text-xs">
                {freezable ? (
                  <XCircle
                    className="w-4 h-4 text-red-400"
                    aria-label="Freezable"
                  />
                ) : (
                  <CheckCircle2
                    className="w-4 h-4 text-green-400"
                    aria-label="Not Freezable"
                  />
                )}
                <span>Unfreezable</span>
              </div>
            </TooltipTrigger>
            <TooltipContent>
              <span>
                This token {freezable ? 'can' : 'cannot'} be frozen by the
                contract owner.
              </span>
            </TooltipContent>
          </Tooltip>
        </TooltipProvider>
        <TooltipProvider>
          <Tooltip>
            <TooltipTrigger asChild={true}>
              <div className="flex items-center gap-1 text-xs">
                {mintable ? (
                  <XCircle
                    className="w-4 h-4 text-red-400"
                    aria-label="Mintable"
                  />
                ) : (
                  <CheckCircle2
                    className="w-4 h-4 text-green-400"
                    aria-label="Not Mintable"
                  />
                )}
                <span>Unmintable</span>
              </div>
            </TooltipTrigger>
            <TooltipContent>
              <span>
                This token {mintable ? 'can' : 'cannot'} be minted by the
                contract owner.
              </span>
            </TooltipContent>
          </Tooltip>
        </TooltipProvider>
      </div>
      {/* Main info grid */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-2 text-xs">
        {Object.entries(selectedToken.data || {}).map(([key, value]) => {
          // Skip fields already rendered or not needed
          if (
            key === 'icon' ||
            key === 'links' ||
            key === 'description' ||
            key === 'isFreezable' ||
            key === 'isMintable' ||
            key === 'mintAuthority' ||
            key === 'freezeAuthority' ||
            key === 'liquidityMetrics' ||
            key === 'decimals' ||
            key === 'timestamp' ||
            key === 'tokenAddress' ||
            key === 'name' ||
            key === 'ticker'
          ) {
            return null;
          }
          // Format supply and marketCap
          if (key === 'supply' && typeof value === 'number') {
            return (
              <div key={key} className="flex flex-col bg-white/5 rounded p-2">
                <span className="text-emerald-400/80 font-semibold">
                  Supply
                </span>
                <span className="text-white/90 break-all whitespace-pre-wrap">
                  {formatSupply(value)}
                </span>
              </div>
            );
          }
          if (key === 'marketCap' && typeof value === 'number') {
            return (
              <div key={key} className="flex flex-col bg-white/5 rounded p-2">
                <span className="text-emerald-400/80 font-semibold">MCap</span>
                <span className="text-white/90 break-all whitespace-pre-wrap">
                  {formatCurrency(value)}
                </span>
              </div>
            );
          }
          // Format holderCount as Holders
          if (key === 'holderCount' && typeof value === 'number') {
            return (
              <div key={key} className="flex flex-col bg-white/5 rounded p-2">
                <span className="text-emerald-400/80 font-semibold">
                  Holders
                </span>
                <span className="text-white/90 break-all whitespace-pre-wrap">
                  {formatSupply(value)}
                </span>
              </div>
            );
          }
          // Format priceInfo.price
          if (
            key === 'priceInfo' &&
            value &&
            typeof value === 'object' &&
            typeof value.price === 'number'
          ) {
            return (
              <div key={key} className="flex flex-col bg-white/5 rounded p-2">
                <span className="text-emerald-400/80 font-semibold">Price</span>
                <span className="text-white/90 break-all whitespace-pre-wrap">
                  {formatPrice(value.price)}
                </span>
              </div>
            );
          }
          // Pretty print objects/arrays
          let displayValue: string;
          if (typeof value === 'object' && value !== null) {
            try {
              displayValue = JSON.stringify(value, null, 2);
            } catch {
              displayValue = String(value);
            }
          } else {
            displayValue = String(value);
          }
          return (
            <div key={key} className="flex flex-col bg-white/5 rounded p-2">
              <span className="text-emerald-400/80 font-semibold">{key}</span>
              <span className="text-white/90 break-all whitespace-pre-wrap">
                {displayValue}
              </span>
            </div>
          );
        })}
        {/* No timestamp, tokenAddress, decimals, name, or ticker as separate boxes */}
        {/* No separate box for priceInfo if not present */}
      </div>
    </div>
  );
}
