import React, { useState } from 'react';
import { X, ExternalLink, Image as ImageIcon } from 'lucide-react';

// Image Viewer Modal Component
const ImageViewerModal = ({ image, onClose }) => {
  if (!image) return null;

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/80 backdrop-blur-sm p-4 md:p-8 animate-fade-in" onClick={onClose}>
      <button 
        onClick={onClose}
        className="absolute top-6 right-6 w-10 h-10 bg-white/10 hover:bg-white/20 rounded-full flex items-center justify-center text-white transition-colors"
      >
        <X className="w-5 h-5" />
      </button>
      
      <div 
        className="relative max-w-5xl w-full max-h-full flex flex-col items-center animate-scale-up"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="relative w-full rounded-2xl overflow-hidden shadow-2xl bg-black/50">
          <img 
            src={image.url || image} 
            alt={image.title || 'Image'} 
            className="w-full h-auto max-h-[80vh] object-contain"
            loading="lazy"
            referrerPolicy="no-referrer"
          />
        </div>
        
        <div className="w-full mt-4 bg-white/10 backdrop-blur-md border border-white/20 rounded-xl p-4 flex items-center justify-between">
          <div>
            <h3 className="text-white font-semibold text-lg">{image.title || 'Company Image'}</h3>
            <p className="text-gray-300 text-sm mt-0.5 flex items-center gap-1.5">
              Source: <span className="text-gray-100 font-medium">{image.domain || new URL(image.url).hostname}</span>
            </p>
          </div>
          <a 
            href={image.url || image} 
            target="_blank" 
            rel="noreferrer"
            className="flex items-center gap-2 bg-white/20 hover:bg-white/30 text-white px-4 py-2 rounded-lg text-sm font-medium transition-colors"
          >
            <ExternalLink className="w-4 h-4" />
            Open Original
          </a>
        </div>
      </div>
    </div>
  );
};

// Single Image Card Component
const ImageCard = ({ image, onClick, onError }) => {
  const rawUrl = typeof image === 'string' ? image : image?.url;
  const url = rawUrl ? rawUrl.replace(/[\n\r\t ]/g, '') : '';
  const title = image?.title || 'Image';

  // Helper to extract domain if missing
  const getDomain = () => {
    if (image?.domain) return image.domain;
    try {
      return new URL(url).hostname.replace('www.', '');
    } catch {
      return 'External Source';
    }
  };

  return (
    <div 
      onClick={() => onClick({ url, title, domain: getDomain() })}
      className="group relative cursor-pointer overflow-hidden rounded-xl bg-gray-100 aspect-video shadow-sm hover:shadow-md transition-all duration-300 border border-black/5"
    >
      <img 
        src={url} 
        alt={title}
        loading="lazy"
        referrerPolicy="no-referrer"
        onError={() => onError(url)}
        className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
      />
      
      {/* Hover Overlay */}
      <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/20 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300 flex flex-col justify-end p-3">
        <h4 className="text-white font-semibold text-sm line-clamp-1">{title}</h4>
        <p className="text-white/80 text-[10px] uppercase tracking-wider mt-0.5">{getDomain()}</p>
      </div>
    </div>
  );
};

// Main Media Gallery Component
export const MediaGallery = ({ data }) => {
  const [selectedImage, setSelectedImage] = useState(null);
  const [failedUrls, setFailedUrls] = useState(new Set());

  console.log("MediaGallery received data:", data);

  if (!data || !Array.isArray(data) || data.length === 0) return null;

  const handleImageError = (url) => {
    setFailedUrls(prev => {
      const next = new Set(prev);
      next.add(url);
      return next;
    });
  };

  const visibleImages = data.filter(img => {
    const rawUrl = typeof img === 'string' ? img : img?.url;
    const url = rawUrl ? rawUrl.replace(/[\n\r\t ]/g, '') : '';
    return url && !failedUrls.has(url);
  });

  if (visibleImages.length === 0) return null;

  return (
    <div className="mt-4 w-full">
      <div className="flex items-center gap-2 mb-3 px-1">
        <ImageIcon className="w-5 h-5 text-[#8C52FF]" />
        <h3 className="text-gray-800 font-bold text-sm tracking-wide">Media Intelligence</h3>
      </div>
      
      {/* Image Grid */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
        {visibleImages.map((img, idx) => {
          return (
            <ImageCard 
              key={idx} 
              image={img} 
              onClick={setSelectedImage} 
              onError={handleImageError} 
            />
          );
        })}
      </div>

      {/* Fullscreen Viewer */}
      {selectedImage && (
        <ImageViewerModal 
          image={selectedImage} 
          onClose={() => setSelectedImage(null)} 
        />
      )}
    </div>
  );
};
