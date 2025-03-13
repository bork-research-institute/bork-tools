import { BarChart3, Coins, LineChart, Lock, Wallet } from 'lucide-react';
import Link from 'next/link';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '../ui/card';

const tools = [
  {
    title: 'Staking Leaderboard',
    description:
      'Track top stakers and monitor your position in the Bork ecosystem.',
    icon: Coins,
    href: '/leaderboard',
    color: 'text-emerald-500',
    available: true,
  },
  {
    title: 'X Analysis',
    description:
      'Track and analyze X (Twitter) activity of key influencers and community members.',
    icon: BarChart3,
    href: '/x-analysis',
    color: 'text-blue-500',
    available: true,
  },
  {
    title: 'GFM Tools',
    description: 'Advanced trading tools for GFM operations and analysis.',
    icon: LineChart,
    href: '/gfm',
    color: 'text-purple-500',
    available: false,
  },
  {
    title: 'Wallet Tools',
    description:
      'Manage and analyze your Bork wallet holdings and transactions.',
    icon: Wallet,
    href: '/wallet',
    color: 'text-orange-500',
    available: false,
  },
];

export function Home() {
  return (
    <div className="space-y-12">
      <div className="space-y-4 text-center">
        <h1 className="text-4xl font-bold text-white">Bork Tools</h1>
        <p className="mx-auto max-w-2xl text-lg text-gray-300">
          Your comprehensive toolkit for the Bork ecosystem. From staking to
          trading, we provide the tools you need to navigate and succeed.
        </p>
      </div>
      <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
        {tools.map((tool) => {
          const Icon = tool.icon;
          return tool.available ? (
            <Link
              key={tool.title}
              href={tool.href}
              className="block group relative overflow-hidden border border-emerald-400/20 bg-[#020617]/80 transition-all duration-200 cursor-pointer hover:border-emerald-400 hover:scale-105"
            >
              <Card className="border-0 bg-transparent">
                <CardHeader>
                  <div className="flex items-center space-x-2">
                    <Icon className={`h-5 w-5 ${tool.color}`} />
                    <CardTitle className="text-lg text-white">
                      {tool.title}
                    </CardTitle>
                  </div>
                  <CardDescription className="text-gray-400">
                    {tool.description}
                  </CardDescription>
                </CardHeader>
                <CardContent />
              </Card>
            </Link>
          ) : (
            <Card
              key={tool.title}
              className="group relative overflow-hidden border border-emerald-400/20 bg-[#020617]/80 transition-all cursor-not-allowed opacity-50 border-0 bg-transparent"
            >
              <CardHeader>
                <div className="flex items-center space-x-2">
                  <Icon className={`h-5 w-5 ${tool.color}`} />
                  <CardTitle className="text-lg text-white">
                    {tool.title}
                  </CardTitle>
                </div>
                <CardDescription className="text-gray-400">
                  {tool.description}
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="flex items-center justify-center space-x-2 text-sm text-gray-500">
                  <Lock className="h-4 w-4" />
                  <span>Coming Soon</span>
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>
    </div>
  );
}
