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

- Build command: `npm run build`
- Start command: `npm run start`
- Variable: `VITE_API_URL=https://tu-backend.up.railway.app/analyze`

La ubicación se procesa exclusivamente en el navegador y no se envía al backend
ni a OpenAI. Las direcciones se basan en la lista publicada por el Banco Central
de Chile; la disponibilidad debe confirmarse en el enlace oficial mostrado en la
interfaz.
