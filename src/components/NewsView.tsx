import React, { useState, useEffect } from 'react';
import { Search, Calendar, Share2, Eye, X, BookOpen, AlertCircle, Heart, Star } from 'lucide-react';
import { NewsItem } from '../types';
import { apiService } from '../services/api';

interface NewsViewProps {
  news: NewsItem[];
  selectedNewsFromHome?: NewsItem | null;
}

export const NewsView: React.FC<NewsViewProps> = ({ news: initialNews, selectedNewsFromHome }) => {
  const [news, setNews] = useState<NewsItem[]>(initialNews);
  const [selectedCategory, setSelectedCategory] = useState<string>('الكل');
  const [searchQuery, setSearchQuery] = useState('');
  const [activeArticle, setActiveArticle] = useState<NewsItem | null>(selectedNewsFromHome || null);
  
  // Rating states
  const [draftRatings, setDraftRatings] = useState<{ [newsId: string]: number }>({});
  const [savingRatingId, setSavingRatingId] = useState<string | null>(null);
  const [ratedFeedback, setRatedFeedback] = useState<{ [newsId: string]: boolean }>({});

  const currentUserId = typeof localStorage !== 'undefined'
    ? localStorage.getItem('salam_device_user_id') || `user-${Date.now()}`
    : 'guest';

  useEffect(() => {
    setNews(initialNews);
  }, [initialNews]);

  useEffect(() => {
    if (selectedNewsFromHome) {
      setActiveArticle(selectedNewsFromHome);
    }
  }, [selectedNewsFromHome]);

  const categories = ['الكل', 'أخبار', 'انتقالات', 'مقالات', 'مفاجآت'];

  const filteredNews = news
    .filter((item) => selectedCategory === 'الكل' || item.category === selectedCategory)
    .filter(
      (item) =>
        (item?.title || '').includes(searchQuery) || (item?.content || '').includes(searchQuery)
    );

  const handleShare = (title: string) => {
    if (navigator.share) {
      navigator.share({
        title: title,
        text: `أخبار وتحديثات فريق السلام الرياضي بكثيبة: ${title}`,
        url: window.location.href,
      }).catch(() => {});
    } else {
      if (navigator.clipboard) {
        navigator.clipboard.writeText(`${title}\n${window.location.href}`);
      }
      alert(`تم نسخ رابط الخبر: ${title}`);
    }
  };

  const handleLike = async (newsId: string) => {
    // Optimistic UI update
    setNews((prev) =>
      prev.map((n) => {
        if (n.id === newsId) {
          const userIds = n.likedUserIds || [];
          const isLiked = userIds.includes(currentUserId);
          const newLikes = isLiked ? Math.max(0, (n.likesCount || 0) - 1) : (n.likesCount || 0) + 1;
          const newUserIds = isLiked ? userIds.filter((id) => id !== currentUserId) : [...userIds, currentUserId];
          return { ...n, likesCount: newLikes, likedUserIds: newUserIds };
        }
        return n;
      })
    );

    if (activeArticle && activeArticle.id === newsId) {
      setActiveArticle((prev) => {
        if (!prev) return null;
        const userIds = prev.likedUserIds || [];
        const isLiked = userIds.includes(currentUserId);
        const newLikes = isLiked ? Math.max(0, (prev.likesCount || 0) - 1) : (prev.likesCount || 0) + 1;
        const newUserIds = isLiked ? userIds.filter((id) => id !== currentUserId) : [...userIds, currentUserId];
        return { ...prev, likesCount: newLikes, likedUserIds: newUserIds };
      });
    }

    await apiService.toggleNewsLike(newsId, currentUserId);
  };

  const handleSelectStar = (newsId: string, star: number) => {
    setDraftRatings((prev) => ({ ...prev, [newsId]: star }));
  };

  const handleConfirmRate = async (newsId: string) => {
    const rating = draftRatings[newsId];
    if (!rating || rating < 1 || rating > 5) return;

    setSavingRatingId(newsId);
    try {
      setNews((prev) =>
        prev.map((n) => {
          if (n.id === newsId) {
            const ratings = n.ratings ? [...n.ratings] : [];
            const idx = ratings.findIndex((r) => r.userId === currentUserId);
            if (idx >= 0) ratings[idx].rating = rating;
            else ratings.push({ userId: currentUserId, rating });
            const sum = ratings.reduce((acc, curr) => acc + curr.rating, 0);
            const avg = Number((sum / ratings.length).toFixed(1));
            return { ...n, ratings, averageRating: avg, totalRatingsCount: ratings.length };
          }
          return n;
        })
      );

      if (activeArticle && activeArticle.id === newsId) {
        setActiveArticle((prev) => {
          if (!prev) return null;
          const ratings = prev.ratings ? [...prev.ratings] : [];
          const idx = ratings.findIndex((r) => r.userId === currentUserId);
          if (idx >= 0) ratings[idx].rating = rating;
          else ratings.push({ userId: currentUserId, rating });
          const sum = ratings.reduce((acc, curr) => acc + curr.rating, 0);
          const avg = Number((sum / ratings.length).toFixed(1));
          return { ...prev, ratings, averageRating: avg, totalRatingsCount: ratings.length };
        });
      }

      await apiService.rateNewsItem(newsId, currentUserId, rating);
      setRatedFeedback((prev) => ({ ...prev, [newsId]: true }));
      setTimeout(() => {
        setRatedFeedback((prev) => ({ ...prev, [newsId]: false }));
      }, 3000);
    } catch (err) {
      console.error("Error rating news item:", err);
    } finally {
      setSavingRatingId(null);
    }
  };

  return (
    <div className="space-y-4 pb-12 px-3 sm:px-4 text-white dir-rtl select-none">
      {/* View Header */}
      <div className="flex items-center justify-between border-b border-red-900/40 pb-2">
        <h2 className="text-base sm:text-lg font-black text-white flex items-center gap-2">
          <span>📰</span> أخبار ومستجدات الفريق
        </h2>
      </div>

      {/* Search Bar */}
      <div className="relative">
        <input
          type="text"
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          placeholder="بحث في الأخبار والانتقالات والمقالات والمفاجآت..."
          className="w-full bg-[#1e1717] border border-red-900/40 rounded-2xl py-2.5 pr-10 pl-4 text-xs sm:text-sm text-white placeholder-gray-400 focus:outline-none focus:border-red-500 transition-colors shadow-inner"
        />
        <Search className="w-4 h-4 text-gray-400 absolute right-3.5 top-3.5" />
      </div>

      {/* Category Filter Pills */}
      <div className="flex items-center gap-2 overflow-x-auto pb-1 no-scrollbar">
        {categories.map((cat) => (
          <button
            key={cat}
            onClick={() => setSelectedCategory(cat)}
            className={`whitespace-nowrap px-4 py-2 rounded-xl text-xs font-black transition-all ${
              selectedCategory === cat
                ? 'bg-gradient-to-r from-red-600 to-red-700 text-white shadow-lg border border-red-400 scale-102'
                : 'bg-[#1d1717] text-gray-300 hover:bg-[#2a2222] border border-white/10'
            }`}
          >
            {cat}
          </button>
        ))}
      </div>

      {/* News Articles List */}
      <div className="space-y-4">
        {filteredNews.length === 0 ? (
          <div className="text-center py-10 bg-[#171212] rounded-3xl border border-white/5 space-y-2">
            <AlertCircle className="w-8 h-8 text-amber-500 mx-auto opacity-70" />
            <p className="text-xs text-gray-300 font-bold">لا توجد عناصر منشورة في هذا القسم حالياً</p>
          </div>
        ) : (
          filteredNews.map((item) => {
            const isLiked = item.likedUserIds?.includes(currentUserId);
            const userRating = item.ratings?.find((r) => r.userId === currentUserId)?.rating || 0;
            const currentDraft = draftRatings[item.id] !== undefined ? draftRatings[item.id] : userRating;
            const hasUnsavedDraft = draftRatings[item.id] !== undefined && draftRatings[item.id] !== userRating && draftRatings[item.id] > 0;

            return (
              <div
                key={item.id}
                className="bg-[#191313] border border-red-900/30 rounded-3xl overflow-hidden shadow-xl space-y-2 hover:border-red-700/50 transition-all"
              >
                {/* Image & Badge */}
                <div className="relative h-48 w-full cursor-pointer" onClick={() => setActiveArticle(item)}>
                  <img
                    src={item.image}
                    alt={item.title}
                    className="w-full h-full object-cover"
                    loading="lazy"
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-black/30" />
                  
                  <div className="absolute top-3 right-3 bg-red-600 text-white text-[11px] font-black px-3 py-1 rounded-xl shadow-md border border-red-400/40">
                    {item.category}
                  </div>
                  <div className="absolute bottom-2 left-3 bg-black/80 backdrop-blur-sm text-gray-300 text-[10px] px-2.5 py-1 rounded-xl flex items-center gap-1 border border-white/10">
                    <Calendar className="w-3 h-3 text-red-400" />
                    {item.date}
                  </div>
                </div>

                {/* Text Body */}
                <div className="p-4 pt-1 space-y-2.5">
                  <h3 
                    onClick={() => setActiveArticle(item)}
                    className="font-black text-sm sm:text-base text-white leading-snug cursor-pointer hover:text-amber-300 transition-colors"
                  >
                    {item.title}
                  </h3>
                  <p className="text-xs text-gray-300 line-clamp-2 leading-relaxed">
                    {item.content}
                  </p>

                  {/* Read More / Share actions */}
                  <div className="flex items-center justify-between pt-1">
                    <button
                      onClick={() => setActiveArticle(item)}
                      className="text-xs font-black text-amber-400 hover:text-amber-300 flex items-center gap-1 active:scale-95"
                    >
                      <BookOpen className="w-3.5 h-3.5" />
                      قراءة التفاصيل كاملة
                    </button>

                    <button
                      onClick={() => handleShare(item.title)}
                      className="p-1.5 px-3 rounded-xl bg-white/5 hover:bg-white/10 text-gray-300 transition-all flex items-center gap-1 text-xs border border-white/10 active:scale-95"
                      title="مشاركة"
                    >
                      <Share2 className="w-3.5 h-3.5 text-amber-400" />
                      <span>مشاركة</span>
                    </button>
                  </div>

                  {/* Interactive Like & Rating System Footer */}
                  <div className="pt-2.5 border-t border-white/10 flex items-center justify-between gap-2 flex-wrap bg-[#120a0a] p-2.5 rounded-2xl border border-red-950/60">
                    {/* Like Button */}
                    <button
                      type="button"
                      onClick={() => handleLike(item.id)}
                      className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl font-black text-xs transition-all active:scale-95 ${
                        isLiked
                          ? 'bg-red-600/30 text-red-400 border border-red-500/60 shadow-[0_0_12px_rgba(239,68,68,0.4)]'
                          : 'bg-white/5 hover:bg-red-500/10 text-gray-300 border border-white/10 hover:text-red-300'
                      }`}
                    >
                      <Heart
                        className={`w-4 h-4 ${
                          isLiked ? 'fill-red-500 text-red-500 animate-bounce' : 'text-gray-400'
                        }`}
                      />
                      <span>{item.likesCount || 0} إعجاب</span>
                    </button>

                    {/* Star Rating Widget with Explicit Confirmation */}
                    <div className="flex items-center gap-1.5 bg-[#0a0303] px-2.5 py-1.5 rounded-xl border border-amber-500/30 shadow-inner flex-wrap">
                      <span className="text-[10px] font-bold text-gray-400 hidden sm:inline">تقييمك:</span>
                      <div className="flex items-center gap-0.5">
                        {[1, 2, 3, 4, 5].map((star) => {
                          const isFilled = star <= currentDraft;
                          return (
                            <button
                              key={`news-star-${item.id}-${star}`}
                              type="button"
                              onClick={() => handleSelectStar(item.id, star)}
                              className="p-0.5 text-amber-400 hover:scale-125 transition-transform active:scale-90"
                              title={`اختيار ${star} نجوم`}
                            >
                              <Star
                                className={`w-3.5 h-3.5 sm:w-4 sm:h-4 ${
                                  isFilled
                                    ? 'fill-amber-400 text-amber-400 drop-shadow-[0_0_4px_rgba(245,158,11,0.6)]'
                                    : 'text-gray-600 hover:text-amber-300'
                                }`}
                              />
                            </button>
                          );
                        })}
                      </div>

                      {/* Explicit Confirm Button */}
                      {hasUnsavedDraft && (
                        <button
                          type="button"
                          onClick={() => handleConfirmRate(item.id)}
                          disabled={savingRatingId === item.id}
                          className="px-2 py-0.5 bg-gradient-to-r from-amber-400 to-amber-500 hover:from-amber-300 text-black font-black text-[10px] rounded-lg shadow active:scale-95 transition-all animate-pulse"
                        >
                          {savingRatingId === item.id ? '...' : 'تأكيد'}
                        </button>
                      )}

                      {ratedFeedback[item.id] && (
                        <span className="text-[10px] font-black text-emerald-400">✓ تم</span>
                      )}

                      {item.totalRatingsCount && item.totalRatingsCount > 0 ? (
                        <span className="text-xs font-black text-amber-300 mr-1">
                          ⭐ {item.averageRating ? item.averageRating.toFixed(1) : '0.0'}
                          <span className="text-[9px] text-gray-400 font-normal mr-0.5">({item.totalRatingsCount})</span>
                        </span>
                      ) : (
                        <span className="text-[10px] text-gray-400 mr-1 font-bold">(0)</span>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            );
          })
        )}
      </div>

      {/* Full Article Reading Modal */}
      {activeArticle && (
        <div className="fixed inset-0 z-50 bg-black/85 backdrop-blur-md flex items-center justify-center p-3 sm:p-4">
          <div className="bg-[#1c1414] border-2 border-red-800/60 rounded-3xl w-full max-w-lg overflow-hidden shadow-2xl max-h-[92vh] flex flex-col dir-rtl">
            <div className="relative h-56 w-full flex-shrink-0">
              <img
                src={activeArticle.image}
                alt={activeArticle.title}
                className="w-full h-full object-cover"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-[#1c1414] via-transparent to-black/70" />

              <button
                onClick={() => setActiveArticle(null)}
                className="absolute top-3 left-3 bg-black/70 text-white p-2 rounded-2xl hover:bg-black/90 active:scale-95 border border-white/20"
              >
                <X className="w-5 h-5" />
              </button>

              <div className="absolute bottom-3 right-4 left-4">
                <span className="bg-red-600 text-white text-xs font-black px-3 py-1 rounded-xl border border-red-400/40">
                  {activeArticle.category}
                </span>
                <span className="text-gray-300 text-xs font-bold mr-2">
                  📅 {activeArticle.date}
                </span>
              </div>
            </div>

            <div className="p-4 sm:p-5 space-y-4 overflow-y-auto">
              <h2 className="text-base sm:text-lg font-black text-white leading-snug">
                {activeArticle.title}
              </h2>

              <div className="w-16 h-1 bg-gradient-to-r from-red-600 to-amber-500 rounded-full" />

              <p className="text-xs sm:text-sm text-gray-200 leading-relaxed whitespace-pre-line">
                {activeArticle.content}
              </p>

              {/* Interactions in Modal */}
              <div className="p-3 bg-[#120909] rounded-2xl border border-white/10 flex items-center justify-between gap-2 flex-wrap">
                {/* Like Button */}
                <button
                  type="button"
                  onClick={() => handleLike(activeArticle.id)}
                  className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl font-bold text-xs ${
                    activeArticle.likedUserIds?.includes(currentUserId)
                      ? 'bg-red-600/30 text-red-400 border border-red-500/50'
                      : 'bg-white/10 text-gray-300'
                  }`}
                >
                  <Heart
                    className={`w-4 h-4 ${
                      activeArticle.likedUserIds?.includes(currentUserId)
                        ? 'fill-red-500 text-red-500'
                        : ''
                    }`}
                  />
                  <span>{activeArticle.likesCount || 0} إعجاب</span>
                </button>

                {/* Rating in Modal */}
                {(() => {
                  const mUserRating = activeArticle.ratings?.find((r) => r.userId === currentUserId)?.rating || 0;
                  const mDraft = draftRatings[activeArticle.id] !== undefined ? draftRatings[activeArticle.id] : mUserRating;
                  const hasMDraft = draftRatings[activeArticle.id] !== undefined && draftRatings[activeArticle.id] !== mUserRating && draftRatings[activeArticle.id] > 0;

                  return (
                    <div className="flex items-center gap-1 bg-black/60 px-2.5 py-1.5 rounded-xl border border-white/10">
                      <span className="text-[10px] text-gray-400">التقييم:</span>
                      <div className="flex items-center gap-0.5">
                        {[1, 2, 3, 4, 5].map((star) => (
                          <button
                            key={`modal-star-${star}`}
                            type="button"
                            onClick={() => handleSelectStar(activeArticle.id, star)}
                            className="p-0.5 text-amber-400 active:scale-125"
                          >
                            <Star
                              className={`w-3.5 h-3.5 ${
                                star <= mDraft
                                  ? 'fill-amber-400 text-amber-400 drop-shadow-[0_0_4px_rgba(245,158,11,0.6)]'
                                  : 'text-gray-600'
                              }`}
                            />
                          </button>
                        ))}
                      </div>

                      {hasMDraft && (
                        <button
                          type="button"
                          onClick={() => handleConfirmRate(activeArticle.id)}
                          disabled={savingRatingId === activeArticle.id}
                          className="px-2 py-0.5 bg-amber-400 hover:bg-amber-300 text-black font-black text-[10px] rounded-lg shadow active:scale-95 animate-pulse"
                        >
                          {savingRatingId === activeArticle.id ? '...' : 'تأكيد'}
                        </button>
                      )}

                      {activeArticle.totalRatingsCount && activeArticle.totalRatingsCount > 0 ? (
                        <span className="text-[11px] font-black text-amber-300 mr-1">
                          ⭐ {activeArticle.averageRating ? activeArticle.averageRating.toFixed(1) : '0.0'} ({activeArticle.totalRatingsCount})
                        </span>
                      ) : (
                        <span className="text-[10px] text-gray-400 mr-1 font-bold">(0)</span>
                      )}
                    </div>
                  );
                })()}
              </div>

              <div className="pt-2 border-t border-white/10 flex items-center justify-between gap-3">
                <button
                  onClick={() => handleShare(activeArticle.title)}
                  className="bg-amber-500 hover:bg-amber-400 text-black font-black text-xs px-4 py-2 rounded-xl flex items-center gap-1.5 active:scale-95"
                >
                  <Share2 className="w-4 h-4" />
                  مشاركة
                </button>

                <button
                  onClick={() => setActiveArticle(null)}
                  className="bg-gray-800 hover:bg-gray-700 text-white font-bold text-xs px-4 py-2 rounded-xl active:scale-95"
                >
                  إغلاق
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
