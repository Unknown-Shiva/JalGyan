import { useState, useEffect, useCallback } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import {
  BookOpen,
  Search,
  Filter,
  Clock,
  Eye,
  Bookmark,
  PlusCircle,
  Video,
  ArrowRight,
  Droplets,
  Sparkles,
  X,
  FileText,
} from 'lucide-react';
import { articleService } from '../services/articleService';
import { categoryService } from '../services/categoryService';
import { bookmarkService } from '../services/bookmarkService';
import { useAuth } from '../hooks/useAuth';

export default function KnowledgeLibrary() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();

  const [articles, setArticles] = useState([]);
  const [categories, setCategories] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [pagination, setPagination] = useState({ page: 1, totalPages: 1, total: 0 });

  // Query state derived from searchParams
  const currentCategory = searchParams.get('category') || '';
  const currentSearch = searchParams.get('q') || '';
  const currentSort = searchParams.get('sort') || 'recent';
  const currentPage = parseInt(searchParams.get('page') || '1', 10);

  const [searchInput, setSearchInput] = useState(currentSearch);
  const [bookmarkedIds, setBookmarkedIds] = useState(new Set());
  const [bookmarkingId, setBookmarkingId] = useState(null);

  // Load categories
  useEffect(() => {
    categoryService
      .list()
      .then((cats) => setCategories(cats))
      .catch((err) => console.error('Failed to load categories', err));
  }, []);

  // Load articles
  const loadArticles = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const data = await articleService.list({
        page: currentPage,
        limit: 9,
        category: currentCategory,
        q: currentSearch,
        sort: currentSort,
      });
      setArticles(data.articles || []);
      setPagination(data.pagination || { page: 1, totalPages: 1, total: 0 });
    } catch (err) {
      setError('Unable to load articles. Please check your network and try again.');
    } finally {
      setLoading(false);
    }
  }, [currentPage, currentCategory, currentSearch, currentSort]);

  useEffect(() => {
    loadArticles();
  }, [loadArticles]);

  // Load user bookmarks if authenticated
  useEffect(() => {
    if (!user) {
      setBookmarkedIds(new Set());
      return;
    }
    bookmarkService
      .list()
      .then((items) => {
        const ids = new Set(items.map((b) => b.article?.id).filter(Boolean));
        setBookmarkedIds(ids);
      })
      .catch(() => {});
  }, [user]);

  // Handle search submit
  const handleSearchSubmit = (e) => {
    e.preventDefault();
    const next = new URLSearchParams(searchParams);
    if (searchInput.trim()) {
      next.set('q', searchInput.trim());
    } else {
      next.delete('q');
    }
    next.set('page', '1');
    setSearchParams(next);
  };

  // Handle category change
  const handleCategoryChange = (slug) => {
    const next = new URLSearchParams(searchParams);
    if (slug) {
      next.set('category', slug);
    } else {
      next.delete('category');
    }
    next.set('page', '1');
    setSearchParams(next);
  };

  // Handle sort change
  const handleSortChange = (e) => {
    const next = new URLSearchParams(searchParams);
    next.set('sort', e.target.value);
    next.set('page', '1');
    setSearchParams(next);
  };

  // Clear all filters
  const handleClearFilters = () => {
    setSearchInput('');
    setSearchParams({});
  };

  // Toggle bookmark
  const toggleBookmark = async (e, articleId) => {
    e.preventDefault();
    e.stopPropagation();
    if (!user) {
      navigate('/login');
      return;
    }
    if (bookmarkingId === articleId) return;

    setBookmarkingId(articleId);
    const isBookmarked = bookmarkedIds.has(articleId);
    try {
      if (isBookmarked) {
        await bookmarkService.remove(articleId);
        setBookmarkedIds((prev) => {
          const next = new Set(prev);
          next.delete(articleId);
          return next;
        });
      } else {
        await bookmarkService.add(articleId);
        setBookmarkedIds((prev) => new Set(prev).add(articleId));
      }
    } catch (err) {
      console.error('Bookmark error:', err);
    } finally {
      setBookmarkingId(null);
    }
  };

  return (
    <div className="knowledge-page">
      {/* Hero Section */}
      <section className="knowledge-hero">
        <div className="knowledge-hero-content">
          <span className="eyebrow light-eyebrow">
            <Sparkles size={13} style={{ verticalAlign: 'middle', marginRight: 4 }} />
            DIGITAL KNOWLEDGE SHARING PLATFORM &bull; BUREAU OF WATER USE EFFICIENCY
          </span>
          <h1>
            Water Conservation <em>Wiki & Knowledge Base</em>
          </h1>
          <p>
            Peer-reviewed field techniques, technical schematics, and proven methods for
            minimizing water scarcity across agriculture, urban ecosystems, and local watersheds.
          </p>

          <div className="hero-buttons">
            <Link to="/articles/submit" className="button button-white">
              <PlusCircle size={16} /> Submit an Article
            </Link>
            <Link to="/resources" className="button button-outline" style={{ background: '#ffffff20', color: '#fff', borderColor: '#ffffff40' }}>
              <Video size={16} /> Video & Resource Library
            </Link>
          </div>
        </div>

        <div className="knowledge-hero-stats">
          <div className="knowledge-stat-card">
            <Droplets size={22} className="stat-icon" />
            <div className="stat-value">6+</div>
            <div className="stat-label">Conservation Domains</div>
          </div>
          <div className="knowledge-stat-card">
            <FileText size={22} className="stat-icon" />
            <div className="stat-value">{pagination.total || 4}</div>
            <div className="stat-label">Verified Wiki Articles</div>
          </div>
          <div className="knowledge-stat-card">
            <Clock size={22} className="stat-icon" />
            <div className="stat-value">45%</div>
            <div className="stat-label">Avg Irrigation Saving</div>
          </div>
        </div>
      </section>

      {/* Search and Filters Bar */}
      <div className="knowledge-toolbar">
        <form onSubmit={handleSearchSubmit} className="knowledge-search-form">
          <Search size={18} className="search-icon" />
          <input
            type="text"
            placeholder="Search conservation techniques, drip systems, rainwater sumps..."
            value={searchInput}
            onChange={(e) => setSearchInput(e.target.value)}
            className="knowledge-search-input"
          />
          {searchInput && (
            <button
              type="button"
              className="search-clear-btn"
              onClick={() => {
                setSearchInput('');
                const next = new URLSearchParams(searchParams);
                next.delete('q');
                setSearchParams(next);
              }}
            >
              <X size={15} />
            </button>
          )}
          <button type="submit" className="button button-primary button-small">
            Search
          </button>
        </form>

        <div className="knowledge-toolbar-controls">
          <div className="sort-control">
            <Filter size={15} />
            <select value={currentSort} onChange={handleSortChange} aria-label="Sort articles">
              <option value="recent">Most Recent</option>
              <option value="popular">Most Viewed</option>
              <option value="readTime">Read Time</option>
            </select>
          </div>
        </div>
      </div>

      {/* Category Tabs */}
      <div className="category-scroll-wrapper">
        <button
          className={`category-chip ${!currentCategory ? 'active' : ''}`}
          onClick={() => handleCategoryChange('')}
        >
          All Topics
        </button>
        {categories.map((cat) => (
          <button
            key={cat.id || cat.slug}
            className={`category-chip ${currentCategory === cat.slug ? 'active' : ''}`}
            onClick={() => handleCategoryChange(cat.slug)}
          >
            {cat.name}
            {cat.articlesCount !== undefined && (
              <span className="category-chip-count">{cat.articlesCount}</span>
            )}
          </button>
        ))}
      </div>

      {/* Active Filter Indicators */}
      {(currentCategory || currentSearch) && (
        <div className="active-filter-bar">
          <span>Filtering by:</span>
          {currentCategory && (
            <span className="filter-badge">
              Topic: {categories.find((c) => c.slug === currentCategory)?.name || currentCategory}
              <button onClick={() => handleCategoryChange('')}><X size={12} /></button>
            </span>
          )}
          {currentSearch && (
            <span className="filter-badge">
              Keyword: "{currentSearch}"
              <button
                onClick={() => {
                  setSearchInput('');
                  const next = new URLSearchParams(searchParams);
                  next.delete('q');
                  setSearchParams(next);
                }}
              >
                <X size={12} />
              </button>
            </span>
          )}
          <button className="text-button filter-reset-btn" onClick={handleClearFilters}>
            Reset all
          </button>
        </div>
      )}

      {/* Content Area */}
      {loading ? (
        <div className="knowledge-loading">
          <Droplets className="spin-icon" size={28} />
          <p>Loading knowledge repository...</p>
        </div>
      ) : error ? (
        <div className="alert-error" role="alert">
          {error}
        </div>
      ) : articles.length === 0 ? (
        <div className="knowledge-empty-state">
          <BookOpen size={48} className="empty-icon" />
          <h3>No articles found</h3>
          <p>No water conservation guides match your current search or category criteria.</p>
          <button className="button button-primary" onClick={handleClearFilters}>
            Clear all filters
          </button>
        </div>
      ) : (
        <div className="articles-grid">
          {articles.map((art) => {
            const isBookmarked = bookmarkedIds.has(art.id);
            return (
              <article key={art.id} className="article-card">
                <Link to={`/articles/${art.slug || art.id}`} className="article-cover-link">
                  {art.coverImage ? (
                    <img
                      src={art.coverImage}
                      alt={art.title}
                      className="article-cover-img"
                      loading="lazy"
                    />
                  ) : (
                    <div className="article-cover-placeholder">
                      <Droplets size={36} />
                    </div>
                  )}
                  <span className="article-category-badge">
                    {art.category?.name || 'Water Conservation'}
                  </span>
                </Link>

                <div className="article-card-body">
                  <div className="article-card-meta">
                    <span className="article-read-time">
                      <Clock size={12} /> {art.readTime || '5 min read'}
                    </span>
                    <span className="article-views">
                      <Eye size={12} /> {art.viewsCount || 0} views
                    </span>
                  </div>

                  <h3 className="article-card-title">
                    <Link to={`/articles/${art.slug || art.id}`}>{art.title}</Link>
                  </h3>

                  <p className="article-card-summary">{art.summary}</p>

                  <div className="article-card-footer">
                    <div className="article-author-info">
                      <span className="avatar avatar-small">
                        {(art.author?.name || 'Author')
                          .split(' ')
                          .map((x) => x[0])
                          .join('')
                          .slice(0, 2)
                          .toUpperCase()}
                      </span>
                      <span className="author-name">{art.author?.name || 'Contributor'}</span>
                    </div>

                    <div className="article-card-actions">
                      <button
                        className={`icon-button bookmark-btn ${isBookmarked ? 'active' : ''}`}
                        title={isBookmarked ? 'Remove bookmark' : 'Save article'}
                        onClick={(e) => toggleBookmark(e, art.id)}
                        disabled={bookmarkingId === art.id}
                        aria-label="Bookmark article"
                      >
                        <Bookmark size={16} fill={isBookmarked ? 'currentColor' : 'none'} />
                      </button>
                      <Link
                        to={`/articles/${art.slug || art.id}`}
                        className="article-read-link"
                        title="Read full article"
                      >
                        <ArrowRight size={16} />
                      </Link>
                    </div>
                  </div>
                </div>
              </article>
            );
          })}
        </div>
      )}

      {/* Pagination */}
      {pagination.totalPages > 1 && (
        <div className="knowledge-pagination">
          <button
            className="button button-outline button-small"
            disabled={currentPage <= 1}
            onClick={() => {
              const next = new URLSearchParams(searchParams);
              next.set('page', String(currentPage - 1));
              setSearchParams(next);
            }}
          >
            Previous
          </button>
          <span className="pagination-info">
            Page {pagination.page} of {pagination.totalPages}
          </span>
          <button
            className="button button-outline button-small"
            disabled={currentPage >= pagination.totalPages}
            onClick={() => {
              const next = new URLSearchParams(searchParams);
              next.set('page', String(currentPage + 1));
              setSearchParams(next);
            }}
          >
            Next
          </button>
        </div>
      )}
    </div>
  );
}
