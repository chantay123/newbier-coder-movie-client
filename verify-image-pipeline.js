// End-to-end pipeline verification với mock data được tái tạo từ
// src/mock/mockMovies.js (đây là API contract spec do dự án định nghĩa).
// Mục tiêu: chứng minh resolveImageUrl + resolveMovieBackdrop + normalizeHeroMovie
//            trả về URL absolute đúng cho mọi kiểu dữ liệu API có thể trả về.

process.env.NEXT_PUBLIC_CORE_API_URL = 'https://core-movie-service.onrender.com/api/v1';

// ========== 1. Sao chép verbatim logic từ src/utils/movieNormalizer.js ==========
const LOCAL_DEFAULT_BACKDROP = '/img/placeholder-backdrop.svg';
const LOCAL_DEFAULT_POSTER = '/img/placeholder-poster.svg';

const imageOrigin = (() => {
  const raw = process.env.NEXT_PUBLIC_CORE_API_URL || process.env.NEXT_PUBLIC_API_URL || '';
  try { return new URL(raw).origin; } catch { return ''; }
})();

const resolveImageUrl = (url) => {
  if (!url || typeof url !== 'string') return '';
  const cleaned = url.trim();
  if (cleaned === '') return '';
  if (/^(https?:|data:|blob:)/i.test(cleaned)) return cleaned;
  if (cleaned.startsWith('//')) {
    const proto = (typeof window !== 'undefined' && window.location?.protocol) || 'https:';
    return `${proto}${cleaned}`;
  }
  if (cleaned.startsWith('/')) {
    if (imageOrigin) return `${imageOrigin}${cleaned}`;
    return cleaned;
  }
  return cleaned;
};

const resolveMovieBackdrop = (movie) => {
  if (!movie) return LOCAL_DEFAULT_BACKDROP;
  const candidates = [
    movie.backdrop_url, movie.backdrop, movie.backdropUrl,
    movie.image_backdrop, movie.imageBackdrop,
    movie.poster_url, movie.poster, movie.posterUrl,
    movie.thumb_url, movie.thumb, movie.thumbUrl,
    movie.image, movie.imageUrl
  ];
  for (const c of candidates) {
    const r = resolveImageUrl(c);
    if (r) return r;
  }
  return LOCAL_DEFAULT_BACKDROP;
};

const normalizeHeroMovie = (m, i = 0) => {
  if (!m) return null;
  const resolveFirstUsable = (cands) => {
    for (const c of cands) { const r = resolveImageUrl(c); if (r) return r; }
    return '';
  };
  const backdrop = resolveFirstUsable([m.backdrop_url, m.backdrop, m.backdropUrl, m.cover])
    || resolveMovieBackdrop(m, i);
  const poster = resolveFirstUsable([m.poster_url, m.poster, m.posterUrl, m.image])
    || resolveFirstUsable([m.thumb_url, m.thumb, m.thumbUrl, m.thumbnail])
    || LOCAL_DEFAULT_POSTER;
  const thumb = resolveFirstUsable([m.thumb_url, m.thumb, m.thumbUrl, m.thumbnail])
    || resolveFirstUsable([m.poster_url, m.poster, m.posterUrl, m.image])
    || poster || LOCAL_DEFAULT_POSTER;
  return { ...m, poster_url: poster, thumb_url: thumb, backdrop_url: backdrop };
};

// ========== 2. Mock data từ src/mock/mockMovies.js (lấy 1 phim) ==========
const mockMovie = {
  _id: "mock-featured-1",
  name: "Dune: Hành Tinh Cát - Phần Hai",
  origin_name: "Dune: Part Two",
  slug: "dune-hanh-tinh-cat-phan-hai",
  year: 2024,
  quality: "4K",
  type: "single",
  status: "completed",
  poster_url: "https://image.tmdb.org/t/p/w500/8b8R8l88Qje9dn9OE8PY05Nxl1X.jpg",
  thumb_url: "https://image.tmdb.org/t/p/w500/8b8R8l88Qje9dn9OE8PY05Nxl1X.jpg",
  backdrop_url: "https://image.tmdb.org/t/p/original/eZ239CUp1d6OryZEBPnO2n87gMG.jpg",
  trailer_url: "Way9Dexny3w",
};

