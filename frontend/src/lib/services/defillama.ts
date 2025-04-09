type PriceResponse = {
  coins: {
    [key: string]: {
      decimals: number;
      symbol: string;
      price: number;
      timestamp: number;
      confidence: number;
    };
  };
};

type VolumeResponse = {
  total24h: number;
  change_1d: number;
  chain: string;
};

const CHAIN_CONFIG = {
  Injective: {
    priceId: 'ethereum:0xe28b3b32b6c345a34ff64674606124dd5aceca30',
    chain: 'injective',
  },
  Solana: {
    priceId: 'solana:So11111111111111111111111111111111111111112',
    chain: 'solana',
  },
} as const;

export async function getChainStats(chainName: keyof typeof CHAIN_CONFIG) {
  const config = CHAIN_CONFIG[chainName];

  // TODO Should probably be a single request
  const [priceRes, volumeRes] = await Promise.all([
    fetch(
      `https://coins.llama.fi/prices/current/${config.priceId}?searchWidth=4h`,
    ),
    fetch(
      `https://api.llama.fi/overview/dexs/${config.chain}?excludeTotalDataChart=true&excludeTotalDataChartBreakdown=true&dataType=dailyVolume`,
    ),
  ]);

  const priceData = (await priceRes.json()) as PriceResponse;
  const volumeData = (await volumeRes.json()) as VolumeResponse;

  return {
    price: priceData.coins[config.priceId].price,
    volume24h: volumeData.total24h,
    volumeChange24h: volumeData.change_1d,
  };
}
