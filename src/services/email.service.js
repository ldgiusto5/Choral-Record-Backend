import nodemailer from 'nodemailer';

let transporter = null;

const getTransporter = async () => {
    if (transporter) {
        return transporter;
    }

    // Check if user has defined custom SMTP credentials in environment variables
    const hasCustomSmtp = process.env.SMTP_HOST && process.env.SMTP_USER && process.env.SMTP_PASS;

    if (hasCustomSmtp) {
        console.log('Using SMTP configuration from environment variables:', process.env.SMTP_HOST);
        transporter = nodemailer.createTransport({
            host: process.env.SMTP_HOST,
            port: Number(process.env.SMTP_PORT) || 587,
            secure: process.env.SMTP_SECURE === 'true',
            auth: {
                user: process.env.SMTP_USER,
                pass: process.env.SMTP_PASS
            },
            tls: {
                rejectUnauthorized: false
            }
        });
        
        try {
            // Verify connection
            await transporter.verify();
            console.log('SMTP connection verified successfully!');
            return transporter;
        } catch (error) {
            console.error('SMTP connection check failed with custom settings:', error.message);
            console.log('Falling back to Ethereal Email test account...');
        }
    } else {
        // Try using the default Outlook configurations if variables are partially defined
        console.log('Attempting default Outlook account connection...');
        transporter = nodemailer.createTransport({
            host: 'smtp-mail.outlook.com',
            port: 587,
            secure: false,
            auth: {
                user: 'choralrecord@outlook.com',
                pass: process.env.SMTP_PASS || 'NewPasChoral5Record5'
            },
            tls: {
                rejectUnauthorized: false
            }
        });
        
        try {
            await transporter.verify();
            console.log('Outlook SMTP connection verified successfully!');
            return transporter;
        } catch (error) {
            console.error('Outlook SMTP connection failed:', error.message);
            console.log('Falling back to Ethereal Email test account...');
        }
    }

    // If custom SMTP is not provided or it fails, use Ethereal Email for development/testing
    console.log('Inicializando cuenta de correo de prueba en Ethereal...');
    try {
        const testAccount = await nodemailer.createTestAccount();
        console.log('--------------------------------------------------');
        console.log('¡Cuenta de pruebas Ethereal creada con éxito!');
        console.log('Usuario:', testAccount.user);
        console.log('Contraseña:', testAccount.pass);
        console.log('Interfaz Web:', testAccount.web);
        console.log('--------------------------------------------------');

        transporter = nodemailer.createTransport({
            host: testAccount.smtp.host,
            port: testAccount.smtp.port,
            secure: testAccount.smtp.secure,
            auth: {
                user: testAccount.user,
                pass: testAccount.pass
            }
        });
        
        // Wrap sendMail to log the preview link automatically
        const originalSendMail = transporter.sendMail.bind(transporter);
        transporter.sendMail = async (mailOptions) => {
            const info = await originalSendMail(mailOptions);
            const previewUrl = nodemailer.getTestMessageUrl(info);
            console.log('--------------------------------------------------');
            console.log('✉️ Correo enviado (Modo Desarrollo - Ethereal)');
            console.log('Destinatario:', mailOptions.to);
            console.log('Asunto:', mailOptions.subject);
            console.log('Enlace de vista previa del correo (Copia y pega en tu navegador):');
            console.log(previewUrl);
            console.log('--------------------------------------------------');
            return info;
        };
    } catch (err) {
        console.error('Error al crear cuenta de prueba Ethereal:', err);
        console.log('Cambiando a modo simulado (offline).');
        // Fake transporter that does not crash
        transporter = {
            sendMail: async (mailOptions) => {
                console.log('--------------------------------------------------');
                console.log('✉️ Correo simulado (Servicio SMTP desconectado)');
                console.log('Destinatario:', mailOptions.to);
                console.log('Asunto:', mailOptions.subject);
                console.log('--------------------------------------------------');
                return { messageId: 'mock-id' };
            }
        };
    }

    return transporter;
};

export const sendVerificationEmail = async (email, name, token) => {
    const activeTransporter = await getTransporter();
    
    const frontendUrl = (process.env.FRONTEND_URL || 'http://localhost:5173').trim();
    const url = `${frontendUrl}/verify-email?token=${token}`;
    
    // Ensure the "from" header matches the actual authenticated user to avoid rejection
    const fromUser = activeTransporter.options?.auth?.user || 'choralrecord@outlook.com';
    const mailOptions = {
        from: `"Choral Record" <${fromUser}>`,
        to: email,
        subject: 'Verifica tu correo electrónico - Choral Record',
        html: `
            <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #ebd3a2; border-radius: 8px; background-color: #fefbf0; color: #333333;">
                <h2 style="color: #cda24b; text-align: center; margin-bottom: 24px;">¡Bienvenido a Choral Record!</h2>
                <p style="font-size: 16px; line-height: 1.5; color: #555555;">
                    Hola, <strong>${name}</strong>:
                </p>
                <p style="font-size: 16px; line-height: 1.5; color: #555555;">
                    Gracias por registrarte en la primera red social de coros y coralistas. Para activar tu cuenta, por favor verifica tu dirección de correo electrónico haciendo clic en el siguiente enlace:
                </p>
                <div style="text-align: center; margin: 32px 0;">
                    <a href="${url}" style="background: linear-gradient(135deg, #d4af37 0%, #aa7c11 100%); color: #ffffff; padding: 12px 30px; text-decoration: none; border-radius: 6px; font-weight: bold; font-size: 16px; display: inline-block; box-shadow: 0 4px 10px rgba(170,124,17,0.3);">Verificar mi cuenta</a>
                </div>
                <p style="font-size: 14px; line-height: 1.5; color: #777777;">
                    Si tienes problemas con el botón superior, copia y pega este enlace directo en la barra de tu navegador:
                </p>
                <p style="font-size: 13px; color: #cda24b; word-break: break-all; background-color: #f5f2e9; padding: 10px; border-radius: 4px;">
                    ${url}
                </p>
                <hr style="border: 0; border-top: 1px solid #ebd3a2; margin: 24px 0;">
                <p style="font-size: 11px; color: #999999; text-align: center; margin: 0;">
                    Este correo se envía automáticamente. Por favor, no respondas a este mensaje. El enlace de activación tiene una validez de 24 horas.
                </p>
            </div>
        `
    };

    return activeTransporter.sendMail(mailOptions);
};
