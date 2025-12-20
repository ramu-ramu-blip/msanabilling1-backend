import PDFDocument from 'pdfkit';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import logger from '../utils/logger.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

class PDFService {
    async generateInvoicePDF(invoice) {
        return new Promise((resolve, reject) => {
            try {
                const doc = new PDFDocument({ margin: 40, size: 'A4' });

                // In Vercel/Serverless, only /tmp is writable
                const isProduction = process.env.NODE_ENV === 'production';
                const invoicesDir = isProduction 
                    ? '/tmp' 
                    : path.join(__dirname, '../invoices');

                if (!fs.existsSync(invoicesDir)) {
                    fs.mkdirSync(invoicesDir, { recursive: true });
                }

                const fileName = `${invoice.invoiceNo.replace(/\//g, '-')}.pdf`;
                const filePath = path.join(invoicesDir, fileName);

                const stream = fs.createWriteStream(filePath);
                doc.pipe(stream);

                // --- HEADER SECTION (Violet Background) ---
                doc.rect(40, 40, 515, 30).fill('#9370DB').stroke(); // MediumPurple
                doc.fillColor('white').fontSize(16).font('Helvetica-Bold').text('Hospital Bill Book Format', 40, 48, { align: 'center', width: 515 });

                // Reset color
                doc.fillColor('black');

                // --- PATIENT & ADMISSION DETAILS ---
                let y = 80;
                doc.fontSize(10).font('Helvetica-Bold');
                doc.text('Bill No.:', 45, y).font('Helvetica').text(invoice.invoiceNo, 100, y);
                doc.font('Helvetica-Bold').text('Bill Date:', 350, y).font('Helvetica').text(new Date(invoice.createdAt).toLocaleDateString(), 420, y);

                y += 15;
                doc.font('Helvetica-Bold').text('Name of Patient:', 45, y).font('Helvetica').text(invoice.patientName, 130, y);

                y += 15;
                doc.font('Helvetica-Bold').text('Address:', 45, y).font('Helvetica').text(invoice.patientAddress || 'N/A', 130, y);

                y += 15;
                doc.font('Helvetica-Bold').text('Date/Time of Admission:', 45, y).font('Helvetica').text(invoice.admissionDate ? new Date(invoice.admissionDate).toLocaleString() : 'N/A', 180, y);
                doc.font('Helvetica-Bold').text('Date/Time of Discharge:', 350, y).font('Helvetica').text(invoice.dischargeDate ? new Date(invoice.dischargeDate).toLocaleString() : 'N/A', 480, y);

                y += 15;
                doc.font('Helvetica-Bold').text('Name of Treating Doctor:', 45, y).font('Helvetica').text(invoice.doctorName || 'Dr. Smith', 180, y);
                doc.font('Helvetica-Bold').text('Department:', 350, y).font('Helvetica').text(invoice.department || 'General', 480, y);

                y += 15;
                doc.font('Helvetica-Bold').text('Accommodation Type:', 45, y).font('Helvetica').text('Room', 180, y);
                doc.font('Helvetica-Bold').text('Room No.:', 350, y).font('Helvetica').text(invoice.roomNo || 'N/A', 480, y);

                y += 15;
                doc.font('Helvetica-Bold').text('Diagnosis:', 45, y).font('Helvetica').text(invoice.diagnosis || 'N/A', 130, y);

                // Separator Line
                y += 20;
                doc.moveTo(40, y).lineTo(555, y).stroke();

                // --- TABLE HEADER (Violet) ---
                y += 10;
                doc.rect(40, y, 515, 20).fill('#6A5ACD').stroke(); // SlateBlue
                doc.fillColor('white').fontSize(9).font('Helvetica-Bold');
                doc.text('Sl. No.', 45, y + 5, { width: 40, align: 'center' });
                doc.text('Description', 90, y + 5, { width: 200, align: 'center' }); // Merged Professional Fees/Billing Heads
                doc.text('Unit', 300, y + 5, { width: 40, align: 'center' });
                doc.text('Qty', 350, y + 5, { width: 40, align: 'center' });
                doc.text('Price / Unit', 400, y + 5, { width: 60, align: 'center' });
                doc.text('GST (%)', 470, y + 5, { width: 40, align: 'center' });
                doc.text('Amount', 510, y + 5, { width: 45, align: 'center' });

                // --- TABLE ROWS ---
                y += 20;
                doc.fillColor('black').font('Helvetica');

                let totalAmount = 0;

                invoice.items.forEach((item, index) => {
                    // Row Background (Alternating - optional, keeping simple for now)
                    // doc.rect(40, y, 515, 20).stroke();

                    doc.text(index + 1, 45, y + 5, { width: 40, align: 'center' });
                    doc.text(item.productName, 90, y + 5, { width: 200 });
                    doc.text('Unit', 300, y + 5, { width: 40, align: 'center' }); // Static unit for now
                    doc.text(item.qty, 350, y + 5, { width: 40, align: 'center' });
                    doc.text(item.unitRate.toFixed(2), 400, y + 5, { width: 60, align: 'right' });
                    doc.text(`${item.gstPct}%`, 470, y + 5, { width: 40, align: 'center' });
                    doc.text(item.amount.toFixed(2), 510, y + 5, { width: 40, align: 'right' });

                    // Horizontal Line
                    doc.moveTo(40, y + 20).lineTo(555, y + 20).lineWidth(0.5).strokeColor('#ccc').stroke().strokeColor('black').lineWidth(1);

                    y += 20;
                });

                // --- TOTALS SECTION ---
                y += 10;
                const bottomStart = y;

                // Amount in Words Box
                doc.rect(40, y, 300, 80).stroke();
                doc.text('Amount In Words:', 45, y + 10);
                // Requires separate number-to-words lib, placeholder for now
                // doc.text(convertNumberToWords(invoice.netPayable), 45, y + 30, { width: 290 });

                // Totals Grid
                const rightX = 340;
                doc.rect(rightX, y, 215, 80).stroke();

                let currentY = y;
                const rowHeight = 20;

                // Subtotal
                doc.text('Sub Total', rightX + 5, currentY + 5);
                doc.text(`₹ ${invoice.subTotal.toFixed(2)}`, rightX + 110, currentY + 5, { align: 'right', width: 95 });
                doc.moveTo(rightX, currentY + rowHeight).lineTo(555, currentY + rowHeight).stroke();
                currentY += rowHeight;

                // Discount
                doc.text('Discount', rightX + 5, currentY + 5);
                doc.text(`₹ ${(invoice.discountTotal || 0).toFixed(2)}`, rightX + 110, currentY + 5, { align: 'right', width: 95 });
                doc.moveTo(rightX, currentY + rowHeight).lineTo(555, currentY + rowHeight).stroke();
                currentY += rowHeight;

                // Final Amount (Violet bg)
                doc.rect(rightX, currentY, 215, rowHeight).fill('#6A5ACD').stroke();
                doc.fillColor('white').font('Helvetica-Bold');
                doc.text('Final Amount:', rightX + 5, currentY + 5);
                doc.text(`₹ ${invoice.netPayable.toFixed(2)}`, rightX + 110, currentY + 5, { align: 'right', width: 95 });
                doc.fillColor('black').font('Helvetica');
                currentY += rowHeight;

                // Amount Paid
                doc.text('Amount Paid:', rightX + 5, currentY + 5);
                doc.text(`₹ ${invoice.paid.toFixed(2)}`, rightX + 110, currentY + 5, { align: 'right', width: 95 });

                // --- FOOTER SECTION ---
                y = Math.max(y + 90, 700);

                // Declaration (Violet bg)
                doc.rect(40, y, 515, 20).fill('#6A5ACD').stroke();
                doc.fillColor('white').text('Declaration:', 45, y + 5);
                doc.fillColor('black');

                y += 60;

                // Signatures
                doc.text("Client's Signature", 100, y);
                doc.text("Business Signature", 400, y);

                // Generated By
                if (invoice.createdBy && invoice.createdBy.name) {
                    doc.fontSize(8).text(`Generated by: ${invoice.createdBy.name}`, 40, y + 30);
                }

                doc.end();

                stream.on('finish', () => {
                    logger.info(`PDF generated: ${fileName}`);
                    resolve(filePath);
                });

                stream.on('error', (error) => {
                    logger.error(`PDF generation error: ${error.message}`);
                    reject(error);
                });
            } catch (error) {
                logger.error(`PDF service error: ${error.message}`);
                reject(error);
            }
        });
    }
}

const pdfService = new PDFService();

export default pdfService;
