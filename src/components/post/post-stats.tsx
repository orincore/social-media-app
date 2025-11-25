'use client';

interface PostStatsProps {
  repliesCount: number;
  repostsCount: number;
  likesCount: number;
  viewsCount: number;
  createdAt: string;
  formatCount: (count: number) => string;
  formatDate: (date: string) => string;
}

export function PostStats({
  repliesCount,
  repostsCount,
  likesCount,
  viewsCount,
  createdAt,
  formatCount,
  formatDate,
}: PostStatsProps) {
  return (
    <>
      {/* Timestamp & Views with Enhanced Design */}
      <div className="flex items-center gap-2 text-muted-foreground text-[15px] px-4 py-4 border-b border-border/50">
        <div className="flex items-center gap-2 bg-accent/30 rounded-full px-3 py-1.5">
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
          <time className="font-medium">{formatDate(createdAt)}</time>
        </div>
        <div className="flex items-center gap-2 bg-accent/30 rounded-full px-3 py-1.5">
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
          </svg>
          <span className="font-semibold text-foreground">{formatCount(viewsCount)}</span>
          <span>Views</span>
        </div>
      </div>

      {/* Enhanced Stats Row */}
      {(repliesCount > 0 || repostsCount > 0 || likesCount > 0) && (
        <div className="px-4 py-4 border-b border-border/50">
          <div className="grid grid-cols-3 gap-4">
            {repliesCount > 0 && (
              <button className="group flex flex-col items-center p-3 rounded-xl hover:bg-blue-500/10 transition-all duration-200">
                <div className="flex items-center gap-2 text-blue-500">
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
                  </svg>
                  <span className="font-bold text-xl">{formatCount(repliesCount)}</span>
                </div>
                <span className="text-muted-foreground text-sm mt-1 group-hover:text-blue-500 transition-colors">
                  {repliesCount === 1 ? 'Reply' : 'Replies'}
                </span>
              </button>
            )}
            {repostsCount > 0 && (
              <button className="group flex flex-col items-center p-3 rounded-xl hover:bg-green-500/10 transition-all duration-200">
                <div className="flex items-center gap-2 text-green-500">
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                  </svg>
                  <span className="font-bold text-xl">{formatCount(repostsCount)}</span>
                </div>
                <span className="text-muted-foreground text-sm mt-1 group-hover:text-green-500 transition-colors">
                  {repostsCount === 1 ? 'Repost' : 'Reposts'}
                </span>
              </button>
            )}
            {likesCount > 0 && (
              <button className="group flex flex-col items-center p-3 rounded-xl hover:bg-red-500/10 transition-all duration-200">
                <div className="flex items-center gap-2 text-red-500">
                  <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
                    <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z" />
                  </svg>
                  <span className="font-bold text-xl">{formatCount(likesCount)}</span>
                </div>
                <span className="text-muted-foreground text-sm mt-1 group-hover:text-red-500 transition-colors">
                  {likesCount === 1 ? 'Like' : 'Likes'}
                </span>
              </button>
            )}
          </div>
        </div>
      )}
    </>
  );
}
