import { useState, useEffect } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import {
  FileText,
  Plus,
  Trash2,
  Eye,
  Edit3,
  CheckCircle2,
  AlertCircle,
  ArrowLeft,
  Droplets,
  AlertTriangle,
} from 'lucide-react';
import { articleService } from '../services/articleService';
import { categoryService } from '../services/categoryService';
import { useAuth } from '../hooks/useAuth';

export default function EditArticle() {
  const { id } = useParams();
  const { user } = useAuth();
  const navigate = useNavigate();

  const [categories, setCategories] = useState([]);
  const [loading, setLoading] = useState(true);
  const [originalArticle, setOriginalArticle] = useState(null);

  // Form State
  const [title, setTitle] = useState('');
  const [categoryId, setCategoryId] = useState('');
  const [summary, setSummary] = useState('');
  const [content, setContent] = useState('');
  const [coverImage, setCoverImage] = useState('');
  const [readTime, setReadTime] = useState('');
  const [resources, setResources] = useState([]);
  const [status, setStatus] = useState('');
  const [rejectionReason, setRejectionReason] = useState('');

  const [activeTab, setActiveTab] = useState('write');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [successMessage, setSuccessMessage] = useState('');

  // Load article and categories
  useEffect(() => {
    let active = true;
    setLoading(true);

    Promise.all([categoryService.list(), articleService.getBySlug(id)])
      .then(([cats, artData]) => {
        if (!active) return;
        setCategories(cats || []);

        const art = artData?.article;
        if (!art) {
          setError('Article not found.');
          return;
        }

        // Authorization check
        if (user && art.author?.id && art.author.id !== user.id && user.role !== 'ADMIN') {
          setError('You do not have permission to edit this article.');
          return;
        }

        setOriginalArticle(art);
        setTitle(art.title || '');
        setCategoryId(art.category?.id || (cats[0] ? cats[0].id : ''));
        setSummary(art.summary || '');
        setContent(art.content || '');
        setCoverImage(art.coverImage || '');
        setReadTime(art.readTime || '');
        setStatus(art.status || 'DRAFT');
        setRejectionReason(art.rejectionReason || '');
        setResources(
          (art.resources || []).map((r) => ({
            id: r.id,
            title: r.title,
            url: r.url,
            type: r.type,
          }))
        );
      })
      .catch((err) => {
        if (active) setError(err.message || 'Failed to load article details.');
      })
      .finally(() => {
        if (active) setLoading(false);
      });

    return () => {
      active = false;
    };
  }, [id, user]);

  const handleAddResource = () => {
    setResources((prev) => [
      ...prev,
      { id: `res_${Date.now()}`, title: '', url: '', type: 'PDF' },
    ]);
  };

  const handleUpdateResource = (index, field, value) => {
    setResources((prev) => {
      const next = [...prev];
      next[index] = { ...next[index], [field]: value };
      return next;
    });
  };

  const handleRemoveResource = (index) => {
    setResources((prev) => prev.filter((_, i) => i !== index));
  };

  const handleSubmit = async (submitForReview = false) => {
    setError('');
    setSuccessMessage('');

    if (!title.trim() || title.trim().length < 8) {
      setError('Title must be at least 8 characters long.');
      return;
    }
    if (!categoryId) {
      setError('Please select a water conservation category.');
      return;
    }
    if (!summary.trim() || summary.trim().length < 20) {
      setError('Summary must be at least 20 characters long.');
      return;
    }
    if (!content.trim() || content.trim().length < 50) {
      setError('Article content must be at least 50 characters long.');
      return;
    }

    const validResources = resources
      .filter((r) => r.title.trim() && r.url.trim())
      .map((r) => ({
        title: r.title.trim(),
        url: r.url.trim(),
        type: r.type || 'LINK',
      }));

    setSubmitting(true);
    try {
      const payload = {
        title: title.trim(),
        categoryId,
        summary: summary.trim(),
        content: content.trim(),
        coverImage: coverImage.trim() || null,
        readTime: readTime || '5 min read',
        submitForReview,
        status: submitForReview ? 'PENDING_REVIEW' : status,
        resources: validResources,
      };

      await articleService.update(originalArticle.id, payload);
      setSuccessMessage(
        submitForReview
          ? 'Article updated and resubmitted for editorial review!'
          : 'Article changes saved successfully!'
      );

      setTimeout(() => {
        navigate('/my-articles');
      }, 1500);
    } catch (err) {
      setError(err.message || 'Failed to update article.');
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className="article-detail-loading">
        <Droplets size={32} className="spin-icon" />
        <p>Loading article editor...</p>
      </div>
    );
  }

  if (error && !originalArticle) {
    return (
      <div className="knowledge-empty-state">
        <AlertCircle size={48} className="empty-icon" color="#b14e44" />
        <h3>Cannot edit article</h3>
        <p>{error}</p>
        <Link to="/knowledge" className="button button-primary">
          <ArrowLeft size={16} /> Return to Library
        </Link>
      </div>
    );
  }

  return (
    <div className="submit-article-page">
      <div className="form-header-row">
        <Link to="/my-articles" className="back-link">
          <ArrowLeft size={16} /> Back to My Articles
        </Link>
        <span className="eyebrow">EDITING ARTICLE &bull; ID: {originalArticle?.id}</span>
      </div>

      <div className="form-title-area">
        <h1>Edit Article</h1>
        <p>Refine your article content, update attached resources, or address reviewer feedback.</p>
      </div>

      {/* Review Feedback Alert if REJECTED */}
      {status === 'REJECTED' && rejectionReason && (
        <div className="rejection-feedback-card">
          <div className="feedback-icon">
            <AlertTriangle size={22} />
          </div>
          <div className="feedback-content">
            <h4>Editorial Feedback from Reviewer</h4>
            <p>{rejectionReason}</p>
            <span className="feedback-tip">
              Please address the points above and click "Save & Resubmit for Review" below.
            </span>
          </div>
        </div>
      )}

      {error && (
        <div className="alert-error" role="alert">
          <AlertCircle size={16} /> {error}
        </div>
      )}

      {successMessage && (
        <div className="alert-success" role="status">
          <CheckCircle2 size={16} /> {successMessage}
        </div>
      )}

      <div className="submit-form-card">
        {/* Title */}
        <div className="form-group">
          <label htmlFor="edit-title">Article Title</label>
          <input
            id="edit-title"
            type="text"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            className="form-input"
            maxLength={150}
          />
        </div>

        {/* Category & Read Time Row */}
        <div className="form-row-2">
          <div className="form-group">
            <label htmlFor="edit-category">Domain Category</label>
            <select
              id="edit-category"
              value={categoryId}
              onChange={(e) => setCategoryId(e.target.value)}
              className="form-select"
            >
              {categories.map((cat) => (
                <option key={cat.id} value={cat.id}>
                  {cat.name}
                </option>
              ))}
            </select>
          </div>

          <div className="form-group">
            <label htmlFor="edit-read-time">Estimated Read Time</label>
            <input
              id="edit-read-time"
              type="text"
              value={readTime}
              onChange={(e) => setReadTime(e.target.value)}
              className="form-input"
            />
          </div>
        </div>

        {/* Summary */}
        <div className="form-group">
          <label htmlFor="edit-summary">Summary / Executive Abstract</label>
          <textarea
            id="edit-summary"
            rows={3}
            value={summary}
            onChange={(e) => setSummary(e.target.value)}
            className="form-textarea"
            maxLength={500}
          />
        </div>

        {/* Cover Image URL */}
        <div className="form-group">
          <label htmlFor="edit-cover">Cover Image URL</label>
          <input
            id="edit-cover"
            type="url"
            value={coverImage}
            onChange={(e) => setCoverImage(e.target.value)}
            className="form-input"
          />
          {coverImage && (
            <div className="cover-preview">
              <img src={coverImage} alt="Cover Preview" />
            </div>
          )}
        </div>

        {/* Markdown Content */}
        <div className="form-group">
          <div className="editor-tab-header">
            <label>Full Article Body</label>
            <div className="tab-buttons">
              <button
                type="button"
                className={`tab-btn ${activeTab === 'write' ? 'active' : ''}`}
                onClick={() => setActiveTab('write')}
              >
                <Edit3 size={14} /> Write
              </button>
              <button
                type="button"
                className={`tab-btn ${activeTab === 'preview' ? 'active' : ''}`}
                onClick={() => setActiveTab('preview')}
              >
                <Eye size={14} /> Live Preview
              </button>
            </div>
          </div>

          {activeTab === 'write' ? (
            <textarea
              rows={14}
              value={content}
              onChange={(e) => setContent(e.target.value)}
              className="form-textarea code-font"
            />
          ) : (
            <div className="editor-live-preview">
              <div className="wiki-body-preview">
                {content.split('\n\n').map((para, i) => (
                  <p key={i}>{para}</p>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Resources */}
        <div className="form-group resources-builder-section">
          <div className="resources-builder-header">
            <div>
              <label>Attached Resources</label>
              <p className="field-hint">Manage technical PDFs, video URLs, and research data.</p>
            </div>
            <button
              type="button"
              className="button button-outline button-small"
              onClick={handleAddResource}
            >
              <Plus size={14} /> Add Resource
            </button>
          </div>

          <div className="resources-form-list">
            {resources.map((res, index) => (
              <div key={res.id || index} className="resource-form-row">
                <div className="res-input-title">
                  <input
                    type="text"
                    placeholder="Resource Title"
                    value={res.title}
                    onChange={(e) => handleUpdateResource(index, 'title', e.target.value)}
                    className="form-input"
                  />
                </div>
                <div className="res-input-url">
                  <input
                    type="url"
                    placeholder="https://..."
                    value={res.url}
                    onChange={(e) => handleUpdateResource(index, 'url', e.target.value)}
                    className="form-input"
                  />
                </div>
                <div className="res-input-type">
                  <select
                    value={res.type}
                    onChange={(e) => handleUpdateResource(index, 'type', e.target.value)}
                    className="form-select"
                  >
                    <option value="PDF">PDF Document</option>
                    <option value="VIDEO">Video Tutorial</option>
                    <option value="DATASET">Dataset / Sheet</option>
                    <option value="LINK">External Link</option>
                  </select>
                </div>
                <button
                  type="button"
                  className="icon-button delete-res-btn"
                  onClick={() => handleRemoveResource(index)}
                  title="Remove resource"
                >
                  <Trash2 size={16} />
                </button>
              </div>
            ))}
          </div>
        </div>

        {/* Action Buttons */}
        <div className="form-actions-footer">
          <button
            type="button"
            className="button button-outline"
            disabled={submitting}
            onClick={() => handleSubmit(false)}
          >
            Save Changes
          </button>
          <button
            type="button"
            className="button button-primary"
            disabled={submitting}
            onClick={() => handleSubmit(true)}
          >
            {submitting ? 'Saving...' : 'Save & Submit for Review'}
          </button>
        </div>
      </div>
    </div>
  );
}
