import { useEffect, useMemo, useState } from 'react';
import Map, { Layer, Marker, NavigationControl, Source } from 'react-map-gl';
import 'mapbox-gl/dist/mapbox-gl.css';
import { MapPin } from 'lucide-react';
import { findDistrictFeature } from '../../lib/geo';
import { hasValidCoordinates } from '../../lib/location';
import { useI18n } from '../../lib/i18n';

type PropertyMapPreviewProps = {
  latitude: number | null;
  longitude: number | null;
  district?: string;
};

const MAPBOX_TOKEN = import.meta.env.VITE_MAPBOX_TOKEN;

export function PropertyMapPreview({ latitude, longitude, district = '' }: PropertyMapPreviewProps) {
  const { t } = useI18n();
  const [districtsGeoJson, setDistrictsGeoJson] = useState<GeoJSON.FeatureCollection | null>(null);
  const districtFeature = useMemo(() => districtsGeoJson && district ? findDistrictFeature(districtsGeoJson, district) : null, [district, districtsGeoJson]);
  const districtCollection = useMemo<GeoJSON.FeatureCollection | null>(() => districtFeature ? { type: 'FeatureCollection', features: [districtFeature] } : null, [districtFeature]);
  const hasLocation = hasValidCoordinates({ latitude, longitude });

  useEffect(() => {
    fetch('/data/jeddah_districts.geojson')
      .then((response) => response.json())
      .then((data) => setDistrictsGeoJson(data))
      .catch(() => undefined);
  }, []);

  if (!hasLocation) {
    return (
      <div className="flex h-64 items-center justify-center rounded-lg border border-dashed border-slate-300 bg-slate-50 p-6 text-center text-sm font-bold text-slate-500">
        {t('noLocation')}
      </div>
    );
  }

  if (!MAPBOX_TOKEN) {
    return (
      <div className="flex h-64 items-center justify-center rounded-lg border border-dashed border-slate-300 bg-slate-50 p-6 text-center text-sm font-bold text-slate-500">
        Mapbox token is missing. The selected coordinates are {latitude}, {longitude}.
      </div>
    );
  }

  return (
    <div className="h-64 overflow-hidden rounded-lg border border-slate-200">
      <Map
        initialViewState={{ latitude: latitude as number, longitude: longitude as number, zoom: 14 }}
        mapStyle="mapbox://styles/mapbox/streets-v12"
        mapboxAccessToken={MAPBOX_TOKEN}
        style={{ width: '100%', height: '100%' }}
      >
        <NavigationControl position="bottom-right" />
        {districtCollection && (
          <Source id="report-district" type="geojson" data={districtCollection}>
            <Layer id="report-district-fill" type="fill" paint={{ 'fill-color': '#059669', 'fill-opacity': 0.12 }} />
            <Layer id="report-district-line" type="line" paint={{ 'line-color': '#047857', 'line-width': 2 }} />
          </Source>
        )}
        <Marker latitude={latitude as number} longitude={longitude as number} anchor="bottom">
          <MapPin size={34} className="text-emerald-600 drop-shadow" fill="#059669" />
        </Marker>
      </Map>
    </div>
  );
}
