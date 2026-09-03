# LectorBilletesFrontend

Frontend React/Vite para orientar visualmente sobre el posible canje de billetes
chilenos. Incluye carga de anverso/reverso, modo de cámara con superposición AR
y búsqueda privada de centros de cambio.

## Desarrollo

```bash
npm install
cp .env.example .env
npm run dev
```

`VITE_API_URL` debe apuntar al endpoint `/analyze` del backend.

## Railway

`railway.json` ya configura Nixpacks, el build, el inicio, el healthcheck y los
reinicios. Solo debes crear el servicio desde este repositorio y agregar:

```env
VITE_API_URL=https://tu-backend.up.railway.app/analyze
```

La variable debe existir antes del build porque Vite la incorpora al bundle.
Después de cambiarla, ejecuta un redeploy del frontend.

La ubicación se procesa exclusivamente en el navegador y no se envía al backend
ni a OpenAI. Las direcciones se basan en la lista publicada por el Banco Central
de Chile; la disponibilidad debe confirmarse en el enlace oficial mostrado en la
interfaz.
