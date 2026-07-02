import { useEffect, useMemo, useRef, useState } from 'react';
import Map, { Layer, MapRef, Marker, NavigationControl, Source } from 'react-map-gl';
import 'mapbox-gl/dist/mapbox-gl.css';
import { MapPin } from 'lucide-react';
import { findDistrictFeature, getFeatureBounds, isPointInFeature } from '../../lib/geo';
import { hasValidCoordinates } from '../../lib/location';

type Location = {
  latitude: number | null;
  longitude: number | null;
};

type PropertyLocationPickerProps = {
  value: Location;
  district: string;
  onChange: (location: Location) => void;
};

const MAPBOX_TOKEN = import.meta.env.VITE_MAPBOX_TOKEN;
const JEDDAH_CENTER = { latitude: 21.5433, longitude: 39.1728 };

export function PropertyLocationPicker({ value, district, onChange }: PropertyLocationPickerProps) {
  const mapRef = useRef<MapRef | null>(null);
  const [districtsGeoJson, setDistrictsGeoJson] = useState<GeoJSON.FeatureCollection | null>(null);
  const [districtWarning, setDistrictWarning] = useState('');
  const [outsideWarning, setOutsideWarning] = useState('');
  const [viewState, setViewState] = useState({
    latitude: value.latitude ?? JEDDAH_CENTER.latitude,
    longitude: value.longitude ?? JEDDAH_CENTER.longitude,
    zoom: hasValidCoordinates(value) ? 14 : 11,
  });

  const selectedDistrictFeature = useMemo(() => districtsGeoJson ? findDistrictFeature(districtsGeoJson, district) : null, [district, districtsGeoJson]);
  const selectedDistrictCollection = useMemo<GeoJSON.FeatureCollection | null>(() => selectedDistrictFeature ? { type: 'FeatureCollection', features: [selectedDistrictFeature] } : null, [selectedDistrictFeature]);
  const hasLocation = hasValidCoordinates(value);
  const marker = useMemo(() => hasLocation ? { latitude: value.latitude as number, longitude: value.longitude as number } : null, [hasLocation, value.latitude, value.longitude]);

  useEffect(() => {
    fetch('/data/jeddah_districts.geojson')
      .then((response) => response.json())
      .then((data) => setDistrictsGeoJson(data))
      .catch(() => setDistrictWarning('District boundary file could not be loaded.'));
  }, []);

  useEffect(() => {
    if (!district || !districtsGeoJson) return;
    if (!selectedDistrictFeature) {
      setDistrictWarning('District boundary not found.');
      return;
    }

    setDistrictWarning('');
    const bounds = getFeatureBounds(selectedDistrictFeature);
    if (bounds) {
      mapRef.current?.fitBounds(bounds, { padding: 48, duration: 900 });
    }
  }, [district, districtsGeoJson, selectedDistrictFeature]);

  if (!MAPBOX_TOKEN) {
    return (
      <div className="flex min-h-[280px] items-center justify-center rounded-lg border border-dashed border-slate-300 bg-slate-50 p-6 text-center text-sm font-bold text-slate-500">
        Mapbox token is missing. Set VITE_MAPBOX_TOKEN to enable location selection.
      </div>
    );
  }

  return (
    <div className="relative h-[320px] overflow-hidden rounded-lg border border-slate-200">
      <Map
        {...viewState}
        ref={mapRef}
        onMove={(event) => setViewState(event.viewState)}
        onClick={(event) => {
          const latitude = Number(event.lngLat.lat.toFixed(6));
          const longitude = Number(event.lngLat.lng.toFixed(6));
          if (selectedDistrictFeature && !isPointInFeature(longitude, latitude, selectedDistrictFeature)) {
            setOutsideWarning('Selected point is outside the highlighted district. You can keep it if this is intentional.');
          } else {
            setOutsideWarning('');
          }
          onChange({ latitude, longitude });
        }}
        mapStyle="mapbox://styles/mapbox/streets-v12"
        mapboxAccessToken={MAPBOX_TOKEN}
        style={{ width: '100%', height: '100%' }}
      >
        <NavigationControl position="bottom-right" />
        {selectedDistrictCollection && (
          <Source id="selected-district" type="geojson" data={selectedDistrictCollection}>
            <Layer id="selected-district-fill" type="fill" paint={{ 'fill-color': '#059669', 'fill-opacity': 0.16 }} />
            <Layer id="selected-district-line" type="line" paint={{ 'line-color': '#047857', 'line-width': 3 }} />
          </Source>
        )}
        {marker && (
          <Marker latitude={marker.latitude} longitude={marker.longitude} anchor="bottom">
            <MapPin size={34} className="text-emerald-600 drop-shadow" fill="#059669" />
          </Marker>
        )}
      </Map>
      {!marker && (
        <div className="absolute left-1/2 top-4 -translate-x-1/2 rounded-lg bg-white/95 px-4 py-2 text-xs font-black text-slate-700 shadow">
          Click the map to select the property location.
        </div>
      )}
      {(districtWarning || outsideWarning) && (
        <div className="absolute bottom-4 left-4 right-4 rounded-lg bg-amber-50 px-4 py-3 text-xs font-black leading-5 text-amber-900 shadow">
          {outsideWarning || districtWarning}
        </div>
      )}
    </div>
  );
}
