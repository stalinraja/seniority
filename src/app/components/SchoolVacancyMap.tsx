import "leaflet/dist/leaflet.css";
import L from "leaflet";
import { MapContainer, Marker, Popup, TileLayer } from "react-leaflet";
import markerIcon2x from "leaflet/dist/images/marker-icon-2x.png";
import markerIcon from "leaflet/dist/images/marker-icon.png";
import markerShadow from "leaflet/dist/images/marker-shadow.png";

L.Icon.Default.mergeOptions({
  iconRetinaUrl: markerIcon2x,
  iconUrl: markerIcon,
  shadowUrl: markerShadow,
});

interface SchoolVacancyMapProps {
  schools: any[];
}

function getCoordinate(value: any): number | null {
  const n = Number(value);
  return Number.isFinite(n) ? n : null;
}

function parseLatLngFromMapLink(link: string): [number, number] | null {
  if (!link) return null;
  const normalized = String(link).trim();
  const patterns = [
    /@(-?\d+(?:\.\d+)?),(-?\d+(?:\.\d+)?)/,
    /[?&]q=(-?\d+(?:\.\d+)?),(-?\d+(?:\.\d+)?)/,
    /[?&]query=(-?\d+(?:\.\d+)?),(-?\d+(?:\.\d+)?)/,
    /[?&]ll=(-?\d+(?:\.\d+)?),(-?\d+(?:\.\d+)?)/,
    /!3d(-?\d+(?:\.\d+)?)!4d(-?\d+(?:\.\d+)?)/,
  ];
  for (const pattern of patterns) {
    const match = normalized.match(pattern);
    if (match) {
      const lat = Number(match[1]);
      const lng = Number(match[2]);
      if (Number.isFinite(lat) && Number.isFinite(lng)) {
        return [lat, lng];
      }
    }
  }
  return null;
}

function getSchoolName(row: any) {
  return row.name || row.Name || row["School Name"] || row.schoolName || "School";
}

function getSchoolId(row: any) {
  return row.schoolId || row["School ID"] || row.id || "";
}

function getVacancyValue(row: any) {
  return Number(
    row.vacancy ||
      row.Vacancy ||
      row["Total Vacancy"] ||
      row["Vacancy Count"] ||
      0
  );
}

function getTypeValue(row: any) {
  return String(row.type || row["School Type"] || row["Type"] || "").trim();
}

function getDepartmentVacancyValue(row: any) {
  return String(
    row.departmentVacancy ||
      row["Department Vacancy"] ||
      row["Subject/Department Vacancy"] ||
      row["Subject / Department Vacancy"] ||
      row["Subject Vacancy"] ||
      ""
  ).trim();
}

function pinColorByType(type: string) {
  const normalized = String(type || "").toLowerCase();
  if (normalized.includes("high") || normalized.includes("higher")) {
    return "#16a34a";
  }
  if (normalized.includes("middle")) {
    return "#2563eb";
  }
  return "#475569";
}

function createVacancyIcon(vacancy: number, type: string) {
  const value = Number.isFinite(vacancy) ? vacancy : 0;
  const pinColor = pinColorByType(type);
  return L.divIcon({
    className: "vacancy-pin",
    html: `
      <div style="background:${pinColor};color:#fff;border:2px solid #fff;border-radius:9999px;min-width:28px;height:28px;padding:0 8px;display:flex;align-items:center;justify-content:center;font-size:12px;font-weight:700;box-shadow:0 4px 10px rgba(0,0,0,0.25);">
        ${value}
      </div>
    `,
    iconSize: [28, 28],
    iconAnchor: [14, 14],
    popupAnchor: [0, -12],
  });
}

export function SchoolVacancyMap({ schools }: SchoolVacancyMapProps) {
  const mapped = schools
    .map((row) => {
      const mapLink = row.maplink || row.mapLink || row["Map Link"] || "";
      const lat =
        getCoordinate(row.latitude) ??
        getCoordinate(row.Latitude) ??
        getCoordinate(row.lat) ??
        getCoordinate(row.Lat) ??
        getCoordinate(row["School Latitude"]);
      const lng =
        getCoordinate(row.longitude) ??
        getCoordinate(row.Longitude) ??
        getCoordinate(row.lng) ??
        getCoordinate(row.Lng) ??
        getCoordinate(row["School Longitude"]);
      const latLng = lat !== null && lng !== null ? ([lat, lng] as [number, number]) : parseLatLngFromMapLink(mapLink);
      const directionsLink =
        latLng && latLng.length === 2
          ? `https://www.google.com/maps/dir/?api=1&destination=${latLng[0]},${latLng[1]}`
          : mapLink;
      return {
        id: getSchoolId(row),
        name: getSchoolName(row),
        type: getTypeValue(row),
        departmentVacancy: getDepartmentVacancyValue(row),
        mapLink,
        directionsLink,
        vacancy: getVacancyValue(row),
        latLng,
      };
    })
    .filter((row) => row.latLng);

  if (mapped.length === 0) {
    return (
      <div className="rounded-lg border border-gray-200 bg-white p-4 text-sm text-gray-600">
        No mappable school locations found. Add <code>Latitude</code> and <code>Longitude</code>
        columns in the vacancy sheet.
      </div>
    );
  }

  const center = mapped[0].latLng as [number, number];

  return (
    <div className="rounded-lg border border-gray-200 bg-white p-3 sm:p-4">
      <div className="h-[320px] sm:h-[420px] w-full rounded-md overflow-hidden">
        <MapContainer center={center} zoom={11} scrollWheelZoom style={{ height: "100%", width: "100%" }}>
          <TileLayer
            attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
            url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
          />
          {mapped.map((school) => (
            <Marker
              key={`${school.id}-${school.name}`}
              position={school.latLng as [number, number]}
              icon={createVacancyIcon(school.vacancy, school.type)}
            >
              <Popup>
                <div className="text-sm">
                  <div className="font-semibold">{school.name}</div>
                  <div>Type: {school.type || "Unknown"}</div>
                  <div>Vacancy: {school.vacancy}</div>
                  <div>Subject/Department: {school.departmentVacancy || "Not provided"}</div>
                  {school.directionsLink && (
                    <a
                      className="text-blue-600 underline"
                      href={school.directionsLink}
                      target="_blank"
                      rel="noreferrer"
                    >
                      Get Directions
                    </a>
                  )}
                </div>
              </Popup>
            </Marker>
          ))}
        </MapContainer>
      </div>
      <div className="mt-2 flex flex-wrap items-center gap-3 text-xs text-gray-600">
        <span className="inline-flex items-center gap-1">
          <span className="h-2.5 w-2.5 rounded-full bg-blue-600" />
          Elementry/Middle School
        </span>
        <span className="inline-flex items-center gap-1">
          <span className="h-2.5 w-2.5 rounded-full bg-green-600" />
          High/Higher Secondary School
        </span>
      </div>
    </div>
  );
}
