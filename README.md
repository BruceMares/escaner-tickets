# Escáner de Tickets con IA 🧾

App móvil (Expo / React Native) para registrar tus gastos con solo tomarle foto al ticket.
La IA (Gemini, de Google, en su plan gratuito) lee la foto, saca los productos y los precios, y la app te muestra en qué gastas más.

## Funciones

0. **Cuentas de usuario**: registro con correo y contraseña o con Google; cada usuario ve solo sus tickets.
1. **Escanear ticket**: con la cámara o desde la galería.
2. **Lectura con IA**: tienda, fecha, total y cada producto con su categoría (puedes corregir antes de guardar).
3. **Historial**: lista de tickets guardados, con su detalle y opción de borrarlos.
4. **Mis gastos**: total del mes, gráfica por categoría, productos y tiendas donde más gastas.
5. **Consejos de ahorro con IA** basados en tu resumen del mes.

## Arquitectura

```
[Login: correo o Google] → Supabase Auth → sesión guardada en el teléfono
[Cámara / Galería] → foto reducida (JPEG) → API de Gemini (visión) → JSON con productos
                                         └→ Cloudinary (foto guardada al confirmar)
                                                                       ↓
                       Pantallas: Historial · Gastos  ←  Supabase (tabla tickets, por usuario)
                                       ↓
                   Resumen de gastos (sin fotos) → API de Gemini → consejos de ahorro
```

- Los tickets se guardan en **Supabase** (PostgreSQL). Las reglas RLS hacen que cada usuario solo pueda leer y modificar los suyos.
- La foto del ticket se sube a **Cloudinary** (carpeta `tickets/<id del usuario>`) y su URL se guarda junto al ticket.

## Estructura

```
/app        Proyecto Expo (código de la app)
  App.tsx   Navegación por pestañas
  src/      Pantallas, conexión con la IA y guardado local
/docs       Documentación del proyecto
.github/    CI (GitHub Actions) y plantilla de Pull Request
```

## Cómo correrla

Necesitas Node.js 22+ y la app **Expo Go** en tu celular.

```bash
cd app
npm install
cp .env.example .env      # luego pon tu llave en .env
npx expo start
```

Escanea el código QR con Expo Go (Android) o con la cámara (iPhone). El teléfono y la compu deben estar en la misma red Wi‑Fi.

Para configurar el login, la base de datos y las fotos sigue [docs/configurar-login.md](docs/configurar-login.md).

### Variables de entorno

| Variable | Para qué |
|---|---|
| `EXPO_PUBLIC_SUPABASE_URL` | URL del proyecto de Supabase |
| `EXPO_PUBLIC_SUPABASE_ANON_KEY` | Llave pública (anon/publishable) de Supabase |
| `EXPO_PUBLIC_CLOUDINARY_CLOUD_NAME` | Cloud name de Cloudinary |
| `EXPO_PUBLIC_CLOUDINARY_UPLOAD_PRESET` | Upload preset **Unsigned** de Cloudinary |
| `EXPO_PUBLIC_GEMINI_API_KEY` | Llave de la API de Gemini (gratis en https://aistudio.google.com → Get API key) |

> ⚠️ Es un prototipo escolar: la llave queda dentro de la app. En una versión real, la llamada a la IA debe pasar por un servidor propio.
> En el plan gratuito de Gemini, Google puede usar lo que se le envía para mejorar sus productos.

## Calidad

```bash
cd app
npm run lint        # ESLint
npm run typecheck   # TypeScript
```

El CI de GitHub corre ambos en cada push y PR a `main` y `develop`, y revisa que los commits sigan el formato convencional (`feat: ...`, `fix: ...`, `docs: ...`).
