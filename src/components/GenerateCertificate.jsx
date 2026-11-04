
import jsPDF from "jspdf";
import QRCode from "qrcode";

function GenerateCertificate({ certificate }) {
  const downloadCertificate = async () => {
    try {
      const pdf = new jsPDF({
        orientation: "landscape",
        unit: "mm",
        format: "a4"
      });

      const qrCode = await QRCode.toDataURL(
        certificate.verificationUrl,
        {
          width: 300,
          margin: 1
        }
      );

      // Background
      pdf.setFillColor(248, 250, 255);
      pdf.rect(0, 0, 297, 210, "F");

      // Outer border
      pdf.setDrawColor(35, 75, 130);
      pdf.setLineWidth(2);
      pdf.rect(8, 8, 281, 194);

      // Inner border
      pdf.setDrawColor(190, 160, 90);
      pdf.setLineWidth(0.7);
      pdf.rect(12, 12, 273, 186);

      // Heading
      pdf.setTextColor(35, 75, 130);
      pdf.setFont("times", "bold");
      pdf.setFontSize(28);
      pdf.text("CERTIFICATE", 148.5, 38, { align: "center" });

      pdf.setFontSize(13);
      pdf.text("OF ACHIEVEMENT", 148.5, 48, { align: "center" });

      // Decorative line
      pdf.setDrawColor(190, 160, 90);
      pdf.line(75, 55, 222, 55);

      // Description
      pdf.setTextColor(80, 80, 80);
      pdf.setFont("helvetica", "normal");
      pdf.setFontSize(13);
      pdf.text("This certificate is proudly presented to", 148.5, 70, {
        align: "center"
      });

      // Recipient
      pdf.setTextColor(25, 55, 100);
      pdf.setFont("times", "bolditalic");
      pdf.setFontSize(27);
      pdf.text(
        certificate.recipientName || "Recipient Name",
        148.5,
        87,
        { align: "center", maxWidth: 210 }
      );

      pdf.setDrawColor(190, 160, 90);
      pdf.line(65, 93, 232, 93);

      // Course
      pdf.setTextColor(80, 80, 80);
      pdf.setFont("helvetica", "normal");
      pdf.setFontSize(13);
      pdf.text("For successfully completing", 148.5, 106, {
        align: "center"
      });

      pdf.setTextColor(35, 75, 130);
      pdf.setFont("helvetica", "bold");
      pdf.setFontSize(20);
      pdf.text(
        certificate.courseName || "Course Name",
        148.5,
        119,
        { align: "center", maxWidth: 210 }
      );

      // Institution
      pdf.setTextColor(80, 80, 80);
      pdf.setFont("helvetica", "normal");
      pdf.setFontSize(12);
      pdf.text(
        certificate.issuingInstitution || "Issuing Institution",
        148.5,
        132,
        { align: "center", maxWidth: 210 }
      );

      // Certificate information
      let issueDate = "Not available";

      if (certificate.issueDate?.toDate) {
        issueDate = certificate.issueDate
          .toDate()
          .toLocaleDateString("en-IN");
      }

      pdf.setFontSize(10);
      pdf.setTextColor(70, 70, 70);

      pdf.text(`Certificate ID: ${certificate.certificateId}`, 25, 165);
      pdf.text(`Date of Issue: ${issueDate}`, 25, 173);

      // QR code
      pdf.addImage(qrCode, "PNG", 235, 145, 35, 35);

      pdf.setFontSize(8);
      pdf.text("Scan to verify certificate", 252.5, 184, {
        align: "center"
      });

      // Footer
      pdf.setFontSize(9);
      pdf.setTextColor(35, 75, 130);
      pdf.text("CERTVERIFY - DIGITAL CERTIFICATE VERIFICATION", 148.5, 192, {
        align: "center"
      });

      // Download
      pdf.save(`${certificate.certificateId}.pdf`);

    } catch (error) {
      console.error("PDF generation error:", error);
      alert("Unable to generate certificate PDF.");
    }
  };

  return (
    <button
      onClick={downloadCertificate}
      disabled={certificate.status === "REVOKED"}
      style={{
        padding: "8px 12px",
        background: "#e0ecff",
        color: "#1d4ed8",
        border: "none",
        borderRadius: "6px",
        cursor: certificate.status === "REVOKED" ? "not-allowed" : "pointer",
        fontWeight: "600",
        opacity: certificate.status === "REVOKED" ? 0.5 : 1
      }}
    >
      Download PDF
    </button>
  );
}

export default GenerateCertificate;
