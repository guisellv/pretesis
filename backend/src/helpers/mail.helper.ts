import nodemailer, { Transporter } from 'nodemailer';
import { SMTP_CONFIGURADO, SMTP_FROM, SMTP_HOST, SMTP_PASS, SMTP_PORT, SMTP_USER } from '../config/configEnv';

let transporte: Transporter | null = null;

// Se crea una sola vez y se reutiliza en todos los envíos
function obtenerTransporte(): Transporter {
    if (!transporte) {
        transporte = nodemailer.createTransport({
            host: SMTP_HOST,
            port: SMTP_PORT,
            secure: SMTP_PORT === 465,
            auth: {
                user: SMTP_USER,
                pass: SMTP_PASS,
            },
        });
    }

    return transporte;
}

type Correo = {
    para: string[];
    asunto: string;
    texto: string;
    html: string;
};

// Envía un correo. Con varios destinatarios se usa copia oculta (CCO) para que nadie vea los correos de los demás.
export async function enviarCorreo({ para, asunto, texto, html }: Correo): Promise<void> {
    const destinatarios = [...new Set(para.filter(Boolean))];
    if (destinatarios.length === 0) return;

    if (!SMTP_CONFIGURADO) {
        // Modo desarrollo: sin SMTP configurado, el correo se muestra en la consola del backend.
        console.log(`[Correo] Para: ${destinatarios.join(', ')}\nAsunto: ${asunto}\n${texto}\n`);
        return;
    }

    const asuntoCompleto = `Agenda Comunitaria - ${asunto}`;

    if (destinatarios.length === 1) {
        await obtenerTransporte().sendMail({ from: SMTP_FROM, to: destinatarios[0], subject: asuntoCompleto, text: texto, html });
        return;
    }

    await obtenerTransporte().sendMail({ from: SMTP_FROM, to: SMTP_FROM, bcc: destinatarios, subject: asuntoCompleto, text: texto, html });
}

export async function enviarCodigoRecuperacion(correo: string, codigo: string): Promise<void> {
    await enviarCorreo({
        para: [correo],
        asunto: 'Recuperar contraseña',
        texto: `Tu código para recuperar la contraseña es: ${codigo}\n\nEl código vence en 15 minutos. Si no solicitaste este cambio, ignora este correo.`,
        html: `<p>Tu código para recuperar la contraseña es:</p>
<p style="font-size:24px;font-weight:bold;letter-spacing:4px">${codigo}</p>
<p>El código vence en 15 minutos. Si no solicitaste este cambio, ignora este correo.</p>`,
    });
}
