export default function Header() {
  return (
    <header className="header">
      <div className="header-brand">
        <span className="header-maple">🍁</span>
        <span className="header-title">Canada Services API</span>
      </div>
      <nav className="header-nav">
        <a
          href="https://canada-services-api.onrender.com/api/docs"
          target="_blank"
          rel="noopener noreferrer"
          className="header-link"
        >
          API Docs
        </a>
        <a
          href="https://github.com/jhonny1677/Canada-Services-API"
          target="_blank"
          rel="noopener noreferrer"
          className="header-link"
        >
          GitHub
        </a>
      </nav>
    </header>
  );
}
