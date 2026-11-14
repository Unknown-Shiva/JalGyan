import { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import {
  FileText,
  Plus,
  Trash2,
  Eye,
  Edit3,
  CheckCircle2,
  AlertCircle,
  ArrowLeft,
  Upload,
  Droplets,
  HelpCircle,
} from 'lucide-react';
import { articleService } from '../services/articleService';
import { categoryService } from '../services/categoryService';
import { useAuth } from '../hooks/useAuth';

export default function SubmitArticle() {
  const { user } = useAuth();
  const navigate = useNavigate();

  const [categories, setCategories] = useState([]);
  const [loadingCategories, setLoadingCategories] = useState(true);

  // Form State
  const [title, setTitle] = useState('');
  const [categoryId, setCategoryId] = useState('');
  const [summary, setSummary] = useState('');
  const [content, setContent] = useState('');
  const [coverImage, setCoverImage] = useState('');
  const [readTime, setReadTime] = useState('');
  const [resources, setResources] = useState([]);

  // Active Editor Tab: 'write' | 'preview'
  const [activeTab, setActiveTab] = useState('write');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [successMessage, setSuccessMessage] = useState('');

  // Auto-calculate read time based on word count
  useEffect(() => {
    const words = content.trim().split(/\s+/).filter(Boolean).length;
    const mins = Math.max(1, Math.ceil(words / 200));
    setReadTime(`${mins} min read`);
  }, [content]);

  // Load categories
  useEffect(() => {
    categoryService
      .list()
      .then((cats) => {
        setCategories(cats || []);
        if (cats && cats.length > 0) {
          setCategoryId(cats[0].id);
        }
      })
      .catch((err) => console.error('Failed to load categories', err))
      .finally(() => setLoadingCategories(false));
  }, []);

  // Resource handlers
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

  // Form submission
  const handleSubmit = async (targetStatus) => {
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

    // Clean resources
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
        status: targetStatus,
        resources: validResources,
      };

      const res = await articleService.create(payload);
      setSuccessMessage(
        targetStatus === 'DRAFT'
          ? 'Draft saved successfully!'
          : 'Article submitted successfully! It has been placed in the editorial review queue.'
      );

      setTimeout(() => {
        if (targetStatus === 'DRAFT') {
          navigate('/my-articles?tab=DRAFT');
        } else {
          navigate('/my-articles?tab=PENDING_REVIEW');
        }
      }, 1500);
    } catch (err) {
      setError(err.message || 'Failed to submit article. Please verify inputs.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="submit-article-page">
      <div className="form-header-row">
        <Link to="/knowledge" className="back-link">
          <ArrowLeft size={16} /> Back to Library
        </Link>
        <span className="eyebrow">MODULE A &bull; CONTRIBUTOR WORKSPACE</span>
      </div>

      <div className="form-title-area">
        <h1>Contribute Water Conservation Article</h1>
        <p>
          Share scientific methodologies, agricultural irrigation techniques, or urban rainwater
          case studies with the JalGyan community.
        </p>
      </div>

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
          <label htmlFor="article-title">
            Article Title <span className="req">*</span>
          </label>
          <input
            id="article-title"
            type="text"
            placeholder="e.g. Subsurface Drip Irrigation for Cotton in Black Cotton Soils"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            className="form-input"
            maxLength={150}
          />
          <span className="field-hint">Between 8 and 150 characters ({title.length}/150)</span>
        </div>

        {/* Category & Read Time Row */}
        <div className="form-row-2">
          <div className="form-group">
            <label htmlFor="article-category">
              Domain Category <span className="req">*</span>
            </label>
            <select
              id="article-category"
              value={categoryId}
              onChange={(e) => setCategoryId(e.target.value)}
              className="form-select"
              disabled={loadingCategories}
            >
              {categories.map((cat) => (
                <option key={cat.id} value={cat.id}>
                  {cat.name}
                </option>
              ))}
            </select>
          </div>

          <div className="form-group">
            <label htmlFor="article-read-time">Estimated Read Time</label>
            <input
              id="article-read-time"
              type="text"
              value={readTime}
              onChange={(e) => setReadTime(e.target.value)}
              className="form-input"
              placeholder="e.g. 7 min read"
            />
          </div>
        </div>

        {/* Summary */}
        <div className="form-group">
          <label htmlFor="article-summary">
            Summary / Executive Abstract <span className="req">*</span>
          </label>
          <textarea
            id="article-summary"
            rows={3}
            placeholder="A concise 2-3 sentence overview highlighting the water conservation technique and quantified benefits..."
            value={summary}
            onChange={(e) => setSummary(e.target.value)}
            className="form-textarea"
            maxLength={500}
          />
          <span className="field-hint">Between 20 and 500 characters ({summary.length}/500)</span>
        </div>

        {/* Cover Image URL */}
        <div className="form-group">
          <label htmlFor="article-cover">Cover Image URL (Optional)</label>
          <input
            id="article-cover"
            type="url"
            placeholder="https://images.unsplash.com/photo-..."
            value={coverImage}
            onChange={(e) => setCoverImage(e.target.value)}
            className="form-input"
          />
          {coverImage && (
            <div className="cover-preview">
              <img
                src={coverImage}
                alt="Cover Preview"
                onError={(e) => {
                  e.target.style.display = 'none';
                }}
              />
            </div>
          )}
        </div>

        {/* Markdown Editor Tabs */}
        <div className="form-group">
          <div className="editor-tab-header">
            <label>
              Full Article Body (Markdown supported) <span className="req">*</span>
            </label>
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
            <>
              <textarea
                rows={14}
                placeholder="Write your article using Markdown headers (## Heading), bullet lists (- item), quotes (> citation), and math ($$ formula $$)..."
                value={content}
                onChange={(e) => setContent(e.target.value)}
                className="form-textarea code-font"
              />
              <div className="markdown-cheatsheet">
                <span>Markdown hints:</span>
                <code>## Section Title</code>
                <code>### Subsection</code>
                <code>**bold text**</code>
                <code>- List item</code>
                <code>&gt; Quote / Callout</code>
              </div>
            </>
          ) : (
            <div className="editor-live-preview">
              {content ? (
                <div className="wiki-body-preview">
                  {content.split('\n\n').map((para, i) => (
                    <p key={i}>{para}</p>
                  ))}
                </div>
              ) : (
                <div className="preview-empty">Write some content to see live preview...</div>
              )}
            </div>
          )}
        </div>

        {/* Dynamic Resource Builder */}
        <div className="form-group resources-builder-section">
          <div className="resources-builder-header">
            <div>
              <label>Attached Resources & Educational Media</label>
              <p className="field-hint">
                Attach technical manuals, videos, spreadsheets, or government guidelines to accompany your article.
              </p>
            </div>
            <button
              type="button"
              className="button button-outline button-small"
              onClick={handleAddResource}
            >
              <Plus size={14} /> Add Resource
            </button>
          </div>

          {resources.length === 0 ? (
            <div className="no-resources-hint">
              No resources attached yet. Click "+ Add Resource" to include PDFs, research links, or video tutorials.
            </div>
          ) : (
            <div className="resources-form-list">
              {resources.map((res, index) => (
                <div key={res.id || index} className="resource-form-row">
                  <div className="res-input-title">
                    <input
                      type="text"
                      placeholder="Resource Title (e.g. Drip Layout Schematic PDF)"
                      value={res.title}
                      onChange={(e) => handleUpdateResource(index, 'title', e.target.value)}
                      className="form-input"
                    />
                  </div>
                  <div className="res-input-url">
                    <input
                      type="url"
                      placeholder="https://example.com/manual.pdf or YouTube link"
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
          )}
        </div>

        {/* Action Buttons */}
        <div className="form-actions-footer">
          <button
            type="button"
            className="button button-outline"
            disabled={submitting}
            onClick={() => handleSubmit('DRAFT')}
          >
            Save as Draft
          </button>
          <button
            type="button"
            className="button button-primary"
            disabled={submitting}
            onClick={() => handleSubmit('PENDING_REVIEW')}
          >
            {submitting ? 'Submitting...' : 'Submit for Review'}
          </button>
        </div>
      </div>
    </div>
  );
}
