import React, { useState, useEffect, useRef } from 'react';
import { Heart, Star, Share2, ZoomIn, Eye, Sparkles, Image as ImageIcon, Camera, X, Check, ArrowRight, ArrowLeft } from 'lucide-react';
import { GalleryPost } from '../types';
import { apiService } from '../services/api';
import { Logo } from './Logo';

interface TeamGalleryViewProps {
  initialPosts?: GalleryPost[];
  targetPostId?: string | null;
  onClearTargetPostId?: () => void;
}

export const TeamGalleryView: React.FC<TeamGalleryViewProps> = ({
  initialPosts = [],
  targetPostId,
  onClearTargetPostId,
}) => {
  const [posts, setPosts] = useState<GalleryPost[]>(initialPosts);
  const [selectedFilter, setSelectedFilter] = useState<'all' | 'live'>('all');
  
  // Lightbox State
  const [lightboxData, setLightboxData] = useState<{
    post: GalleryPost;
    imageIndex: number;
  } | null>(null);

  // Zoom & Pinch State
  const [zoomScale, setZoomScale] = useState<number>(1);
  const [panPosition, setPanPosition] = useState<{ x: number; y: number }>({ x: 0, y: 0 });
  const [copiedPostId, setCopiedPostId] = useState<string | null>(null);
  const [draftRatings, setDraftRatings] = useState<{ [postId: string]: number }>({});
  const [savingRatingId, setSavingRatingId] = useState<string | null>(null);
  const [ratedFeedback, setRatedFeedback] = useState<{ [postId: string]: boolean }>({});

  // Touch & Swipe Refs for mobile gestures
  const touchStartRef = useRef<{ x: number; y: number; distance: number; time: number }>({ x: 0, y: 0, distance: 0, time: 0 });
  const isDraggingRef = useRef(false);
  const startPanRef = useRef<{ x: number; y: number }>({ x: 0, y: 0 });
  const postRefs = useRef<{ [key: string]: HTMLDivElement | null }>({});

  // Device User ID for likes and ratings
  const currentUserId = typeof localStorage !== 'undefined'
    ? localStorage.getItem('salam_device_user_id') || `user-${Date.now()}`
    : 'guest';

  useEffect(() => {
    if (typeof localStorage !== 'undefined' && !localStorage.getItem('salam_device_user_id')) {
      localStorage.setItem('salam_device_user_id', currentUserId);
    }

    // Subscribe to live Firestore updates
    const unsub = apiService.subscribeToGalleryPosts((livePosts) => {
      if (Array.isArray(livePosts)) {
        setPosts(livePosts);
      }
    });

    return () => {
      unsub();
    };
  }, []);

  // Deep linking: scroll to target post and open lightbox if opened via push notification
  useEffect(() => {
    if (targetPostId && posts.length > 0) {
      const targetElement = postRefs.current[targetPostId];
      if (targetElement) {
        setTimeout(() => {
          targetElement.scrollIntoView({ behavior: 'smooth', block: 'center' });
        }, 150);
      }

      const foundPost = posts.find((p) => p.id === targetPostId);
      if (foundPost && ((foundPost.images && foundPost.images.length > 0) || foundPost.imageUrl)) {
        setLightboxData({ post: foundPost, imageIndex: 0 });
        setZoomScale(1);
        setPanPosition({ x: 0, y: 0 });
      }
    }
  }, [targetPostId, posts]);

  const handleLike = async (postId: string) => {
    // Optimistic UI update
    setPosts((prev) =>
      prev.map((p) => {
        if (p.id === postId) {
          const userIds = p.likedUserIds || [];
          const isLiked = userIds.includes(currentUserId);
          const newLikes = isLiked ? Math.max(0, p.likesCount - 1) : p.likesCount + 1;
          const newUserIds = isLiked ? userIds.filter((id) => id !== currentUserId) : [...userIds, currentUserId];
          return { ...p, likesCount: newLikes, likedUserIds: newUserIds };
        }
        return p;
      })
    );

    // Also update lightbox state if open
    if (lightboxData && lightboxData.post.id === postId) {
      setLightboxData((prev) => {
        if (!prev) return null;
        const userIds = prev.post.likedUserIds || [];
        const isLiked = userIds.includes(currentUserId);
        const newLikes = isLiked ? Math.max(0, prev.post.likesCount - 1) : prev.post.likesCount + 1;
        const newUserIds = isLiked ? userIds.filter((id) => id !== currentUserId) : [...userIds, currentUserId];
        return {
          ...prev,
          post: { ...prev.post, likesCount: newLikes, likedUserIds: newUserIds },
        };
      });
    }

    await apiService.toggleGalleryLike(postId, currentUserId);
  };

  const handleSelectStar = (postId: string, star: number) => {
    setDraftRatings((prev) => ({ ...prev, [postId]: star }));
  };

  const handleConfirmRate = async (postId: string) => {
    const rating = draftRatings[postId];
    if (!rating || rating < 1 || rating > 5) return;

    setSavingRatingId(postId);
    try {
      // Optimistic UI update
      setPosts((prev) =>
        prev.map((p) => {
          if (p.id === postId) {
            const ratings = p.ratings ? [...p.ratings] : [];
            const idx = ratings.findIndex((r) => r.userId === currentUserId);
            if (idx >= 0) ratings[idx].rating = rating;
            else ratings.push({ userId: currentUserId, rating });
            const sum = ratings.reduce((acc, curr) => acc + curr.rating, 0);
            const avg = Number((sum / ratings.length).toFixed(1));
            return { ...p, ratings, averageRating: avg, totalRatingsCount: ratings.length };
          }
          return p;
        })
      );

      // Also update lightbox state if open
      if (lightboxData && lightboxData.post.id === postId) {
        setLightboxData((prev) => {
          if (!prev) return null;
          const ratings = prev.post.ratings ? [...prev.post.ratings] : [];
          const idx = ratings.findIndex((r) => r.userId === currentUserId);
          if (idx >= 0) ratings[idx].rating = rating;
          else ratings.push({ userId: currentUserId, rating });
          const sum = ratings.reduce((acc, curr) => acc + curr.rating, 0);
          const avg = Number((sum / ratings.length).toFixed(1));
          return {
            ...prev,
            post: { ...prev.post, ratings, averageRating: avg, totalRatingsCount: ratings.length },
          };
        });
      }

      await apiService.rateGalleryPost(postId, currentUserId, rating);
      setRatedFeedback((prev) => ({ ...prev, [postId]: true }));
      setTimeout(() => {
        setRatedFeedback((prev) => ({ ...prev, [postId]: false }));
      }, 3000);
    } catch (err) {
      console.error("Error rating gallery post:", err);
    } finally {
      setSavingRatingId(null);
    }
  };

  const handleShare = async (post: GalleryPost) => {
    const shareText = `📸 ${post.title || 'تغطية مصورة من فريق السلام بكثيبة'}\n${post.description || ''}`;
    if (navigator.share) {
      try {
        await navigator.share({
          title: post.title || 'فريق السلام بكثيبة - المعرض',
          text: shareText,
          url: window.location.href,
        });
        return;
      } catch {}
    }

    // Fallback: Copy to clipboard
    if (navigator.clipboard) {
      await navigator.clipboard.writeText(`${shareText}\n${window.location.href}`);
      setCopiedPostId(post.id);
      setTimeout(() => setCopiedPostId(null), 2500);
    }
  };

  // 1. تبسيط الفلترة لخيارين فقط: "كل المعرض" و "التغطيات"
  const filterOptions = [
    { id: 'all' as const, label: '🌟 كل المعرض' },
    { id: 'live' as const, label: '📸 التغطيات' },
  ];

  const filteredPosts = selectedFilter === 'all'
    ? posts
    : posts.filter((p) => {
        const cat = (p.category || '').toLowerCase();
        const title = (p.title || '').toLowerCase();
        const desc = (p.description || '').toLowerCase();
        return cat.includes('تغطية') || cat.includes('إحماء') || cat.includes('مباشر') || 
               title.includes('مباشر') || title.includes('إحماء') || desc.includes('مباشر') || desc.includes('إحماء');
      });

  // Lightbox Navigation Functions
  const handlePrevImage = () => {
    if (!lightboxData) return;
    const images = lightboxData.post.images?.length ? lightboxData.post.images : [lightboxData.post.imageUrl || ''];
    setLightboxData({
      ...lightboxData,
      imageIndex: (lightboxData.imageIndex - 1 + images.length) % images.length,
    });
    setZoomScale(1);
    setPanPosition({ x: 0, y: 0 });
  };

  const handleNextImage = () => {
    if (!lightboxData) return;
    const images = lightboxData.post.images?.length ? lightboxData.post.images : [lightboxData.post.imageUrl || ''];
    setLightboxData({
      ...lightboxData,
      imageIndex: (lightboxData.imageIndex + 1) % images.length,
    });
    setZoomScale(1);
    setPanPosition({ x: 0, y: 0 });
  };

  // Touch Gesture Helpers (Swipe left/right + Pinch-to-zoom)
  const getTouchDistance = (e: React.TouchEvent) => {
    if (e.touches.length < 2) return 0;
    const dx = e.touches[0].clientX - e.touches[1].clientX;
    const dy = e.touches[0].clientY - e.touches[1].clientY;
    return Math.sqrt(dx * dx + dy * dy);
  };

  const handleTouchStart = (e: React.TouchEvent) => {
    if (e.touches.length === 2) {
      // Pinch started
      const dist = getTouchDistance(e);
      touchStartRef.current = { x: 0, y: 0, distance: dist, time: Date.now() };
    } else if (e.touches.length === 1) {
      // Single finger swipe or pan
      touchStartRef.current = {
        x: e.touches[0].clientX,
        y: e.touches[0].clientY,
        distance: 0,
        time: Date.now(),
      };
      isDraggingRef.current = true;
      startPanRef.current = { ...panPosition };
    }
  };

  const handleTouchMove = (e: React.TouchEvent) => {
    if (e.touches.length === 2 && touchStartRef.current.distance > 0) {
      // Pinching
      const currentDist = getTouchDistance(e);
      const ratio = currentDist / touchStartRef.current.distance;
      const newScale = Math.min(Math.max(1, zoomScale * ratio), 4);
      setZoomScale(newScale);
      touchStartRef.current.distance = currentDist;
    } else if (e.touches.length === 1 && isDraggingRef.current && zoomScale > 1) {
      // Panning zoomed image
      const deltaX = e.touches[0].clientX - touchStartRef.current.x;
      const deltaY = e.touches[0].clientY - touchStartRef.current.y;
      setPanPosition({
        x: startPanRef.current.x + deltaX,
        y: startPanRef.current.y + deltaY,
      });
    }
  };

  const handleTouchEnd = (e: React.TouchEvent) => {
    if (zoomScale <= 1.05) {
      setZoomScale(1);
      setPanPosition({ x: 0, y: 0 });

      // Check for horizontal swipe gesture when not zoomed
      if (touchStartRef.current.x !== 0 && e.changedTouches.length === 1) {
        const deltaX = e.changedTouches[0].clientX - touchStartRef.current.x;
        const deltaY = e.changedTouches[0].clientY - touchStartRef.current.y;
        const deltaTime = Date.now() - touchStartRef.current.time;

        // Ensure horizontal swipe > vertical movement and quick swipe (< 500ms) or distance > 50px
        if (Math.abs(deltaX) > Math.abs(deltaY) && Math.abs(deltaX) > 40 && deltaTime < 500) {
          if (deltaX > 0) {
            // Swiped right (in RTL: previous image or next depending on reading direction)
            handleNextImage();
          } else {
            // Swiped left
            handlePrevImage();
          }
        }
      }
    }
    isDraggingRef.current = false;
    touchStartRef.current = { x: 0, y: 0, distance: 0, time: 0 };
  };

  // Double tap to zoom toggle
  const lastTapRef = useRef<number>(0);
  const handleDoubleTap = () => {
    const now = Date.now();
    if (now - lastTapRef.current < 300) {
      if (zoomScale > 1) {
        setZoomScale(1);
        setPanPosition({ x: 0, y: 0 });
      } else {
        setZoomScale(2.2);
      }
    }
    lastTapRef.current = now;
  };

  return (
    <div className="space-y-4 px-3 sm:px-4 pb-24 dir-rtl select-none">
      {/* Header Banner - Compact & Android Native Look */}
      <div className="relative overflow-hidden rounded-3xl bg-gradient-to-r from-[#3d0808] via-[#240606] to-[#160404] p-3.5 sm:p-4 border border-amber-500/40 shadow-xl">
        <div className="absolute top-0 left-0 w-36 h-36 bg-amber-500/10 rounded-full blur-3xl -z-10" />
        <div className="flex items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 sm:w-11 sm:h-11 rounded-2xl bg-amber-500/20 border border-amber-400/50 flex items-center justify-center text-amber-300 shadow-md shrink-0">
              <Camera className="w-5 h-5" />
            </div>
            <div>
              <h1 className="text-base sm:text-lg font-black text-white drop-shadow-sm">
                المعرض
              </h1>
              <p className="text-[11px] text-amber-300/80 font-bold mt-0.5">
                صور وحالات وتغطيات فريق السلام بكثيبة
              </p>
            </div>
          </div>
          <div className="p-1 rounded-full bg-amber-500/15 border border-amber-400/30 shrink-0 hidden sm:block">
            <Logo size={36} />
          </div>
        </div>
      </div>

      {/* 2. شريط الفلترة المبسط (خيارين فقط: كل المعرض والتغطيات) */}
      <div className="grid grid-cols-2 gap-2 bg-[#140606] p-1.5 rounded-2xl border border-amber-500/30 shadow-md">
        {filterOptions.map((opt) => (
          <button
            key={opt.id}
            type="button"
            onClick={() => setSelectedFilter(opt.id)}
            className={`py-2 px-3 rounded-xl text-xs font-black transition-all flex items-center justify-center gap-1.5 active:scale-98 ${
              selectedFilter === opt.id
                ? 'bg-gradient-to-r from-amber-400 via-amber-500 to-amber-600 text-black shadow-md border border-amber-300 scale-101'
                : 'text-gray-300 hover:text-amber-200 hover:bg-white/5'
            }`}
          >
            <span>{opt.label}</span>
          </button>
        ))}
      </div>

      {/* Stories / Circular Highlights Bar */}
      {posts.length > 0 && (
        <div className="space-y-1">
          <div className="flex items-center justify-between px-1">
            <span className="text-[11px] font-black text-amber-300 flex items-center gap-1">
              <Sparkles className="w-3 h-3 text-amber-400" />
              أحدث الحالات واللقطات السريعة ({posts.length}):
            </span>
          </div>
          <div className="flex items-center gap-2.5 overflow-x-auto pb-1 pt-0.5 touch-pan-x no-scrollbar">
            {posts.slice(0, 12).map((post) => {
              const mainImg = post.images?.[0] || post.imageUrl || 'https://images.unsplash.com/photo-1508098682722-e99c43a406b2?w=400';
              return (
                <button
                  key={`story-${post.id}`}
                  onClick={() => {
                    setLightboxData({ post, imageIndex: 0 });
                    setZoomScale(1);
                    setPanPosition({ x: 0, y: 0 });
                  }}
                  className="flex flex-col items-center gap-1 flex-shrink-0 group cursor-pointer active:scale-95 transition-transform"
                >
                  <div className="w-14 h-14 sm:w-16 sm:h-16 rounded-2xl p-0.5 bg-gradient-to-tr from-amber-500 via-red-600 to-amber-300 shadow-md">
                    <div className="w-full h-full rounded-[14px] overflow-hidden bg-black relative border border-black">
                      <img
                        src={mainImg}
                        alt={post.title || 'حالة الفريق'}
                        className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-300"
                        loading="lazy"
                        referrerPolicy="no-referrer"
                      />
                      <div className="absolute inset-0 bg-gradient-to-t from-black/50 via-transparent to-transparent" />
                    </div>
                  </div>
                  <span className="text-[10px] font-bold text-gray-200 max-w-[62px] truncate text-center">
                    {post.category || 'تغطية'}
                  </span>
                </button>
              );
            })}
          </div>
        </div>
      )}

      {/* Gallery Posts Feed */}
      {filteredPosts.length === 0 ? (
        <div className="bg-[#180a0a] border-2 border-dashed border-amber-500/30 rounded-3xl p-8 text-center space-y-3">
          <div className="w-14 h-14 rounded-full bg-amber-500/10 border border-amber-500/30 mx-auto flex items-center justify-center text-amber-400">
            <ImageIcon className="w-7 h-7 opacity-60" />
          </div>
          <h3 className="text-xs sm:text-sm font-black text-white">لا توجد صور منشورة في هذا القسم حالياً</h3>
          <p className="text-[11px] text-gray-400 max-w-sm mx-auto">
            يقوم إعلامي الفريق بنشر وتغطية صور الإحماء والحالات والمباريات مباشرة هنا فور حدوثها.
          </p>
        </div>
      ) : (
        <div className="space-y-4">
          {filteredPosts.map((post) => {
            const allImages = post.images && post.images.length > 0 ? post.images : post.imageUrl ? [post.imageUrl] : [];
            const isLiked = post.likedUserIds?.includes(currentUserId);
            const userRating = post.ratings?.find((r) => r.userId === currentUserId)?.rating || 0;
            const isTargeted = targetPostId === post.id;

            return (
              <div
                key={post.id}
                ref={(el) => {
                  postRefs.current[post.id] = el;
                }}
                className={`bg-[#180909] rounded-3xl border transition-all duration-300 overflow-hidden shadow-xl ${
                  isTargeted
                    ? 'border-2 border-amber-400 ring-4 ring-amber-500/40 shadow-[0_0_30px_rgba(245,158,11,0.5)]'
                    : 'border-amber-500/30 hover:border-amber-500/60'
                }`}
              >
                {/* Post Header */}
                <div className="p-3 sm:p-3.5 flex items-center justify-between border-b border-amber-500/15 bg-gradient-to-r from-[#200a0a] to-[#180909]">
                  <div className="flex items-center gap-2.5">
                    <div className="p-1 rounded-xl bg-amber-500/20 border border-amber-400/40 shrink-0">
                      <Logo size={26} />
                    </div>
                    <div>
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="font-black text-xs text-white">
                          {post.author || 'إعلامي السلام'}
                        </span>
                        <span className="text-[9px] bg-red-600/90 text-white font-bold px-2 py-0.5 rounded-md">
                          {post.category || 'تغطية'}
                        </span>
                      </div>
                      <span className="text-[10px] text-gray-400 font-medium">
                        {post.date || 'اليوم'}
                      </span>
                    </div>
                  </div>

                  <button
                    onClick={() => handleShare(post)}
                    className="p-1.5 sm:p-2 rounded-xl bg-black/40 hover:bg-amber-500/20 text-amber-300 border border-amber-500/30 transition-all active:scale-95 flex items-center gap-1 text-xs"
                    title="مشاركة الصورة والحالة"
                  >
                    {copiedPostId === post.id ? (
                      <>
                        <Check className="w-3.5 h-3.5 text-emerald-400" />
                        <span className="text-emerald-400 text-[10px] font-bold">تم النسخ</span>
                      </>
                    ) : (
                      <>
                        <Share2 className="w-3.5 h-3.5" />
                        <span className="text-[10px] font-bold hidden sm:inline">مشاركة</span>
                      </>
                    )}
                  </button>
                </div>

                {/* Status / Description Text */}
                {post.description && (
                  <div className="px-3.5 pt-2.5 pb-1.5 text-xs sm:text-sm text-gray-100 font-semibold leading-relaxed whitespace-pre-line text-right">
                    {post.description}
                  </div>
                )}

                {/* Photo Display Grid / Single Display */}
                {allImages.length > 0 && (
                  <div className="px-2.5 py-1.5">
                    {allImages.length === 1 ? (
                      <div
                        onClick={() => {
                          setLightboxData({ post, imageIndex: 0 });
                          setZoomScale(1);
                          setPanPosition({ x: 0, y: 0 });
                        }}
                        className="relative rounded-2xl overflow-hidden bg-black/90 max-h-[460px] group cursor-pointer border border-white/10 shadow-inner flex items-center justify-center"
                      >
                        <img
                          src={allImages[0]}
                          alt={post.title || 'صورة المعرض'}
                          className="w-full h-auto max-h-[460px] object-cover group-hover:scale-101 transition-transform duration-300"
                          loading="lazy"
                          referrerPolicy="no-referrer"
                        />
                        <div className="absolute bottom-2 left-2 bg-black/75 backdrop-blur-sm text-amber-300 px-2.5 py-1 rounded-xl text-[10px] font-black flex items-center gap-1 border border-amber-400/30 shadow-md">
                          <ZoomIn className="w-3.5 h-3.5" />
                          <span>عرض كامل وتكبير</span>
                        </div>
                      </div>
                    ) : (
                      <div className="grid grid-cols-2 gap-1.5">
                        {allImages.slice(0, 4).map((img, idx) => {
                          const isMore = idx === 3 && allImages.length > 4;
                          return (
                            <div
                              key={`post-img-${idx}`}
                              onClick={() => {
                                setLightboxData({ post, imageIndex: idx });
                                setZoomScale(1);
                                setPanPosition({ x: 0, y: 0 });
                              }}
                              className={`relative rounded-xl overflow-hidden bg-black/90 aspect-square group cursor-pointer border border-white/10 ${
                                allImages.length === 3 && idx === 0 ? 'col-span-2 aspect-video' : ''
                              }`}
                            >
                              <img
                                src={img}
                                alt={`صورة ${idx + 1}`}
                                className="w-full h-full object-cover group-hover:scale-104 transition-transform duration-300"
                                loading="lazy"
                                referrerPolicy="no-referrer"
                              />
                              {isMore ? (
                                <div className="absolute inset-0 bg-black/80 flex flex-col items-center justify-center text-white font-black">
                                  <span className="text-lg">+{allImages.length - 4}</span>
                                  <span className="text-[10px] text-amber-300 font-bold">باقي الصور</span>
                                </div>
                              ) : (
                                <div className="absolute bottom-1.5 left-1.5 bg-black/60 rounded-lg p-1">
                                  <ZoomIn className="w-3.5 h-3.5 text-amber-300" />
                                </div>
                              )}
                            </div>
                          );
                        })}
                      </div>
                    )}
                  </div>
                )}

                {/* 4. تنسيق أزرار التفاعل: وضع زري الإعجاب والتقييم بشكل مباشر وثابت تحت كل صورة في المعرض لسهولة التفاعل */}
                <div className="p-3 bg-gradient-to-r from-[#140606] to-[#0e0404] border-t border-amber-500/20 flex items-center justify-between gap-2">
                  {/* زر الإعجاب (Like Button) */}
                  <button
                    type="button"
                    onClick={() => handleLike(post.id)}
                    className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl font-black text-xs transition-all active:scale-95 ${
                      isLiked
                        ? 'bg-red-600/30 text-red-400 border border-red-500/60 shadow-[0_0_12px_rgba(239,68,68,0.4)]'
                        : 'bg-white/5 hover:bg-red-500/10 text-gray-300 border border-white/10 hover:text-red-300'
                    }`}
                    title="تسجيل إعجاب بالصورة"
                  >
                    <Heart
                      className={`w-4 h-4 ${
                        isLiked ? 'fill-red-500 text-red-500 animate-bounce' : 'text-gray-400'
                      }`}
                    />
                    <span>{post.likesCount || 0} إعجاب</span>
                  </button>

                  {/* زر ونظام التقييم بالنجوم المباشر مع زر التأكيد */}
                  <div className="flex items-center gap-1.5 bg-[#0a0303] px-2.5 py-1.5 rounded-xl border border-amber-500/30 shadow-inner flex-wrap">
                    <span className="text-[10px] font-bold text-gray-400 hidden sm:inline">تقييمك:</span>
                    <div className="flex items-center gap-0.5">
                      {[1, 2, 3, 4, 5].map((star) => {
                        const isFilled = star <= (draftRatings[post.id] !== undefined ? draftRatings[post.id] : userRating);
                        return (
                          <button
                            key={`star-${star}`}
                            type="button"
                            onClick={() => handleSelectStar(post.id, star)}
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

                    {/* زر التأكيد إذا قام المستخدم باختيار تقييم لم يؤكده بعد */}
                    {draftRatings[post.id] !== undefined && draftRatings[post.id] !== userRating && draftRatings[post.id] > 0 && (
                      <button
                        type="button"
                        onClick={() => handleConfirmRate(post.id)}
                        disabled={savingRatingId === post.id}
                        className="px-2 py-0.5 bg-gradient-to-r from-amber-400 to-amber-500 hover:from-amber-300 hover:to-amber-400 text-black font-black text-[10px] rounded-lg shadow active:scale-95 transition-all animate-pulse"
                      >
                        {savingRatingId === post.id ? '...' : 'تأكيد'}
                      </button>
                    )}

                    {ratedFeedback[post.id] && (
                      <span className="text-[10px] font-black text-emerald-400">✓ تم</span>
                    )}

                    {post.totalRatingsCount && post.totalRatingsCount > 0 ? (
                      <span className="text-xs font-black text-amber-300 mr-1">
                        ⭐ {post.averageRating ? post.averageRating.toFixed(1) : '0.0'}
                        <span className="text-[9px] text-gray-400 font-normal mr-0.5">({post.totalRatingsCount})</span>
                      </span>
                    ) : (
                      <span className="text-[10px] text-gray-400 mr-1 font-bold">(0)</span>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* ========================================================================= */}
      {/* 📱 Fullscreen Mobile Lightbox with Swipe Navigation & Pinch-to-Zoom Gesture */}
      {/* ========================================================================= */}
      {lightboxData && (
        <div 
          className="fixed inset-0 z-50 bg-black/98 flex flex-col justify-between p-2 sm:p-4 dir-rtl select-none touch-none animate-in fade-in duration-200"
          style={{ overscrollBehavior: 'none' }}
        >
          {/* Lightbox Top Bar */}
          <div className="flex items-center justify-between text-white border-b border-white/10 pb-2.5 px-2 z-20">
            <div className="flex items-center gap-2">
              <div className="p-1 rounded-xl bg-amber-500/20 border border-amber-400/40">
                <Logo size={22} />
              </div>
              <div>
                <h3 className="font-black text-xs sm:text-sm text-white truncate max-w-[190px]">
                  {lightboxData.post.title || 'معرض صور فريق السلام'}
                </h3>
                <span className="text-[10px] text-amber-400 font-bold">
                  صورة {lightboxData.imageIndex + 1} من {lightboxData.post.images?.length || 1} • اسحب للتنقل
                </span>
              </div>
            </div>

            <div className="flex items-center gap-1.5">
              {/* Zoom Reset / Indicator */}
              {zoomScale > 1 && (
                <button
                  onClick={() => {
                    setZoomScale(1);
                    setPanPosition({ x: 0, y: 0 });
                  }}
                  className="px-2.5 py-1 rounded-xl bg-amber-500 text-black font-black text-[10px] shadow active:scale-95"
                >
                  إعادة {zoomScale.toFixed(1)}x
                </button>
              )}

              {/* Close Button */}
              <button
                onClick={() => {
                  setLightboxData(null);
                  setZoomScale(1);
                  setPanPosition({ x: 0, y: 0 });
                  if (onClearTargetPostId) onClearTargetPostId();
                }}
                className="p-2 rounded-xl bg-red-950/90 hover:bg-red-900 text-red-300 border border-red-500/40 active:scale-95"
                title="إغلاق"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
          </div>

          {/* Lightbox Image Stage (Touch Pinch-to-Zoom & Swipe Area) */}
          <div 
            className="relative flex-1 flex items-center justify-center overflow-hidden my-auto w-full h-full"
            onTouchStart={handleTouchStart}
            onTouchMove={handleTouchMove}
            onTouchEnd={handleTouchEnd}
            onClick={handleDoubleTap}
          >
            {/* Swiper Hint Indicators (Subtle Arrows for touch feedback) */}
            {lightboxData.post.images && lightboxData.post.images.length > 1 && (
              <>
                <button
                  type="button"
                  onClick={handleNextImage}
                  className="absolute right-2 z-30 p-2.5 rounded-full bg-black/60 text-amber-300 border border-white/10 active:scale-90 hidden sm:flex items-center justify-center"
                  title="الصورة السابقة"
                >
                  <ArrowRight className="w-5 h-5" />
                </button>
                <button
                  type="button"
                  onClick={handlePrevImage}
                  className="absolute left-2 z-30 p-2.5 rounded-full bg-black/60 text-amber-300 border border-white/10 active:scale-90 hidden sm:flex items-center justify-center"
                  title="الصورة التالية"
                >
                  <ArrowLeft className="w-5 h-5" />
                </button>
              </>
            )}

            {/* Rendered Mobile Responsive Zoomable Image */}
            <div 
              className="w-full h-full flex items-center justify-center transition-transform duration-75"
              style={{
                transform: `scale(${zoomScale}) translate(${panPosition.x / zoomScale}px, ${panPosition.y / zoomScale}px)`,
                cursor: zoomScale > 1 ? 'grab' : 'default',
              }}
            >
              <img
                src={
                  lightboxData.post.images?.[lightboxData.imageIndex] ||
                  lightboxData.post.imageUrl
                }
                alt="صورة المعرض"
                className="max-h-[75vh] max-w-full object-contain rounded-2xl shadow-2xl pointer-events-none"
                referrerPolicy="no-referrer"
              />
            </div>
          </div>

          {/* Lightbox Bottom Footer & Interactive Likes / Rating Bar */}
          <div className="bg-[#140505] border border-amber-500/30 rounded-2xl p-2.5 space-y-2 text-white z-20">
            {lightboxData.post.description && (
              <p className="text-xs text-gray-200 line-clamp-2 px-1 text-right">
                {lightboxData.post.description}
              </p>
            )}

            <div className="flex items-center justify-between gap-2 pt-1 border-t border-white/10 flex-wrap">
              {/* Direct Like in Lightbox */}
              <button
                type="button"
                onClick={() => handleLike(lightboxData.post.id)}
                className={`flex items-center gap-1.5 px-3 py-1 rounded-xl font-bold text-xs ${
                  lightboxData.post.likedUserIds?.includes(currentUserId)
                    ? 'bg-red-600/30 text-red-400 border border-red-500/50'
                    : 'bg-white/10 text-gray-300'
                }`}
              >
                <Heart
                  className={`w-4 h-4 ${
                    lightboxData.post.likedUserIds?.includes(currentUserId)
                      ? 'fill-red-500 text-red-500'
                      : ''
                  }`}
                />
                <span>{lightboxData.post.likesCount || 0}</span>
              </button>

              {/* Direct Rating in Lightbox */}
              {(() => {
                const lbPost = lightboxData.post;
                const lbUserRating = lbPost.ratings?.find((r) => r.userId === currentUserId)?.rating || 0;
                const lbDraft = draftRatings[lbPost.id] !== undefined ? draftRatings[lbPost.id] : lbUserRating;
                const hasLbDraft = draftRatings[lbPost.id] !== undefined && draftRatings[lbPost.id] !== lbUserRating && draftRatings[lbPost.id] > 0;

                return (
                  <div className="flex items-center gap-1 bg-black/60 px-2 py-1 rounded-xl border border-white/10">
                    <span className="text-[10px] text-gray-400 hidden xs:inline">التقييم:</span>
                    <div className="flex items-center gap-0.5">
                      {[1, 2, 3, 4, 5].map((star) => (
                        <button
                          key={`lb-star-${star}`}
                          type="button"
                          onClick={() => handleSelectStar(lbPost.id, star)}
                          className="p-0.5 text-amber-400 active:scale-125"
                        >
                          <Star
                            className={`w-3.5 h-3.5 ${
                              star <= lbDraft
                                ? 'fill-amber-400 text-amber-400 drop-shadow-[0_0_4px_rgba(245,158,11,0.6)]'
                                : 'text-gray-600'
                            }`}
                          />
                        </button>
                      ))}
                    </div>

                    {hasLbDraft && (
                      <button
                        type="button"
                        onClick={() => handleConfirmRate(lbPost.id)}
                        disabled={savingRatingId === lbPost.id}
                        className="px-2 py-0.5 bg-amber-400 hover:bg-amber-300 text-black font-black text-[10px] rounded-lg shadow active:scale-95 animate-pulse"
                      >
                        {savingRatingId === lbPost.id ? '...' : 'تأكيد'}
                      </button>
                    )}

                    {lbPost.totalRatingsCount && lbPost.totalRatingsCount > 0 ? (
                      <span className="text-[11px] font-black text-amber-300 mr-1">
                        ⭐ {lbPost.averageRating ? lbPost.averageRating.toFixed(1) : '0.0'} ({lbPost.totalRatingsCount})
                      </span>
                    ) : (
                      <span className="text-[10px] text-gray-400 mr-1 font-bold">(0)</span>
                    )}
                  </div>
                );
              })()}

              {/* Share in Lightbox */}
              <button
                type="button"
                onClick={() => handleShare(lightboxData.post)}
                className="p-1.5 px-3 rounded-xl bg-amber-500 hover:bg-amber-400 text-black font-black text-xs flex items-center gap-1 active:scale-95"
              >
                <Share2 className="w-3.5 h-3.5" />
                <span className="text-[10px]">مشاركة</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
