import { useState, useEffect } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import {
  ArrowLeft,
  Clock,
  Eye,
  Bookmark,
  Share2,
  FileText,
  Video,
  Download,
  ExternalLink,
  Check,
  Edit3,
  Calendar,
  User,
  MapPin,
  Droplets,
  BookOpen,
} from 'lucide-react';
import { articleService } from '../services/articleService';
import { bookmarkService } from '../services/bookmarkService';
import { useAuth } from '../hooks/useAuth';

// Helper to render markdown-like wiki formatting cleanly into HTML elements
function WikiMarkdown({ content }) {
  if (!content) return null;

  const lines = content.split('\n');
  const elements = [];
  let inList = false;
  let listItems = [];
  let blockKey = 0;

  const flushList = () => {
    if (inList && listItems.length > 0) {
      elements.push(
        <ul key={`ul-${blockKey++}`} className="wiki-bullet-list">
          {listItems.map((item, idx) => (
            <li key={idx} dangerouslySetInnerHTML={{ __html: formatInline(item) }} />
          ))}
        </ul>
      );
      listItems = [];
      inList = false;
    }
  };

  const formatInline = (text) => {
    let formatted = text
      .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
      .replace(/\*(.*?)\*/g, '<em>$1</em>')
      .replace(/`([^`]+)`/g, '<code>$1</code>');
    return formatted;
  };

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i].trim();

    if (!line) {
      flushList();
      continue;
    }

    if (line.startsWith('## ')) {
      flushList();
      elements.push(
        <h2 key={`h2-${blockKey++}`} className="wiki-h2">
          {line.replace(/^##\s+/, '')}
        </h2>
      );
    } else if (line.startsWith('### ')) {
      flushList();
      elements.push(
        <h3 key={`h3-${blockKey++}`} className="wiki-h3">
          {line.replace(/^###\s+/, '')}
        </h3>
      );
    } else if (line.startsWith('---')) {
      flushList();
      elements.push(<hr key={`hr-${blockKey++}`} className="wiki-divider" />);
    } else if (line.startsWith('- ') || line.startsWith('* ')) {
      inList = true;
      listItems.push(line.replace(/^[-*]\s+/, ''));
    } else if (line.startsWith('> ')) {
      flushList();
      elements.push(
        <blockquote key={`bq-${blockKey++}`} className="wiki-quote">
          {line.replace(/^>\s+/, '')}
        </blockquote>
      );
    } else if (line.startsWith('$$') && line.endsWith('$$')) {
      flushList();
      elements.push(
        <div key={`math-${blockKey++}`} className="wiki-math-box">
          <code>{line.replace(/^\$\$/, '').replace(/\$\$$/, '')}</code>
        </div>
      );
    } else {
      flushList();
      elements.push(
        <p
          key={`p-${blockKey++}`}
          className="wiki-paragraph"
          dangerouslySetInnerHTML={{ __html: formatInline(line) }}
        />
      );
    }
  }

  flushList();
  return <div className="wiki-body">{elements}</div>;
}

export default function ArticleDetails() {
  const { slug } = useParams();
  const { user } = useAuth();
  const navigate = useNavigate();

  const [article, setArticle] = useState(null);
  const [relatedArticles, setRelatedArticles] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [isBookmarked, setIsBookmarked] = useState(false);
  const [bookmarkCount, setBookmarkCount] = useState(0);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    let active = true;
    setLoading(true);
    setError('');

    articleService
      .getBySlug(slug)
      .then((data) => {
        if (!active) return;
        if (!data || !data.article) {
          setError('Article not found.');
          return;
        }
        setArticle(data.article);
        setRelatedArticles(data.relatedArticles || []);
        setIsBookmarked(Boolean(data.article.isBookmarked));
        setBookmarkCount(data.article.bookmarksCount || 0);
      })
      .catch((err) => {
        if (active) setError(err.message || 'Article could not be loaded.');
      })
      .finally(() => {
        if (active) setLoading(false);
      });

    return () => {
      active = false;
    };
  }, [slug]);

  // Check user bookmark status directly
  useEffect(() => {
    if (!user || !article?.id) return;
    bookmarkService
      .list()
      .then((items) => {
        const found = items.some((b) => b.article?.id === article.id);
        setIsBookmarked(found);
      })
      .catch(() => {});
  }, [user, article?.id]);

  const toggleBookmark = async () => {
    if (!user) {
      navigate('/login');
      return;
    }
    try {
      if (isBookmarked) {
        await bookmarkService.remove(article.id);
        setIsBookmarked(false);
        setBookmarkCount((c) => Math.max(0, c - 1));
      } else {
        await bookmarkService.add(article.id);
        setIsBookmarked(true);
        setBookmarkCount((c) => c + 1);
      }
    } catch (err) {
      console.error('Bookmark toggle failed:', err);
    }
  };

  const handleCopyLink = () => {
    navigator.clipboard.writeText(window.location.href);
    setCopied(true);
    setTimeout(() => setCopied(false), 2500);
  };

  const isAuthorOrAdmin =
    user && (user.id === article?.author?.id || user.role === 'ADMIN');

  if (loading) {
    return (
      <div className="article-detail-loading">
        <Droplets size={32} className="spin-icon" />
        <p>Loading conservation article...</p>
      </div>
    );
  }

  if (error || !article) {
    return (
      <div className="knowledge-empty-state">
        <BookOpen size={48} className="empty-icon" />
        <h3>Article unavailable</h3>
        <p>{error || 'The requested article could not be located.'}</p>
        <Link to="/knowledge" className="button button-primary">
          <ArrowLeft size={16} /> Back to Knowledge Library
        </Link>
      </div>
    );
  }

  // Filter video resources
  const videoResources = (article.resources || []).filter(
    (r) => r.type === 'VIDEO'
  );
  const documentResources = (article.resources || []).filter(
    (r) => r.type !== 'VIDEO'
  );

  return (
    <div className="article-detail-page">
      {/* Breadcrumb Navigation */}
      <nav className="article-breadcrumbs" aria-label="Breadcrumb">
        <Link to="/knowledge" className="breadcrumb-link">
          Knowledge Library
        </Link>
        <span className="breadcrumb-sep">&gt;</span>
        <Link
          to={`/knowledge?category=${article.category?.slug || ''}`}
          className="breadcrumb-link"
        >
          {article.category?.name || 'Category'}
        </Link>
        <span className="breadcrumb-sep">&gt;</span>
        <span className="breadcrumb-current">{article.title}</span>
      </nav>

      {/* Header section */}
      <header className="article-header">
        <div className="article-category-row">
          <span className="category-pill">{article.category?.name}</span>
          {article.status !== 'PUBLISHED' && (
            <span className={`status-pill status-${article.status.toLowerCase()}`}>
              {article.status.replace('_', ' ')}
            </span>
          )}
          {isAuthorOrAdmin && (
            <Link
              to={`/articles/edit/${article.id}`}
              className="button button-outline button-small edit-article-btn"
            >
              <Edit3 size={14} /> Edit Article
            </Link>
          )}
        </div>

        <h1 className="article-detail-title">{article.title}</h1>
        <p className="article-detail-summary">{article.summary}</p>

        {/* Metadata Bar */}
        <div className="article-meta-bar">
          <div className="article-author-meta">
            <span className="avatar avatar-small">
              {(article.author?.name || 'Author')
                .split(' ')
                .map((x) => x[0])
                .join('')
                .slice(0, 2)
                .toUpperCase()}
            </span>
            <div className="author-text">
              <span className="author-name">{article.author?.name}</span>
              {article.author?.location && (
                <span className="author-location">
                  <MapPin size={11} /> {article.author.location}
                </span>
              )}
            </div>
          </div>

          <div className="article-info-chips">
            <span className="info-chip">
              <Calendar size={13} />
              {new Date(article.publishedAt || article.createdAt).toLocaleDateString(
                'en-US',
                { month: 'short', day: 'numeric', year: 'numeric' }
              )}
            </span>
            <span className="info-chip">
              <Clock size={13} /> {article.readTime || '5 min read'}
            </span>
            <span className="info-chip">
              <Eye size={13} /> {article.viewsCount} views
            </span>
          </div>

          <div className="article-actions-bar">
            <button
              className={`button button-small ${isBookmarked ? 'button-primary' : 'button-outline'}`}
              onClick={toggleBookmark}
              title={isBookmarked ? 'Remove bookmark' : 'Save article'}
            >
              <Bookmark size={15} fill={isBookmarked ? 'currentColor' : 'none'} />
              <span>{isBookmarked ? 'Saved' : 'Save'}</span>
              {bookmarkCount > 0 && <span className="action-counter">({bookmarkCount})</span>}
            </button>

            <button
              className="button button-outline button-small share-btn"
              onClick={handleCopyLink}
              title="Copy article link"
            >
              {copied ? <Check size={15} color="#176b4a" /> : <Share2 size={15} />}
              <span>{copied ? 'Copied Link!' : 'Share'}</span>
            </button>
          </div>
        </div>
      </header>

      {/* Cover Image */}
      {article.coverImage && (
        <div className="article-detail-cover">
          <img src={article.coverImage} alt={article.title} className="cover-img-full" />
        </div>
      )}

      {/* Main Content Layout */}
      <div className="article-layout-grid">
        {/* Article Body */}
        <main className="article-main-content">
          <WikiMarkdown content={article.content} />

          {/* Embedded Video Tutorials */}
          {videoResources.length > 0 && (
            <section className="article-video-section">
              <h3 className="section-subheading">
                <Video size={18} /> Field Demonstrations & Video Tutorials
              </h3>
              <div className="video-cards-list">
                {videoResources.map((vid) => (
                  <div key={vid.id} className="video-card">
                    <div className="video-info">
                      <span className="video-tag">VIDEO GUIDE</span>
                      <h4>{vid.title}</h4>
                      <a
                        href={vid.url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="button button-primary button-small"
                      >
                        <Video size={14} /> Watch Tutorial <ExternalLink size={12} />
                      </a>
                    </div>
                  </div>
                ))}
              </div>
            </section>
          )}

          {/* Downloadable Resources & Technical References */}
          {documentResources.length > 0 && (
            <section className="article-resources-section">
              <h3 className="section-subheading">
                <FileText size={18} /> Technical Guidelines & Datasets
              </h3>
              <div className="resources-list">
                {documentResources.map((res) => (
                  <div key={res.id} className="resource-item">
                    <div className="resource-icon">
                      <FileText size={20} />
                    </div>
                    <div className="resource-details">
                      <span className="resource-type-badge">{res.type}</span>
                      <h4>{res.title}</h4>
                    </div>
                    <a
                      href={res.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="button button-outline button-small"
                      download
                    >
                      {res.type === 'PDF' ? <Download size={14} /> : <ExternalLink size={14} />}
                      <span>{res.type === 'PDF' ? 'Download PDF' : 'Open Resource'}</span>
                    </a>
                  </div>
                ))}
              </div>
            </section>
          )}

          {/* Author Profile Bio Card */}
          {article.author && (
            <div className="article-author-card">
              <span className="avatar avatar-large">
                {(article.author.name || 'Author')
                  .split(' ')
                  .map((x) => x[0])
                  .join('')
                  .slice(0, 2)
                  .toUpperCase()}
              </span>
              <div className="author-card-content">
                <span className="author-card-eyebrow">CONTRIBUTED BY</span>
                <h3>{article.author.name}</h3>
                {article.author.bio && <p>{article.author.bio}</p>}
                {article.author.location && (
                  <div className="author-card-location">
                    <MapPin size={13} /> {article.author.location}
                  </div>
                )}
              </div>
            </div>
          )}
        </main>

        {/* Sidebar */}
        <aside className="article-sidebar">
          {/* Quick Table of Contents / Summary box */}
          <div className="sidebar-card toc-card">
            <h4>Article Overview</h4>
            <div className="toc-metrics">
              <div className="toc-metric">
                <Clock size={16} />
                <div>
                  <strong>{article.readTime || '5 min'}</strong>
                  <span>Reading time</span>
                </div>
              </div>
              <div className="toc-metric">
                <Droplets size={16} />
                <div>
                  <strong>{article.category?.name}</strong>
                  <span>Domain</span>
                </div>
              </div>
              <div className="toc-metric">
                <FileText size={16} />
                <div>
                  <strong>{(article.resources || []).length} items</strong>
                  <span>Attached resources</span>
                </div>
              </div>
            </div>
          </div>

          {/* Related Articles */}
          {relatedArticles.length > 0 && (
            <div className="sidebar-card related-card">
              <h4>Related Conservation Guides</h4>
              <div className="related-articles-list">
                {relatedArticles.map((rel) => (
                  <Link
                    key={rel.id}
                    to={`/articles/${rel.slug || rel.id}`}
                    className="related-article-item"
                  >
                    <div className="related-img-thumb">
                      {rel.coverImage ? (
                        <img src={rel.coverImage} alt={rel.title} />
                      ) : (
                        <Droplets size={18} />
                      )}
                    </div>
                    <div className="related-text">
                      <h5>{rel.title}</h5>
                      <span className="related-read-time">{rel.readTime || '5 min read'}</span>
                    </div>
                  </Link>
                ))}
              </div>
            </div>
          )}

          {/* Call to Contribute */}
          <div className="sidebar-card contribute-card">
            <Droplets size={26} className="contribute-icon" />
            <h4>Have a technique to share?</h4>
            <p>
              Publish your water-efficient techniques, case studies, or irrigation schedules
              to help communities overcome water stress.
            </p>
            <Link to="/articles/submit" className="button button-primary button-small button-wide">
              Submit an Article
            </Link>
          </div>
        </aside>
      </div>
    </div>
  );
}
