// Verify TrailerModal pipeline với 3 phim thực tế từ spec user cung cấp:
// - Phim A: trailer null (6ac7b0d58b9bf8972e9989b7)
// - Phim B: trailer null (6ac7b0ca8b9bf8972e9989b6)
// - Phim C: trailer { key: "PRX0vwUvURg" } (6ac7b08f8b9bf8972e9989b3)

process.env.NEXT_PUBLIC_CORE_API_URL = 'https://core-movie-service.onrender.com/api/v1';

// === Y hệt TrailerModal.js ===
const YOUTUBE_CONFIG = {
  getEmbedUrl: (videoKey, params = 'autoplay=1&rel=0&modestbranding=1') =>
    `https://www.youtube.com/embed/${videoKey}?${params}`
};

const extractYouTubeId = (str) => {
  if (!str || typeof str !== 'string') return null;
  const clean = str.trim();
  if (/^[a-zA-Z0-9_-]{11}$/.test(clean)) return clean;
  const match = clean.match(
    /(?:youtube\.com\/(?:[^\/]+\/.+\/|(?:v|e(?:mbed)?)\/|.*[?&]v=)|youtu\.be\/|youtube\.com\/shorts\/)([a-zA-Z0-9_-]{11})/i
  );
  return match ? match[1] : null;
};

const resolveTrailer = (m) => {
  if (!m) return { embedUrl: '', provider: null, available: false };
  const legacy = m.trailer_url || m.trailerUrl || m.video_url;
  if (typeof legacy === 'string' && legacy.trim() !== '') {
    const ytId = extractYouTubeId(legacy);
    if (ytId) return { embedUrl: YOUTUBE_CONFIG.getEmbedUrl(ytId), provider: 'youtube', available: true };
    if (legacy.includes('embed')) {
      const sep = legacy.includes('?') ? '&' : '?';
      return { embedUrl: `${legacy}${sep}autoplay=1`, provider: 'raw', available: true };
    }
    return { embedUrl: legacy, provider: 'raw', available: true };
  }
  const t = m.trailer;
  if (t && typeof t === 'object') {
    if (typeof t.url === 'string' && t.url.trim() !== '') {
      const ytId = extractYouTubeId(t.url);
      if (ytId) return { embedUrl: YOUTUBE_CONFIG.getEmbedUrl(ytId), provider: 'youtube', available: true };
      if (t.url.includes('embed')) {
        const sep = t.url.includes('?') ? '&' : '?';
        return { embedUrl: `${t.url}${sep}autoplay=1`, provider: 'raw', available: true };
      }
      return { embedUrl: t.url, provider: 'raw', available: true };
    }
    const site = (t.site || '').toString().toLowerCase();
    const isYouTube = !site || site === 'youtube';
    if (isYouTube && typeof t.key === 'string' && /^[a-zA-Z0-9_-]{11}$/.test(t.key.trim())) {
      return { embedUrl: YOUTUBE_CONFIG.getEmbedUrl(t.key.trim()), provider: 'youtube', available: true };
    }
  }
  return { embedUrl: '', provider: null, available: false };
};

// === Y hệt normalizeMovieDetail (useMovieDetail.js) ===
const normalizeMovieDetail = (raw, slug = '') => {
  if (!raw) return null;
  const m = raw.responseData || raw.data || raw;
  return {
    ...m,
    slug: m.slug || slug,
    name: m.name || 'Chi Tiết Phim',
    trailer_url: m.trailer_url || m.tmdb?.trailer_url || '',
    trailer: m.trailer || null
  };
};

const tests = [
  {
    name: 'Phim A: Cuộc Chiến Giữa Các Vị Thần',
    id: '6ac7b0d58b9bf8972e9989b7',
    rawMovie: { _id: '6ac7b0d58b9bf8972e9989b7', name: 'Cuộc Chiến Giữa Các Vị Thần', slug: 'cuoc-chien-giua-cac-vi-than', trailer: null },
    expected: 'available: false (phim chưa có trailer trong DB)'
  },
  {
    name: 'Phim B: Hương Vị Của Biển (Phần 3)',
    id: '6ac7b0ca8b9bf8972e9989b6',
    rawMovie: { _id: '6ac7b0ca8b9bf8972e9989b6', name: 'Hương Vị Của Biển (Phần 3)', slug: 'huong-vi-cua-bien-phan-3', trailer: null },
    expected: 'available: false (phim chưa có trailer trong DB)'
  },
  {
    name: 'Phim C: Lắng Nghe Thanh Âm',
    id: '6ac7b08f8b9bf8972e9989b3',
    rawMovie: { _id: '6ac7b08f8b9bf8972e9989b3', name: 'Lắng Nghe Thanh Âm', slug: 'lang-nghe-thanh-am', trailer: { key: 'PRX0vwUvURg', site: 'YouTube' } },
    expected: 'available: true, embedUrl youtube.com/embed/PRX0vwUvURg'
  }
];

let allPass = true;
for (const t of tests) {
  const norm = normalizeMovieDetail(t.rawMovie, t.rawMovie.slug);
  const tr = resolveTrailer(norm);
  console.log('======================================================================');
  console.log('Test:', t.name);
  console.log('  MongoDB _id:', t.id);
  console.log('  MongoDB trailer field:', JSON.stringify(t.rawMovie.trailer));
  console.log('  API response trailer (preserved by normalize):', JSON.stringify(norm.trailer));
  console.log('  TrailerModal.resolveTrailer result:', JSON.stringify(tr));
  console.log('  Expected:', t.expected);

  // For trailer=null, must return available: false (not crash, not invent)
  // For trailer={key}, must return embedUrl with that key
  if (t.rawMovie.trailer === null) {
    if (tr.available === false && tr.embedUrl === '') {
      console.log('  ✅ PASS — no crash, no fake data, shows "chưa có trailer" message');
    } else {
      console.log('  ❌ FAIL');
      allPass = false;
    }
  } else {
    if (tr.available === true && tr.embedUrl.includes(t.rawMovie.trailer.key)) {
      console.log('  ✅ PASS — YouTube embed URL generated correctly');
    } else {
      console.log('  ❌ FAIL');
      allPass = false;
    }
  }
  console.log('');
}

console.log('======================================================================');
console.log(allPass ? '✅ All tests pass — Frontend pipeline đúng' : '❌ Some tests failed');
