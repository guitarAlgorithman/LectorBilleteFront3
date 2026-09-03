export const OFFICIAL_SOURCE =
  "https://www.billetesymonedas.cl/InformacionNormativa/CanjeBilletesMonedas";

// Direcciones publicadas por el Banco Central de Chile. Las coordenadas
// representan el centro de la ciudad y solo se usan para elegir la ciudad más
// cercana sin enviar la ubicación fuera del navegador.
export const exchangeCenters = [
  { city: "Santiago", lat: -33.4489, lng: -70.6693, centers: [
    ["Banco Central de Chile", "Agustinas 1180, Santiago"],
    ["BancoEstado", "Av. Libertador Bernardo O’Higgins 1111, Santiago"],
    ["Scotiabank", "Huérfanos 1090, Santiago"],
    ["BCI", "Huérfanos 1134, Santiago"],
    ["Banco de Chile", "Ahumada 251, Santiago"],
    ["Banco Santander", "Bandera 140, Santiago"],
  ]},
  { city: "Arica", lat: -18.4783, lng: -70.3126, centers: [["BancoEstado", "21 de Mayo 228, Arica"], ["BCI", "Bolognesi 221, Arica"]] },
  { city: "Iquique", lat: -20.2307, lng: -70.1357, centers: [["BancoEstado", "San Martín 301, Iquique"], ["Banco de Chile", "Plaza Prat 660, Iquique"]] },
  { city: "Antofagasta", lat: -23.6509, lng: -70.3975, centers: [["BancoEstado", "Arturo Prat 400, Antofagasta"], ["BCI", "Washington 2683, Antofagasta"]] },
  { city: "Calama", lat: -22.4544, lng: -68.9294, centers: [["BancoEstado", "Sotomayor 1848, Calama"]] },
  { city: "Copiapó", lat: -27.3668, lng: -70.3323, centers: [["BancoEstado", "Bernardo O’Higgins 694, Copiapó"], ["BCI", "Chacabuco 449, Copiapó"]] },
  { city: "La Serena", lat: -29.9027, lng: -71.2519, centers: [["BancoEstado", "Balmaceda 506, La Serena"], ["Banco Santander", "Gregorio Cordovez 351, La Serena"]] },
  { city: "San Felipe", lat: -32.75, lng: -70.725, centers: [["BancoEstado", "Arturo Prat 100, San Felipe"]] },
  { city: "Valparaíso", lat: -33.0472, lng: -71.6127, centers: [["BancoEstado", "Arturo Prat 656, Valparaíso"], ["Banco de Chile", "Arturo Prat 698, Valparaíso"]] },
  { city: "Viña del Mar", lat: -33.0153, lng: -71.55, centers: [["Scotiabank", "Arlegui 665, Viña del Mar"]] },
  { city: "Rancagua", lat: -34.1708, lng: -70.7444, centers: [["BancoEstado", "Independencia 666, Rancagua"]] },
  { city: "Talca", lat: -35.4264, lng: -71.6554, centers: [["BancoEstado", "Uno Sur 971, Talca"], ["BCI", "Uno Sur 732, Talca"]] },
  { city: "Chillán", lat: -36.6066, lng: -72.1034, centers: [["BancoEstado", "Constitución 500, Chillán"]] },
  { city: "Los Ángeles", lat: -37.4697, lng: -72.3537, centers: [["BancoEstado", "Colón 140, Los Ángeles"]] },
  { city: "Concepción", lat: -36.8201, lng: -73.0444, centers: [["BancoEstado", "Bernardo O’Higgins 486, Concepción"], ["Banco de Chile", "Bernardo O’Higgins 598, Concepción"]] },
  { city: "Temuco", lat: -38.7359, lng: -72.5904, centers: [["BancoEstado", "Claro Solar 931, Temuco"], ["BCI", "Manuel Bulnes 615, Temuco"]] },
  { city: "Valdivia", lat: -39.8196, lng: -73.2452, centers: [["BancoEstado", "Camilo Henríquez 562, Valdivia"]] },
  { city: "Osorno", lat: -40.574, lng: -73.1335, centers: [["BancoEstado", "Eleuterio Ramírez 741, Osorno"]] },
  { city: "Puerto Montt", lat: -41.4689, lng: -72.9411, centers: [["BancoEstado", "Urmeneta 444, Puerto Montt"], ["BCI", "Antonio Varas 560, Puerto Montt"]] },
  { city: "Coyhaique", lat: -45.5752, lng: -72.0662, centers: [["BancoEstado", "José de Moraleda 502, Coyhaique"]] },
  { city: "Punta Arenas", lat: -53.1638, lng: -70.9171, centers: [["BancoEstado", "Muñoz Gamero 799, Punta Arenas"], ["Banco de Chile", "Roca 864, Punta Arenas"]] },
];

export function nearestCity(latitude, longitude) {
  const toRad = (value) => (value * Math.PI) / 180;
  const distance = (point) => {
    const earthRadius = 6371;
    const dLat = toRad(point.lat - latitude);
    const dLng = toRad(point.lng - longitude);
    const a = Math.sin(dLat / 2) ** 2 +
      Math.cos(toRad(latitude)) * Math.cos(toRad(point.lat)) * Math.sin(dLng / 2) ** 2;
    return earthRadius * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  };
  return exchangeCenters
    .map((entry) => ({ ...entry, distanceKm: distance(entry) }))
    .sort((a, b) => a.distanceKm - b.distanceKm)[0];
}
