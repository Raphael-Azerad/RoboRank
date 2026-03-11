import { useEffect, useRef } from "react";
import L from "leaflet";
import "leaflet/dist/leaflet.css";

interface EventMapProps {
  events: any[];
  onEventClick: (eventId: number) => void;
}

// Fix default marker icons for Leaflet + bundlers
delete (L.Icon.Default.prototype as any)._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png",
  iconUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png",
  shadowUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png",
});

export function EventMap({ events, onEventClick }: EventMapProps) {
  const mapRef = useRef<HTMLDivElement>(null);
  const mapInstanceRef = useRef<L.Map | null>(null);

  useEffect(() => {
    if (!mapRef.current || mapInstanceRef.current) return;

    const map = L.map(mapRef.current, {
      center: [39.8283, -98.5795],
      zoom: 4,
      scrollWheelZoom: true,
    });

    L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
      attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>',
      maxZoom: 18,
    }).addTo(map);

    mapInstanceRef.current = map;

    return () => {
      map.remove();
      mapInstanceRef.current = null;
    };
  }, []);

  useEffect(() => {
    const map = mapInstanceRef.current;
    if (!map) return;

    // Clear existing markers
    map.eachLayer((layer) => {
      if (layer instanceof L.Marker) map.removeLayer(layer);
    });

    // Cluster by location to avoid overlapping
    const locationMap = new Map<string, { lat: number; lng: number; events: any[] }>();

    events.forEach((event) => {
      const loc = event.location;
      if (!loc?.coordinates?.lat || !loc?.coordinates?.lon) return;
      const key = `${loc.coordinates.lat.toFixed(2)},${loc.coordinates.lon.toFixed(2)}`;
      if (!locationMap.has(key)) {
        locationMap.set(key, { lat: loc.coordinates.lat, lng: loc.coordinates.lon, events: [] });
      }
      locationMap.get(key)!.events.push(event);
    });

    locationMap.forEach(({ lat, lng, events: locEvents }) => {
      const count = locEvents.length;
      const icon = count > 1
        ? L.divIcon({
            className: "custom-cluster-icon",
            html: `<div style="
              background: hsl(221, 83%, 53%);
              color: white;
              border-radius: 50%;
              width: ${Math.min(20 + count * 2, 40)}px;
              height: ${Math.min(20 + count * 2, 40)}px;
              display: flex;
              align-items: center;
              justify-content: center;
              font-size: 11px;
              font-weight: bold;
              border: 2px solid white;
              box-shadow: 0 2px 6px rgba(0,0,0,0.3);
            ">${count}</div>`,
            iconSize: [Math.min(20 + count * 2, 40), Math.min(20 + count * 2, 40)],
            iconAnchor: [Math.min(10 + count, 20), Math.min(10 + count, 20)],
          })
        : undefined;

      const marker = icon
        ? L.marker([lat, lng], { icon }).addTo(map)
        : L.marker([lat, lng]).addTo(map);

      const popupContent = locEvents.length === 1
        ? `<div style="max-width:250px"><b style="font-size:13px">${locEvents[0].name}</b><br/><span style="color:#666;font-size:11px">${new Date(locEvents[0].start).toLocaleDateString()}</span></div>`
        : `<div style="max-width:280px;max-height:200px;overflow-y:auto"><b>${count} Events</b><ul style="padding-left:16px;margin:4px 0">${locEvents.slice(0, 10).map((e: any) => `<li style="font-size:11px;margin:2px 0;cursor:pointer" class="event-link" data-id="${e.id}">${e.name}</li>`).join("")}${count > 10 ? `<li style="font-size:11px;color:#666">...and ${count - 10} more</li>` : ""}</ul></div>`;

      marker.bindPopup(popupContent);

      if (locEvents.length === 1) {
        marker.on("click", () => onEventClick(locEvents[0].id));
      } else {
        marker.on("popupopen", () => {
          const popup = marker.getPopup();
          if (!popup) return;
          const el = popup.getElement();
          if (!el) return;
          el.querySelectorAll(".event-link").forEach((link) => {
            link.addEventListener("click", () => {
              const id = Number(link.getAttribute("data-id"));
              if (id) onEventClick(id);
            });
          });
        });
      }
    });
  }, [events, onEventClick]);

  return (
    <div
      ref={mapRef}
      className="w-full h-[500px] rounded-xl border border-border/50 overflow-hidden"
      style={{ zIndex: 0 }}
    />
  );
}
