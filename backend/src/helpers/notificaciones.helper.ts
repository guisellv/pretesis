import { pool } from '../config/database';
import { APP_URL } from '../config/configEnv';
import { Reunion } from '../entities';
import { enviarCorreo } from './mail.helper';

// Notificaciones por correo cuando se crea, modifica o elimina algo.
// Se envían en segundo plano: si el correo falla, la acción del usuario igual se completa
// (el error solo queda en la consola del backend). Quien hizo el cambio no recibe el aviso.

type Fila = [etiqueta: string, valor: string];

function enSegundoPlano(descripcion: string, tarea: () => Promise<void>): void {
    tarea().catch((error) => console.error(`No se pudo enviar la notificación (${descripcion}):`, error));
}

function escaparHtml(texto: string): string {
    return texto
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#39;');
}

const pad = (valor: number) => String(valor).padStart(2, '0');

function formatoFecha(fecha: Date | string): string {
    const valor = new Date(fecha);
    return `${pad(valor.getDate())}/${pad(valor.getMonth() + 1)}/${valor.getFullYear()} a las ${pad(valor.getHours())}:${pad(valor.getMinutes())} hrs.`;
}

// Arma el texto plano y el HTML de un aviso con el mismo contenido
function armarCorreo(titulo: string, parrafos: string[], filas: Fila[] = []) {
    const pie = 'Este es un aviso automático de Agenda Comunitaria. No respondas a este correo.';
    const enlace = APP_URL ? `Ingresa a la agenda: ${APP_URL}` : '';

    const texto = [
        titulo,
        '',
        ...parrafos,
        ...(filas.length ? ['', ...filas.map(([etiqueta, valor]) => `${etiqueta}: ${valor}`)] : []),
        ...(enlace ? ['', enlace] : []),
        '',
        pie,
    ].join('\n');

    const tabla = filas.length
        ? `<table style="border-collapse:collapse;margin:16px 0;font-size:14px">${filas
            .map(([etiqueta, valor]) => `<tr>
<td style="padding:6px 12px 6px 0;color:#58545B;vertical-align:top;white-space:nowrap">${escaparHtml(etiqueta)}</td>
<td style="padding:6px 0;color:#1C252C;white-space:pre-line">${escaparHtml(valor)}</td></tr>`)
            .join('')}</table>`
        : '';

    const boton = APP_URL
        ? `<p style="margin:20px 0 0"><a href="${escaparHtml(APP_URL)}" style="display:inline-block;background:#1C252C;color:#ffffff;text-decoration:none;padding:10px 18px;border-radius:8px;font-size:14px">Ir a la agenda</a></p>`
        : '';

    const html = `<div style="background:#F6F2F6;padding:24px;font-family:Arial,Helvetica,sans-serif">
<div style="max-width:560px;margin:0 auto;background:#ffffff;border-radius:12px;overflow:hidden;border:1px solid #E1D5D9">
<div style="background:#1C252C;color:#ffffff;padding:16px 24px;font-size:16px;font-weight:bold">Agenda Comunitaria</div>
<div style="padding:24px;color:#1C252C;font-size:15px;line-height:1.5">
<h2 style="margin:0 0 12px;font-size:19px">${escaparHtml(titulo)}</h2>
${parrafos.map((parrafo) => `<p style="margin:0 0 10px">${escaparHtml(parrafo)}</p>`).join('\n')}
${tabla}
${boton}
</div>
<div style="padding:12px 24px;background:#F6F2F6;color:#58545B;font-size:12px">${pie}</div>
</div>
</div>`;

    return { texto, html };
}

// ---------- Consultas de apoyo ----------

async function nombreUsuario(usuarioId: number): Promise<string> {
    const result = await pool.query<{ nombre: string }>('SELECT "nombreCompleto" AS nombre FROM users WHERE id = $1', [usuarioId]);
    return result.rows[0]?.nombre ?? 'Un usuario';
}

async function nombreGrupo(grupoId: number): Promise<string> {
    const result = await pool.query<{ nombre: string }>('SELECT nombre FROM grupos WHERE id = $1', [grupoId]);
    return result.rows[0]?.nombre ?? 'el grupo';
}

// Correos de los integrantes del grupo, sin incluir a quien hizo el cambio.
// Se exporta para poder leerlos antes de eliminar el grupo.
export async function correosDelGrupo(grupoId: number, excluirUsuarioId: number, soloAdministradores = false): Promise<string[]> {
    const result = await pool.query<{ email: string }>(
        `SELECT u.email
         FROM usuarios_grupos ug
         INNER JOIN users u ON u.id = ug.usuario_id
         WHERE ug.grupo_id = $1 AND ug.usuario_id <> $2
           AND ($3::boolean = FALSE OR LOWER(ug.rol) = 'administrador')`,
        [grupoId, excluirUsuarioId, soloAdministradores]
    );

    return result.rows.map((fila) => fila.email);
}

