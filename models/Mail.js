const nodemailer = require('nodemailer');
const PDFDocument = require("pdfkit");
const fs = require("fs");
const path = require("path");

function getandCompleteHTML(){
    const html = `
    <div style="max-width: 600px; margin: auto; font-family: Arial, sans-serif;  padding: 20px; border-radius: 10px; box-shadow: 0 4px 8px rgb(80, 181, 255);">
  <h2 style="text-align: center; color: rgb(80, 181, 255);">Bienvenue chez MEAN Garage !</h2>
  <hr style="border: 1px solid rgb(80, 181, 255);">
  <p style="font-size: 16px;">Bonjour,</p>
  <p>Votre réservation a bien été prise en compte.
     Nous sommes ravis de vous accueillir et de vous offrir nos services de réparation et d'entretien automobile.</p>
  <div style=" padding: 15px; border-radius: 5px; text-align: center;">
      <p style="font-size: 18px; font-weight: bold; color: rgb(80, 181, 255);">📅 Voici les détails de votre rendez-vous :</p>
      <p style="font-size: 16px;">Date : <strong>{{DATE_RENDEZVOUS}}</strong</p>
      <p style="font-size: 16px;">Service : <strong>{{SERVICE}}</strong></p>
  </div>
  <p>Le devis approximatif est en pièce jointe.</p>
  <p>&nbsp;&nbsp;&nbsp;&nbsp;&nbsp; Restant à votre disposition.</p>
  <p> &nbsp;&nbsp;&nbsp;&nbsp;&nbsp; Cordialement , </p>
  <p>🚗 <strong>M1p12mean-Sahy-Miora </strong> – Votre garage de confiance.</p>
  <hr style="border: 1px solid rgb(80, 181, 255);">
  <p style="text-align: center; font-size: 14px; color: #aaaaaa;">Site web : <a href="https://m1p12mean-sahy-miora.netlify.app/">
    M1p12mean-Sahy-Miora
  </a>
   </p>
</div>
    `
    return html;
}

// async function sendMailUsingTemplate(auth_generique,toEmail,fromEmail,date,services){
//     try{
//         const transporter = nodemailer.createTransport({
//             host: 'smtp.mailersend.net',
//             port: 587,
//             secure: false, // true pour 465, false pour 587
//             auth: auth_generique,
//         });
//         const template = getandCompleteHTML(date,services);
//         const mailOptions = {
//             from: fromEmail,
//             to: toEmail, // Destinataire
//             subject: 'Confirmation de votre rendez-vous - M1p12mean-Sahy-Miora Garage',
//             html: template.replace('{{DATE_RENDEZVOUS}}', date)
//                               .replace('{{SERVICE}}', services),
//         };

//         // Envoi de l'email
//         const info = await transporter.sendMail(mailOptions);
//         console.log(" Email envoyé avec succès:", info.messageId);
//         return "Email envoyé avec succès !";
//     }catch (error) {
//         console.error("Erreur lors de l'envoi de l'email:", error);
//         throw new Error("Erreur lors de l'envoi de l'email.");
//     }
// }
// Fonction pour envoyer un email
async function sendMail(toEmail) {
    try {
        // Configuration du transporteur SMTP
        const transporter = nodemailer.createTransport({
            host: 'smtp.mailersend.net',
            port: 587,
            secure: false, // true pour 465, false pour 587
            auth: {
                user: 'MS_CxWqJP@trial-eqvygm0zr8dl0p7w.mlsender.net', // Ton adresse MailerSend
                pass: 'mssp.oAkDMyx.0r83ql3j1k0gzw1j.vwCuibS', // Ton API Key
            },
        });

        // Template HTML de l'email
        const htmlTemplate = `
        <div style="max-width: 600px; margin: auto; font-family: Arial, sans-serif; background-color: #1c1c1c; color: #ffffff; padding: 20px; border-radius: 10px; box-shadow: 0 4px 8px rgba(255, 193, 7, 0.5);">
            <h2 style="text-align: center; color: #ffc107;">Bienvenue chez MEAN Garage !</h2>
            <hr style="border: 1px solid #ffc107;">
            <p style="font-size: 16px;">Bonjour,</p>
            <p>Merci d'avoir réservé un rendez-vous chez <strong>MEAN Garage</strong>. Nous sommes ravis de vous accueillir et de vous offrir nos services de réparation et d'entretien automobile.</p>
            <div style="background-color: #333; padding: 15px; border-radius: 5px; text-align: center;">
                <p style="font-size: 18px; font-weight: bold; color: #ffc107;">📅 Détails de votre rendez-vous :</p>
                <p style="font-size: 16px;">Date : <strong>{{DATE_RENDEZVOUS}}</strong></p>
                <p style="font-size: 16px;">Heure : <strong>{{HEURE_RENDEZVOUS}}</strong></p>
                <p style="font-size: 16px;">Service : <strong>{{SERVICE}}</strong></p>
            </div>
            <p>Si vous avez des questions ou souhaitez modifier votre rendez-vous, n'hésitez pas à nous contacter.</p>
            <p>🚗 <strong>MEAN Garage</strong> – Votre garage de confiance.</p>
            <hr style="border: 1px solid #ffc107;">
            <p style="text-align: center; font-size: 14px; color: #aaaaaa;">📍 Adresse : 123 Rue du Garage, Ville</p>
            <p style="text-align: center; font-size: 14px; color: #aaaaaa;">📞 Téléphone : 01 23 45 67 89 | 📧 Email : contact@meangarage.com</p>
        </div>
        `;

        // Configuration de l'email
        const mailOptions = {
            from: 'MEAN Garage <MS_CxWqJP@trial-eqvygm0zr8dl0p7w.mlsender.net>',
            to: toEmail, // Destinataire
            subject: 'Confirmation de votre rendez-vous - MEAN Garage',
            html: htmlTemplate.replace('{{DATE_RENDEZVOUS}}', date)
                              .replace('{{SERVICE}}', services),
        };

        // Envoi de l'email
        const info = await transporter.sendMail(mailOptions);
        console.log("Email envoyé avec succès:", info.messageId);
        return "Email envoyé avec succès !";
    } catch (error) {
        console.error("❌ Erreur lors de l'envoi de l'email:", error);
        throw new Error("Erreur lors de l'envoi de l'email.");
    }
}

