import nodemailer from 'nodemailer';
import { SMTP_CONFIGURADO, SMTP_FROM, SMTP_HOST, SMTP_PASS, SMTP_PORT, SMTP_USER } from '../config/configEnv';

export async function enviarCodigoRecuperacion(correo: string, codigo: string): Promise<void> {
    if (!SMTP_CONFIGURADO) {
        // Modo desarrollo: sin SMTP configurado, el código se muestra en la consola del backend.
        console.log(`[Recuperación de contraseña] Código para ${correo}: ${codigo}`);
        return;
    }

    const transporte = nodemailer.createTransport({
        host: SMTP_HOST,
        port: SMTP_PORT,
        secure: SMTP_PORT === 465,
        auth: {
            user: SMTP_USER,
            pass: SMTP_PASS,
        },
    });

    await transporte.sendMail({
        from: SMTP_FROM,
        to: correo,
        subject: 'Agenda Comunitaria - Recuperar contraseña',
        text: `Tu código para recuperar la contraseña es: ${codigo}\n\nEl código vence en 15 minutos. Si no solicitaste este cambio, ignora este correo.`,
        html: `<p>Tu código para recuperar la contraseña es:</p>
<p style="font-size:24px;font-weight:bold;letter-spacing:4px">${codigo}</p>
<p>El código vence en 15 minutos. Si no solicitaste este cambio, ignora este correo.</p>`,
    });
}
