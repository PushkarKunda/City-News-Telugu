// hooks/useRealtimeReconciliation.ts
import { useEffect } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/services/supabase';
import { newsKeys } from './useNews';
import { NewsArticle, FeedItem } from '@/services/api/news';

export function useRealtimeReconciliation() {
  const queryClient = useQueryClient();

  useEffect(() => {
    if (!supabase) return;

    // Subscribe to changes on the `news` table
    const newsChannel = supabase
      .channel('public:news')
      .on(
        'postgres_changes',
        { event: 'UPDATE', schema: 'public', table: 'news' },
        (payload) => {
          const updatedNews = payload.new as any;
          const uid = updatedNews.uid || updatedNews.news_uid;
          if (!uid) return;

          // 1. Invalidate single article
          queryClient.invalidateQueries({ queryKey: newsKeys.single(uid) });

          // 2. Invalidate engagement
          queryClient.invalidateQueries({ queryKey: newsKeys.engagement(uid) });

          // 3. Update feed caches dynamically
          queryClient.setQueriesData({ queryKey: ['news', 'feed'] }, (oldData: any) => {
            if (!oldData || !oldData.items) return oldData;
            
            const newItems = oldData.items.map((item: FeedItem) => {
              if (item.type === 'news' && item.data && (item.data as NewsArticle).news_uid === uid) {
                return {
                  ...item,
                  data: {
                    ...item.data,
                    views: updatedNews.views_count ?? (item.data as NewsArticle).views,
                    likes: updatedNews.likes_count ?? (item.data as NewsArticle).likes,
                    comments: updatedNews.comments_count ?? (item.data as NewsArticle).comments,
                    shares: updatedNews.shares_count ?? (item.data as NewsArticle).shares,
                  }
                };
              }
              return item;
            });

            return {
              ...oldData,
              items: newItems,
            };
          });
        }
      )
      .subscribe();

    // Subscribe to `news_comments`
    const commentsChannel = supabase
      .channel('public:news_comments')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'news_comments' },
        (payload) => {
          const record = payload.new || payload.old;
          if (!record) return;
          const uid = (record as any).news_uid;
          if (!uid) return;

          queryClient.invalidateQueries({ queryKey: newsKeys.comments(uid) });
          queryClient.invalidateQueries({ queryKey: newsKeys.engagement(uid) });
        }
      )
      .subscribe();

    // Subscribe to `news_likes`
    const likesChannel = supabase
      .channel('public:news_likes')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'news_likes' },
        (payload) => {
          const record = payload.new || payload.old;
          if (!record) return;
          const uid = (record as any).news_uid;
          if (!uid) return;

          queryClient.invalidateQueries({ queryKey: newsKeys.engagement(uid) });
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(newsChannel);
      supabase.removeChannel(commentsChannel);
      supabase.removeChannel(likesChannel);
    };
  }, [queryClient]);
}
