import { useTranslation } from 'react-i18next';
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
  const { t } = useTranslation();
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
      setError(err.message || t('errors.articleSubmit'));
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="submit-article-page">
      <div className="form-header-row">
        <Link to="/knowledge" className="back-link">
          <ArrowLeft size={16} />{t('ui.k090')}</Link>
        <span className="eyebrow">{t('ui.k242')}</span>
      </div>

      <div className="form-title-area">
        <h1>{t('ui.k127')}</h1>
        <p>{t('ui.k380')}</p>
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
          <label htmlFor="article-title">{t('ui.k072')}<span className="req">*</span>
          </label>
          <input
            id="article-title"
            type="text"
            placeholder={t('ui.a051')}
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            className="form-input"
            maxLength={150}
          />
          <span className="field-hint">{t('ui.k095')}{title.length}/150)</span>
        </div>

        {/* Category & Read Time Row */}
        <div className="form-row-2">
          <div className="form-group">
            <label htmlFor="article-category">{t('ui.k150')}<span className="req">*</span>
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
            <label htmlFor="article-read-time">{t('ui.k171')}</label>
            <input
              id="article-read-time"
              type="text"
              value={readTime}
              onChange={(e) => setReadTime(e.target.value)}
              className="form-input"
              placeholder={t('ui.a050')}
            />
          </div>
        </div>

        {/* Summary */}
        <div className="form-group">
          <label htmlFor="article-summary">{t('ui.k399')}<span className="req">*</span>
          </label>
          <textarea
            id="article-summary"
            rows={3}
            placeholder={t('ui.a001')}
            value={summary}
            onChange={(e) => setSummary(e.target.value)}
            className="form-textarea"
            maxLength={500}
          />
          <span className="field-hint">{t('ui.k094')}{summary.length}/500)</span>
        </div>

        {/* Cover Image URL */}
        <div className="form-group">
          <label htmlFor="article-cover">{t('ui.k130')}</label>
          <input
            id="article-cover"
            type="url"
            placeholder={t('ui.a060')}
            value={coverImage}
            onChange={(e) => setCoverImage(e.target.value)}
            className="form-input"
          />
          {coverImage && (
            <div className="cover-preview">
              <img
                src={coverImage}
                alt={t('ui.a019')}
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
            <label>{t('ui.k188')}<span className="req">*</span>
            </label>
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
            <>
              <textarea
                rows={14}
                placeholder={t('ui.a047')}
                value={content}
                onChange={(e) => setContent(e.target.value)}
                className="form-textarea code-font"
              />
              <div className="markdown-cheatsheet">
                <span>{t('ui.k247')}</span>
                <code>{t('ui.k001')}</code>
                <code>{t('ui.k002')}</code>
                <code>{t('ui.k009')}</code>
                <code>{t('ui.k010')}</code>
                <code>{t('ui.k020')}</code>
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
                <div className="preview-empty">{t('ui.k465')}</div>
              )}
            </div>
          )}
        </div>

        {/* Dynamic Resource Builder */}
        <div className="form-group resources-builder-section">
          <div className="resources-builder-header">
            <div>
              <label>{t('ui.k078')}</label>
              <p className="field-hint">{t('ui.k076')}</p>
            </div>
            <button
              type="button"
              className="button button-outline button-small"
              onClick={handleAddResource}
            >
              <Plus size={14} />{t('ui.k039')}</button>
          </div>

          {resources.length === 0 ? (
            <div className="no-resources-hint">{t('ui.k276')}</div>
          ) : (
            <div className="resources-form-list">
              {resources.map((res, index) => (
                <div key={res.id || index} className="resource-form-row">
                  <div className="res-input-title">
                    <input
                      type="text"
                      placeholder={t('ui.a038')}
                      value={res.title}
                      onChange={(e) => handleUpdateResource(index, 'title', e.target.value)}
                      className="form-input"
                    />
                  </div>
                  <div className="res-input-url">
                    <input
                      type="url"
                      placeholder={t('ui.a059')}
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
          )}
        </div>

        {/* Action Buttons */}
        <div className="form-actions-footer">
          <button
            type="button"
            className="button button-outline"
            disabled={submitting}
            onClick={() => handleSubmit('DRAFT')}
          >{t('ui.k371')}</button>
          <button
            type="button"
            className="button button-primary"
            disabled={submitting}
            onClick={() => handleSubmit('PENDING_REVIEW')}
          >
            {submitting ? t('ui.extra.submitting') : t('ui.k394')}
          </button>
        </div>
      </div>
    </div>
  );
}
