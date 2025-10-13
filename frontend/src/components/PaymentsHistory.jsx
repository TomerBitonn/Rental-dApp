import { useEffect, useMemo, useState, useCallback } from "react";
import { ethers } from "ethers";
import { jsPDF } from "jspdf";
import artifact from "../abi/RentalContract.json";
import "../styles/Components.css";

export default function PaymentsHistory({ provider, contractAddress, refreshKey = 0, appName = "Rental Smart Contracts DApp", logoUrl }) {
  const [ethPrice, setEthPrice] = useState(null);
  const [rows, setRows] = useState([]);
  const [busy, setBusy] = useState(false);

  // Validate contract address
  const isAddr = useMemo(
    () => !!contractAddress && /^0x[a-fA-F0-9]{40}$/.test(contractAddress),
    [contractAddress]
  );

  // Fetch ETH price (USD)
  useEffect(() => {
    fetch("https://api.coingecko.com/api/v3/simple/price?ids=ethereum&vs_currencies=usd")
      .then((res) => res.json())
      .then((data) => setEthPrice(data.ethereum.usd))
      .catch((err) => console.error("Failed to fetch ETH price", err));
  }, []);

  // Format value from wei to ETH + USD
  const fmtEthUsd = (wei) => {
    try {
      const formatEther = ethers.utils?.formatEther ?? ethers.formatEther;
      const eth = parseFloat(formatEther(wei.toString()));
      if (!ethPrice) return `${eth.toFixed(6)} ETH`;
      const usd = (eth * ethPrice).toFixed(2);
      return `${eth.toFixed(6)} ETH ($${usd} USD)`;
    } catch {
      return wei?.toString?.() ?? String(wei);
    }
  };

  
  // Load payments list from the smart contract
  const load = useCallback(async () => {
    if (!provider || !isAddr) return;
    setBusy(true);
    try {
      const contract = new ethers.Contract(contractAddress, artifact.abi, provider);
      const list = await contract.getPayments();

      // Normalize and sort (newest first)
      const mapped = list
        .map((p, i) => ({
          i,
          amount: p.amount ?? p[0],
          ts: Number(p.timestamp ?? p[1]),
        }))
        .sort((a, b) => b.ts - a.ts);

      setRows(mapped);
    } catch (e) {
      console.error("Failed to load payments:", e);
    } finally {
      setBusy(false);
    }
  }, [provider, contractAddress, isAddr]);

  // Auto-load when provider/contractAddress/refreshKey changes
  useEffect(() => {
    load();
  }, [load, refreshKey]);

  
  // Export payments history to PDF
  const exportPDF = async () => {
    // Convert logo URL to base64 if provided
    const logoDataUrl = await (async () => {
      if (!logoUrl) return null;
      try {
        const img = new Image();
        img.crossOrigin = "anonymous";
        const done = new Promise((res, rej) => {
          img.onload = () => {
            const cv = document.createElement("canvas");
            cv.width = img.width;
            cv.height = img.height;
            const ctx = cv.getContext("2d");
            ctx.drawImage(img, 0, 0);
            res(cv.toDataURL("image/png"));
          };
          img.onerror = rej;
        });
        img.src = logoUrl;
        return await done;
      } catch {
        return null;
      }
    })();

    const doc = new jsPDF({ unit: "pt", format: "a4" });
    const pageW = doc.internal.pageSize.getWidth();
    const pageH = doc.internal.pageSize.getHeight();
    const margin = 40;
    let y = margin;

    // Header
    if (logoDataUrl) {
      const logoW = 32;
      const logoH = 32;
      doc.addImage(logoDataUrl, "PNG", margin, y - 4, logoW, logoH);
      doc.setFont("helvetica", "bold");
      doc.setFontSize(14);
      doc.text(appName, margin + logoW + 10, y + 18);
    } else {
      doc.setFont("helvetica", "bold");
      doc.setFontSize(16);
      doc.text(appName, margin, y + 12);
    }

    y += 48;
    doc.setFont("helvetica", "normal");
    doc.setFontSize(10);
    doc.setTextColor(90);
    doc.text(`Contract: ${contractAddress || "-"}`, margin, y);
    doc.text(`Exported: ${new Date().toLocaleString()}`, pageW - margin, y, {
      align: "right",
    });

    // Table header
    y += 48;
    doc.setTextColor(0);
    doc.setFont("helvetica", "bold");
    doc.setFontSize(11);

    const cols = [
      { key: "#", w: 30 },
      { key: "Time", w: 220 },
      { key: "Amount", w: 180 },
    ];

    doc.setFillColor(245);
    doc.rect(margin, y - 12, pageW - margin * 2, 22, "F");

    let x = margin;
    cols.forEach((c) => {
      doc.text(c.key, x + 6, y + 4);
      x += c.w;
    });

    y += 18;
    doc.setFont("helvetica", "normal");
    const rowH = 18;

    // Prepare data for table
    const data = rows.length
      ? [...rows].reverse() // oldest first for ascending numbering
      : [{ i: 0, ts: Math.floor(Date.now() / 1000), amount: 0 }];

    // Draw rows
    data.forEach((r, idx) => {
      if (y + rowH > pageH - margin) {
        doc.addPage();
        y = margin;
      }

      let xd = margin;
      doc.setDrawColor(230);
      doc.line(margin, y - 12, pageW - margin, y - 12);

      doc.setTextColor(30);
      doc.text(String(idx + 1), xd + 6, y); // ascending numbering
      xd += cols[0].w;
      doc.text(new Date(r.ts * 1000).toLocaleString(), xd + 6, y);
      xd += cols[1].w;
      doc.text(fmtEthUsd(r.amount), xd + 6, y);

      y += rowH;
    });

    const short = contractAddress ? contractAddress.slice(0, 10) : "no-address";
    doc.save(`payments_${short}.pdf`);
  };

  return (
    <div className="card">
      <div className="card-toolbar">
        <h2 className="card-title">Payments</h2>
        <div className="toolbar-actions">
          <button className="btn secondary" onClick={load} disabled={busy || !isAddr}>
            {busy ? "Loading…" : "Refresh"}
          </button>
          <button className="btn" onClick={exportPDF} disabled={!isAddr}>
            Export PDF
          </button>
        </div>
      </div>

      {!isAddr && <p>Enter/select a contract address first.</p>}
      {isAddr && rows.length === 0 && !busy && <p>No payments yet.</p>}

      {rows.length > 0 && (
        <div className="payments">
          <table className="payments-table">
            <colgroup>
              <col style={{ width: "56px" }} />
              <col style={{ width: "38%" }} />
              <col style={{ width: "28%" }} />
            </colgroup>
            <thead>
              <tr>
                <th className="num">#</th>
                <th>Time</th>
                <th>Amount</th>
              </tr>
            </thead>
            <tbody>
              {rows
                .slice() // clone to avoid mutating
                .reverse() // oldest first (ascending)
                .map((r, idx) => (
                  <tr key={r.i}>
                    <td className="num">{idx + 1}</td>
                    <td className="time">{new Date(r.ts * 1000).toLocaleString()}</td>
                    <td className="amount">{fmtEthUsd(r.amount)}</td>
                  </tr>
                ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
