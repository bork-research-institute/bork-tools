import { Brain, Clock, Target, Zap } from 'lucide-react';
import { Button } from '../../ui/button';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '../../ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../../ui/tabs';

const metrics = [
  {
    title: 'Virality Score',
    value: '76/100',
    description: 'Your content potential',
    trend: '+8.3%',
    icon: Zap,
    color: 'text-yellow-500',
    action: 'Boost Score',
  },
  {
    title: 'Growth Opportunities',
    value: '12',
    description: 'Ready to act on',
    trend: '+5 new',
    icon: Target,
    color: 'text-emerald-500',
    action: 'View All',
  },
  {
    title: 'Best Post Time',
    value: '3:00 PM',
    description: 'Optimal engagement',
    trend: '89% confidence',
    icon: Clock,
    color: 'text-purple-500',
    action: 'Schedule',
  },
  {
    title: 'AI Suggestions',
    value: '8',
    description: 'Content ideas ready',
    trend: 'Updated now',
    icon: Brain,
    color: 'text-blue-500',
    action: 'Generate',
  },
];

export function XAnalysisDashboard() {
  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-3xl font-bold text-white">X Analysis</h1>
        <p className="mt-2 text-gray-400">
          AI-powered insights and actions to grow your X presence
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
                    <Button
                      variant="outline"
                      size="sm"
                      className="text-emerald-500 border-emerald-500/20 hover:bg-emerald-500/10"
                    >
                      {metric.action}
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>

      <Tabs defaultValue="opportunities" className="space-y-6">
        <TabsList className="bg-[#020617]/80 border border-emerald-400/20">
          <TabsTrigger value="opportunities" className="text-white">
            Growth Opportunities
          </TabsTrigger>
          <TabsTrigger value="content" className="text-white">
            Content Generator
          </TabsTrigger>
          <TabsTrigger value="trends" className="text-white">
            Trend Analysis
          </TabsTrigger>
          <TabsTrigger value="scheduler" className="text-white">
            Smart Scheduler
          </TabsTrigger>
        </TabsList>
        <TabsContent value="opportunities">
          <Card className="border-emerald-400/20 bg-[#020617]/80">
            <CardHeader>
              <CardTitle>Growth Opportunities</CardTitle>
              <CardDescription>
                AI-detected opportunities to increase your engagement
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div className="p-4 border border-emerald-400/20 rounded-lg">
                  <div className="flex items-center justify-between">
                    <div>
                      <h3 className="text-white font-semibold">
                        Trending Topic Match
                      </h3>
                      <p className="text-gray-400 text-sm">
                        Your expertise matches trending topic "AI Ethics"
                      </p>
                    </div>
                    <Button className="bg-emerald-500 hover:bg-emerald-600">
                      Generate Post
                    </Button>
                  </div>
                </div>
                <div className="p-4 border border-emerald-400/20 rounded-lg">
                  <div className="flex items-center justify-between">
                    <div>
                      <h3 className="text-white font-semibold">
                        Engagement Gap
                      </h3>
                      <p className="text-gray-400 text-sm">
                        Your followers are most active now
                      </p>
                    </div>
                    <Button className="bg-emerald-500 hover:bg-emerald-600">
                      Post Now
                    </Button>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
        <TabsContent value="content">
          <Card className="border-emerald-400/20 bg-[#020617]/80">
            <CardHeader>
              <CardTitle>AI Content Generator</CardTitle>
              <CardDescription>
                Generate high-impact content based on trends and your style
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div className="p-4 border border-emerald-400/20 rounded-lg">
                  <h3 className="text-white font-semibold mb-2">
                    Content Suggestions
                  </h3>
                  <div className="space-y-2">
                    <Button className="w-full justify-start text-left bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-500">
                      🔥 Thread: "5 AI Breakthroughs This Week"
                    </Button>
                    <Button className="w-full justify-start text-left bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-500">
                      💡 Poll: "Which AI Tool Do You Use Daily?"
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
                Most influential accounts in the community
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="text-gray-400">
                Influencer tracking coming soon...
              </div>
            </CardContent>
          </Card>
        </TabsContent>
        <TabsContent value="community">
          <Card className="border-emerald-400/20 bg-[#020617]/80">
            <CardHeader>
              <CardTitle>Community Activity</CardTitle>
              <CardDescription>
                Recent activity from community members
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="text-gray-400">
                Community activity tracking coming soon...
              </div>
            </CardContent>
          </Card>
        </TabsContent>
        <TabsContent value="trending">
          <Card className="border-emerald-400/20 bg-[#020617]/80">
            <CardHeader>
              <CardTitle>Trending Topics</CardTitle>
              <CardDescription>
                Most discussed topics in the community
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="text-gray-400">Topic analysis coming soon...</div>
            </CardContent>
          </Card>
        </TabsContent>
        <TabsContent value="sentiment">
          <Card className="border-emerald-400/20 bg-[#020617]/80">
            <CardHeader>
              <CardTitle>Sentiment Analysis</CardTitle>
              <CardDescription>Community sentiment over time</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="text-gray-400">
                Sentiment analysis coming soon...
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
