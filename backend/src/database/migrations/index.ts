import { Migracion } from './tipos';
import { migracion as m001 } from './001_crear_users';
import { migracion as m002 } from './002_crear_grupos';
import { migracion as m003 } from './003_crear_usuarios_grupos';
import { migracion as m004 } from './004_crear_reuniones';
import { migracion as m005 } from './005_modalidad_reuniones';
import { migracion as m006 } from './006_crear_formularios';
import { migracion as m007 } from './007_crear_recuperacion_clave';
import { migracion as m008 } from './008_ampliar_codigo_acceso';
import { migracion as m009 } from './009_fechas_grupos_usuarios';

// Orden en que se aplican. Para un cambio nuevo en la base: crear 009_... y agregarlo al final.
// Nunca modificar una migración que ya se aplicó; siempre crear una nueva.
export const migraciones: Migracion[] = [m001, m002, m003, m004, m005, m006, m007, m008, m009];

export type { Migracion };
