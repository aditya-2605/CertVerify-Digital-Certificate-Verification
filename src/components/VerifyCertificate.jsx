
import { useEffect, useState } from "react";
import { doc, getDoc } from "firebase/firestore";
import { db } from "../firebase";
import "./VerifyCertificate.css";

function VerifyCertificate({ certificateId }) {
  const [certificate, setCertificate] = useState(null);
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    const verifyCertificate = async () => {
      try {
        setLoading(true);
        setError("");
        setNotFound(false);

        const certificateRef = doc(
          db,
          "publicCertificates",
          certificateId
        );

        const certificateSnapshot = await getDoc(certificateRef);

        if (!certificateSnapshot.exists()) {
          setNotFound(true);
          setCertificate(null);
          return;
        }

        setCertificate(certificateSnapshot.data());
      } catch (err) {
        console.error("Certificate verification error:", err);
        setError(
          "Unable to verify this certificate. Please try again later."
        );
      } finally {
        setLoading(false);
      }
    };

    if (certificateId) {
      verifyCertificate();
    }
  }, [certificateId]);

  const formatDate = (date) => {
    if (!date) return "Not available";

    if (typeof date.toDate === "function") {
      return date.toDate().toLocaleDateString("en-IN", {
        day: "2-digit",
        month: "long",
        year: "numeric"
      });
    }

    return "Not available";
  };

  return (
    <main className="verify-page">
      <header className="verify-header">
        <div className="verify-brand">
          <div className="verify-logo">C</div>
          <span>
            Cert<span>Verify</span>
          </span>
        </div>

        <span className="verify-header-label">
          PUBLIC CERTIFICATE VERIFICATION
        </span>
      </header>

      <section className="verify-container">
        {loading ? (
          <div className="verify-card">
            <div className="verify-loader"></div>
            <h2>Verifying Certificate</h2>
            <p>Please wait while we check our secure records.</p>
          </div>
        ) : error ? (
          <div className="verify-card">
            <div className="verify-status-icon error-icon">!</div>
            <p className="verify-eyebrow">VERIFICATION ERROR</p>
            <h1>Unable to Verify</h1>
            <p className="verify-description">{error}</p>
          </div>
        ) : notFound ? (
          <div className="verify-card">
            <div className="verify-status-icon not-found-icon">✕</div>
            <p className="verify-eyebrow">CERTIFICATE VERIFICATION</p>
            <h1>Certificate Not Found</h1>
            <p className="verify-description">
              We could not find a certificate matching this ID in our
              verification database. Please check the Certificate ID.
            </p>

            <div className="verify-id-box">
              <span>Certificate ID</span>
              <strong>{certificateId}</strong>
            </div>

            <p className="verify-footer-note">
              This certificate could not be verified by CertVerify.
            </p>
          </div>
        ) : (
          <div className="verify-card">
            <div
              className={`verify-status-icon ${
                certificate.status === "REVOKED"
                  ? "revoked-icon"
                  : "valid-icon"
              }`}
            >
              {certificate.status === "REVOKED" ? "!" : "✓"}
            </div>

            <p className="verify-eyebrow">CERTIFICATE VERIFICATION RESULT</p>

            <h1>
              {certificate.status === "REVOKED"
                ? "Certificate Revoked"
                : certificate.status === "VALID"
                  ? "Certificate Verified!"
                  : "Unknown Certificate Status"}
            </h1>

            <div
              className={`verify-status-label ${
                certificate.status === "REVOKED"
                  ? "revoked-label"
                  : certificate.status === "VALID"
                    ? "valid-label"
                    : "unknown-label"
              }`}
            >
              {certificate.status || "UNKNOWN"}
            </div>

            <p className="verify-description">
              {certificate.status === "VALID"
                ? "This certificate exists in our database and is currently marked as valid."
                : certificate.status === "REVOKED"
                  ? "This certificate exists in our database but has been revoked by the issuing administrator."
                  : "This certificate exists, but its current status could not be confirmed."}
            </p>

            <div className="verify-details">
              <div className="verify-detail-row">
                <span>Certificate ID</span>
                <strong>{certificate.certificateId || certificateId}</strong>
              </div>

              <div className="verify-detail-row">
                <span>Recipient Name</span>
                <strong>{certificate.recipientName || "Not available"}</strong>
              </div>

              <div className="verify-detail-row">
                <span>Course / Certificate</span>
                <strong>{certificate.courseName || "Not available"}</strong>
              </div>

              <div className="verify-detail-row">
                <span>Issuing Institution</span>
                <strong>
                  {certificate.issuingInstitution || "Not available"}
                </strong>
              </div>

              <div className="verify-detail-row">
                <span>Date of Issue</span>
                <strong>{formatDate(certificate.issueDate)}</strong>
              </div>
            </div>

            <div className="verify-authenticity-note">
              <span>✓</span>
              Verification result retrieved from the CertVerify database.
            </div>
          </div>
        )}

        <p className="verify-bottom-text">
          CertVerify · Secure Digital Certificate Verification
        </p>
      </section>
    </main>
  );
}

export default VerifyCertificate;