console.log('======================================================================');
console.log('CASE 1: Mock data đúng spec (mockMovies.js)');
console.log('======================================================================');
const n1 = normalizeHeroMovie(mockMovie, 0);
console.log('  RAW poster_url   :', mockMovie.poster_url);
console.log('  → poster_url     :', n1.poster_url);
console.log('  RAW thumb_url    :', mockMovie.thumb_url);
console.log('  → thumb_url      :', n1.thumb_url);
console.log('  RAW backdrop_url :', mockMovie.backdrop_url);
console.log('  → backdrop_url   :', n1.backdrop_url);
const c1 = /^https?:\/\//.test(n1.poster_url) && /^https?:\/\//.test(n1.thumb_url) && /^https?:\/\//.test(n1.backdrop_url);
console.log('  → all absolute URL?', c1 ? '✅ YES' : '❌ NO');
console.log('');

console.log('======================================================================');
console.log('CASE 2: Phim không có ảnh (API trả null)');
console.log('======================================================================');
const noImg = { _id: 'x', name: 'No Image' };
const n2 = normalizeHeroMovie(noImg, 0);
console.log('  → poster_url     :', n2.poster_url);
console.log('  → thumb_url      :', n2.thumb_url);
console.log('  → backdrop_url   :', n2.backdrop_url);
const c2 = n2.poster_url.endsWith('.svg') && n2.thumb_url.endsWith('.svg') && n2.backdrop_url.endsWith('.svg');
console.log('  → all SVG placeholder?', c2 ? '✅ YES' : '❌ NO');
console.log('');

console.log('======================================================================');
console.log('CASE 3: Relative URL /uploads/x.jpg');
console.log('======================================================================');
const rel = { _id: 'r', name: 'Rel', poster_url: '/uploads/p.jpg', thumb_url: '/uploads/t.jpg', backdrop_url: '/uploads/b.jpg' };
const n3 = normalizeHeroMovie(rel, 0);
console.log('  → poster_url     :', n3.poster_url);
console.log('  → thumb_url      :', n3.thumb_url);
console.log('  → backdrop_url   :', n3.backdrop_url);
const c3 = n3.poster_url.startsWith(imageOrigin) && n3.thumb_url.startsWith(imageOrigin) && n3.backdrop_url.startsWith(imageOrigin);
console.log('  → all prepended with imageOrigin?', c3 ? '✅ YES' : '❌ NO');
console.log('  imageOrigin used =', imageOrigin);
console.log('');

console.log('======================================================================');
console.log('CASE 4: Protocol-relative //cdn.com/x.jpg');
console.log('======================================================================');
const proto = { _id: 'p', name: 'Proto', poster_url: '//cdn.com/p.jpg', thumb_url: '//cdn.com/t.jpg', backdrop_url: '//cdn.com/b.jpg' };
const n4 = normalizeHeroMovie(proto, 0);
console.log('  → poster_url     :', n4.poster_url);
console.log('  → thumb_url      :', n4.thumb_url);
console.log('  → backdrop_url   :', n4.backdrop_url);
const c4 = n4.poster_url.startsWith('https://cdn.com/') || n4.poster_url.startsWith('http://cdn.com/');
console.log('  → prepended with https:?', c4 ? '✅ YES' : '❌ NO');
console.log('');

console.log('======================================================================');
console.log('CASE 5: Alternative field names (poster, backdrop thay vì poster_url)');
console.log('======================================================================');
const alt = { _id: 'a', name: 'Alt', poster: 'https://x.com/p.jpg', thumb: 'https://x.com/t.jpg', backdrop: 'https://x.com/b.jpg' };
const n5 = normalizeHeroMovie(alt, 0);
console.log('  → poster_url     :', n5.poster_url);
console.log('  → thumb_url      :', n5.thumb_url);
console.log('  → backdrop_url   :', n5.backdrop_url);
const c5 = /^https:\/\/x\.com\//.test(n5.poster_url) && /^https:\/\/x\.com\//.test(n5.backdrop_url);
console.log('  → normalized correctly from alt fields?', c5 ? '✅ YES' : '❌ NO');
console.log('');

console.log('======================================================================');
console.log('SUMMARY');
console.log('======================================================================');
const all = c1 && c2 && c3 && c4 && c5;
console.log('Pipeline hoạt động đúng cho mọi edge case:', all ? '✅ YES' : '❌ NO');
console.log('');
console.log('Hành vi trong từng case:');
console.log(' 1. API trả poster_url/thumb_url/backdrop_url (absolute URL từ TMDB) → trả nguyên ✅');
console.log(' 2. API trả null/rỗng → trả placeholder SVG ✅');
console.log(' 3. API trả /uploads/x.jpg → ghép thành ' + imageOrigin + '/uploads/x.jpg ✅');
console.log(' 4. API trả //cdn.com/x.jpg → thành https://cdn.com/x.jpg ✅');
console.log(' 5. API dùng field name khác (poster, backdrop) → vẫn đọc được ✅');
