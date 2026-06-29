import { MapContainer, TileLayer, CircleMarker, Popup, Tooltip } from "react-leaflet";
import { AlertTriangle } from "lucide-react";
import "leaflet/dist/leaflet.css";

const incidents = [
  { id: 1, lat: 28.6448, lng: 77.2167, city: "NEW DELHI",  label: "Critical",    status: "Pothole on Ring Road",            color: "#ef4444", fill: "#ef4444" },
  { id: 2, lat: 19.076,  lng: 72.877,  city: "MUMBAI",     label: "In Progress", status: "Flooding — Andheri West",          color: "#eab308", fill: "#eab308" },
  { id: 3, lat: 12.971,  lng: 77.594,  city: "BENGALURU",  label: "Resolved",    status: "Streetlight fixed — Koramangala",  color: "#22c55e", fill: "#22c55e" },
  { id: 4, lat: 22.572,  lng: 88.363,  city: "KOLKATA",    label: "New",         status: "Garbage overflow — Salt Lake",     color: "#3b82f6", fill: "#3b82f6" },
  { id: 5, lat: 17.385,  lng: 78.486,  city: "HYDERABAD",  label: "Critical",    status: "Broken drain — Banjara Hills",     color: "#ef4444", fill: "#ef4444" },
  { id: 6, lat: 26.912,  lng: 75.787,  city: "JAIPUR",     label: "Resolved",    status: "Road repaired — Jaipur City",      color: "#22c55e", fill: "#22c55e" },
];

const statusCounts = {
  critical:   incidents.filter(i => i.label === "Critical").length,
  inProgress: incidents.filter(i => i.label === "In Progress").length,
  newIssues:  incidents.filter(i => i.label === "New").length,
};

export function CityMapSection() {
  return (
    <section id="solutions" className="py-24 bg-[#f0f0f53d]">
      {/* Strip Leaflet tooltip chrome so labels look like the reference */}
      <style>{`
        .incident-label {
          background: transparent !important;
          border: none !important;
          box-shadow: none !important;
          padding: 0 !important;
          color: #ffffff;
          font-size: 11px;
          font-weight: 700;
          letter-spacing: 0.05em;
          font-family: 'Inter', sans-serif;
          white-space: nowrap;
          text-shadow: 0 1px 3px rgba(0,0,0,0.9), 0 0 6px rgba(0,0,0,0.7);
        }
        .incident-label::before { display: none !important; }
        .leaflet-tooltip-left.incident-label::before,
        .leaflet-tooltip-right.incident-label::before { display: none !important; }
      `}</style>

      <div className="container mx-auto px-8">
        <div className="text-center mb-12">
          <h2 className="text-3xl lg:text-4xl font-bold font-['Plus_Jakarta_Sans'] mb-4 text-white">
            Live Incident Map
          </h2>
          <p className="text-white/60 max-w-2xl mx-auto font-['Inter']">
            Geospatial intelligence that tracks every reported issue in real-time, helping
            dispatchers route the closest available workers.
          </p>
        </div>

        <div className="relative w-full h-[600px] rounded-3xl overflow-hidden border border-white/10 shadow-2xl">
          <MapContainer
            center={[22.5, 80.5]}
            zoom={5}
            scrollWheelZoom={false}
            style={{ height: "100%", width: "100%" }}
            zoomControl={true}
          >
            <TileLayer
              url="https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png"
              attribution='&copy; <a href="https://carto.com/">CARTO</a> &copy; <a href="https://www.openstreetmap.org/copyright">OSM</a>'
              subdomains="abcd"
              maxZoom={19}
            />

            {incidents.map((inc) => (
              <CircleMarker
                key={inc.id}
                center={[inc.lat, inc.lng]}
                radius={12}
                pathOptions={{
                  color: "#ffffff",
                  weight: 2,
                  fillColor: inc.fill,
                  fillOpacity: 1,
                }}
              >
                {/* Permanent city-name label — matches reference screenshot */}
                <Tooltip
                  permanent
                  direction="right"
                  offset={[14, 0]}
                  className="incident-label"
                >
                  {inc.city}
                </Tooltip>

                {/* Click popup for incident detail */}
                <Popup>
                  <div style={{ fontSize: 12, lineHeight: 1.5 }}>
                    <div style={{ fontWeight: 700, marginBottom: 2, color: inc.color }}>{inc.label}</div>
                    <div>{inc.status}</div>
                  </div>
                </Popup>
              </CircleMarker>
            ))}
          </MapContainer>

          {/* Live Status overlay */}
          <div className="absolute top-4 right-4 z-[1000] bg-black/70 backdrop-blur-md border border-white/10 rounded-xl p-4 w-44 pointer-events-auto">
            <h4 className="text-sm font-bold text-white mb-3 flex items-center gap-2">
              <AlertTriangle className="w-4 h-4 text-yellow-400" />
              Live Status
            </h4>
            <div className="space-y-2 text-xs">
              <div className="flex justify-between text-white/80">
                <span>Critical</span>
                <span className="text-red-400 font-bold">{statusCounts.critical}</span>
              </div>
              <div className="flex justify-between text-white/80">
                <span>In Progress</span>
                <span className="text-yellow-400 font-bold">{statusCounts.inProgress}</span>
              </div>
              <div className="flex justify-between text-white/80">
                <span>New</span>
                <span className="text-blue-400 font-bold">{statusCounts.newIssues}</span>
              </div>
            </div>
          </div>

          {/* Legend */}
          <div className="absolute bottom-4 left-4 z-[1000] bg-black/70 backdrop-blur-md border border-white/10 rounded-xl px-4 py-3 flex gap-4 text-xs text-white/70">
            {[
              { color: "#ef4444", label: "Critical" },
              { color: "#eab308", label: "In Progress" },
              { color: "#3b82f6", label: "New" },
              { color: "#22c55e", label: "Resolved" },
            ].map(l => (
              <div key={l.label} className="flex items-center gap-1.5">
                <span className="w-2.5 h-2.5 rounded-full inline-block" style={{ background: l.color }} />
                {l.label}
              </div>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}
