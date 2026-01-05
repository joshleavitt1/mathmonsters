export function preloadImages(urls, onProgress) {
    const unique = Array.from(new Set(urls)).filter(Boolean);
    const total = unique.length;
    if (total === 0) return Promise.resolve();
  
    let loaded = 0;
  
    return new Promise((resolve, reject) => {
      for (const url of unique) {
        const img = new Image();
        img.onload = () => {
          loaded += 1;
          if (onProgress) onProgress(loaded, total);
          if (loaded === total) resolve();
        };
        img.onerror = () => reject(new Error(`Failed to preload image: ${url}`));
        img.src = url;
      }
    });
  }
  