function filasReunion(reunion: Reunion): Fila[] {
    const filas: Fila[] = [
        ['Título', reunion.titulo],
        ['Fecha', formatoFecha(reunion.fecha_inicio)],
        ['Termina', formatoFecha(reunion.fecha_fin)],
        ['Modalidad', reunion.modalidad === 'online' ? 'Online' : 'Presencial'],
    ];

    if (reunion.modalidad === 'online') {
        if (reunion.plataforma) filas.push(['Plataforma', reunion.plataforma]);
        if (reunion.enlace) filas.push(['Enlace', reunion.enlace]);
    } else if (reunion.direccion) {
        filas.push(['Dirección', reunion.direccion]);
    }

    if (reunion.descripcion) filas.push(['Descripción', reunion.descripcion]);

    return filas;
}

// Lista legible de lo que cambió entre la versión anterior y la nueva de una reunión
function cambiosReunion(anterior: Reunion, nueva: Reunion): string[] {
    const cambios: string[] = [];
    const lugar = (reunion: Reunion) => (reunion.modalidad === 'online' ? reunion.plataforma : reunion.direccion) ?? '';

    if (anterior.titulo !== nueva.titulo) cambios.push(`el título (antes: "${anterior.titulo}")`);
    if (new Date(anterior.fecha_inicio).getTime() !== new Date(nueva.fecha_inicio).getTime()) {
        cambios.push(`la fecha (antes: ${formatoFecha(anterior.fecha_inicio)})`);
    } else if (new Date(anterior.fecha_fin).getTime() !== new Date(nueva.fecha_fin).getTime()) {
        cambios.push('la hora de término');
    }
    if (anterior.modalidad !== nueva.modalidad) cambios.push('la modalidad');
    else if (lugar(anterior) !== lugar(nueva) || (anterior.enlace ?? '') !== (nueva.enlace ?? '')) {
        cambios.push(nueva.modalidad === 'online' ? 'la plataforma o el enlace' : 'la dirección');
    }
    if ((anterior.descripcion ?? '') !== (nueva.descripcion ?? '')) cambios.push('la descripción');

    return cambios;
}

// ---------- Reuniones ----------

export function notificarReunionCreada(reunion: Reunion, actorId: number): void {
    enSegundoPlano('reunión creada', async () => {
        const [para, actor, grupo] = await Promise.all([
            correosDelGrupo(reunion.grupo_id, actorId),
            nombreUsuario(actorId),
            nombreGrupo(reunion.grupo_id),
        ]);

        const { texto, html } = armarCorreo(
            'Nueva reunión programada',
            [`${actor} programó una nueva reunión en el grupo "${grupo}".`, 'Entra a la agenda para confirmar si asistirás.'],
            filasReunion(reunion)
        );

        await enviarCorreo({ para, asunto: `Nueva reunión: ${reunion.titulo}`, texto, html });
    });
}

export function notificarReunionModificada(anterior: Reunion, nueva: Reunion, actorId: number): void {
    const cambios = cambiosReunion(anterior, nueva);
    if (cambios.length === 0) return; // se guardó sin cambios
    const cambioFecha = new Date(anterior.fecha_inicio).getTime() !== new Date(nueva.fecha_inicio).getTime();

    enSegundoPlano('reunión modificada', async () => {
        const [para, actor, grupo] = await Promise.all([
            correosDelGrupo(nueva.grupo_id, actorId),
            nombreUsuario(actorId),
            nombreGrupo(nueva.grupo_id),
        ]);

        const { texto, html } = armarCorreo(
            'Se modificó una reunión',
            [
                `${actor} modificó la reunión "${anterior.titulo}" del grupo "${grupo}".`,
                `Cambió ${cambios.join(', ')}. Así quedó:`,
                ...(cambioFecha ? ['Como cambió la fecha, vuelve a confirmar tu asistencia en la agenda.'] : []),
            ],
            filasReunion(nueva)
        );

        await enviarCorreo({ para, asunto: `Reunión modificada: ${nueva.titulo}`, texto, html });
    });
}

