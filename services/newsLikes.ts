// Update articles in both modular queries and aggregate/infinite feed payloads.
// Preserve unchanged references so unrelated cards don't rerender.
export function updateNewsLikeData(data: any, newsUid: string, liked: boolean): any {
  if (!data || typeof data !== 'object') return data;
  if (Array.isArray(data)) {
    const next = data.map((item) => updateNewsLikeData(item, newsUid, liked));
    return next.every((item, i) => item === data[i]) ? data : next;
  }
  if (data.news_uid === newsUid) {
    const previous = Boolean(data.user_liked ?? data.is_liked ?? data.engagement?.user_liked);
    const delta = Number(liked) - Number(previous);
    return {
      ...data,
      user_liked: liked,
      is_liked: liked,
      likes: Math.max(0, (data.likes ?? data.engagement?.total_likes ?? data.engagement?.likes ?? 0) + delta),
      ...(data.engagement ? { engagement: {
        ...data.engagement, user_liked: liked,
        total_likes: Math.max(0, (data.engagement.total_likes ?? data.engagement.likes ?? data.likes ?? 0) + delta),
        likes: Math.max(0, (data.engagement.likes ?? data.engagement.total_likes ?? data.likes ?? 0) + delta),
      } } : {}),
    };
  }
  let next = data;
  for (const key of ['data', 'items', 'feed', 'pages', 'article', 'news']) {
    if (!data[key]) continue;
    const value = updateNewsLikeData(data[key], newsUid, liked);
    if (value !== data[key]) next = { ...next, [key]: value };
  }
  return next;
}
