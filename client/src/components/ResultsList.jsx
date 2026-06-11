export default function ResultsList({ results, total, radius, serviceType, error, onResultClick }) {
  const radiusKm = (radius / 1000).toFixed(1);

  if (error) {
    return (
      <div className="results-panel">
        <div className="results-error">{error}</div>
      </div>
    );
  }

  if (results.length === 0) return null;

  const dot = serviceType === 'healthcare' ? '#dc2626' : '#2563eb';

  return (
    <div className="results-panel">
      <div className="results-header">
        <span className="results-count">{total ?? results.length}</span> results within{' '}
        <strong>{radiusKm} km</strong>
      </div>
      <ul className="results-list">
        {results.map((result) => (
          <li
            key={result.id}
            className="result-item"
            onClick={() => onResultClick(result)}
          >
            <span
              className="result-dot"
              style={{ background: dot }}
              aria-hidden="true"
            />
            <div className="result-body">
              <div className="result-name">{result.name}</div>
              <div className="result-meta">
                <span className="result-type">{result.amenity}</span>
                <span className="result-distance">{result.distance?.toFixed(2)} km</span>
              </div>
              {result.address && (
                <div className="result-address">{result.address}</div>
              )}
            </div>
          </li>
        ))}
      </ul>
    </div>
  );
}