export function notificarReunionEliminada(reunion: Reunion, actorId: number): void {
    enSegundoPlano('reunión eliminada', async () => {
        const [para, actor, grupo] = await Promise.all([
            correosDelGrupo(reunion.grupo_id, actorId),
            nombreUsuario(actorId),
            nombreGrupo(reunion.grupo_id),
        ]);

        const { texto, html } = armarCorreo(
            'Se canceló una reunión',
            [`${actor} eliminó la reunión "${reunion.titulo}" del grupo "${grupo}". Ya no se realizará.`],
            [['Título', reunion.titulo], ['Fecha', formatoFecha(reunion.fecha_inicio)]]
        );

        await enviarCorreo({ para, asunto: `Reunión cancelada: ${reunion.titulo}`, texto, html });
    });
}

export function notificarActaGuardada(reunionId: number, creada: boolean, actorId: number): void {
    enSegundoPlano('acta guardada', async () => {
        const result = await pool.query<Reunion>('SELECT * FROM reuniones WHERE id = $1', [reunionId]);
        const reunion = result.rows[0];
        if (!reunion) return;

        const [para, actor, grupo] = await Promise.all([
            correosDelGrupo(reunion.grupo_id, actorId),
            nombreUsuario(actorId),
            nombreGrupo(reunion.grupo_id),
        ]);

        const { texto, html } = armarCorreo(
            creada ? 'Se registró el acta de una reunión' : 'Se actualizó el acta de una reunión',
            [`${actor} ${creada ? 'registró' : 'modificó'} el acta de la reunión "${reunion.titulo}" del grupo "${grupo}". Puedes revisarla en la agenda.`],
            [['Reunión', reunion.titulo], ['Fecha', formatoFecha(reunion.fecha_inicio)]]
        );

        await enviarCorreo({ para, asunto: `Acta ${creada ? 'registrada' : 'actualizada'}: ${reunion.titulo}`, texto, html });
    });
}

// ---------- Grupos ----------

export function notificarGrupoRenombrado(grupoId: number, nombreAnterior: string, nombreNuevo: string, actorId: number): void {
    if (nombreAnterior === nombreNuevo) return;

    enSegundoPlano('grupo renombrado', async () => {
        const [para, actor] = await Promise.all([correosDelGrupo(grupoId, actorId), nombreUsuario(actorId)]);

        const { texto, html } = armarCorreo(
            'Se cambió el nombre de un grupo',
            [`${actor} cambió el nombre del grupo "${nombreAnterior}" a "${nombreNuevo}".`]
        );

        await enviarCorreo({ para, asunto: `Grupo renombrado: ${nombreNuevo}`, texto, html });
    });
}

// Los correos se leen ANTES de eliminar el grupo (después ya no existen sus integrantes)
export function notificarGrupoEliminado(nombre: string, para: string[], actorId: number): void {
    enSegundoPlano('grupo eliminado', async () => {
        const actor = await nombreUsuario(actorId);

        const { texto, html } = armarCorreo(
            'Se eliminó un grupo',
            [`${actor} eliminó el grupo "${nombre}". También se eliminaron sus reuniones y actas.`]
        );

        await enviarCorreo({ para, asunto: `Grupo eliminado: ${nombre}`, texto, html });
    });
}

// Aviso a los administradores del grupo
export function notificarNuevoIntegrante(grupoId: number, nuevoUsuarioId: number): void {
    enSegundoPlano('nuevo integrante', async () => {
        const [para, nuevo, grupo] = await Promise.all([
            correosDelGrupo(grupoId, nuevoUsuarioId, true),
            nombreUsuario(nuevoUsuarioId),
            nombreGrupo(grupoId),
        ]);

        const { texto, html } = armarCorreo(
            'Nuevo integrante en tu grupo',
            [`${nuevo} se unió al grupo "${grupo}" con el código de acceso.`]
        );

        await enviarCorreo({ para, asunto: `Nuevo integrante en ${grupo}`, texto, html });
    });
}

// Aviso a los administradores cuando alguien sale del grupo
export function notificarIntegranteSalio(grupoId: number, usuarioId: number): void {
    enSegundoPlano('integrante salió', async () => {
        const [para, nombre, grupo] = await Promise.all([
            correosDelGrupo(grupoId, usuarioId, true),
            nombreUsuario(usuarioId),
            nombreGrupo(grupoId),
        ]);

        const { texto, html } = armarCorreo(
            'Un integrante salió de tu grupo',
            [`${nombre} salió del grupo "${grupo}".`]
        );

        await enviarCorreo({ para, asunto: `${nombre} salió de ${grupo}`, texto, html });
    });
}

