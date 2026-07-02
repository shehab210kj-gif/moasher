import { useState, useCallback, useEffect } from 'react';
import Map, { Marker, NavigationControl, GeolocateControl, Source, Layer } from 'react-map-gl';
import 'mapbox-gl/dist/mapbox-gl.css';
import { Search, Layers, Crosshair, MapPin } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

const MAPBOX_TOKEN = import.meta.env.VITE_MAPBOX_TOKEN;

// Jeddah neighborhoods approximate coordinates
const JEDDAH_NEIGHBORHOODS: Record<string, { lat: number; lng: number }> = {
  'الرويس': { lat: 21.5200, lng: 39.1728 },
  'الحمدانية': { lat: 21.8100, lng: 39.1200 },
  'الزهراء': { lat: 21.5400, lng: 39.1500 },
  'الصفا': { lat: 21.5100, lng: 39.1900 },
  'المحمدية': { lat: 21.5800, lng: 39.1400 },
  'ابحر الشمالية': { lat: 21.7200, lng: 39.1000 },
  'الشاطئ': { lat: 21.6100, lng: 39.1050 },
  'السلامة': { lat: 21.5600, lng: 39.1600 },
  'النعيم': { lat: 21.5500, lng: 39.1750 },
};

type MapStyle = 'satellite' | 'streets' | 'dark';

const MAP_STYLES: Record<MapStyle, { url: string; label: string }> = {
  satellite: { url: 'mapbox://styles/mapbox/satellite-streets-v12', label: 'أقمار صناعية' },
  streets: { url: 'mapbox://styles/mapbox/streets-v12', label: 'شوارع' },
  dark: { url: 'mapbox://styles/mapbox/dark-v11', label: 'داكن' },
};

interface MapComponentProps {
  onParcelSelect: (data: any) => void;
}

