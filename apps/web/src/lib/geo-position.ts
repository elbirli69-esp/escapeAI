export type GeoReading = {
  lat: number;
  lon: number;
  accuracyMeters: number;
};

export function getBrowserPosition(): Promise<GeoReading> {
  return new Promise((resolve, reject) => {
    if (!navigator.geolocation) {
      reject(new Error("Este navegador no expone geolocalización."));
      return;
    }
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        resolve({
          lat: pos.coords.latitude,
          lon: pos.coords.longitude,
          accuracyMeters: pos.coords.accuracy,
        });
      },
      (err) => {
        const msg =
          err.code === err.PERMISSION_DENIED
            ? "Permiso de ubicación denegado."
            : err.code === err.POSITION_UNAVAILABLE
              ? "No se pudo obtener GPS (prueba al aire libre)."
              : "Tiempo agotado al fijar posición.";
        reject(new Error(msg));
      },
      { enableHighAccuracy: true, timeout: 20000, maximumAge: 0 },
    );
  });
}
