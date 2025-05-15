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
import {
  AlertTriangle,
  CheckCircle2,
  ChevronDown,
  ChevronUp,
  Copy,
  ExternalLink,
  XCircle,
} from 'lucide-react';
import { useState } from 'react';

interface TokenInfoPanelProps {
  selectedToken: TokenSnapshot | null;
  onClose?: () => void;
}

export function TokenInfoPanel({
  selectedToken,
  onClose,
}: TokenInfoPanelProps) {
  const [isChartExpanded, setIsChartExpanded] = useState(false);
  const [expandedBundles, setExpandedBundles] = useState<Set<string>>(
    new Set(),
  );

  if (!selectedToken) {
    return null;
  }

  const icon = selectedToken.data?.icon;
  const links = selectedToken.data?.links as unknown[] | undefined;
  const description = selectedToken.data?.description;
  const freezable = selectedToken.data?.isFreezable;
  const mintable = selectedToken.data?.isMintable;
  const lpProgramId = selectedToken.data?.liquidityMetrics?.lpProgramId;
  const supply = selectedToken.data?.supply || 0;
  const bundleAnalysis = selectedToken.data?.bundleAnalysis || [];

  // Calculate total bundled tokens
  const totalBundledTokens = bundleAnalysis.reduce((total, bundle) => {
    const tokenMovements =
      bundle.netTokenMovements[selectedToken.token_address];
    if (tokenMovements) {
      return total + tokenMovements.amount;
    }
    return total;
  }, 0);

  // Calculate bundled percentage
  const bundledPercentage = (totalBundledTokens / supply) * 100;
  const isHighConcentration = bundledPercentage > 10;

  // Format the timestamp to human readable format
  const formatTimestamp = (timestamp: string) => {
    const date = new Date(timestamp);
    return new Intl.DateTimeFormat('en-US', {
      month: 'short',
      day: 'numeric',
      hour: 'numeric',
      minute: 'numeric',
      hour12: true,
    }).format(date);
  };

  const toggleBundle = (bundleId: string) => {
    setExpandedBundles((prev) => {
      const next = new Set(prev);
      if (next.has(bundleId)) {
        next.delete(bundleId);
      } else {
        next.add(bundleId);
      }
      return next;
    });
  };

  const formatAddress = (address: string) => {
    return `${address.slice(0, 6)}...${address.slice(-6)}`;
  };

  const formatAmount = (amount: number, decimals: number) => {
    return amount.toLocaleString(undefined, {
      minimumFractionDigits: 0,
      maximumFractionDigits: decimals,
    });
  };

  const formatSolAmount = (amount: number) => {
    return amount.toLocaleString(undefined, {
      minimumFractionDigits: 8,
      maximumFractionDigits: 8,
    });
  };

  const openSolscan = (address: string, isTransaction = false) => {
    const baseUrl = 'https://solscan.io';
    const path = isTransaction ? '/tx' : '/account';
    window.open(`${baseUrl}${path}/${address}`, '_blank');
  };

  const handleKeyPress = (e: React.KeyboardEvent, callback: () => void) => {
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault();
      callback();
    }
  };

  return (
    <div className="relative mt-4 p-4 bg-[#0f172a] rounded-lg border border-emerald-400/10">
      {onClose && (
        <button
          type="button"
          className="absolute top-2 right-2 text-emerald-400 hover:text-emerald-300 focus:outline-none focus:ring-2 focus:ring-emerald-400 rounded p-1"
          aria-label="Close info panel"
          tabIndex={0}
          onClick={onClose}
          onKeyDown={(e) => handleKeyPress(e, onClose)}
        >
          <XCircle className="w-5 h-5" />
        </button>
      )}
      {/* Ticker and Name header */}
      <div className="flex items-center gap-3 mb-2">
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

        {/* Safety checkmarks */}
        <div className="flex gap-4">
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
          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger asChild={true}>
                <div className="flex items-center gap-1 text-xs">
                  {isHighConcentration ? (
                    <AlertTriangle
                      className="w-4 h-4 text-yellow-400"
                      aria-label="High Concentration"
                    />
                  ) : (
                    <CheckCircle2
                      className="w-4 h-4 text-green-400"
                      aria-label="Low Concentration"
                    />
                  )}
                  <span>Bundle &lt;10%</span>
                </div>
              </TooltipTrigger>
              <TooltipContent>
                <span>
                  {isHighConcentration
                    ? `High concentration: ${bundledPercentage.toFixed(2)}% of supply is bundled`
                    : `Low concentration: ${bundledPercentage.toFixed(2)}% of supply is bundled`}
                </span>
              </TooltipContent>
            </Tooltip>
          </TooltipProvider>
        </div>
      </div>
      {/* Description */}
      {description && (
        <div className="mb-2 text-xs text-white/80 whitespace-pre-line">
          {description}
        </div>
      )}
      {/* Token address */}
      <div className="flex items-center mb-2">
        <div className="flex items-center gap-2">
          <span className="font-mono text-xs text-white/80 break-all">
            {selectedToken.token_address}
          </span>
        </div>
        <button
          type="button"
          className="text-xs text-emerald-400 bg-emerald-900/30 ml-2 px-2 py-1 rounded hover:bg-emerald-400/20 focus:outline-none focus:ring-2 focus:ring-emerald-400 flex items-center"
          onClick={() => {
            navigator.clipboard.writeText(selectedToken.token_address);
          }}
          aria-label="Copy token address"
          onKeyDown={(e) =>
            handleKeyPress(e, () => {
              navigator.clipboard.writeText(selectedToken.token_address);
            })
          }
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
                  onKeyDown={(e) =>
                    handleKeyPress(e, () => {
                      navigator.clipboard.writeText(link);
                    })
                  }
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
                  onKeyDown={(e) =>
                    handleKeyPress(e, () => {
                      navigator.clipboard.writeText(
                        (link as { url: string }).url,
                      );
                    })
                  }
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

      {/* Chart Toggle Button */}
      {lpProgramId && (
        <button
          type="button"
          onClick={() => setIsChartExpanded(!isChartExpanded)}
          className="w-full flex items-center justify-center gap-2 py-2 mb-2 text-emerald-400 hover:text-emerald-300 focus:outline-none focus:ring-2 focus:ring-emerald-400 rounded"
          onKeyDown={(e) =>
            handleKeyPress(e, () => setIsChartExpanded(!isChartExpanded))
          }
        >
          {isChartExpanded ? (
            <>
              <ChevronUp className="w-4 h-4" />
              <span className="text-sm">Hide Chart</span>
            </>
          ) : (
            <>
              <ChevronDown className="w-4 h-4" />
              <span className="text-sm">Show Chart</span>
            </>
          )}
        </button>
      )}

      {/* GeckoTerminal Chart */}
      {lpProgramId && isChartExpanded && (
        <div className="w-full h-[500px] mb-4">
          <iframe
            height="100%"
            width="100%"
            id="geckoterminal-embed"
            title="GeckoTerminal Embed"
            src={`https://www.geckoterminal.com/solana/pools/${lpProgramId}?embed=1&info=0&swaps=0&grayscale=0&light_chart=0&chart_type=price&resolution=15m`}
            frameBorder="0"
            allow="clipboard-write"
            allowFullScreen={true}
            className="rounded-lg"
          />
        </div>
      )}

      {/* Bundle Analysis Section */}
      {bundleAnalysis.length > 0 && (
        <div className="mt-4 p-3 bg-white/5 rounded">
          <h3 className="text-sm font-semibold text-emerald-400 mb-2">
            Bundle Analysis
          </h3>
          <div className="space-y-2">
            {bundleAnalysis.map((bundle) => (
              <div
                key={bundle.bundleId}
                className="text-xs border border-white/10 rounded p-2"
              >
                <button
                  type="button"
                  className="w-full flex justify-between items-center cursor-pointer text-left"
                  onClick={() => toggleBundle(bundle.bundleId)}
                  onKeyDown={(e) =>
                    handleKeyPress(e, () => toggleBundle(bundle.bundleId))
                  }
                >
                  <div className="flex items-center gap-2">
                    <span className="font-mono">
                      {formatAddress(bundle.bundleId)}
                    </span>
                    <span className="text-white/60">
                      ({bundle.transactions.length} tx)
                    </span>
                  </div>
                  {expandedBundles.has(bundle.bundleId) ? (
                    <ChevronUp className="w-4 h-4 text-emerald-400" />
                  ) : (
                    <ChevronDown className="w-4 h-4 text-emerald-400" />
                  )}
                </button>

                {expandedBundles.has(bundle.bundleId) && (
                  <div className="mt-2 space-y-4">
                    {bundle.transactions.map((tx) => (
                      <div
                        key={tx.signature}
                        className="pl-2 border-l-2 border-emerald-400/20"
                      >
                        <div className="mb-2">
                          <div className="flex items-center gap-2 text-emerald-400">
                            <a
                              href={`https://solscan.io/tx/${tx.signature}`}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="font-mono cursor-pointer hover:underline"
                              onClick={(e) => {
                                e.preventDefault();
                                openSolscan(tx.signature, true);
                              }}
                            >
                              {formatAddress(tx.signature)}
                            </a>
                            <ExternalLink className="w-3 h-3" />
                          </div>
                        </div>

                        {/* Token Transfers */}
                        {(tx.tokenTransfers || []).length > 0 && (
                          <div className="mb-2">
                            <h4 className="text-emerald-400/80 mb-1">
                              Token Transfers:
                            </h4>
                            {(tx.tokenTransfers || []).map((transfer) => (
                              <div
                                key={`${transfer.fromUserAccount}-${transfer.toUserAccount}-${transfer.mint}`}
                                className="pl-2 mb-1"
                              >
                                <div className="flex items-center gap-1">
                                  <a
                                    href={`https://solscan.io/account/${transfer.fromUserAccount}`}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="font-mono cursor-pointer hover:underline"
                                    onClick={(e) => {
                                      e.preventDefault();
                                      openSolscan(transfer.fromUserAccount);
                                    }}
                                  >
                                    {formatAddress(transfer.fromUserAccount)}
                                  </a>
                                  <span>transferred to</span>
                                  <a
                                    href={`https://solscan.io/account/${transfer.toUserAccount}`}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="font-mono cursor-pointer hover:underline"
                                    onClick={(e) => {
                                      e.preventDefault();
                                      openSolscan(transfer.toUserAccount);
                                    }}
                                  >
                                    {formatAddress(transfer.toUserAccount)}
                                  </a>
                                </div>
                                <div className="pl-4 text-emerald-400">
                                  {formatAmount(transfer.tokenAmount, 8)} tokens
                                </div>
                              </div>
                            ))}
                          </div>
                        )}

                        {/* Native Transfers */}
                        {(tx.nativeTransfers || []).length > 0 && (
                          <div className="mb-2">
                            <h4 className="text-emerald-400/80 mb-1">
                              SOL Transfers:
                            </h4>
                            {(tx.nativeTransfers || []).map((transfer) => (
                              <div
                                key={`${transfer.fromUserAccount}-${transfer.toUserAccount}`}
                                className="pl-2 mb-1"
                              >
                                <div className="flex items-center gap-1">
                                  <a
                                    href={`https://solscan.io/account/${transfer.fromUserAccount}`}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="font-mono cursor-pointer hover:underline"
                                    onClick={(e) => {
                                      e.preventDefault();
                                      openSolscan(transfer.fromUserAccount);
                                    }}
                                  >
                                    {formatAddress(transfer.fromUserAccount)}
                                  </a>
                                  <span>transferred to</span>
                                  <a
                                    href={`https://solscan.io/account/${transfer.toUserAccount}`}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="font-mono cursor-pointer hover:underline"
                                    onClick={(e) => {
                                      e.preventDefault();
                                      openSolscan(transfer.toUserAccount);
                                    }}
                                  >
                                    {formatAddress(transfer.toUserAccount)}
                                  </a>
                                </div>
                                <div className="pl-4 text-emerald-400">
                                  {formatSolAmount(transfer.amount)} SOL
                                </div>
                              </div>
                            ))}
                          </div>
                        )}

                        {/* Account Changes */}
                        {(tx.accountData || []).length > 0 && (
                          <div>
                            <h4 className="text-emerald-400/80 mb-1">
                              Account Changes:
                            </h4>
                            {(tx.accountData || []).map((account) => (
                              <div key={account.account} className="pl-2 mb-2">
                                <a
                                  href={`https://solscan.io/account/${account.account}`}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  className="font-mono cursor-pointer hover:underline"
                                  onClick={(e) => {
                                    e.preventDefault();
                                    openSolscan(account.account);
                                  }}
                                >
                                  {account.account}
                                </a>
                                <div className="pl-4">
                                  <div>
                                    Change:{' '}
                                    {formatSolAmount(
                                      account.nativeBalanceChange,
                                    )}{' '}
                                    SOL
                                  </div>
                                  {(account.tokenBalanceChanges || []).map(
                                    (change) => (
                                      <div
                                        key={`${change.mint}-${change.tokenAccount}`}
                                        className="pl-2"
                                      >
                                        <a
                                          href={`https://solscan.io/account/${change.mint}`}
                                          target="_blank"
                                          rel="noopener noreferrer"
                                          className="font-mono cursor-pointer hover:underline"
                                          onClick={(e) => {
                                            e.preventDefault();
                                            openSolscan(change.mint);
                                          }}
                                        >
                                          {formatAddress(change.mint)}
                                        </a>
                                        <div className="pl-2">
                                          Change:{' '}
                                          {change.rawTokenAmount.tokenAmount}{' '}
                                          tokens
                                        </div>
                                      </div>
                                    ),
                                  )}
                                </div>
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Key Metrics Row */}
      <div className="flex gap-2 text-xs">
        {/* Snapshot Time */}
        {selectedToken.timestamp && (
          <div className="flex-1 flex flex-col bg-white/5 rounded p-2">
            <span className="text-emerald-400/80 font-semibold">
              Latest Snapshot
            </span>
            <span className="text-white/90 break-all whitespace-pre-wrap">
              {formatTimestamp(selectedToken.timestamp)}
            </span>
          </div>
        )}

        {/* Supply */}
        {typeof selectedToken.data?.supply === 'number' && (
          <div className="flex-1 flex flex-col bg-white/5 rounded p-2">
            <span className="text-emerald-400/80 font-semibold">Supply</span>
            <span className="text-white/90 break-all whitespace-pre-wrap">
              {formatSupply(selectedToken.data.supply)}
            </span>
          </div>
        )}

        {/* Market Cap */}
        {typeof selectedToken.data?.marketCap === 'number' && (
          <div className="flex-1 flex flex-col bg-white/5 rounded p-2">
            <span className="text-emerald-400/80 font-semibold">MCap</span>
            <span className="text-white/90 break-all whitespace-pre-wrap">
              {formatCurrency(selectedToken.data.marketCap)}
            </span>
          </div>
        )}

        {/* Price */}
        {typeof selectedToken.data?.priceInfo?.price === 'number' && (
          <div className="flex-1 flex flex-col bg-white/5 rounded p-2">
            <span className="text-emerald-400/80 font-semibold">Price</span>
            <span className="text-white/90 break-all whitespace-pre-wrap">
              {formatPrice(selectedToken.data.priceInfo.price)}
            </span>
          </div>
        )}

        {/* Holders */}
        {typeof selectedToken.data?.holderCount === 'number' && (
          <div className="flex-1 flex flex-col bg-white/5 rounded p-2">
            <span className="text-emerald-400/80 font-semibold">Holders</span>
            <span className="text-white/90 break-all whitespace-pre-wrap">
              {formatSupply(selectedToken.data.holderCount)}
            </span>
          </div>
        )}
      </div>
    </div>
  );
}
