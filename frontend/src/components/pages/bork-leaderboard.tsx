import { StakersList } from '../stakers/stakers-list';

export function BorkLeaderboard() {
  return (
    <div className="space-y-8">
      <div className="space-y-4">
        <h1 className="font-bold text-3xl text-white">
          Bork Staking Leaderboard
        </h1>
        <p className="text-gray-300">
          Track the top stakers in the Bork ecosystem. See who's leading the
          pack and monitor your own position.
        </p>
      </div>
      <StakersList />
    </div>
  );
}
