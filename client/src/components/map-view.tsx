import { useEffect, useRef } from "react";
import type { CityOrganization } from "@/lib/city-services-data";

interface MapViewProps {
  organizations: CityOrganization[];
  onSelect?: (org: CityOrganization) => void;
}

const GROZNY_CENTER: [number, number] = [43.3170, 45.6992];

export function MapView({ organizations, onSelect }: MapViewProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<any>(null);
  const lRef = useRef<any>(null);
  const markersRef = useRef<any[]>([]);
  const onSelectRef = useRef(onSelect);
  onSelectRef.current = onSelect;

  const addMarkers = (orgs: CityOrganization[]) => {
    const L = lRef.current;
    const map = mapRef.current;
    if (!L || !map) return;

    markersRef.current.forEach((m) => m.remove());
    markersRef.current = [];

    const orgsWithCoords = orgs.filter((o) => o.lat && o.lng);
    if (orgsWithCoords.length === 0) return;

    const markers = orgsWithCoords.map((org) => {
      const color = org.isEmergency ? "#FF3B30" : "#007AFF";

      const icon = L.divIcon({
        className: "",
        html: `<div style="
          width:28px;height:28px;border-radius:50% 50% 50% 0;
          background:${color};border:2.5px solid white;
          box-shadow:0 2px 6px rgba(0,0,0,0.35);
          transform:rotate(-45deg);
        "></div>`,
        iconSize: [28, 28],
        iconAnchor: [14, 28],
        popupAnchor: [0, -30],
      });

      const marker = L.marker([org.lat!, org.lng!], { icon }).addTo(map);

      const popupContent = `
        <div style="font-family:system-ui,sans-serif;min-width:160px;max-width:210px">
          <div style="font-size:13px;font-weight:700;margin-bottom:3px;line-height:1.3">${org.name}</div>
          <div style="font-size:11px;color:#888;margin-bottom:5px">${org.subcategory}</div>
          ${org.address ? `<div style="font-size:11px;color:#666;margin-bottom:5px">📍 ${org.address}</div>` : ""}
          <div style="font-size:12px;font-weight:700;color:#007AFF">📞 ${org.phone}</div>
          ${org.hours ? `<div style="font-size:10px;color:#aaa;margin-top:3px">🕐 ${org.hours}</div>` : ""}
        </div>
      `;

      marker.bindPopup(popupContent, { maxWidth: 240, className: "govza-popup" });
      marker.on("click", () => onSelectRef.current?.(org));

      return marker;
    });

    markersRef.current = markers;

    const group = L.featureGroup(markers);
    map.fitBounds(group.getBounds().pad(0.18), { maxZoom: 15 });
  };

  useEffect(() => {
    if (!containerRef.current || mapRef.current) return;

    const init = async () => {
      const L = await import("leaflet");
      lRef.current = L;

      if (!document.getElementById("leaflet-css")) {
        const link = document.createElement("link");
        link.id = "leaflet-css";
        link.rel = "stylesheet";
        link.href = "https://unpkg.com/leaflet@1.9.4/dist/leaflet.css";
        document.head.appendChild(link);
      }

      delete (L.Icon.Default.prototype as any)._getIconUrl;
      L.Icon.Default.mergeOptions({
        iconRetinaUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png",
        iconUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png",
        shadowUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png",
      });

      if (!containerRef.current) return;

      const map = L.map(containerRef.current, {
        center: GROZNY_CENTER,
        zoom: 13,
        zoomControl: true,
      });

      L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
        attribution: '© <a href="https://openstreetmap.org/copyright">OpenStreetMap</a>',
        maxZoom: 19,
      }).addTo(map);

      mapRef.current = map;
      addMarkers(organizations);
    };

    init();

    return () => {
      if (mapRef.current) {
        mapRef.current.remove();
        mapRef.current = null;
        lRef.current = null;
        markersRef.current = [];
      }
    };
  }, []);

  useEffect(() => {
    if (mapRef.current && lRef.current) {
      addMarkers(organizations);
    }
  }, [organizations]);

  return (
    <div
      ref={containerRef}
      data-testid="map-view"
      style={{ height: "calc(100vh - 196px)", minHeight: "420px" }}
      className="w-full"
    />
  );
}
