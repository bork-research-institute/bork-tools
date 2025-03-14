import {
  Activity,
  Brain,
  ChartBar,
  type LucideIcon,
  Users,
} from 'lucide-react';
import { Button } from '../../ui/button';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '../../ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../../ui/tabs';

const metrics: Array<{
  title: string;
  value: string;
  description: string;
  trend: string;
  icon: LucideIcon;
  color: string;
}> = [
  {
    title: 'Community Health',
    value: '92/100',
    description: 'Overall health score',
    trend: '+5.2%',
    icon: Activity,
    color: 'text-emerald-500',
  },
  {
    title: 'Sentiment Score',
    value: '78/100',
    description: 'Positive sentiment',
    trend: '+3.1%',
    icon: Brain,
    color: 'text-blue-500',
  },
  {
    title: 'Active Influencers',
    value: '24',
    description: 'High-impact users',
    trend: '+2 new',
    icon: Users,
    color: 'text-purple-500',
  },
  {
    title: 'Engagement Rate',
    value: '4.2%',
    description: 'Community activity',
    trend: '+0.8%',
    icon: ChartBar,
    color: 'text-yellow-500',
  },
];

export function XAnalysisDashboard() {
  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-3xl font-bold text-white">X Analysis</h1>
        <p className="mt-2 text-gray-400">
          AI-powered community health tracking and sentiment analysis
        </p>
      </div>

      <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
        {metrics.map((metric) => {
          const Icon = metric.icon;
          return (
            <Card
              key={metric.title}
              className="border-emerald-400/20 bg-[#020617]/80"
            >
              <CardHeader>
                <div className="flex items-center justify-between">
                  <CardTitle className="text-sm font-medium text-gray-300">
                    {metric.title}
                  </CardTitle>
                  <Icon className={`h-4 w-4 ${metric.color}`} />
                </div>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  <div className="text-2xl font-bold text-white">
                    {metric.value}
                  </div>
                  <div className="flex items-center justify-between text-sm">
                    <div className="flex items-center">
                      <span className="text-gray-400">
                        {metric.description}
                      </span>
                      <span className="ml-2 text-emerald-500">
                        {metric.trend}
                      </span>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>

      <Tabs defaultValue="community" className="space-y-6">
        <TabsList className="bg-[#020617]/80 border border-emerald-400/20">
          <TabsTrigger value="community" className="text-white">
            Community Health
          </TabsTrigger>
          <TabsTrigger value="sentiment" className="text-white">
            Sentiment Analysis
          </TabsTrigger>
          <TabsTrigger value="influencers" className="text-white">
            Top Influencers
          </TabsTrigger>
          <TabsTrigger value="projects" className="text-white">
            Project Tracking
          </TabsTrigger>
        </TabsList>
        <TabsContent value="community">
          <Card className="border-emerald-400/20 bg-[#020617]/80">
            <CardHeader>
              <CardTitle>Community Health Overview</CardTitle>
              <CardDescription>
                Real-time metrics and trends for community engagement
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div className="p-4 border border-emerald-400/20 rounded-lg">
                  <div className="flex items-center justify-between">
                    <div>
                      <h3 className="text-white font-semibold">
                        Engagement Spike
                      </h3>
                      <p className="text-gray-400 text-sm">
                        45% increase in community activity in the last 24 hours
                      </p>
                    </div>
                    <Button className="bg-emerald-500 hover:bg-emerald-600">
                      View Details
                    </Button>
                  </div>
                </div>
                <div className="p-4 border border-emerald-400/20 rounded-lg">
                  <div className="flex items-center justify-between">
                    <div>
                      <h3 className="text-white font-semibold">
                        Growth Opportunity
                      </h3>
                      <p className="text-gray-400 text-sm">
                        High engagement potential in "DeFi" discussions
                      </p>
                    </div>
                    <Button className="bg-emerald-500 hover:bg-emerald-600">
                      Analyze
                    </Button>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
        <TabsContent value="sentiment">
          <Card className="border-emerald-400/20 bg-[#020617]/80">
            <CardHeader>
              <CardTitle>Sentiment Analysis</CardTitle>
              <CardDescription>
                AI-powered sentiment tracking across topics and projects
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div className="p-4 border border-emerald-400/20 rounded-lg">
                  <h3 className="text-white font-semibold mb-2">
                    Trending Sentiment
                  </h3>
                  <div className="space-y-2">
                    <Button className="w-full justify-start text-left bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-500">
                      📈 "Layer 2 Solutions" - 85% Positive
                    </Button>
                    <Button className="w-full justify-start text-left bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-500">
                      📉 "Market Volatility" - 65% Negative
                    </Button>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
        <TabsContent value="influencers">
          <Card className="border-emerald-400/20 bg-[#020617]/80">
            <CardHeader>
              <CardTitle>Top Influencers</CardTitle>
              <CardDescription>
                Most influential community members and their impact
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div className="p-4 border border-emerald-400/20 rounded-lg">
                  <div className="flex items-center justify-between">
                    <div>
                      <h3 className="text-white font-semibold">@cryptodev</h3>
                      <p className="text-gray-400 text-sm">
                        Influence Score: 92 | 50K followers
                      </p>
                    </div>
                    <Button className="bg-emerald-500 hover:bg-emerald-600">
                      Track
                    </Button>
                  </div>
                </div>
                <div className="p-4 border border-emerald-400/20 rounded-lg">
                  <div className="flex items-center justify-between">
                    <div>
                      <h3 className="text-white font-semibold">@web3builder</h3>
                      <p className="text-gray-400 text-sm">
                        Influence Score: 88 | 35K followers
                      </p>
                    </div>
                    <Button className="bg-emerald-500 hover:bg-emerald-600">
                      Track
                    </Button>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
        <TabsContent value="projects">
          <Card className="border-emerald-400/20 bg-[#020617]/80">
            <CardHeader>
              <CardTitle>Project Health Tracking</CardTitle>
              <CardDescription>
                Monitor community health and sentiment for specific projects
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div className="p-4 border border-emerald-400/20 rounded-lg">
                  <div className="flex items-center justify-between">
                    <div>
                      <h3 className="text-white font-semibold">
                        Project Alpha
                      </h3>
                      <p className="text-gray-400 text-sm">
                        Health Score: 94 | Sentiment: 88% Positive
                      </p>
                    </div>
                    <Button className="bg-emerald-500 hover:bg-emerald-600">
                      View Details
                    </Button>
                  </div>
                </div>
                <div className="p-4 border border-emerald-400/20 rounded-lg">
                  <div className="flex items-center justify-between">
                    <div>
                      <h3 className="text-white font-semibold">Project Beta</h3>
                      <p className="text-gray-400 text-sm">
                        Health Score: 82 | Sentiment: 75% Positive
                      </p>
                    </div>
                    <Button className="bg-emerald-500 hover:bg-emerald-600">
                      View Details
                    </Button>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
