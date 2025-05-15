import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { Spinner } from '@/components/ui/spinner';
import { tokenLaunchService } from '@/lib/services/token-launch-service';
import type { TokenLaunch } from '@/types/token-launch';
import { Copy, ExternalLink } from 'lucide-react';
import { useEffect, useState } from 'react';
import { toast } from 'sonner';

export function LaunchedTokensPanel() {
  const [launches, setLaunches] = useState<TokenLaunch[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchLaunches = async () => {
      try {
        const data = await tokenLaunchService.getAllTokenLaunches();
        setLaunches(data);
      } catch (error) {
        console.error('Error fetching token launches:', error);
        toast.error('Failed to fetch token launches');
      } finally {
        setLoading(false);
      }
    };

    fetchLaunches();
  }, []);

  const handleCopyMintAddress = (mintAddress: string) => {
    navigator.clipboard.writeText(mintAddress);
    toast.success('Mint address copied to clipboard');
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-32">
        <Spinner size="lg" />
      </div>
    );
  }

  if (launches.length === 0) {
    return (
      <div className="flex items-center justify-center h-32">
        <span className="text-emerald-400/60">No launched tokens yet</span>
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 p-4">
      {launches.map((launch) => (
        <Card
          key={launch.id}
          className="bg-black/50 border-emerald-400/10 hover:border-emerald-400/20 transition-colors"
        >
          <CardHeader className="p-4">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-full overflow-hidden bg-emerald-400/10 flex items-center justify-center">
                {launch.tokenImage ? (
                  <img
                    src={`data:image/png;base64,${launch.tokenImage}`}
                    alt={launch.tokenName}
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <span className="text-emerald-400/60 text-lg">
                    {launch.tokenSymbol.slice(0, 2)}
                  </span>
                )}
              </div>
              <div>
                <h3 className="text-white/90 font-bold">{launch.tokenName}</h3>
                <p className="text-emerald-400/60 text-sm">
                  {launch.tokenSymbol}
                </p>
              </div>
            </div>
          </CardHeader>
          <CardContent className="p-4 pt-0">
            <p className="text-white/60 text-sm mb-4 line-clamp-2">
              {launch.tokenDescription}
            </p>
            <div className="flex flex-col gap-2">
              <div className="flex items-center gap-2">
                <span className="text-emerald-400/60 text-xs">
                  Mint Address:
                </span>
                <code className="text-white/60 text-xs flex-1 truncate">
                  {launch.mintAddress}
                </code>
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-6 w-6 p-0 text-emerald-400/60 hover:text-emerald-400"
                  onClick={() => handleCopyMintAddress(launch.mintAddress)}
                >
                  <Copy className="h-3 w-3" />
                </Button>
              </div>
              <Button
                variant="outline"
                size="sm"
                className="w-full text-xs bg-emerald-400/10 text-emerald-400 hover:bg-emerald-400/20 border-emerald-400/20"
                onClick={() => window.open(launch.campaignUrl, '_blank')}
              >
                <ExternalLink className="h-3 w-3 mr-2" />
                View Campaign
              </Button>
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}
