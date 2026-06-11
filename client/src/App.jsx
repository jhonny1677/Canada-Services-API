import { useState, useRef } from 'react';
import Header from './components/Header';
import SearchPanel from './components/SearchPanel';
import MapView from './components/MapView';
import ResultsList from './components/ResultsList';
import { geocodeAddress, fetchNearby } from './api/services';
import './App.css';

export default function App() {
  const [address, setAddress] = useState('');
  const [serviceType, setServiceType] = useState('healthcare');
  const [radius, setRadius] = useState(2000);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [results, setResults] = useState([]);
  const [total, setTotal] = useState(0);
  const [searchLocation, setSearchLocation] = useState(null);

  const mapRef = useRef(null);

  async function handleSearch() {
    if (!address.trim()) return;
    setLoading(true);
    setError(null);
    setResults([]);
    setTotal(0);

    try {
      const geo = await geocodeAddress(address.trim());
      const lat = parseFloat(geo.latitude);
      const lon = parseFloat(geo.longitude);
      setSearchLocation({ lat, lon, display_name: geo.display_name });

      const radiusKm = radius / 1000;
      const data = await fetchNearby(serviceType, lat, lon, radiusKm);
      const items = data?.all ?? [];

      if (items.length === 0) {
        setError('No services found in this area — try increasing the radius');
      } else {
        setResults(items);
        setTotal(data?.total ?? items.length);
      }
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  function handleResultClick(result) {
    mapRef.current?.focusMarker(result);
  }

  return (
    <div className="app-shell">
      <Header />
      <div className="app-body">
        <aside className="sidebar">
          <SearchPanel
            address={address}
            setAddress={setAddress}
            serviceType={serviceType}
            setServiceType={setServiceType}
            radius={radius}
            setRadius={setRadius}
            onSearch={handleSearch}
            loading={loading}
          />
          <ResultsList
            results={results}
            total={total}
            radius={radius}
            serviceType={serviceType}
            error={error}
            onResultClick={handleResultClick}
          />
        </aside>
        <main className="map-container">
          <MapView
            ref={mapRef}
            searchLocation={searchLocation}
            results={results}
            radius={radius}
            serviceType={serviceType}
          />
        </main>
      </div>
    </div>
  );
}
