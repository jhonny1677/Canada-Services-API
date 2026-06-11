export default function SearchPanel({
  address,
  setAddress,
  serviceType,
  setServiceType,
  radius,
  setRadius,
  onSearch,
  loading,
}) {
  const radiusKm = (radius / 1000).toFixed(1);

  function handleKeyDown(e) {
    if (e.key === 'Enter') onSearch();
  }

  return (
    <div className="search-panel">
      <div className="search-form">
        <label className="form-label" htmlFor="address-input">
          Address
        </label>
        <input
          id="address-input"
          type="text"
          className="form-input"
          placeholder="e.g. Vancouver, BC"
          value={address}
          onChange={(e) => setAddress(e.target.value)}
          onKeyDown={handleKeyDown}
          disabled={loading}
        />

        <label className="form-label">Service type</label>
        <div className="radio-group">
          {['healthcare', 'retail'].map((type) => (
            <label key={type} className="radio-label">
              <input
                type="radio"
                name="serviceType"
                value={type}
                checked={serviceType === type}
                onChange={() => setServiceType(type)}
                disabled={loading}
              />
              <span className={`radio-dot radio-dot--${type}`} />
              {type.charAt(0).toUpperCase() + type.slice(1)}
            </label>
          ))}
        </div>

        <label className="form-label" htmlFor="radius-slider">
          Radius — <strong>{radiusKm} km</strong>
        </label>
        <input
          id="radius-slider"
          type="range"
          min={500}
          max={10000}
          step={500}
          value={radius}
          onChange={(e) => setRadius(Number(e.target.value))}
          disabled={loading}
          className="form-slider"
        />
        <div className="slider-labels">
          <span>0.5 km</span>
          <span>10 km</span>
        </div>

        <button
          className="search-btn"
          onClick={onSearch}
          disabled={loading || !address.trim()}
        >
          {loading ? (
            <>
              <span className="spinner" />
              Searching…
            </>
          ) : (
            '🔍 Search'
          )}
        </button>
      </div>
    </div>
  );
}