// async function sendMailUsingTemplate(auth_generique, toEmail, fromEmail, date, services) {
//     try {
//         const transporter = nodemailer.createTransport({
//             host: "smtp.mailersend.net",
//             port: 587,
//             secure: false, // true pour 465, false pour 587
//             auth: auth_generique,
//         });

//         // Génération du PDF
//         const pdfPath = await generateDevisPDF(date, services);

//         const template = getandCompleteHTML(date, services);
//         const mailOptions = {
//             from: fromEmail,
//             to: toEmail,
//             subject: "Confirmation de votre rendez-vous - Garage",
//             html: template.replace("{{DATE_RENDEZVOUS}}", date).replace("{{SERVICE}}", services),
//             attachments: [
//                 {
//                     filename: "devis.pdf",
//                     path: pdfPath,
//                     contentType: "application/pdf",
//                 },
//             ],
//         };

//         // Envoi de l'email
//         const info = await transporter.sendMail(mailOptions);
//         console.log("📩 Email envoyé avec succès:", info.messageId);

//         // Supprimer le fichier PDF après l'envoi
//         fs.unlink(pdfPath, (err) => {
//             if (err) console.error("❌ Erreur lors de la suppression du fichier PDF :", err);
//             else console.log("✅ Fichier PDF supprimé après envoi.");
//         });

//         return "Email envoyé avec succès !";
//     } catch (error) {
//         console.error("❌ Erreur lors de l'envoi de l'email:", error);
//         throw new Error("Erreur lors de l'envoi de l'email.");
//     }
// }

// pdf 

// Fonction pour générer le PDF du devis

async function sendMailUsingTemplate(auth_generique, toEmail, fromEmail, date, services) {
    let pdfPath;
    try {
        // 1. Configuration du transporteur SMTP
        const transporter = nodemailer.createTransport({
            host: "smtp.mailersend.net",
            port: 587,
            secure: false,
            auth: auth_generique,
            tls: { rejectUnauthorized: true } // À mettre à false seulement en développement
        });

        // 2. Génération du PDF
        pdfPath = await generateDevisPDF(date, services);
        if (!pdfPath) throw new Error("Échec de la génération du PDF");

        // 3. Récupération et validation du template
        let template =getandCompleteHTML(date, services);
        
        // Vérification que le template est bien une string
        if (typeof template !== 'string') {
            throw new Error("Le template HTML doit être une chaîne de caractères");
        }

        // 4. Remplacement des variables
        const htmlContent = template
            .replace(/{{DATE_RENDEZVOUS}}/g, date)
            .replace(/{{SERVICE}}/g, services);

        // 5. Configuration de l'email
        const mailOptions = {
            from: `Garage ${fromEmail}`,
            to: toEmail,
            subject: "Confirmation de votre rendez-vous - Garage",
            html: htmlContent,
            attachments: [
                {
                    filename: "devis.pdf",
                    path: pdfPath,
                    contentType: "application/pdf"
                }
            ]
        };

        // 6. Envoi de l'email
        const info = await transporter.sendMail(mailOptions);
        console.log("📩 Email envoyé avec succès:", info.messageId);

        // 7. Nettoyage
        try {
            await fs.unlink(pdfPath);
            console.log("✅ Fichier PDF supprimé");
        } catch (unlinkError) {
            console.error("⚠️ Erreur de suppression PDF:", unlinkError);
        }

        return info.messageId;

    } catch (error) {
        console.error("❌ Erreur critique:", error);
        
        // Nettoyage en cas d'erreur
        if (pdfPath) {
            try {
                await fs.unlink(pdfPath);
            } catch (cleanupError) {
                console.error("Échec du nettoyage:", cleanupError);
            }
        }
        
        throw error; // Propager l'erreur originale
    }
}
async function generateDevisPDF(date, services) {
    return new Promise((resolve, reject) => {
        try {
            const doc = new PDFDocument();
            const pdfPath = path.join(__dirname, `devis_${Date.now()}.pdf`);
            const stream = fs.createWriteStream(pdfPath);
            
            doc.pipe(stream);

            // En-tête du devis
            doc.fontSize(20).text("Devis de Rendez-vous", { align: "center" });
            doc.moveDown();
            doc.fontSize(12).text(`Date du rendez-vous : ${date}`);
            doc.moveDown();

            // Tableau des services
            doc.fontSize(14).text("Détails des services :", { underline: true });
            doc.moveDown();

            services.forEach((service, index) => {
                doc.fontSize(12).text(`${index + 1}. ${service.nom}`);
                doc.fontSize(10).text(`   Description : ${service.description}`);
                doc.fontSize(10).text(`   Prix : ${service.prix} Ar`);
                doc.fontSize(10).text(`   Durée : ${service.duree} min`);
                doc.moveDown();
            });

            doc.end();

            stream.on("finish", () => resolve(pdfPath));
            stream.on("error", reject);
        } catch (error) {
            reject(error);
        }
    });
}

module.exports = sendMailUsingTemplate;
