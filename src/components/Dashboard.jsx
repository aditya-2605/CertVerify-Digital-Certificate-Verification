
import { useEffect, useMemo, useState } from "react";
import {
  collection,
  getDocs,
  doc,
  writeBatch,
  serverTimestamp
} from "firebase/firestore";
import * as XLSX from "xlsx";
import jsPDF from "jspdf";

import { db } from "../firebase";
import RegisterCertificate from "./RegisterCertificate";
import GenerateCertificate from "./GenerateCertificate";
import "./Dashboard.css";

function Dashboard({ adminEmail, onLogout }) {
  const [allCertificates, setAllCertificates] = useState([]);
  const [loading, setLoading] = useState(true);
  const [listLoading, setListLoading] = useState(false);
  const [error, setError] = useState("");
  const [actionLoading, setActionLoading] = useState("");

  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("ALL");
  const [fromDate, setFromDate] = useState("");
  const [toDate, setToDate] = useState("");

  const [activePage, setActivePage] = useState("dashboard");
  const [refreshKey, setRefreshKey] = useState(0);

  useEffect(() => {
    const loadCertificates = async () => {
      try {
        setLoading(true);
        setListLoading(true);
        setError("");

        const result = await getDocs(collection(db, "certificates"));

        const records = result.docs.map((document) => ({
          id: document.id,
          ...document.data()
        }));

        records.sort((a, b) => {
          const dateA = getDateValue(a.createdAt)?.getTime() || 0;
          const dateB = getDateValue(b.createdAt)?.getTime() || 0;
          return dateB - dateA;
        });

        setAllCertificates(records);
      } catch (err) {
        console.error("Certificate loading error:", err);
        setError(
          "Unable to load certificates. Please check your Firestore permissions."
        );
      } finally {
        setLoading(false);
        setListLoading(false);
      }
    };

    loadCertificates();
  }, [refreshKey]);

  const getDateValue = (date) => {
    if (!date) return null;

    if (typeof date.toDate === "function") {
      return date.toDate();
    }

    if (date instanceof Date) {
      return date;
    }

    const parsed = new Date(date);
    return Number.isNaN(parsed.getTime()) ? null : parsed;
  };

  const formatDate = (date) => {
    const value = getDateValue(date);

    if (!value) return "Not available";

    return value.toLocaleDateString("en-IN");
  };

  const refreshDashboard = () => {
    setRefreshKey((previous) => previous + 1);
  };

  const openDashboard = () => {
    setActivePage("dashboard");
    refreshDashboard();
  };

  const openRegistration = () => {
    setActivePage("register");
  };

  const openCertificates = () => {
    setActivePage("certificates");
  };

  const validCount = allCertificates.filter(
    (certificate) => certificate.status === "VALID"
  ).length;

  const revokedCount = allCertificates.filter(
    (certificate) => certificate.status === "REVOKED"
  ).length;

  const totalCount = allCertificates.length;

  const currentMonthCount = allCertificates.filter((certificate) => {
    const date = getDateValue(certificate.createdAt);

    if (!date) return false;

    const today = new Date();

    return (
      date.getMonth() === today.getMonth() &&
      date.getFullYear() === today.getFullYear()
    );
  }).length;

  const monthlyData = useMemo(() => {
    const today = new Date();

    const months = [];

    for (let i = 5; i >= 0; i--) {
      const date = new Date(
        today.getFullYear(),
        today.getMonth() - i,
        1
      );

      months.push({
        label: date.toLocaleDateString("en-IN", {
          month: "short"
        }),
        month: date.getMonth(),
        year: date.getFullYear(),
        count: 0
      });
    }

    allCertificates.forEach((certificate) => {
      const date = getDateValue(certificate.createdAt);

      if (!date) return;

      const month = months.find(
        (item) =>
          item.month === date.getMonth() &&
          item.year === date.getFullYear()
      );

      if (month) month.count++;
    });

    return months;
  }, [allCertificates]);

  const maxMonthlyCount = Math.max(
    ...monthlyData.map((item) => item.count),
    1
  );

  const filteredCertificates = allCertificates.filter((certificate) => {
    const searchValue = search.toLowerCase();

    const matchesSearch =
      (certificate.certificateId || certificate.id)
        .toLowerCase()
        .includes(searchValue) ||
      (certificate.recipientName || "")
        .toLowerCase()
        .includes(searchValue) ||
      (certificate.courseName || "")
        .toLowerCase()
        .includes(searchValue) ||
      (certificate.issuingInstitution || "")
        .toLowerCase()
        .includes(searchValue);

    const matchesStatus =
      statusFilter === "ALL" ||
      certificate.status === statusFilter;

    const issueDate = getDateValue(certificate.issueDate);

    const matchesFromDate =
      !fromDate ||
      (issueDate &&
        issueDate >= new Date(`${fromDate}T00:00:00`));

    const matchesToDate =
      !toDate ||
      (issueDate &&
        issueDate <= new Date(`${toDate}T23:59:59`));

    return (
      matchesSearch &&
      matchesStatus &&
      matchesFromDate &&
      matchesToDate
    );
  });

  const revokeCertificate = async (certificate) => {
    const certificateId = certificate.id;

    if (certificate.status === "REVOKED") return;

    const confirmed = window.confirm(
      `Are you sure you want to revoke certificate ${certificateId}?`
    );

    if (!confirmed) return;

    try {
      setActionLoading(certificateId);

      const batch = writeBatch(db);

      batch.update(doc(db, "certificates", certificateId), {
        status: "REVOKED",
        revokedAt: serverTimestamp()
      });

      batch.update(
        doc(db, "publicCertificates", certificateId),
        { status: "REVOKED" }
      );

      await batch.commit();

      setAllCertificates((previous) =>
        previous.map((item) =>
          item.id === certificateId
            ? { ...item, status: "REVOKED" }
            : item
        )
      );

      alert("Certificate successfully revoked.");
    } catch (err) {
      console.error("Revocation error:", err);
      alert("Unable to revoke certificate. Check Firestore permissions.");
    } finally {
      setActionLoading("");
    }
  };

  const exportExcel = () => {
    try {
      const exportData = filteredCertificates.map((certificate) => ({
        "Certificate ID":
          certificate.certificateId || certificate.id,
        "Recipient Name": certificate.recipientName || "",
        "Course Name": certificate.courseName || "",
        "Issuing Institution":
          certificate.issuingInstitution || "",
        "Issue Date": formatDate(certificate.issueDate),
        Status: certificate.status || "UNKNOWN",
        "Verification URL": certificate.verificationUrl || ""
      }));

      if (exportData.length === 0) {
        alert("No certificate records available to export.");
        return;
      }

      const worksheet = XLSX.utils.json_to_sheet(exportData);

      worksheet["!cols"] = [
        { wch: 32 },
        { wch: 25 },
        { wch: 25 },
        { wch: 30 },
        { wch: 16 },
        { wch: 15 },
        { wch: 55 }
      ];

      const workbook = XLSX.utils.book_new();

      XLSX.utils.book_append_sheet(
        workbook,
        worksheet,
        "Certificates"
      );

      XLSX.writeFile(
        workbook,
        "CertVerify_Certificate_Report.xlsx"
      );
    } catch (err) {
      console.error("Excel export error:", err);
      alert("Unable to export Excel report.");
    }
  };

  const exportPdfReport = () => {
    try {
      const pdf = new jsPDF();
      const pageWidth = pdf.internal.pageSize.getWidth();

      pdf.setFont("helvetica", "bold");
      pdf.setFontSize(22);
      pdf.setTextColor(35, 75, 130);

      pdf.text("CERTVERIFY", 15, 20);

      pdf.setFontSize(11);
      pdf.setTextColor(90, 90, 90);
      pdf.text("Certificate Analytics Report", 15, 29);

      pdf.setDrawColor(35, 75, 130);
      pdf.line(15, 34, pageWidth - 15, 34);

      pdf.setFont("helvetica", "normal");
      pdf.setFontSize(10);
      pdf.text(
        `Generated on: ${new Date().toLocaleString("en-IN")}`,
        15,
        43
      );

      pdf.setFont("helvetica", "bold");
      pdf.setFontSize(12);
      pdf.text("Certificate Summary", 15, 56);

      pdf.setFont("helvetica", "normal");
      pdf.setFontSize(10);

      pdf.text(`Total Certificates: ${totalCount}`, 15, 66);
      pdf.text(`Valid Certificates: ${validCount}`, 15, 74);
      pdf.text(`Revoked Certificates: ${revokedCount}`, 15, 82);
      pdf.text(
        `Generated This Month: ${currentMonthCount}`,
        15,
        90
      );

      pdf.setFont("helvetica", "bold");
      pdf.setFontSize(12);
      pdf.text(
        `Certificate Records (${filteredCertificates.length})`,
        15,
        105
      );

      let y = 115;

      filteredCertificates.forEach((certificate, index) => {
        if (y > 270) {
          pdf.addPage();
          y = 20;
        }

        pdf.setFont("helvetica", "bold");
        pdf.setFontSize(9);

        pdf.text(
          `${index + 1}. ${certificate.certificateId || certificate.id}`,
          15,
          y
        );

        y += 6;

        pdf.setFont("helvetica", "normal");
        pdf.setFontSize(8);

        const details = [
          `Recipient: ${certificate.recipientName || "—"}`,
          `Course: ${certificate.courseName || "—"}`,
          `Issue Date: ${formatDate(certificate.issueDate)}`,
          `Status: ${certificate.status || "UNKNOWN"}`
        ];

        details.forEach((detail) => {
          pdf.text(detail, 20, y);
          y += 5;
        });

        y += 4;
      });

      pdf.save("CertVerify_Analytics_Report.pdf");
    } catch (err) {
      console.error("PDF report error:", err);
      alert("Unable to generate analytics PDF.");
    }
  };

  const resetFilters = () => {
    setSearch("");
    setStatusFilter("ALL");
    setFromDate("");
    setToDate("");
  };

  return (
    <div className="admin-dashboard">
      <aside className="dashboard-sidebar">
        <div className="dashboard-brand">
          <div className="dashboard-logo">C</div>
          <span>
            Cert<span>Verify</span>
          </span>
        </div>

        <div className="sidebar-label">WORKSPACE</div>

        <button
          className={
            activePage === "dashboard"
              ? "sidebar-active"
              : "sidebar-nav-button"
          }
          onClick={openDashboard}
        >
          ▦ Dashboard
        </button>

        <button
          className={
            activePage === "register"
              ? "sidebar-active"
              : "sidebar-nav-button"
          }
          onClick={openRegistration}
        >
          ＋ Register Certificate
        </button>

        <button
          className={
            activePage === "certificates"
              ? "sidebar-active"
              : "sidebar-nav-button"
          }
          onClick={openCertificates}
        >
          ▤ All Certificates
        </button>

        <div className="sidebar-bottom">
          <div className="admin-avatar">
            {(adminEmail || "A").charAt(0).toUpperCase()}
          </div>

          <div className="admin-details">
            <strong>Administrator</strong>
            <span>{adminEmail}</span>
          </div>
        </div>
      </aside>

      <main className="dashboard-main">
        <header className="dashboard-topbar">
          <div>
            <p className="dashboard-breadcrumb">
              WORKSPACE / {activePage.toUpperCase()}
            </p>

            <h1>
              {activePage === "dashboard"
                ? "Analytics Dashboard"
                : activePage === "register"
                  ? "Register Certificate"
                  : "All Certificates"}
            </h1>
          </div>

          <button className="dashboard-logout" onClick={onLogout}>
            Sign out ↗
          </button>
        </header>

        <section className="dashboard-content">
          {error && <div className="dashboard-error">{error}</div>}

          {activePage === "register" ? (
            <RegisterCertificate
              onCancel={openDashboard}
              onSuccess={refreshDashboard}
            />
          ) : activePage === "certificates" ? (
            <>
              <div className="analytics-heading">
                <div>
                  <h2>Certificate Management</h2>
                  <p>Search, filter and export your certificate records.</p>
                </div>

                <button
                  className="refresh-button"
                  onClick={refreshDashboard}
                >
                  ↻ Refresh
                </button>
              </div>

              <div className="filter-panel">
                <input
                  type="text"
                  placeholder="Search ID, recipient, course or institution..."
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                />

                <select
                  value={statusFilter}
                  onChange={(e) => setStatusFilter(e.target.value)}
                >
                  <option value="ALL">All Statuses</option>
                  <option value="VALID">Valid</option>
                  <option value="REVOKED">Revoked</option>
                </select>

                <input
                  type="date"
                  value={fromDate}
                  onChange={(e) => setFromDate(e.target.value)}
                  title="From date"
                />

                <input
                  type="date"
                  value={toDate}
                  onChange={(e) => setToDate(e.target.value)}
                  title="To date"
                />

                <button className="reset-button" onClick={resetFilters}>
                  Reset
                </button>
              </div>

              <div className="export-actions">
                <button className="excel-button" onClick={exportExcel}>
                  <span>↓</span> Export Excel
                </button>

                <button className="pdf-button" onClick={exportPdfReport}>
                  <span>↓</span> Export PDF Report
                </button>
              </div>

              <div className="table-info">
                Showing {filteredCertificates.length} of {totalCount} certificates
              </div>

              {listLoading ? (
                <p>Loading certificates...</p>
              ) : (
                <div className="certificate-table-wrapper">
                  <table className="certificate-table">
                    <thead>
                      <tr>
                        <th>Certificate ID</th>
                        <th>Recipient</th>
                        <th>Course</th>
                        <th>Issue Date</th>
                        <th>Status</th>
                        <th>Actions</th>
                      </tr>
                    </thead>

                    <tbody>
                      {filteredCertificates.length === 0 ? (
                        <tr>
                          <td colSpan="6" className="empty-table">
                            No matching certificates found.
                          </td>
                        </tr>
                      ) : (
                        filteredCertificates.map((certificate) => (
                          <tr key={certificate.id}>
                            <td>
                              {certificate.certificateId || certificate.id}
                            </td>

                            <td>{certificate.recipientName || "—"}</td>

                            <td>{certificate.courseName || "—"}</td>

                            <td>{formatDate(certificate.issueDate)}</td>

                            <td>
                              <span
                                className={
                                  certificate.status === "REVOKED"
                                    ? "status-badge status-revoked"
                                    : "status-badge status-valid"
                                }
                              >
                                {certificate.status || "UNKNOWN"}
                              </span>
                            </td>

                            <td>
                              <div className="table-actions">
                                <GenerateCertificate
                                  certificate={certificate}
                                />

                                {certificate.status === "REVOKED" ? (
                                  <span className="already-revoked">
                                    Revoked
                                  </span>
                                ) : (
                                  <button
                                    className="revoke-button"
                                    disabled={
                                      actionLoading === certificate.id
                                    }
                                    onClick={() =>
                                      revokeCertificate(certificate)
                                    }
                                  >
                                    {actionLoading === certificate.id
                                      ? "Revoking..."
                                      : "Revoke"}
                                  </button>
                                )}
                              </div>
                            </td>
                          </tr>
                        ))
                      )}
                    </tbody>
                  </table>
                </div>
              )}
            </>
          ) : (
            <>
              <div className="dashboard-welcome">
                <div>
                  <p className="dashboard-eyebrow">
                    CERTIFICATE MANAGEMENT SYSTEM
                  </p>
                  <h2>Welcome back, Administrator!</h2>
                  <p>
                    Monitor certificate generation, verification and status
                    across your platform.
                  </p>
                </div>

                <div className="welcome-symbol">✓</div>
              </div>

              <div className="section-heading">
                <div>
                  <h2>Platform Overview</h2>
                  <p>Live statistics from your Firebase database</p>
                </div>

                <button
                  className="refresh-button"
                  onClick={refreshDashboard}
                >
                  ↻ Refresh
                </button>
              </div>

              <div className="statistics-grid">
                <div className="stat-card total-card">
                  <div className="stat-icon">▤</div>
                  <p>Total Certificates</p>
                  <h3>{loading ? "—" : totalCount}</h3>
                  <span>All registered records</span>
                </div>

                <div className="stat-card valid-card">
                  <div className="stat-icon">✓</div>
                  <p>Valid Certificates</p>
                  <h3>{loading ? "—" : validCount}</h3>
                  <span>Currently valid</span>
                </div>

                <div className="stat-card revoked-card">
                  <div className="stat-icon">⊘</div>
                  <p>Revoked Certificates</p>
                  <h3>{loading ? "—" : revokedCount}</h3>
                  <span>Revoked records</span>
                </div>

                <div className="stat-card monthly-card">
                  <div className="stat-icon">↗</div>
                  <p>Generated This Month</p>
                  <h3>{loading ? "—" : currentMonthCount}</h3>
                  <span>New certificate records</span>
                </div>
              </div>

              <div className="analytics-grid">
                <div className="analytics-card">
                  <div className="analytics-card-heading">
                    <div>
                      <h3>Monthly Certificate Generation</h3>
                      <p>Certificates created in the last six months</p>
                    </div>
                  </div>

                  <div className="bar-chart">
                    {monthlyData.map((item) => (
                      <div className="bar-column" key={`${item.month}-${item.year}`}>
                        <strong>{item.count}</strong>

                        <div className="bar-track">
                          <div
                            className="bar-fill"
                            style={{
                              height: `${(item.count / maxMonthlyCount) * 100}%`
                            }}
                          />
                        </div>

                        <span>{item.label}</span>
                      </div>
                    ))}
                  </div>
                </div>

                <div className="analytics-card">
                  <div className="analytics-card-heading">
                    <div>
                      <h3>Certificate Status</h3>
                      <p>Distribution of certificate records</p>
                    </div>
                  </div>

                  <div
                    className="status-donut"
                    style={{
                      background:
                        totalCount === 0
                          ? "#e5e7eb"
                          : `conic-gradient(#16a34a 0% ${
                              (validCount / totalCount) * 100
                            }%, #dc2626 ${
                              (validCount / totalCount) * 100
                            }% 100%)`
                    }}
                  >
                    <div className="donut-center">
                      <strong>{totalCount}</strong>
                      <span>Total</span>
                    </div>
                  </div>

                  <div className="chart-legend">
                    <span>
                      <i className="legend-valid" /> Valid: {validCount}
                    </span>

                    <span>
                      <i className="legend-revoked" /> Revoked: {revokedCount}
                    </span>
                  </div>
                </div>
              </div>

              <div className="recent-section">
                <div className="recent-heading">
                  <div>
                    <h2>Recent Certificate Activity</h2>
                    <p>Latest certificate records</p>
                  </div>

                  <button
                    className="refresh-button"
                    onClick={openCertificates}
                  >
                    View All →
                  </button>
                </div>

                <div className="certificate-table-wrapper">
                  <table className="certificate-table">
                    <thead>
                      <tr>
                        <th>Certificate ID</th>
                        <th>Recipient</th>
                        <th>Course</th>
                        <th>Issue Date</th>
                        <th>Status</th>
                      </tr>
                    </thead>

                    <tbody>
                      {allCertificates.slice(0, 5).length === 0 ? (
                        <tr>
                          <td colSpan="5" className="empty-table">
                            No certificates registered yet.
                          </td>
                        </tr>
                      ) : (
                        allCertificates.slice(0, 5).map((certificate) => (
                          <tr key={certificate.id}>
                            <td>
                              {certificate.certificateId || certificate.id}
                            </td>
                            <td>{certificate.recipientName || "—"}</td>
                            <td>{certificate.courseName || "—"}</td>
                            <td>{formatDate(certificate.issueDate)}</td>
                            <td>
                              <span
                                className={
                                  certificate.status === "REVOKED"
                                    ? "status-badge status-revoked"
                                    : "status-badge status-valid"
                                }
                              >
                                {certificate.status || "UNKNOWN"}
                              </span>
                            </td>
                          </tr>
                        ))
                      )}
                    </tbody>
                  </table>
                </div>
              </div>

              <footer className="dashboard-footer">
                CertVerify · Secure Digital Certificate Verification
              </footer>
            </>
          )}
        </section>
      </main>
    </div>
  );
}

export default Dashboard;
