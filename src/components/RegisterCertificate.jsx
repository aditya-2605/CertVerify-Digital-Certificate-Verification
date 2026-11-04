
import { useState } from "react";
import {
  doc,
  writeBatch,
  Timestamp,
  serverTimestamp
} from "firebase/firestore";
import QRCode from "qrcode";
import { db } from "../firebase";
import "./RegisterCertificate.css";

function RegisterCertificate({ onCancel, onSuccess }) {
  const [form, setForm] = useState({
    recipientName: "",
    courseName: "",
    issuingInstitution: "",
    issueDate: ""
  });

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [qrCode, setQrCode] = useState("");
  const [certificateId, setCertificateId] = useState("");
  const [verificationUrl, setVerificationUrl] = useState("");

  const handleChange = (e) => {
    setForm({
      ...form,
      [e.target.name]: e.target.value
    });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError("");
    setQrCode("");

    try {
      const id = `CERT-${Date.now()}-${Math.random()
        .toString(36)
        .slice(2, 7)
        .toUpperCase()}`;

      const verifyUrl = `${window.location.origin}/verify/${id}`;

      const issueDate = Timestamp.fromDate(
        new Date(`${form.issueDate}T00:00:00`)
      );

      const certificateData = {
        certificateId: id,
        recipientName: form.recipientName.trim(),
        courseName: form.courseName.trim(),
        issuingInstitution: form.issuingInstitution.trim(),
        issueDate,
        status: "VALID",
        createdAt: serverTimestamp()
      };

      const batch = writeBatch(db);

      batch.set(doc(db, "certificates", id), {
        ...certificateData,
        verificationUrl: verifyUrl
      });

      batch.set(doc(db, "publicCertificates", id), {
        certificateId: id,
        recipientName: form.recipientName.trim(),
        courseName: form.courseName.trim(),
        issuingInstitution: form.issuingInstitution.trim(),
        issueDate,
        status: "VALID"
      });

      const generatedQR = await QRCode.toDataURL(verifyUrl, {
        width: 300,
        margin: 2,
        errorCorrectionLevel: "H"
      });

      await batch.commit();

      setCertificateId(id);
      setVerificationUrl(verifyUrl);
      setQrCode(generatedQR);
    } catch (err) {
      console.error("Certificate registration error:", err);
      setError(
        "Certificate registration failed. Please check your Firebase connection and try again."
      );
    } finally {
      setLoading(false);
    }
  };

  const downloadQR = () => {
    const link = document.createElement("a");
    link.href = qrCode;
    link.download = `${certificateId}-QR.png`;
    link.click();
  };

  const registerAnother = () => {
    setForm({
      recipientName: "",
      courseName: "",
      issuingInstitution: "",
      issueDate: ""
    });

    setQrCode("");
    setCertificateId("");
    setVerificationUrl("");
    setError("");

    if (onSuccess) {
      onSuccess();
    }
  };

  if (qrCode) {
    return (
      <section className="register-page">
        <div className="registration-success">
          <div className="registration-success-icon">✓</div>

          <p className="register-eyebrow">REGISTRATION COMPLETE</p>
          <h2>Certificate Registered!</h2>

          <p className="success-description">
            Your certificate has been securely saved in Firebase.
            Its QR code is ready for download.
          </p>

          <div className="generated-certificate-id">
            <span>Certificate ID</span>
            <strong>{certificateId}</strong>
          </div>

          <div className="generated-qr">
            <img src={qrCode} alt="Certificate verification QR code" />
            <p>Scan to open the certificate verification link</p>
          </div>

          <div className="generated-url">
            <span>Verification URL</span>
            <a href={verificationUrl} target="_blank" rel="noreferrer">
              {verificationUrl}
            </a>
          </div>

          <button className="register-submit" onClick={downloadQR}>
            Download QR Code ↓
          </button>

          <button
            className="register-back-button"
            onClick={registerAnother}
          >
            Register Another Certificate
          </button>

          <button
            className="register-cancel-button"
            onClick={onCancel}
          >
            Back to Dashboard
          </button>
        </div>
      </section>
    );
  }

  return (
    <section className="register-page">
      <div className="register-heading">
        <div>
          <p className="register-eyebrow">CERTIFICATE MANAGEMENT</p>
          <h2>Register New Certificate</h2>
          <p>
            Enter the certificate details below to create a
            digitally verifiable record.
          </p>
        </div>

        <button
          className="register-cancel-button"
          onClick={onCancel}
        >
          ← Back to Dashboard
        </button>
      </div>

      <form className="register-form" onSubmit={handleSubmit}>
        <div className="register-form-title">
          <h3>Certificate Information</h3>
          <p>All fields are required.</p>
        </div>

        <div className="register-fields">
          <div className="register-field">
            <label htmlFor="recipientName">Recipient Full Name</label>
            <input
              id="recipientName"
              name="recipientName"
              type="text"
              placeholder="Enter recipient's full name"
              value={form.recipientName}
              onChange={handleChange}
              maxLength={100}
              required
            />
          </div>

          <div className="register-field">
            <label htmlFor="courseName">Course / Certificate Name</label>
            <input
              id="courseName"
              name="courseName"
              type="text"
              placeholder="e.g. Full Stack Web Development"
              value={form.courseName}
              onChange={handleChange}
              maxLength={150}
              required
            />
          </div>

          <div className="register-field">
            <label htmlFor="issuingInstitution">
              Issuing Institution
            </label>
            <input
              id="issuingInstitution"
              name="issuingInstitution"
              type="text"
              placeholder="Enter institution name"
              value={form.issuingInstitution}
              onChange={handleChange}
              maxLength={150}
              required
            />
          </div>

          <div className="register-field">
            <label htmlFor="issueDate">Date of Issue</label>
            <input
              id="issueDate"
              name="issueDate"
              type="date"
              value={form.issueDate}
              onChange={handleChange}
              max={new Date().toISOString().split("T")[0]}
              required
            />
          </div>
        </div>

        {error && (
          <div className="register-error" role="alert">
            {error}
          </div>
        )}

        <div className="register-note">
          <span>ⓘ</span>
          A unique Certificate ID and QR code will be generated
          automatically after registration.
        </div>

        <button
          className="register-submit"
          type="submit"
          disabled={loading}
        >
          {loading ? "Registering Certificate..." : "Register Certificate →"}
        </button>
      </form>
    </section>
  );
}

export default RegisterCertificate;