// Aviso al integrante que el administrador quitó del grupo
export function notificarIntegranteQuitado(grupoId: number, usuarioId: number, actorId: number): void {
    enSegundoPlano('integrante quitado', async () => {
        const [correo, actor, grupo] = await Promise.all([
            pool.query<{ email: string }>('SELECT email FROM users WHERE id = $1', [usuarioId]),
            nombreUsuario(actorId),
            nombreGrupo(grupoId),
        ]);

        const { texto, html } = armarCorreo(
            'Ya no perteneces a un grupo',
            [
                `${actor}, administrador del grupo "${grupo}", te quitó del grupo.`,
                'Ya no verás sus reuniones. Si crees que es un error, pide un nuevo código de acceso al administrador.',
            ]
        );

        await enviarCorreo({ para: correo.rows.map((fila) => fila.email), asunto: `Saliste de ${grupo}`, texto, html });
    });
}

// Aviso al integrante cuyo rol cambió
export function notificarCambioRol(grupoId: number, usuarioId: number, rol: string, actorId: number): void {
    enSegundoPlano('cambio de rol', async () => {
        const [correo, actor, grupo] = await Promise.all([
            pool.query<{ email: string }>('SELECT email FROM users WHERE id = $1', [usuarioId]),
            nombreUsuario(actorId),
            nombreGrupo(grupoId),
        ]);

        const { texto, html } = armarCorreo(
            'Cambió tu rol en un grupo',
            [`${actor} cambió tu rol en el grupo "${grupo}". Ahora eres: ${rol}.`]
        );

        await enviarCorreo({ para: correo.rows.map((fila) => fila.email), asunto: `Tu rol en ${grupo}`, texto, html });
    });
}

// ---------- Cuentas de usuario ----------

type DatosCuenta = { nombre: string; correo: string; rol: string };

const nombreRolSistema = (rol: string) => (rol === 'admin' ? 'Administrador del sistema' : 'Usuario');

// Registro propio (actorId null) o cuenta creada por el administrador del sistema
export function notificarCuentaCreada(cuenta: DatosCuenta, actorId: number | null): void {
    enSegundoPlano('cuenta creada', async () => {
        const parrafos = actorId === null
            ? [`Hola ${cuenta.nombre}, tu cuenta se creó correctamente. Ya puedes iniciar sesión con este correo.`]
            : [
                `Hola ${cuenta.nombre}, ${await nombreUsuario(actorId)} te creó una cuenta en Agenda Comunitaria.`,
                'Pide tu contraseña al administrador o usa "¿Olvidaste tu contraseña?" en la pantalla de inicio para crear una nueva.',
            ];

        const { texto, html } = armarCorreo(
            'Bienvenido a Agenda Comunitaria',
            parrafos,
            [['Correo', cuenta.correo], ['Tipo de cuenta', nombreRolSistema(cuenta.rol)]]
        );

        await enviarCorreo({ para: [cuenta.correo], asunto: 'Tu cuenta fue creada', texto, html });
    });
}

export function notificarCuentaModificada(
    anterior: DatosCuenta,
    nueva: DatosCuenta,
    claveCambiada: boolean,
    actorId: number
): void {
    const cambios: string[] = [];
    if (anterior.nombre !== nueva.nombre) cambios.push('el nombre');
    if (anterior.correo !== nueva.correo) cambios.push('el correo');
    if (anterior.rol !== nueva.rol) cambios.push('el tipo de cuenta');
    if (claveCambiada) cambios.push('la contraseña');
    if (cambios.length === 0) return;

    enSegundoPlano('cuenta modificada', async () => {
        const actor = await nombreUsuario(actorId);

        const { texto, html } = armarCorreo(
            'Se modificó tu cuenta',
            [
                `Hola ${nueva.nombre}, ${actor} modificó ${cambios.join(', ')} de tu cuenta.`,
                'Si no reconoces este cambio, comunícate con el administrador.',
            ],
            [['Nombre', nueva.nombre], ['Correo', nueva.correo], ['Tipo de cuenta', nombreRolSistema(nueva.rol)]]
        );

        // Si cambió el correo, se avisa también al anterior
        await enviarCorreo({ para: [nueva.correo, anterior.correo], asunto: 'Tu cuenta fue modificada', texto, html });
    });
}

export function notificarCuentaEliminada(cuenta: Pick<DatosCuenta, 'nombre' | 'correo'>): void {
    enSegundoPlano('cuenta eliminada', async () => {
        const { texto, html } = armarCorreo(
            'Tu cuenta fue eliminada',
            [`Hola ${cuenta.nombre}, el administrador eliminó tu cuenta de Agenda Comunitaria. Ya no podrás iniciar sesión.`]
        );

        await enviarCorreo({ para: [cuenta.correo], asunto: 'Tu cuenta fue eliminada', texto, html });
    });
}
