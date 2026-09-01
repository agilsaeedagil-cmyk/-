import React, { useRef, useState } from 'react';
import { Image as ImageIcon, Camera, Upload, X, CheckCircle2, Loader2 } from 'lucide-react';

interface ImagePickerProps {
  label: string;
  value: string;
  onChange: (dataUrl: string) => void;
  placeholder?: string;
  maxDimension?: number;
}

export const ImagePicker: React.FC<ImagePickerProps> = ({
  label,
  value,
  onChange,
  maxDimension = 800,
}) => {
  const galleryInputRef = useRef<HTMLInputElement>(null);
  const cameraInputRef = useRef<HTMLInputElement>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const compressAndSetImage = (file: File) => {
    setIsLoading(true);
    setErrorMessage(null);
    const reader = new FileReader();
    
    reader.onload = (e) => {
      const resultDataUrl = e.target?.result as string;
      if (!resultDataUrl) {
        setIsLoading(false);
        return;
      }

      const img = new Image();
      img.onload = () => {
        try {
          const canvas = document.createElement('canvas');
          let width = img.width;
          let height = img.height;

          if (width > height) {
            if (width > maxDimension) {
              height = Math.round((height * maxDimension) / width);
              width = maxDimension;
            }
          } else {
            if (height > maxDimension) {
              width = Math.round((width * maxDimension) / height);
              height = maxDimension;
            }
          }

          canvas.width = width;
          canvas.height = height;

          const ctx = canvas.getContext('2d');
          if (ctx) {
            ctx.drawImage(img, 0, 0, width, height);
            const compressedDataUrl = canvas.toDataURL('image/jpeg', 0.85);
            onChange(compressedDataUrl);
          } else {
            onChange(resultDataUrl);
          }
        } catch {
          onChange(resultDataUrl);
        } finally {
          setIsLoading(false);
        }
      };

      img.onerror = () => {
        onChange(resultDataUrl);
        setIsLoading(false);
      };

      img.src = resultDataUrl;
    };

    reader.onerror = () => {
      setErrorMessage('حدث خطأ أثناء قراءة ملف الصورة');
      setIsLoading(false);
    };

    reader.readAsDataURL(file);
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      if (!file.type.startsWith('image/')) {
        setErrorMessage('يرجى اختيار ملف صورة صالح (PNG, JPG, WEBP).');
        return;
      }
      compressAndSetImage(file);
    }
    e.target.value = '';
  };

  return (
    <div className="space-y-1.5 dir-rtl">
      <label className="block text-gray-300 font-bold text-xs">{label}</label>

      {errorMessage && (
        <div className="bg-red-950/80 border border-red-500/60 text-red-200 text-xs px-3 py-1.5 rounded-xl font-bold">
          {errorMessage}
        </div>
      )}

      {isLoading ? (
        <div className="w-full h-28 bg-[#120a0a] rounded-2xl border-2 border-amber-500/50 flex flex-col items-center justify-center gap-2 text-amber-400">
          <Loader2 className="w-6 h-6 animate-spin text-amber-400" />
          <span className="text-xs font-bold">جاري معالجة وضغط الصورة...</span>
        </div>
      ) : value ? (
        <div className="relative w-full h-36 bg-[#100909] rounded-2xl border-2 border-dashed border-amber-500/50 overflow-hidden flex items-center justify-center group">
          <img src={value} alt="معاينة الصورة" className="w-full h-full object-contain p-1 bg-black/40" />

          <div className="absolute inset-0 bg-black/75 opacity-0 group-hover:opacity-100 transition-opacity flex flex-wrap items-center justify-center gap-2 p-2">
            <button
              type="button"
              onClick={() => galleryInputRef.current?.click()}
              className="bg-amber-500 hover:bg-amber-400 text-black px-3 py-1.5 rounded-xl font-bold text-xs flex items-center gap-1 shadow-lg transition-transform active:scale-95"
            >
              <Upload className="w-3.5 h-3.5" />
              تغيير من المعرض
            </button>
            <button
              type="button"
              onClick={() => cameraInputRef.current?.click()}
              className="bg-amber-600 hover:bg-amber-500 text-white px-3 py-1.5 rounded-xl font-bold text-xs flex items-center gap-1 shadow-lg transition-transform active:scale-95"
            >
              <Camera className="w-3.5 h-3.5" />
              من الكاميرا
            </button>
            <button
              type="button"
              onClick={() => onChange('')}
              className="bg-red-600 hover:bg-red-500 text-white p-1.5 rounded-xl font-bold text-xs shadow-lg transition-transform active:scale-95"
              title="إزالة الصورة"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          <div className="absolute bottom-2 left-2 bg-black/80 text-amber-300 text-[10px] px-2.5 py-0.5 rounded-full flex items-center gap-1 font-bold border border-amber-500/30">
            <CheckCircle2 className="w-3 h-3 text-emerald-400" />
            تم اختيار الصورة بنجاح
          </div>
        </div>
      ) : (
        <div className="w-full bg-[#120a0a] border-2 border-dashed border-gray-700 hover:border-amber-500/70 rounded-2xl p-3 text-center transition-all space-y-2">
          <div className="flex justify-center items-center gap-2.5">
            <button
              type="button"
              onClick={() => galleryInputRef.current?.click()}
              className="flex-1 bg-amber-500/10 hover:bg-amber-500/20 border border-amber-500/40 rounded-xl p-2.5 flex items-center justify-center gap-2 text-amber-300 font-bold text-xs transition-colors active:scale-95 cursor-pointer shadow-sm"
            >
              <ImageIcon className="w-4 h-4 text-amber-400" />
              اختيار من المعرض 🖼️
            </button>

            <button
              type="button"
              onClick={() => cameraInputRef.current?.click()}
              className="flex-1 bg-red-500/10 hover:bg-red-500/20 border border-red-500/40 rounded-xl p-2.5 flex items-center justify-center gap-2 text-red-300 font-bold text-xs transition-colors active:scale-95 cursor-pointer shadow-sm"
            >
              <Camera className="w-4 h-4 text-red-400" />
              التقاط بالكاميرا 📸
            </button>
          </div>
          <p className="text-[10px] text-gray-400">اختر صورة من معرض هاتفك أو التقطها مباشرة بكاميرا الجهاز</p>
        </div>
      )}

      {/* Gallery Input */}
      <input
        type="file"
        ref={galleryInputRef}
        onChange={handleFileChange}
        accept="image/*"
        className="hidden"
      />

      {/* Camera Input */}
      <input
        type="file"
        ref={cameraInputRef}
        onChange={handleFileChange}
        accept="image/*"
        capture="environment"
        className="hidden"
      />
    </div>
  );
};
