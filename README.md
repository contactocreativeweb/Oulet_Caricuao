# Outlet Caricuao - PWA de Gestión de Ventas e Inventario

Este proyecto es una Progressive Web App (PWA) diseñada para optimizar la gestión comercial de tiendas minoristas, específicamente adaptada para manejar múltiples divisas (Dólares, Bolívares y USDT) y procesos de apartados de mercancía.

## 🚀 Tecnologías Principales
- **Frontend**: React.js + Vite
- **Estilos**: Vanilla CSS con diseño Premium y Responsivo.
- **Base de Datos**: Firebase Firestore (Tiempo Real).
- **Autenticación**: Firebase Auth (Google Login y Correo/Contraseña).
- **Animaciones**: Framer Motion.
- **Iconografía**: Lucide React.
- **Hosting**: Firebase Hosting.

---

## 🛠️ Funcionalidades Principales para Replicar

### 1. Sistema Multimoneda Dinámico
- **Tasas en Tiempo Real**: Integración de tasas BCV, Euro y Binance ( USDT/VES).
- **Conversiones Automáticas**: El sistema calcula montos en VES basándose en la tasa seleccionada por el usuario (BCV por defecto).
- **Pago Compartido**: Permite registrar una sola venta pagada con múltiples métodos (ej. una parte en $ y otra en Bolívares), manteniendo la contabilidad exacta en USD.

### 2. Flujo de Apartados (Layaway)
- **Regla de 2 Cuotas**: El sistema está optimizado para 2 pagos:
    - **Día 1**: Pago inicial (Abono) -> Incrementa "Monto por Cobrar".
    - **Día 2 (Retoma)**: Pago final -> Cierra la venta y marca como "Pagado Total".
- **Inventario**: La mercancía se descuenta del stock desde el primer pago para evitar sobreventas.

### 3. Herramientas de Pago Integradas (UX de Staff)
- **QR Automáticos**: Generación de códigos QR mediante `qrserver.com` para Pago Móvil y Binance Pay basados en datos preconfigurados.
- **Portapapeles**: Botones "Copiar Datos" para enviar rápidamente la información de pago al cliente.
- **Compartir por WhatsApp**: Generación de mensajes automáticos con los detalles de la venta y datos de pago móviles, incluyendo enlaces profundos (`deeplinks`) para apps bancarias.

### 4. Administración y Monitoreo
- **Equipo en Sesión**: Sistema de presencia en tiempo real que muestra quién está logueado.
- **Dashboard de Estadísticas**:
    1. Rentabilidad (Ventas - Gastos)
    2. Gastos Totales
    3. Monto por Cobrar (Cuentas pendientes)
    4. Ventas Totales
    5. Pendientes (Notas personales/recordatorios)
    6. Valor de Inventario (Precio x Stock)
    7. Promociones Activas

---

## 📋 Guía de Instalación y Despliegue

### Requisitos
- Node.js v18+
- Un proyecto en Firebase Console.

### Pasos
1. **Clonar y descargar dependencias**:
   ```bash
   npm install
   ```
2. **Configurar Firebase**:
   Crea un archivo `src/firebase.js` con las credenciales de tu proyecto.
3. **Reglas de Seguridad (Firestore)**:
   Asegúrate de permitir lectura/escritura a usuarios autenticados para las colecciones `inventory`, `sales`, `expenses`, `promotions`, `notes` y `active_sellers`.
4. **Desarrollo**:
   ```bash
   npm run dev
   ```
5. **Producción**:
   ```bash
   npm run build
   npx firebase deploy --only hosting
   ```

---

## 💡 Mejores Prácticas Aprendidas
- **Protección de Datos**: Usar `isInitial` en los listeners de Firebase para evitar que se disparen notificaciones por registros viejos al cargar la app.
- **Consistencia Visual**: Centralizar los colores en variables CSS (`:root`) para mantener un diseño premium consistente.
- **Calculadora Interna**: El uso de `eval()` para la calculadora de precios debe ser sanitizado siempre para evitar inyecciones de código malicioso.
- **Limpieza de Effects**: Siempre retornar una función de limpieza en `useEffect` que use `clearInterval` y `unsubscribe` para evitar fugas de memoria y errores de referencia.

---
*Desarrollado para Outlet Caricuao.*
