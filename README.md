# Proyecto de Título - Agenda Comunitaria (2026)

Bienvenido al repositorio oficial del proyecto **Agenda Comunitaria**, desarrollado como actividad de Titulación.

Esta plataforma web fue diseñada como una solución colaborativa específica para organizaciones comunitarias y funcionales (como Juntas de Vecinos y agrupaciones estudiantiles), centralizando la creación de agendas, redacción de actas y manteniendo un historial de trazabilidad automatizado para garantizar la transparencia institucional.

---

## Características Principales

El sistema está diseñado para reducir la fricción tecnológica y asegurar la integridad de los datos comunitarios:

*   👥 **Acceso Simplificado:** Sistema de autenticación de baja fricción mediante códigos alfanuméricos únicos, eliminando la barrera del correo electrónico para usuarios de distintas edades.
*   📝 **Módulo "Actas Vivas":** Motor central vinculado a un calendario de reuniones que permite la redacción, edición y gestión estructurada de los acuerdos y convenios en tiempo real.
*   🔍 **Motor de Trazabilidad Inmutable:** Registro automático y auditable en la base de datos de cada modificación (quién, cuándo y qué se alteró), promoviendo la rendición de cuentas.
*   🔐 **Control de Acceso (RBAC):** Gestión de roles diferenciados entre Administradores, Secretarios y Lectores, delimitando permisos según las funciones dentro de la agrupación.

---

## Arquitectura y Tecnologías

El proyecto sigue una arquitectura Cliente-Servidor. Actualmente en fase de Anteproyecto, la construcción se enfoca en una API REST robusta, escalable y estrictamente tipada.

### Backend (API REST)
*   **Entorno:** Node.js + Express
*   **Lenguaje:** TypeScript (ejecutado con `tsx` para que se compile mas rapido en desarrollo)
*   **Base de Datos:** PostgreSQL 

---

## Instalación y Uso Local

Para levantar el entorno de desarrollo de esta API en tu máquina, sigue estos pasos:

### 1. Clonar el repositorio
```bash
git clone [https://github.com/guisellv/pretesis.git](https://github.com/guisellv/pretesis.git)
cd pretesis