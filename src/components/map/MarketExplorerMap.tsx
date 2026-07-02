import { useEffect, useMemo, useRef, useState } from 'react';
import Map, { Layer, MapRef, NavigationControl, Source } from 'react-map-gl';
import 'mapbox-gl/dist/mapbox-gl.css';
import { findDistrictFeature, getFeatureBounds } from '../../lib/geo';
import { useI18n } from '../../lib/i18n';

const MAPBOX_TOKEN = import.meta.env.VITE_MAPBOX_TOKEN;

type MarketExplorerMapProps = {
  district: string;
  averagePricePerSqm: number;
  medianPricePerSqm: number;
  transactionsCount: number;
  liquidityScore: number;
};

export function MarketExplorerMap({ district, averagePricePerSqm, medianPricePerSqm, transactionsCount, liquidityScore }: MarketExplorerMapProps) {
  const { t } = useI18n();
  const mapRef = useRef<MapRef | null>(null);
  const [districtsGeoJson, setDistrictsGeoJson] = useState<GeoJSON.FeatureCollection | null>(null);
  const selectedDistrictFeature = useMemo(() => districtsGeoJson ? findDistrictFeature(districtsGeoJson, district) : null, [district, districtsGeoJson]);
  const selectedDistrictCollection = useMemo<GeoJSON.FeatureCollection | null>(() => selectedDistrictFeature ? { type: 'FeatureCollection', features: [selectedDistrictFeature] } : null, [selectedDistrictFeature]);

  useEffect(() => {
    fetch('/data/jeddah_districts.geojson')
      .then((response) => response.json())
      .then((data) => setDistrictsGeoJson(data))
      .catch(() => undefined);
  }, []);

  useEffect(() => {
    if (!selectedDistrictFeature) return;
    const bounds = getFeatureBounds(selectedDistrictFeature);
    if (bounds) mapRef.current?.fitBounds(bounds, { padding: 52, duration: 900 });
  }, [selectedDistrictFeature]);

  if (!MAPBOX_TOKEN) {
    return (
      <div className="flex h-80 items-center justify-center rounded-lg border border-dashed border-slate-300 bg-slate-50 p-6 text-center text-sm font-bold text-slate-500">
        Market map placeholder. Set VITE_MAPBOX_TOKEN to show district and transaction layers later.
      </div>
    );
  }

  return (
    <div className="relative h-80 overflow-hidden rounded-lg border border-slate-200">
      <Map
        ref={mapRef}
        initialViewState={{ latitude: 21.5433, longitude: 39.1728, zoom: 10 }}
        mapStyle="mapbox://styles/mapbox/streets-v12"
        mapboxAccessToken={MAPBOX_TOKEN}
        style={{ width: '100%', height: '100%' }}
      >
        <NavigationControl position="bottom-right" />
        {districtsGeoJson && (
          <Source id="market-districts" type="geojson" data={districtsGeoJson}>
            <Layer id="market-districts-fill" type="fill" paint={{ 'fill-color': '#64748b', 'fill-opacity': 0.08 }} />
            <Layer id="market-districts-line" type="line" paint={{ 'line-color': '#64748b', 'line-width': 1, 'line-opacity': 0.45 }} />
          </Source>
        )}
        {selectedDistrictCollection && (
          <Source id="market-selected-district" type="geojson" data={selectedDistrictCollection}>
            <Layer id="market-selected-district-fill" type="fill" paint={{ 'fill-color': '#059669', 'fill-opacity': 0.22 }} />
            <Layer id="market-selected-district-line" type="line" paint={{ 'line-color': '#047857', 'line-width': 3 }} />
          </Source>
        )}
      </Map>
      <div className="absolute left-4 top-4 max-w-xs rounded-lg bg-white/95 px-4 py-3 text-xs font-bold leading-5 text-slate-700 shadow">
        {t('districtLevelMap')}
      </div>
      <div className="absolute bottom-4 left-4 max-w-sm rounded-lg bg-slate-950/95 px-4 py-3 text-xs font-bold leading-5 text-white shadow">
        <div className="text-sm font-black">{district}</div>
        <div className="mt-2 grid grid-cols-2 gap-x-4 gap-y-1">
          <span>{t('avgSqm')}: {Math.round(averagePricePerSqm).toLocaleString('en-US')} SAR</span>
          <span>{t('medianSqm')}: {Math.round(medianPricePerSqm).toLocaleString('en-US')} SAR</span>
          <span>{t('transactions')}: {transactionsCount}</span>
          <span>{t('liquidity')}: {liquidityScore}/100</span>
        </div>
      </div>
    </div>
  );
}
