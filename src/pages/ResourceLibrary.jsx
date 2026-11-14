import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import {
  Video,
  FileText,
  Database,
  ExternalLink,
  Download,
  Search,
  Filter,
  Play,
  X,
  PlusCircle,
  BookOpen,
  Droplets,
  Layers,
} from 'lucide-react';
import { resourceService } from '../services/resourceService';
import { categoryService } from '../services/categoryService';

export default function ResourceLibrary() {
  const [resources, setResources] = useState([]);
  const [categories, setCategories] = useState([]);
  const [counts, setCounts] = useState({ ALL: 0, VIDEO: 0, PDF: 0, DATASET: 0, LINK: 0 });
  const [loading, setLoading] = useState(true);

  // Filters
  const [selectedType, setSelectedType] = useState('ALL');
  const [selectedCategory, setSelectedCategory] = useState('');
  const [searchQuery, setSearchQuery] = useState('');

  // Video Modal State
  const [activeVideo, setActiveVideo] = useState(null);

  useEffect(() => {
    categoryService
      .list()
      .then((cats) => setCategories(cats || []))
      .catch((err) => console.error(err));
  }, []);

  useEffect(() => {
    setLoading(true);
    resourceService
      .list({
        type: selectedType === 'ALL' ? undefined : selectedType,
        category: selectedCategory || undefined,
        search: searchQuery || undefined,
      })
      .then((data) => {
        setResources(data.resources || []);
        if (data.counts) setCounts(data.counts);
      })
      .catch((err) => console.error(err))
      .finally(() => setLoading(false));
  }, [selectedType, selectedCategory, searchQuery]);

  return (
    <div className="resources-page">
      {/* Hero section */}
      <section className="resources-hero">
        <div className="resources-hero-content">
          <span className="eyebrow light-eyebrow">
            EDUCATIONAL MULTIMEDIA &bull; TECHNICAL GUIDELINES
          </span>
          <h1>
            Water Conservation <em>Resource & Video Hub</em>
          </h1>
          <p>
            Explore verified technical manuals, engineering schematics, step-by-step video tutorials,
            and hydrological datasets for sustainable water governance.
          </p>
          <div className="hero-buttons">
            <Link to="/articles/submit" className="button button-white">
              <PlusCircle size={16} /> Contribute a Resource
            </Link>
            <Link to="/knowledge" className="button button-outline" style={{ background: '#ffffff20', color: '#fff', borderColor: '#ffffff40' }}>
              <BookOpen size={16} /> Browse Wiki Articles
            </Link>
          </div>
        </div>

        <div className="resources-hero-badge">
          <Layers size={36} />
          <div className="badge-text">
            <strong>{counts.ALL || resources.length}</strong>
            <span>Verified Toolkits</span>
          </div>
        </div>
      </section>

      {/* Toolbar / Search */}
      <div className="resources-toolbar">
        <div className="resources-search-bar">
          <Search size={18} className="search-icon" />
          <input
            type="text"
            placeholder="Search manuals, videos, calculations, or guidelines..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="resources-search-input"
          />
          {searchQuery && (
            <button className="search-clear-btn" onClick={() => setSearchQuery('')}>
              <X size={15} />
            </button>
          )}
        </div>

        <div className="resources-category-filter">
          <Filter size={15} />
          <select
            value={selectedCategory}
            onChange={(e) => setSelectedCategory(e.target.value)}
            aria-label="Filter by category"
          >
            <option value="">All Conservation Categories</option>
            {categories.map((cat) => (
              <option key={cat.id} value={cat.slug}>
                {cat.name}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Type Filter Pills */}
      <div className="resource-type-tabs">
        <button
          className={`type-tab ${selectedType === 'ALL' ? 'active' : ''}`}
          onClick={() => setSelectedType('ALL')}
        >
          <Layers size={15} /> All Media ({counts.ALL || 0})
        </button>
        <button
          className={`type-tab ${selectedType === 'VIDEO' ? 'active' : ''}`}
          onClick={() => setSelectedType('VIDEO')}
        >
          <Video size={15} /> Video Tutorials ({counts.VIDEO || 0})
        </button>
        <button
          className={`type-tab ${selectedType === 'PDF' ? 'active' : ''}`}
          onClick={() => setSelectedType('PDF')}
        >
          <FileText size={15} /> Manuals & PDFs ({counts.PDF || 0})
        </button>
        <button
          className={`type-tab ${selectedType === 'DATASET' ? 'active' : ''}`}
          onClick={() => setSelectedType('DATASET')}
        >
          <Database size={15} /> Datasets & Sheets ({counts.DATASET || 0})
        </button>
      </div>

      {/* Resource Grid */}
      {loading ? (
        <div className="knowledge-loading">
          <Droplets size={28} className="spin-icon" />
          <p>Loading educational resources...</p>
        </div>
      ) : resources.length === 0 ? (
        <div className="knowledge-empty-state">
          <Layers size={48} className="empty-icon" />
          <h3>No resources found</h3>
          <p>Try switching the media type or resetting your search term.</p>
          <button
            className="button button-primary"
            onClick={() => {
              setSelectedType('ALL');
              setSelectedCategory('');
              setSearchQuery('');
            }}
          >
            Reset Filters
          </button>
        </div>
      ) : (
        <div className="resource-cards-grid">
          {resources.map((res) => {
            const isVideo = res.type === 'VIDEO';
            const isPdf = res.type === 'PDF';
            const isDataset = res.type === 'DATASET';

            return (
              <div key={res.id} className="resource-hub-card">
                <div className={`resource-card-icon-box type-${res.type?.toLowerCase()}`}>
                  {isVideo && <Video size={24} />}
                  {isPdf && <FileText size={24} />}
                  {isDataset && <Database size={24} />}
                  {!isVideo && !isPdf && !isDataset && <ExternalLink size={24} />}
                </div>

                <div className="resource-hub-body">
                  <div className="resource-hub-top">
                    <span className={`media-badge badge-${res.type?.toLowerCase()}`}>
                      {res.type}
                    </span>
                    {res.article?.category?.name && (
                      <span className="resource-cat-pill">
                        {res.article.category.name}
                      </span>
                    )}
                  </div>

                  <h3 className="resource-hub-title">{res.title}</h3>

                  {res.article && (
                    <div className="resource-source-article">
                      <span>Source Article:</span>
                      <Link to={`/articles/${res.article.slug || res.article.id}`}>
                        {res.article.title}
                      </Link>
                    </div>
                  )}

                  <div className="resource-hub-actions">
                    {isVideo ? (
                      <button
                        className="button button-primary button-small"
                        onClick={() => setActiveVideo(res)}
                      >
                        <Play size={14} /> Watch Video
                      </button>
                    ) : (
                      <a
                        href={res.url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="button button-outline button-small"
                        download={isPdf}
                      >
                        {isPdf ? <Download size={14} /> : <ExternalLink size={14} />}
                        <span>{isPdf ? 'Download PDF' : 'Open Resource'}</span>
                      </a>
                    )}

                    {res.article && (
                      <Link
                        to={`/articles/${res.article.slug || res.article.id}`}
                        className="read-article-link"
                      >
                        Read Guide &rarr;
                      </Link>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Video Modal Player */}
      {activeVideo && (
        <div className="video-modal-backdrop" onClick={() => setActiveVideo(null)}>
          <div className="video-modal" onClick={(e) => e.stopPropagation()}>
            <div className="video-modal-header">
              <div>
                <span className="eyebrow">FIELD TUTORIAL &bull; VIDEO PLAYER</span>
                <h3>{activeVideo.title}</h3>
              </div>
              <button
                className="icon-button"
                onClick={() => setActiveVideo(null)}
                aria-label="Close video player"
              >
                <X size={20} />
              </button>
            </div>
            <div className="video-modal-body">
              {activeVideo.url.includes('youtube.com') || activeVideo.url.includes('youtu.be') ? (
                <div className="iframe-responsive-container">
                  <iframe
                    src={activeVideo.url.replace('watch?v=', 'embed/').replace('youtu.be/', 'youtube.com/embed/')}
                    title={activeVideo.title}
                    allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                    allowFullScreen
                  />
                </div>
              ) : (
                <div className="video-external-fallback">
                  <Video size={48} />
                  <p>External video stream at:</p>
                  <code>{activeVideo.url}</code>
                  <a
                    href={activeVideo.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="button button-primary"
                  >
                    Launch Video in New Window <ExternalLink size={16} />
                  </a>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
