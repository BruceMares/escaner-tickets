# Configurar el login y las fotos (Supabase + Cloudinary, gratis)

La app usa **Supabase** para las cuentas (correo/contraseña y Google) y para guardar los tickets de cada usuario,
y **Cloudinary** para guardar las fotos de los tickets.

## 1. Crear el proyecto
1. Entra a https://supabase.com y crea tu cuenta (puedes usar GitHub o correo).
2. **New project** → ponle un nombre (`escaner-tickets`), crea una contraseña para la base de datos (guárdala) y elige la región más cercana (por ejemplo *East US*). Plan **Free**.
3. Espera 1–2 minutos a que se cree.

## 2. Crear la tabla de tickets
1. Menú izquierdo → **SQL Editor** → **New query**.
2. Copia todo el contenido de `docs/supabase.sql`, pégalo y da clic en **Run**. Debe decir *Success*.

## 3. Copiar las llaves a la app
1. Menú → **Project Settings** → **API** (o **Data API / API Keys**).
2. Copia:
   - **Project URL** (algo como `https://abcd1234.supabase.co`)
   - **anon public key** (o **publishable key**, empieza con `eyJ...` o `sb_publishable_...`)
3. Pégalas en `app/.env`:
   ```
   EXPO_PUBLIC_SUPABASE_URL=https://abcd1234.supabase.co
   EXPO_PUBLIC_SUPABASE_ANON_KEY=tu-llave-publica
   ```
   ⚠️ Nunca uses la llave **service_role / secret**: esa no va en la app.

## 4. Correo y contraseña
Menú → **Authentication** → **Sign In / Providers** → **Email**: viene activado.
- Para pruebas rápidas puedes **desactivar "Confirm email"**: así la cuenta queda lista al registrarse, sin tener que abrir un correo.

## 5. Dirección de regreso a la app
Menú → **Authentication** → **URL Configuration** → **Redirect URLs** → **Add URL**, agrega estas dos:
```
exp://**
escanertickets://**
```
(La primera es para Expo Go, la segunda para cuando la app se instale como app real.)

## 6. Iniciar sesión con Google
Necesitas un "cliente OAuth" de Google (gratis):
1. Entra a https://console.cloud.google.com con tu cuenta de Google y crea un proyecto (o usa uno existente).
2. **APIs y servicios** → **Pantalla de consentimiento de OAuth** (o *Google Auth Platform*) → configura: tipo **Externo**, nombre de la app, tu correo. En **Público/Audience**, agrega tu correo como **usuario de prueba**.
3. **Clientes** (o *Credenciales*) → **Crear cliente** → tipo **Aplicación web**.
   - En **URI de redireccionamiento autorizados** pega la que te muestra Supabase en
     *Authentication → Sign In / Providers → Google* (se ve como `https://abcd1234.supabase.co/auth/v1/callback`).
4. Copia el **ID de cliente** y el **Secreto del cliente**.
5. En Supabase → **Authentication → Sign In / Providers → Google** → actívalo, pega el ID y el secreto, y guarda.

## 7. Fotos de los tickets (Cloudinary, gratis)
1. Crea tu cuenta en https://cloudinary.com (plan **Free**).
2. En el **Dashboard / Home** copia tu **Cloud name** (por ejemplo `dxyz123ab`).
3. Ve a **Settings (⚙️) → Upload → Upload presets → Add upload preset**:
   - **Signing mode: Unsigned** (muy importante).
   - Nombre del preset: por ejemplo `tickets_app`.
   - (Opcional) **Folder**: `tickets`.
   - Guarda.
4. Pega en `app/.env`:
   ```
   EXPO_PUBLIC_CLOUDINARY_CLOUD_NAME=tu-cloud-name
   EXPO_PUBLIC_CLOUDINARY_UPLOAD_PRESET=tickets_app
   ```
   ⚠️ No pongas el **API Secret** de Cloudinary en la app; no se necesita.

Si no configuras Cloudinary, la app funciona igual pero guarda los tickets sin foto.

## 8. Reiniciar la app
Detén Expo (Ctrl+C) y vuelve a correr `npx expo start` para que lea el `.env`.
