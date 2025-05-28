import { stakerSchema } from '@/lib/validators/staker-schema';

// Minimum required $BORK tokens for access
const MIN_BORK_REQUIRED = 100_000_000;

export async function checkTokenBalance(
  walletAddress: string,
): Promise<boolean> {
  try {
    const response = await fetch(
      `https://bork-tools.vercel.app/api/stakers/${walletAddress}`,
      {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        },
        mode: 'cors', // Explicitly request CORS
      },
    );

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    const data = await response.json();
    const stakerData = stakerSchema.parse(data);
    return stakerData.total >= MIN_BORK_REQUIRED;
  } catch (error) {
    console.error('Error checking token balance:', error);
    throw error;
  }
}
