import { type NextRequest, NextResponse } from 'next/server';
import { tokenLaunchQueries } from '../../../../backend/src/bork-protocol/db/token-launch-queries';

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const userId = searchParams.get('userId');

    let launches;
    if (userId) {
      launches = await tokenLaunchQueries.getUserTokenLaunches(userId);
    } else {
      launches = await tokenLaunchQueries.getAllTokenLaunches();
    }

    return NextResponse.json(launches);
  } catch (error) {
    console.error('Error fetching token launches:', error);
    return NextResponse.json(
      { error: 'Failed to fetch token launches' },
      { status: 500 },
    );
  }
}
