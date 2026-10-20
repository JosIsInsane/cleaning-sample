# BrightNest Cleaning — Landing + Leads en Google Sheets

Landing de muestra (en inglés, para clientes en EE. UU.) con un formulario de cotización que guarda automáticamente los datos de contacto en una Google Sheet.

| Archivo | Para qué sirve |
|---|---|
| `index.html` | La landing page completa (un solo archivo, sin dependencias). |
| `Code.gs` | Script de Google Apps Script que recibe el formulario y escribe en la hoja. |

## Cómo funciona

1. El cliente llena el formulario en la landing.
2. El navegador manda los datos a tu Web App de Apps Script.
3. El script escribe en la pestaña **Leads**:
   - **Cliente nuevo** → agrega una fila con estado `New`.
   - **Email que ya existe** → **reescribe** esa fila con los datos nuevos (teléfono, servicio, fecha, etc.), actualiza `Last Updated`, suma 1 a `Submissions` y vuelve a ponerlo en `New`. Así no se duplican clientes.
4. (Opcional) Te llega un email de aviso por cada lead.

Columnas: `Created · Last Updated · First Name · Last Name · Email · Phone · ZIP · Service · Frequency · Preferred Date · Message · Submissions · Status · Source · Language`

## Idioma (inglés / español)
El botón 🌐 **Español / English** del menú traduce toda la página al instante. Recuerda la elección del visitante y, si su navegador está en español, la página abre directo en español.

- Los datos llegan a la hoja siempre con las opciones en inglés (servicio, frecuencia), así la hoja queda uniforme.
- La columna **Language** te dice en qué idioma llenó el formulario el cliente (`English` / `Spanish`), para que le respondas en su idioma.
- Para cambiar o agregar textos traducidos, edita el diccionario `ES` dentro del `<script>` de `index.html` (la clave es el texto en inglés exacto).

La columna **Status** tiene menú desplegable (New / Contacted / Quoted / Booked / Lost) con colores, para usarla como mini-CRM.

## Instalación (5 minutos)

1. Crea una Google Sheet nueva (ej. *BrightNest Leads*).
2. Menú **Extensiones → Apps Script**.
3. Borra lo que haya en `Code.gs` y pega el contenido de `Code.gs` de esta carpeta.
4. (Opcional) En la línea `NOTIFY_EMAIL`, pon tu correo para recibir avisos.
5. Guarda (💾). En la barra de funciones elige **`setup`** y dale **Ejecutar**. Acepta los permisos que pide Google (es tu propia cuenta).
   - Esto crea la pestaña `Leads` con encabezados, colores y el desplegable de estado.
6. **Implementar → Nueva implementación** → tipo **Aplicación web**:
   - *Ejecutar como*: **Yo**
   - *Quién tiene acceso*: **Cualquier usuario**
   - Clic en **Implementar** y copia la URL que termina en `/exec`.
7. Abre `index.html` y reemplaza:
   ```js
   const SCRIPT_URL = "PASTE_YOUR_APPS_SCRIPT_WEB_APP_URL_HERE";
   ```
   por tu URL `/exec`.
8. Abre la landing, envía el formulario y revisa la hoja. ✅

> **Importante:** si cambias `Code.gs` después, ve a **Implementar → Gestionar implementaciones → ✏️ → Versión: Nueva** para que la URL use el código nuevo.

### Probar sin la landing
En el editor de Apps Script ejecuta `testDoPost`: agrega un cliente de prueba. Ejecútalo otra vez y verás que **reescribe** la misma fila y `Submissions` pasa a 2.

## Publicar la landing
Es un solo archivo HTML: puedes subirlo gratis a **Netlify Drop**, **GitHub Pages**, **Cloudflare Pages** o cualquier hosting.

## Personalizar
- Nombre, teléfono, ciudad, precios y textos: busca `BrightNest`, `(512) 555-0147` y `Austin` en `index.html`.
- Colores: variables `--brand`, `--accent`, `--ink` al inicio del `<style>`.
- Las reseñas son de muestra (*Sample Customer*): cámbialas por reseñas reales antes de publicar.

## Seguridad incluida
- Campo *honeypot* oculto contra bots de spam.
- Bloqueo (`LockService`) para que dos envíos simultáneos no se pisen.
- Limpieza de texto que evita inyección de fórmulas en la hoja.
