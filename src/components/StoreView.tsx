import React, { useState } from 'react';
import { ShoppingBag, X, MessageCircle, Info, ShieldCheck, Tag } from 'lucide-react';
import { StoreProduct, StoreSettings } from '../types';
import { initialStoreProducts, initialStoreSettings } from '../data/initialData';
import { useLanguage } from '../context/LanguageContext';

interface StoreViewProps {
  products?: StoreProduct[];
  settings?: StoreSettings;
}

export const StoreView: React.FC<StoreViewProps> = ({
  products = [],
  settings = initialStoreSettings,
}) => {
  const { t } = useLanguage();
  const [selectedProduct, setSelectedProduct] = useState<StoreProduct | null>(null);

  const displayProducts = products;
  const announcementText = settings.announcement || initialStoreSettings.announcement;
  const rawWaNumber = settings.whatsappNumber || initialStoreSettings.whatsappNumber;
  const cleanWaNumber = rawWaNumber.replace(/[^\d]/g, '') || '967780163037';

  return (
    <div className="space-y-4 pb-8 px-4 text-white dir-rtl">
      {/* View Header */}
      <div className="flex items-center justify-between border-b border-red-900/40 pb-2">
        <h2 className="text-base font-black text-white flex items-center gap-2">
          <span>🛍️</span> {t.storeTitle || 'دليل ومتجر المستلزمات الرياضية'}
        </h2>
        <span className="text-xs bg-amber-500/20 text-amber-300 border border-amber-500/30 px-2.5 py-0.5 rounded-full font-bold">
          {displayProducts.length} منتج
        </span>
      </div>

      {/* Announcement Banner */}
      {announcementText ? (
        <div className="bg-gradient-to-r from-red-900/40 via-amber-900/30 to-red-950 p-4 rounded-2xl border border-amber-500/30 text-xs text-amber-200 font-bold leading-relaxed shadow-sm">
          {announcementText.replace('متجر صقور الريف', 'متجر المستلزمات الرياضية').replace('متجر وصقور الريف', 'متجر المستلزمات الرياضية')}
        </div>
      ) : null}

      {/* Products Grid or Empty State */}
      {displayProducts.length === 0 ? (
        <div className="text-center py-12 bg-[#171212] rounded-2xl border border-white/5 space-y-2">
          <ShoppingBag className="w-8 h-8 text-amber-500 mx-auto" />
          <p className="text-xs text-gray-400 font-semibold">لا توجد منتجات معروضة حالياً في المتجر</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {displayProducts.map((p) => {
            const waInquireLink = `https://wa.me/${cleanWaNumber}?text=${encodeURIComponent(`مرحبًا، أريد الاستفسار عن المنتج: ${p.name}\nالسعر: ${p.price}`)}`;

            return (
              <div
                key={p.id}
                onClick={() => setSelectedProduct(p)}
                className="bg-[#181313] hover:bg-[#221a1a] border border-red-900/30 hover:border-amber-500/50 rounded-2xl overflow-hidden shadow-md flex items-center p-3 gap-3 transition-all cursor-pointer group"
              >
                <img
                  src={p.image || 'https://images.unsplash.com/photo-1577219491135-ce391730fb2c?w=500&auto=format&fit=crop&q=80'}
                  alt={p.name}
                  className="w-20 h-20 object-cover rounded-xl border border-red-800/40 flex-shrink-0 group-hover:scale-105 transition-transform"
                />
                <div className="space-y-1.5 flex-1 min-w-0">
                  <span className="text-[10px] bg-red-900/50 text-red-300 font-bold px-2 py-0.5 rounded-md">
                    {p.category}
                  </span>
                  <h3 className="font-extrabold text-xs text-white leading-snug truncate group-hover:text-amber-300 transition-colors">
                    {p.name}
                  </h3>
                  <p className="text-amber-400 font-black text-xs">{p.price}</p>

                  <div className="pt-1 flex items-center gap-2">
                    <a
                      href={waInquireLink}
                      target="_blank"
                      rel="noopener noreferrer"
                      onClick={(e) => e.stopPropagation()}
                      className="inline-flex bg-gradient-to-r from-emerald-600 to-green-600 hover:from-emerald-500 hover:to-green-500 text-white font-extrabold text-[10px] px-2.5 py-1 rounded-lg items-center gap-1 transition-transform active:scale-95 shadow-md"
                    >
                      <MessageCircle className="w-3 h-3 text-emerald-200" />
                      <span>استفسار عن المنتج عبر واتساب</span>
                    </a>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Product Detail Modal */}
      {selectedProduct && (
        <div className="fixed inset-0 z-50 bg-black/85 backdrop-blur-md flex items-center justify-center p-4">
          <div className="bg-[#1c1414] border-2 border-amber-500/60 rounded-3xl w-full max-w-sm overflow-hidden shadow-2xl animate-in fade-in zoom-in-95 dir-rtl text-white flex flex-col">
            
            {/* Modal Image */}
            <div className="relative h-56 w-full bg-black/50">
              <img
                src={selectedProduct.image}
                alt={selectedProduct.name}
                className="w-full h-full object-cover"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-[#1c1414] via-transparent to-black/60" />

              <button
                onClick={() => setSelectedProduct(null)}
                className="absolute top-3 left-3 bg-black/60 text-white p-1.5 rounded-full hover:bg-black/90 transition-transform active:scale-95 border border-white/10"
              >
                <X className="w-5 h-5" />
              </button>

              <div className="absolute bottom-3 right-4 left-4">
                <span className="bg-amber-500 text-black text-[10px] font-black px-2.5 py-0.5 rounded-md uppercase">
                  {selectedProduct.category}
                </span>
                <h2 className="text-base font-black text-white mt-1 leading-snug">{selectedProduct.name}</h2>
              </div>
            </div>

            {/* Modal Details Body */}
            <div className="p-4 space-y-4 text-xs">
              {/* Price Banner */}
              <div className="bg-[#120a0a] border border-amber-500/30 p-3 rounded-xl flex items-center justify-between">
                <span className="text-gray-300 font-bold flex items-center gap-1">
                  <Tag className="w-4 h-4 text-amber-400" />
                  سعر المنتج:
                </span>
                <span className="text-amber-400 font-black text-sm">{selectedProduct.price}</span>
              </div>

              {/* Product Description */}
              <div className="bg-[#120a0a] border border-white/5 p-3 rounded-xl space-y-1.5">
                <h4 className="font-extrabold text-amber-300 text-xs flex items-center gap-1">
                  <Info className="w-3.5 h-3.5 text-amber-400" />
                  وصف وتفاصيل المنتج:
                </h4>
                <p className="text-gray-300 text-xs leading-relaxed whitespace-pre-line">
                  {selectedProduct.description || 'منتج رياضي عالي الجودة معتمد لتمارين ومباريات كرة القدم، متاح للطلب والاستفسار المباشر عبر واتساب.'}
                </p>
              </div>

              {/* WhatsApp Inquire Button */}
              <a
                href={`https://wa.me/${cleanWaNumber}?text=${encodeURIComponent(`مرحبًا، أريد الاستفسار عن المنتج: ${selectedProduct.name}\nالسعر: ${selectedProduct.price}`)}`}
                target="_blank"
                rel="noopener noreferrer"
                className="w-full bg-gradient-to-r from-emerald-600 via-green-600 to-emerald-700 hover:from-emerald-500 hover:to-green-600 text-white font-black py-3 rounded-xl shadow-lg border border-emerald-400/40 flex items-center justify-center gap-2 text-xs transition-transform active:scale-95"
              >
                <MessageCircle className="w-4 h-4 text-white" />
                <span>استفسار عن المنتج عبر واتساب</span>
              </a>

              <button
                onClick={() => setSelectedProduct(null)}
                className="w-full bg-gray-800 hover:bg-gray-700 text-gray-200 font-bold py-2 rounded-xl text-xs transition-colors"
              >
                إغلاق
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
