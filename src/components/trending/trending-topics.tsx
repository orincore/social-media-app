'use client';

import { useRouter } from 'next/navigation';
import { TrendingUp, Hash, MapPin } from 'lucide-react';

const trendingTopics = [
  {
    category: 'Politics',
    hashtag: '#Election2024',
    posts: '127K',
    trend: 'up'
  },
  {
    category: 'Technology',
    hashtag: '#AI',
    posts: '89K',
    trend: 'up'
  },
  {
    category: 'Environment',
    hashtag: '#ClimateAction',
    posts: '56K',
    trend: 'up'
  },
  {
    category: 'Business',
    hashtag: '#Startup',
    posts: '34K',
    trend: 'down'
  },
  {
    category: 'Social Justice',
    hashtag: '#Equality',
    posts: '78K',
    trend: 'up'
  }
];

export function TrendingTopics() {
  const router = useRouter();

  const handleHashtagClick = (hashtag: string) => {
    // Remove the # symbol for the route
    const tag = hashtag.startsWith('#') ? hashtag.slice(1) : hashtag;
    router.push(`/hashtag/${tag}`);
  };

  return (
    <div className="bg-card/80 backdrop-blur-sm border border-border rounded-3xl p-6 shadow-medium hover:shadow-large transition-all duration-300 animate-slide-up">
      <div className="flex items-center space-x-2 mb-4">
        <TrendingUp className="w-5 h-5 text-foreground" />
        <h3 className="text-lg font-bold text-foreground">Trending Topics</h3>
      </div>
      
      <div className="space-y-3">
        {trendingTopics.map((topic, index) => (
          <div
            key={topic.hashtag}
            className="group p-3 rounded-2xl hover:bg-accent/60 transition-all duration-200 cursor-pointer shadow-soft hover:shadow-medium"
            onClick={() => handleHashtagClick(topic.hashtag)}
          >
            <div className="flex items-start justify-between">
              <div className="flex-1">
                <div className="flex items-center space-x-2">
                  <span className="text-xs text-muted-foreground font-medium group-hover:text-foreground transition-colors">
                    {index + 1} · {topic.category}
                  </span>
                  {topic.trend === 'up' && (
                    <TrendingUp className="w-3 h-3 text-muted-foreground" />
                  )}
                </div>
                <div className="flex items-center space-x-2 mt-1">
                  <Hash className="w-4 h-4 text-blue-500" />
                  <span className="font-semibold text-blue-500 group-hover:underline transition-colors">
                    {topic.hashtag.slice(1)}
                  </span>
                </div>
                <p className="text-xs text-muted-foreground mt-1 group-hover:text-foreground transition-colors">
                  {topic.posts} posts
                </p>
              </div>
            </div>
          </div>
        ))}
      </div>
      
      <button className="w-full mt-4 text-foreground hover:text-foreground text-sm font-medium py-2 rounded-xl hover:bg-accent/60 transition-all duration-200 shadow-soft hover:shadow-medium">
        Show more
      </button>
    </div>
  );
}
