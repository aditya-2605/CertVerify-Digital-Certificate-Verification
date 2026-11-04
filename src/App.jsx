
import { useState } from "react";
import {
  signInWithEmailAndPassword,
  signOut
} from "firebase/auth";
import { doc, getDoc } from "firebase/firestore";
import { auth, db } from "./firebase";
import Dashboard from "./components/Dashboard.jsx";
import VerifyCertificate from "./components/VerifyCertificate.jsx";
import "./App.css";

function App() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [adminEmail, setAdminEmail] = useState("");

  // Detect public certificate verification URL
  const verificationMatch = window.location.pathname.match(
    /^\/verify\/([^/]+)\/?$/
  );

  // Public verification page - no admin login required
  if (verificationMatch) {
    return (
      <VerifyCertificate
        certificateId={decodeURIComponent(verificationMatch[1])}
      />
    );
  }

  const handleLogin = async (e) => {
    e.preventDefault();
    setError("");
    setLoading(true);

    try {
      const userCredential = await signInWithEmailAndPassword(
        auth,
        email.trim(),
        password
      );

      const user = userCredential.user;

      const adminRef = doc(db, "admins", user.uid);
      const adminSnapshot = await getDoc(adminRef);

      if (!adminSnapshot.exists()) {
        await signOut(auth);
        setError(
          "Access denied. This account is not an authorized administrator."
        );
        return;
      }

      setAdminEmail(user.email || email);
    } catch (err) {
      console.error("Login error:", err);

      if (
        err.code === "auth/invalid-credential" ||
        err.code === "auth/wrong-password" ||
        err.code === "auth/user-not-found"
      ) {
        setError("Incorrect email or password. Please try again.");
      } else if (err.code === "auth/invalid-email") {
        setError("Please enter a valid email address.");
      } else if (err.code === "auth/too-many-requests") {
        setError("Too many attempts. Please try again later.");
      } else {
        setError(
          "Login failed. Please check your connection and try again."
        );
      }
    } finally {
      setLoading(false);
    }
  };

  const handleLogout = async () => {
    try {
      await signOut(auth);
      setAdminEmail("");
      setEmail("");
      setPassword("");
      setError("");
    } catch (err) {
      console.error("Logout error:", err);
      setError("Unable to log out. Please try again.");
    }
  };

  if (adminEmail) {
    return (
      <Dashboard
        adminEmail={adminEmail}
        onLogout={handleLogout}
      />
    );
  }

  return (
    <main className="login-page">
      <section className="login-intro">
        <div className="brand">
          <div className="brand-icon">C</div>
          <span>
            Cert<span className="brand-highlight">Verify</span>
          </span>
        </div>

        <div className="intro-content">
          <div className="intro-tag">
            DIGITAL CERTIFICATE VERIFICATION
          </div>

          <h1>
            Trust every
            <br />
            <span>certificate.</span>
          </h1>

          <p>
            A secure and reliable platform to register, manage and verify
            digital certificates with confidence.
          </p>

          <div className="feature-list">
            <div className="feature-item">
              <span className="feature-check">✓</span>
              Secure administrator access
            </div>

            <div className="feature-item">
              <span className="feature-check">✓</span>
              QR code-based verification
            </div>

            <div className="feature-item">
              <span className="feature-check">✓</span>
              Real-time certificate status
            </div>
          </div>
        </div>

        <div className="intro-footer">
          Secure digital credentials. Verified with confidence.
        </div>
      </section>

      <section className="login-section">
        <div className="login-card">
          <div className="mobile-brand brand">
            <div className="brand-icon">C</div>
            <span>
              Cert<span className="brand-highlight">Verify</span>
            </span>
          </div>

          <div className="login-heading">
            <p className="eyebrow">ADMIN PORTAL</p>
            <h2>Welcome back</h2>
            <p>Sign in to manage your digital certificates.</p>
          </div>

          <form onSubmit={handleLogin}>
            <div className="form-group">
              <label htmlFor="email">Email address</label>
              <input
                id="email"
                type="email"
                placeholder="admin@example.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                autoComplete="username"
                required
              />
            </div>

            <div className="form-group">
              <label htmlFor="password">Password</label>
              <input
                id="password"
                type="password"
                placeholder="Enter your password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                autoComplete="current-password"
                required
              />
            </div>

            {error && (
              <div className="error-message" role="alert">
                {error}
              </div>
            )}

            <button
              className="login-button"
              type="submit"
              disabled={loading}
            >
              {loading ? "Signing in..." : "Sign in to Admin Portal"}
              {!loading && <span>→</span>}
            </button>
          </form>

          <div className="login-security">
            <span>♢</span>
            Protected by Firebase Authentication
          </div>
        </div>

        <footer className="login-footer">
          © {new Date().getFullYear()} CertVerify. All rights reserved.
        </footer>
      </section>
    </main>
  );
}

export default App;
