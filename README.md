# Finanzas

PWA de finanzas personales para ingresos variables. Los datos viven solo en el
dispositivo (IndexedDB); no hay servidores ni cuentas.

```bash
npm install
npm run dev        # http://localhost:5173/appfinanzas/  (agrega ?sim=1 para simular la Dynamic Island)
npm test           # pruebas de la lógica financiera
npm run build
```

Cada push a `main` se publica en https://jorgerojasmac.github.io/appfinanzas/
