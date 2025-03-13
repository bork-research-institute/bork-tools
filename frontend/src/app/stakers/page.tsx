import { StakersList } from '../../components/stakers/stakers-list';

export default function StakersPage() {
  return (
    <div className="container mx-auto px-4 py-8">
      <h1 className="text-3xl font-bold mb-6">Bork Token Stakers</h1>
      <StakersList />
    </div>
  );
}
