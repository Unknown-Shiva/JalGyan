import { useTranslation } from 'react-i18next';
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
  const { t } = useTranslation();
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
          setError(t('errors.articleMissing'));
          return;
        }

        // Authorization check
        if (user && art.author?.id && art.author.id !== user.id && user.role !== 'ADMIN') {
          setError(t('errors.articlePermission'));
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
        if (active) setError(err.message || t('errors.articleLoad'));
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
      setError(t('errors.articleTitle'));
      return;
    }
    if (!categoryId) {
      setError(t('errors.articleCategory'));
      return;
    }
    if (!summary.trim() || summary.trim().length < 20) {
      setError(t('errors.articleSummary'));
      return;
    }
    if (!content.trim() || content.trim().length < 50) {
      setError(t('errors.articleContent'));
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
      setError(err.message || t('errors.articleUpdate'));
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className="article-detail-loading">
        <Droplets size={32} className="spin-icon" />
        <p>{t('ui.k233')}</p>
      </div>
    );
  }

  if (error && !originalArticle) {
    return (
      <div className="knowledge-empty-state">
        <AlertCircle size={48} className="empty-icon" color="#b14e44" />
        <h3>{t('ui.k107')}</h3>
        <p>{error}</p>
        <Link to="/knowledge" className="button button-primary">
          <ArrowLeft size={16} />{t('ui.k354')}</Link>
      </div>
    );
  }

  return (
    <div className="submit-article-page">
      <div className="form-header-row">
        <Link to="/my-articles" className="back-link">
          <ArrowLeft size={16} />{t('ui.k091')}</Link>
        <span className="eyebrow">{t('ui.k159')}{' '}{originalArticle?.id}</span>
      </div>

      <div className="form-title-area">
        <h1>{t('ui.k162')}</h1>
        <p>{t('ui.k326')}</p>
      </div>

      {/* Review Feedback Alert if REJECTED */}
      {status === 'REJECTED' && rejectionReason && (
        <div className="rejection-feedback-card">
          <div className="feedback-icon">
            <AlertTriangle size={22} />
          </div>
          <div className="feedback-content">
            <h4>{t('ui.k163')}</h4>
            <p>{rejectionReason}</p>
            <span className="feedback-tip">{t('ui.k299')}</span>
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
          <label htmlFor="edit-title">{t('ui.k072')}</label>
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
            <label htmlFor="edit-category">{t('ui.k150')}</label>
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
            <label htmlFor="edit-read-time">{t('ui.k171')}</label>
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
          <label htmlFor="edit-summary">{t('ui.k399')}</label>
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
          <label htmlFor="edit-cover">{t('ui.k129')}</label>
          <input
            id="edit-cover"
            type="url"
            value={coverImage}
            onChange={(e) => setCoverImage(e.target.value)}
            className="form-input"
          />
          {coverImage && (
            <div className="cover-preview">
              <img src={coverImage} alt={t('ui.a019')} />
            </div>
          )}
        </div>

        {/* Markdown Content */}
        <div className="form-group">
          <div className="editor-tab-header">
            <label>{t('ui.k187')}</label>
            <div className="tab-buttons">
              <button
                type="button"
                className={`tab-btn ${activeTab === 'write' ? 'active' : ''}`}
                onClick={() => setActiveTab('write')}
              >
                <Edit3 size={14} />{t('ui.k463')}</button>
              <button
                type="button"
                className={`tab-btn ${activeTab === 'preview' ? 'active' : ''}`}
                onClick={() => setActiveTab('preview')}
              >
                <Eye size={14} />{t('ui.k232')}</button>
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
              <label>{t('ui.k077')}</label>
              <p className="field-hint">{t('ui.k245')}</p>
            </div>
            <button
              type="button"
              className="button button-outline button-small"
              onClick={handleAddResource}
            >
              <Plus size={14} />{t('ui.k039')}</button>
          </div>

          <div className="resources-form-list">
            {resources.map((res, index) => (
              <div key={res.id || index} className="resource-form-row">
                <div className="res-input-title">
                  <input
                    type="text"
                    placeholder={t('ui.a037')}
                    value={res.title}
                    onChange={(e) => handleUpdateResource(index, 'title', e.target.value)}
                    className="form-input"
                  />
                </div>
                <div className="res-input-url">
                  <input
                    type="url"
                    placeholder={t('ui.a058')}
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
                    <option value="PDF">{t('ui.k288')}</option>
                    <option value="VIDEO">{t('ui.k448')}</option>
                    <option value="DATASET">{t('ui.k138')}</option>
                    <option value="LINK">{t('ui.k174')}</option>
                  </select>
                </div>
                <button
                  type="button"
                  className="icon-button delete-res-btn"
                  onClick={() => handleRemoveResource(index)}
                  title={t('ui.a036')}
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
          >{t('ui.k370')}</button>
          <button
            type="button"
            className="button button-primary"
            disabled={submitting}
            onClick={() => handleSubmit(true)}
          >
            {submitting ? t('common.saving') : t('ui.extra.saveAndSubmitReview')}
          </button>
        </div>
      </div>
    </div>
  );
}
