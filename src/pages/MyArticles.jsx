import { useState, useEffect } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import {
  FileText,
  Clock,
  Eye,
  CheckCircle2,
  AlertTriangle,
  Edit3,
  Trash2,
  PlusCircle,
  Send,
  Droplets,
  Bookmark,
  ArrowRight,
  ExternalLink,
} from 'lucide-react';
import { articleService } from '../services/articleService';
import { useAuth } from '../hooks/useAuth';

export default function MyArticles() {
  const { user } = useAuth();
  const [searchParams, setSearchParams] = useSearchParams();

  const [articles, setArticles] = useState([]);
  const [stats, setStats] = useState({
    total: 0,
    published: 0,
    pending: 0,
    drafts: 0,
    rejected: 0,
    totalViews: 0,
  });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [actionInProgress, setActionInProgress] = useState(null);

  const activeTab = searchParams.get('tab') || 'ALL';

  const loadData = () => {
    setLoading(true);
    setError('');
    articleService
      .getMyArticles()
      .then((data) => {
        setArticles(data.articles || []);
        if (data.stats) setStats(data.stats);
      })
      .catch((err) => {
        console.error(err);
        setError('Could not load your articles. Please try again.');
      })
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    loadData();
  }, []);

  const handleTabChange = (tab) => {
    const next = new URLSearchParams(searchParams);
    if (tab === 'ALL') {
      next.delete('tab');
    } else {
      next.set('tab', tab);
    }
    setSearchParams(next);
  };

  const handleQuickSubmit = async (articleId) => {
    setActionInProgress(articleId);
    try {
      await articleService.submitForReview(articleId);
      loadData();
    } catch (err) {
      alert(err.message || 'Failed to submit article for review.');
    } finally {
      setActionInProgress(null);
    }
  };

  const handleDelete = async (articleId, title) => {
    if (!window.confirm(`Are you sure you want to delete "${title}"?`)) return;

    setActionInProgress(articleId);
    try {
      await articleService.delete(articleId);
      setArticles((prev) => prev.filter((a) => a.id !== articleId));
      setStats((prev) => ({
        ...prev,
        total: Math.max(0, prev.total - 1),
      }));
    } catch (err) {
      alert(err.message || 'Failed to delete article.');
    } finally {
      setActionInProgress(null);
    }
  };

  // Filter articles based on active tab
  const filteredArticles = articles.filter((art) => {
    if (activeTab === 'ALL') return true;
    return art.status === activeTab;
  });

  return (
    <div className="my-articles-page">
      {/* Header */}
      <div className="my-articles-header">
        <div>
          <span className="eyebrow">MODULE A &bull; AUTHOR DASHBOARD</span>
          <h1>My Water Conservation Articles</h1>
          <p>
            Track your submissions, review status from hydrologists, and manage technical guides.
          </p>
        </div>
        <Link to="/articles/submit" className="button button-primary">
          <PlusCircle size={16} /> New Article
        </Link>
      </div>

      {/* Metrics Bar */}
      <div className="author-stats-grid">
        <div className="author-stat-card">
          <FileText size={20} className="stat-card-icon" />
          <div className="stat-number">{stats.total}</div>
          <div className="stat-desc">Total Articles</div>
        </div>
        <div className="author-stat-card stat-published">
          <CheckCircle2 size={20} className="stat-card-icon" />
          <div className="stat-number">{stats.published}</div>
          <div className="stat-desc">Published & Live</div>
        </div>
        <div className="author-stat-card stat-pending">
          <Clock size={20} className="stat-card-icon" />
          <div className="stat-number">{stats.pending}</div>
          <div className="stat-desc">Pending Review</div>
        </div>
        <div className="author-stat-card stat-draft">
          <Edit3 size={20} className="stat-card-icon" />
          <div className="stat-number">{stats.drafts}</div>
          <div className="stat-desc">Drafts</div>
        </div>
        <div className="author-stat-card stat-rejected">
          <AlertTriangle size={20} className="stat-card-icon" />
          <div className="stat-number">{stats.rejected}</div>
          <div className="stat-desc">Changes Needed</div>
        </div>
        <div className="author-stat-card stat-views">
          <Eye size={20} className="stat-card-icon" />
          <div className="stat-number">{stats.totalViews}</div>
          <div className="stat-desc">Total Reads</div>
        </div>
      </div>

      {/* Filter Tabs */}
      <div className="my-articles-tabs">
        <button
          className={`tab-item ${activeTab === 'ALL' ? 'active' : ''}`}
          onClick={() => handleTabChange('ALL')}
        >
          All ({stats.total})
        </button>
        <button
          className={`tab-item ${activeTab === 'PUBLISHED' ? 'active' : ''}`}
          onClick={() => handleTabChange('PUBLISHED')}
        >
          Published ({stats.published})
        </button>
        <button
          className={`tab-item ${activeTab === 'PENDING_REVIEW' ? 'active' : ''}`}
          onClick={() => handleTabChange('PENDING_REVIEW')}
        >
          Under Review ({stats.pending})
        </button>
        <button
          className={`tab-item ${activeTab === 'DRAFT' ? 'active' : ''}`}
          onClick={() => handleTabChange('DRAFT')}
        >
          Drafts ({stats.drafts})
        </button>
        <button
          className={`tab-item ${activeTab === 'REJECTED' ? 'active' : ''}`}
          onClick={() => handleTabChange('REJECTED')}
        >
          Changes Requested ({stats.rejected})
        </button>
      </div>

      {/* Articles List */}
      {loading ? (
        <div className="knowledge-loading">
          <Droplets size={28} className="spin-icon" />
          <p>Loading your articles...</p>
        </div>
      ) : error ? (
        <div className="alert-error" role="alert">
          {error}
        </div>
      ) : filteredArticles.length === 0 ? (
        <div className="knowledge-empty-state">
          <FileText size={48} className="empty-icon" />
          <h3>No articles in this section</h3>
          <p>
            {activeTab === 'ALL'
              ? "You haven't written any water conservation articles yet."
              : `You have no articles currently matching the "${activeTab.toLowerCase().replace('_', ' ')}" status.`}
          </p>
          <Link to="/articles/submit" className="button button-primary">
            <PlusCircle size={16} /> Write Your First Article
          </Link>
        </div>
      ) : (
        <div className="my-articles-list">
          {filteredArticles.map((art) => {
            const isBusy = actionInProgress === art.id;

            return (
              <div key={art.id} className="author-article-row">
                <div className="row-main">
                  <div className="row-tags">
                    <span className={`status-pill status-${art.status.toLowerCase()}`}>
                      {art.status === 'PENDING_REVIEW'
                        ? 'Under Review'
                        : art.status === 'PUBLISHED'
                        ? 'Published'
                        : art.status === 'REJECTED'
                        ? 'Changes Requested'
                        : 'Draft'}
                    </span>
                    <span className="row-category-pill">{art.category?.name}</span>
                    <span className="row-date">
                      Updated {new Date(art.updatedAt || art.createdAt).toLocaleDateString()}
                    </span>
                  </div>

                  <h3 className="row-title">
                    {art.status === 'PUBLISHED' ? (
                      <Link to={`/articles/${art.slug || art.id}`}>{art.title}</Link>
                    ) : (
                      art.title
                    )}
                  </h3>

                  <p className="row-summary">{art.summary}</p>

                  {/* Feedback Box for Rejected Articles */}
                  {art.status === 'REJECTED' && (art.rejectionReason || art.latestFeedback) && (
                    <div className="row-rejection-callout">
                      <div className="callout-header">
                        <AlertTriangle size={15} />
                        <strong>Reviewer Feedback:</strong>
                      </div>
                      <p>{art.rejectionReason || art.latestFeedback}</p>
                    </div>
                  )}

                  <div className="row-meta">
                    <span className="meta-item">
                      <Clock size={13} /> {art.readTime || '5 min read'}
                    </span>
                    <span className="meta-item">
                      <Eye size={13} /> {art.viewsCount || 0} views
                    </span>
                    <span className="meta-item">
                      <FileText size={13} /> {(art.resources || []).length} resources
                    </span>
                  </div>
                </div>

                {/* Row Action Buttons */}
                <div className="row-actions">
                  {art.status === 'PUBLISHED' && (
                    <Link
                      to={`/articles/${art.slug || art.id}`}
                      className="button button-outline button-small"
                    >
                      <Eye size={14} /> View Live
                    </Link>
                  )}

                  {(art.status === 'DRAFT' || art.status === 'REJECTED') && (
                    <button
                      className="button button-primary button-small"
                      onClick={() => handleQuickSubmit(art.id)}
                      disabled={isBusy}
                    >
                      <Send size={14} /> Submit for Review
                    </button>
                  )}

                  <Link
                    to={`/articles/edit/${art.id}`}
                    className="button button-outline button-small"
                  >
                    <Edit3 size={14} /> Edit
                  </Link>

                  <button
                    className="icon-button delete-btn"
                    onClick={() => handleDelete(art.id, art.title)}
                    disabled={isBusy}
                    title="Delete article"
                    aria-label={`Delete ${art.title}`}
                  >
                    <Trash2 size={16} />
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