export function MapComponent({ onParcelSelect }: MapComponentProps) {
  const [viewState, setViewState] = useState({
    longitude: 39.1728,
    latitude: 21.5200,
    zoom: 14,
    pitch: 45,
    bearing: -10,
  });

  const [marker, setMarker] = useState<{ lat: number; lng: number } | null>(null);
  const [mapStyle, setMapStyle] = useState<MapStyle>('satellite');
  const [showStylePicker, setShowStylePicker] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [districtsData, setDistrictsData] = useState<any>(null);

  useEffect(() => {
    fetch('/data/jeddah_districts.geojson')
      .then(res => res.json())
      .then(data => setDistrictsData(data))
      .catch(err => console.error('Failed to load districts GeoJSON:', err));
  }, []);

  const [hoveredDistrict, setHoveredDistrict] = useState<string | null>(null);

  if (!MAPBOX_TOKEN) {
    return (
      <div className="flex min-h-[500px] items-center justify-center rounded-xl border border-dashed border-slate-300 bg-slate-50 p-6 text-center text-sm font-bold text-slate-500">
        Legacy map component is disabled because VITE_MAPBOX_TOKEN is not configured.
      </div>
    );
  }

  const handleMapClick = useCallback(async (event: any) => {
    const { lng, lat } = event.lngLat;
    setMarker({ lat, lng });

    // Try to get neighborhood name from clicked GeoJSON feature first
    const feature = event.features && event.features.find((f: any) => f.layer.id === 'districts-fill');
    let neighborhood = 'غير محدد';
    
    if (feature) {
      neighborhood = feature.properties.name_ar.replace('حي ', '');
    } else {
      // Fallback to geocoding
      try {
        const response = await fetch(
          `https://api.mapbox.com/geocoding/v5/mapbox.places/${lng},${lat}.json?access_token=${MAPBOX_TOKEN}&types=neighborhood,locality&language=ar`
        );
        const data = await response.json();
        if (data.features && data.features.length > 0) {
          const nbFeature = data.features.find((f: any) => f.place_type.includes('neighborhood')) || data.features[0];
          neighborhood = nbFeature.text;
        }
      } catch (err) {
        console.error('Geocoding error:', err);
      }
    }

    onParcelSelect({
      id: Math.floor(Math.random() * 9000 + 1000).toString(),
      lat: lat.toFixed(6),
      lng: lng.toFixed(6),
      neighborhood: neighborhood,
      usage: 'residential',
      type: 'قطعة أرض',
      area: 0,
    });
  }, [onParcelSelect]);

  const onMouseMove = useCallback((event: any) => {
    const feature = event.features && event.features.find((f: any) => f.layer.id === 'districts-fill');
    setHoveredDistrict(feature ? feature.properties.name_ar : null);
  }, []);

  const handleSearchGo = () => {
    if (!districtsData) return;

    // Search in GeoJSON features
    const match = districtsData.features.find((f: any) => 
      f.properties.name_ar.includes(searchQuery) || 
      (f.properties.name_en && f.properties.name_en.toLowerCase().includes(searchQuery.toLowerCase()))
    );

    if (match) {
      // Get a coordinate from the polygon to fly to
      // For simplicity, we take the first coordinate of the first ring
      const coords = match.geometry.coordinates[0][0];
      const lng = coords[0];
      const lat = coords[1];

      setViewState(prev => ({
        ...prev,
        latitude: lat,
        longitude: lng,
        zoom: 15,
        transitionDuration: 1000
      }));
      
      setMarker({ lat, lng });
      setSearchQuery('');
    } else {
      // Fallback to hardcoded list if not found in GeoJSON
      const hardMatch = Object.entries(JEDDAH_NEIGHBORHOODS).find(
        ([name]) => name.includes(searchQuery)
      );
      if (hardMatch) {
        setViewState(prev => ({
          ...prev,
          latitude: hardMatch[1].lat,
          longitude: hardMatch[1].lng,
          zoom: 15,
        }));
        setSearchQuery('');
      }
    }
  };

  return (
    <div className="relative w-full h-full min-h-[500px]">
      <Map
        {...viewState}
        onMove={evt => setViewState(evt.viewState)}
        mapStyle={MAP_STYLES[mapStyle].url}
        mapboxAccessToken={MAPBOX_TOKEN}
        onClick={handleMapClick}
        onMouseMove={onMouseMove}
        interactiveLayerIds={['districts-fill']}
        style={{ width: '100%', height: '100%' }}
      >
        <NavigationControl position="bottom-right" />
        <GeolocateControl position="bottom-right" />

        {/* Districts GeoJSON Source */}
        <Source id="jeddah-districts" type="geojson" data="/data/jeddah_districts.geojson">
          <Layer
            id="districts-fill"
            type="fill"
            paint={{
              'fill-color': '#0d9488',
              'fill-opacity': [
                'case',
                ['boolean', ['feature-state', 'hover'], false],
                0.3,
                0.1
              ]
            }}
          />
          <Layer
            id="districts-outline"
            type="line"
            paint={{
              'line-color': '#0d9488',
              'line-width': 1,
              'line-opacity': 0.4
            }}
          />
        </Source>

        {marker && (
          <Marker latitude={marker.lat} longitude={marker.lng} anchor="bottom">
            <div className="relative">
              <div className="absolute -top-1 -left-1 w-8 h-8 bg-brand-500/30 rounded-full animate-ping" />
              <MapPin size={32} className="text-brand-600 drop-shadow-lg" fill="#0d9488" />
            </div>
          </Marker>
        )}
      </Map>

      {/* Hover Info */}
      {hoveredDistrict && (
        <div className="absolute bottom-20 right-4 bg-white/95 backdrop-blur-md px-3 py-1.5 rounded-lg shadow-lg border border-slate-200/80 z-10 font-bold text-xs text-brand-700" dir="rtl">
          {hoveredDistrict}
        </div>
      )}

      {/* Search Bar */}
      <div className="absolute top-4 left-1/2 -translate-x-1/2 w-11/12 max-w-md z-10" dir="rtl">
        <div className="bg-white/95 backdrop-blur-md rounded-2xl shadow-lg border border-slate-200/80 p-1.5 flex items-center gap-2">
          <div className="flex items-center gap-2 px-3 flex-grow">
            <Search size={18} className="text-slate-400 shrink-0" />
            <input
              type="text"
              placeholder="ابحث عن حي... (مثال: الرويس)"
              className="bg-transparent border-none outline-none text-sm text-slate-700 font-bold w-full placeholder:font-medium"
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && handleSearchGo()}
            />
          </div>
          <button
            onClick={handleSearchGo}
            className="px-4 py-2 bg-brand-600 text-white text-xs font-black rounded-xl hover:bg-brand-700 transition shrink-0"
          >
            انتقل
          </button>
        </div>
      </div>

      {/* Style Switcher */}
      <div className="absolute top-4 right-4 z-10">
        <button
          onClick={() => setShowStylePicker(!showStylePicker)}
          className="w-11 h-11 bg-white/95 backdrop-blur-md rounded-xl shadow-lg flex items-center justify-center text-slate-600 hover:text-brand-600 transition border border-slate-200/80"
        >
          <Layers size={20} />
        </button>
        <AnimatePresence>
          {showStylePicker && (
            <motion.div
              initial={{ opacity: 0, y: -5, scale: 0.95 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: -5, scale: 0.95 }}
              className="absolute top-14 right-0 bg-white/95 backdrop-blur-md rounded-xl shadow-lg border border-slate-200/80 p-2 space-y-1 min-w-[130px]"
              dir="rtl"
            >
              {(Object.keys(MAP_STYLES) as MapStyle[]).map(key => (
                <button
                  key={key}
                  onClick={() => { setMapStyle(key); setShowStylePicker(false); }}
                  className={`w-full text-right px-3 py-2 rounded-lg text-xs font-bold transition ${
                    mapStyle === key ? 'bg-brand-50 text-brand-700' : 'text-slate-600 hover:bg-slate-50'
                  }`}
                >
                  {MAP_STYLES[key].label}
                </button>
              ))}
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* Crosshair Center Indicator */}
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 pointer-events-none z-[5] opacity-30">
        <Crosshair size={32} className="text-white drop-shadow" />
      </div>

      {/* Instructions Toast */}
      {!marker && (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="absolute bottom-6 left-1/2 -translate-x-1/2 bg-slate-900/90 backdrop-blur-md text-white text-xs font-bold px-5 py-3 rounded-full shadow-xl z-10"
          dir="rtl"
        >
          <span className="flex items-center gap-2">
            <MapPin size={14} />
            انقر على أي موقع في الخريطة لتحديد القطعة
          </span>
        </motion.div>
      )}
    </div>
  );
}
