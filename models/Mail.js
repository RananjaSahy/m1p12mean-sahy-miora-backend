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

// async function sendMailUsingTemplate(auth_generique, toEmail, fromEmail, date, services) {
//     let pdfPath;
//     try {
//         // 1. Configuration du transporteur SMTP
//         const transporter = nodemailer.createTransport({
//             host: "smtp.mailersend.net",
//             port: 587,
//             secure: false,
//             auth: auth_generique,
//             tls: { rejectUnauthorized: true } // À mettre à false seulement en développement
//         });

//         // 2. Génération du PDF
//         pdfPath = await generateDevisPDF(date, services);
//         if (!pdfPath) throw new Error("Échec de la génération du PDF");

//         // 3. Récupération et validation du template
//         let template =getandCompleteHTML(date, services);
        
//         // Vérification que le template est bien une string
//         if (typeof template !== 'string') {
//             throw new Error("Le template HTML doit être une chaîne de caractères");
//         }

//         // 4. Remplacement des variables
//         const htmlContent = template
//             .replace(/{{DATE_RENDEZVOUS}}/g, date)
//             .replace(/{{SERVICE}}/g, services);

//         // 5. Configuration de l'email
//         const mailOptions = {
//             from: `Garage ${fromEmail}`,
//             to: toEmail,
//             subject: "Confirmation de votre rendez-vous - Garage",
//             html: htmlContent,
//             attachments: [
//                 {
//                     filename: "devis.pdf",
//                     path: pdfPath,
//                     contentType: "application/pdf"
//                 }
//             ]
//         };

//         // 6. Envoi de l'email
//         const info = await transporter.sendMail(mailOptions);
//         console.log("📩 Email envoyé avec succès:", info.messageId);

//         // 7. Nettoyage
//         try {
//             await fs.unlink(pdfPath);
//             console.log("✅ Fichier PDF supprimé");
//         } catch (unlinkError) {
//             console.error("⚠️ Erreur de suppression PDF:", unlinkError);
//         }

//         return info.messageId;

//     } catch (error) {
//         console.error("❌ Erreur critique:", error);
        
//         // Nettoyage en cas d'erreur
//         if (pdfPath) {
//             try {
//                 await fs.unlink(pdfPath);
//             } catch (cleanupError) {
//                 console.error("Échec du nettoyage:", cleanupError);
//             }
//         }
        
//         throw error; // Propager l'erreur originale
//     }
// }

async function sendMailUsingTemplate(auth_generique, toEmail, fromEmail, date, services,totalPrix,totalDuree) {
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
        pdfPath = await generateDevisPDF(date, services,totalPrix,totalDuree);
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
async function generateDevisPDF(date, services, totalPrix, totalDuree) {
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
                doc.fontSize(12).text(`${index + 1}. Service ID: ${service.service}`);
                doc.fontSize(10).text(`   Prix Estimé : ${service.prixEstime} Ar`);
                doc.fontSize(10).text(`   Durée Estimée : ${service.dureeEstimee} min`);
                doc.moveDown();
            });

            // Résumé total
            doc.moveDown();
            doc.fontSize(14).text("Total :", { underline: true });
            doc.fontSize(12).text(`Prix total : ${totalPrix} Ar`);
            doc.fontSize(12).text(`Durée totale : ${totalDuree} min`);

            doc.end();

            stream.on("finish", () => resolve(pdfPath));
            stream.on("error", reject);
        } catch (error) {
            reject(error);
        }
    });
}


module.exports = sendMailUsingTemplate;
