'use client';

import { useState } from 'react';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { UserPlus, Check } from 'lucide-react';

const suggestions = [
  {
    id: '1',
    name: 'Sarah Chen',
    username: 'sarahc_dev',
    bio: 'Climate activist & software engineer',
    avatar: null,
    verified: true,
    followers: '12.4K'
  },
  {
    id: '2',
    name: 'Marcus Johnson',
    username: 'marcus_pol',
    bio: 'Political analyst & journalist',
    avatar: null,
    verified: false,
    followers: '8.7K'
  },
  {
    id: '3',
    name: 'Dr. Elena Rodriguez',
    username: 'dr_elena',
    bio: 'Public health researcher',
    avatar: null,
    verified: true,
    followers: '15.2K'
  }
];

export function WhoToFollow() {
  const [followedUsers, setFollowedUsers] = useState<Set<string>>(new Set());

  const handleFollow = (userId: string) => {
    setFollowedUsers(prev => {
      const newSet = new Set(prev);
      if (newSet.has(userId)) {
        newSet.delete(userId);
      } else {
        newSet.add(userId);
      }
      return newSet;
    });
  };

  return (
    <div className="bg-card/80 backdrop-blur-sm border border-border rounded-3xl p-6 shadow-medium hover:shadow-large transition-all duration-300 animate-slide-up">
      <div className="flex items-center space-x-2 mb-4">
        <UserPlus className="w-5 h-5 text-foreground" />
        <h3 className="text-lg font-bold text-foreground">Who to follow</h3>
      </div>
      
      <div className="space-y-4">
        {suggestions.map((user) => {
          const isFollowed = followedUsers.has(user.id);
          
          return (
            <div
              key={user.id}
              className="flex items-start space-x-3 p-3 rounded-2xl hover:bg-accent/60 transition-all duration-200 shadow-soft hover:shadow-medium"
            >
              <Avatar className="h-10 w-10 border border-border shadow-soft">
                <AvatarImage src={user.avatar || undefined} />
                <AvatarFallback className="bg-muted text-muted-foreground">
                  {user.name.charAt(0)}
                </AvatarFallback>
              </Avatar>
              
              <div className="flex-1 min-w-0">
                <div className="flex items-center space-x-1">
                  <p className="font-semibold text-foreground text-sm truncate">
                    {user.name}
                  </p>
                  {user.verified && (
                    <Check className="w-4 h-4 text-foreground" />
                  )}
                </div>
                <p className="text-blue-500 text-xs hover:underline transition-colors">@{user.username}</p>
                <p className="text-muted-foreground text-xs mt-1 line-clamp-2 hover:text-accent-foreground transition-colors">
                  {user.bio}
                </p>
                <p className="text-muted-foreground/80 text-xs mt-1">
                  {user.followers} followers
                </p>
              </div>
              
              <Button
                onClick={() => handleFollow(user.id)}
                variant={isFollowed ? "outline" : "default"}
                size="sm"
                className={`
                  px-4 py-1.5 text-xs font-semibold rounded-full transition-all
                  ${isFollowed 
                    ? 'border-border text-muted-foreground hover:bg-accent hover:text-foreground shadow-soft' 
                    : 'bg-foreground text-background hover:bg-muted hover:text-foreground shadow-medium'
                  }
                `}
              >
                {isFollowed ? 'Following' : 'Follow'}
              </Button>
            </div>
          );
        })}
      </div>
      
      <button className="w-full mt-4 text-foreground hover:text-foreground text-sm font-medium py-2 rounded-xl hover:bg-accent/60 transition-all duration-200 shadow-soft hover:shadow-medium">
        Show more
      </button>
    </div>
  );
}
