# Finanzas

PWA de finanzas personales para ingresos variables, pensada para iPhone. Los
datos viven solo en el dispositivo (IndexedDB); no hay servidores ni cuentas.

App publicada: https://jorgerojasmac.github.io/appfinanzas/

## Desarrollo

```bash
npm install
npm run dev        # http://localhost:5173/appfinanzas/
npm test           # pruebas de la lógica financiera
npm run build
```

En desarrollo:
- `?sim=1` simula la Dynamic Island y el indicador de inicio del iPhone 15 Pro.
- `?seed=1` carga los datos de ejemplo al abrir.

Cada push a `main` se compila, se prueba y se publica en GitHub Pages
(`.github/workflows/deploy.yml`).

## Reglas contables

- Montos en centavos enteros; fechas locales `YYYY-MM-DD`.
- Los saldos se calculan siempre a partir de los movimientos.
- Solo `income` y `expense` cuentan como ingreso o gasto, y siempre por
  `myAmount` (tu parte en gastos compartidos).
- Transferencias (incluido el pago de tarjetas) y liquidaciones con personas
  mueven dinero pero no son ingreso ni gasto: así nada se cuenta dos veces.

## Estructura

- `src/domain/`: lógica pura y probada (saldos, tarjetas, presupuestos,
  indicadores, colchón, recurrencias, filtros).
- `src/db/`: Dexie (esquema y migraciones), repositorio, datos de ejemplo y respaldo.
- `src/features/`: pantallas por funcionalidad.
- `src/components/`: componentes de interfaz estilo iOS y gráficos.
- `scripts/`: generación de íconos y pantallas de arranque.
