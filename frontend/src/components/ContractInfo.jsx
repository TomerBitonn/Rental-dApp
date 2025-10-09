/*import { useState, useEffect } from "react";
import { ethers } from "ethers";
import artifact from "../abi/RentalContract.json";
import "../styles/Components.css";
import SignContract from "./SignContract";

export default function ContractInfo({ provider, signer, account, contractAddress, setContractAddress }) {
  const [contractData, setContractData] = useState(null);
  const [payments, setPayments] = useState([]);
  const [loading, setLoading] = useState(false);
  const [ethPrice, setEthPrice] = useState(null);

  // Fetch ETH price (USD)
  useEffect(() => {
    fetch("https://api.coingecko.com/api/v3/simple/price?ids=ethereum&vs_currencies=usd")
      .then((res) => res.json())
      .then((data) => setEthPrice(data.ethereum.usd))
      .catch((err) => console.error("Failed to fetch ETH price", err));
  }, []);

  const loadContract = async () => {
    try {
      if (!provider) return alert("No provider found. Please connect MetaMask.");

      setLoading(true);

      // Use provider (read-only)
      const contract = new ethers.Contract(contractAddress, artifact.abi, provider);

      // Get contract info
      const data = await contract.getContractInfo();
      setContractData(data);

      // Get payments
      const p = await contract.getPayments();
      setPayments(p);

      setLoading(false);
    } catch (err) {
      console.error("Error loading contract:", err);
      setLoading(false);
    }
  };

  // Convert wei → ETH → USD
  const formatRent = (weiAmount) => {
    try {
      if (!weiAmount) return "0";
      const eth = parseFloat(ethers.utils.formatEther(weiAmount.toString())); 
      if (!ethPrice) return `${eth.toFixed(6)} ETH`;
      const usd = (eth * ethPrice).toFixed(2);
      return `${eth.toFixed(6)} ETH ($${usd} USD)`; 
    } catch (e) {
      console.error("Error formatting rent:", e);
      return weiAmount.toString();
    }
  };

  // Map status number → text
  const getStatusLabel = (status) => {
    switch (Number(status)) {
      case 0: return "Created";
      case 1: return "Signed";
      case 2: return "Locked";
      case 3: return "Cancelled";
      case 4: return "Terminated";
      default: return "Unknown";
    }
  };

  return (
    <div className="card">
      <h2>Contract Info</h2>

      <label>Contract Address</label>
      <input
        type="text"
        placeholder="0x..."
        value={contractAddress || ""}
        onChange={(e) => setContractAddress(e.target.value)}
      />

      <button className="btn" onClick={loadContract} disabled={loading || !contractAddress}>
        {loading ? "Loading..." : "Load Contract"}
      </button>

      
      {contractData && (
        <>
          <div className="info">
            <h3>Details</h3>
            <p><b>Landlord:</b> {contractData[0]}</p>
            <p><b>Tenant:</b> {contractData[1]}</p>
            <p><b>Rent Amount:</b> {formatRent(contractData[2])}</p>
            <p><b>Start Date:</b> {new Date(contractData[3] * 1000).toLocaleDateString()}</p>
            <p><b>End Date:</b> {new Date(contractData[4] * 1000).toLocaleDateString()}</p>
            <p><b>Signed by Landlord:</b> {contractData[5] ? "Yes" : "No"}</p>
            <p><b>Signed by Tenant:</b> {contractData[6] ? "Yes" : "No"}</p>
            <p><b>Locked:</b> {contractData[7] ? "Yes" : "No"}</p>
            <p><b>Active:</b> {contractData[8] ? "Yes" : "No"}</p>
            <p><b>Status:</b> {getStatusLabel(contractData[9])}</p>
          </div>

          
          <div className="actions">
            <h2>Actions</h2>
            <SignContract contractAddress={contractAddress} signer={signer} account={account} />
          </div>
        </>
      )}

      
      {payments.length > 0 && (
        <div className="info">
          <h3>Payments</h3>
          {payments.map((p, i) => (
            <p key={i}>
              Amount: {formatRent(p.amount)} | Time:{" "}
              {new Date(p.timestamp * 1000).toLocaleString()}
            </p>
          ))}
        </div>
      )}
    </div>
  );
}*/

import { useState, useEffect } from "react";
import { ethers } from "ethers";
import artifact from "../abi/RentalContract.json";
import "../styles/Components.css";
import SignContract from "./SignContract";

export default function ContractInfo({
  provider,
  signer,
  account,
  contractAddress,
  setContractAddress,
  refreshKey,          // חדש
  onRefresh,           // חדש – נקרא מהכפתור
}) {
  const [addr, setAddr] = useState(contractAddress || "");
  const [contractData, setContractData] = useState(null);
  const [payments, setPayments] = useState([]);
  const [loading, setLoading] = useState(false);
  const [ethPrice, setEthPrice] = useState(null);
  const [error, setError] = useState("");

  // סנכרון שדה הכתובת כשיורש מעדכן contractAddress (למשל אחרי Deploy)
  useEffect(() => {
    if (contractAddress && contractAddress !== addr) {
      setAddr(contractAddress);
    }
  }, [contractAddress]); // eslint-disable-line

  // מחיר ETH
  useEffect(() => {
    fetch("https://api.coingecko.com/api/v3/simple/price?ids=ethereum&vs_currencies=usd")
      .then((res) => res.json())
      .then((data) => setEthPrice(data.ethereum.usd))
      .catch(() => {});
  }, []);

  // תמיכה ב-v5/v6
  const toChecksum = (a) => {
    const s = a.trim();
    try {
      if (ethers?.utils?.getAddress) return ethers.utils.getAddress(s);
      if (ethers?.getAddress) return ethers.getAddress(s);
    } catch (_) {}
    throw new Error("Invalid contract address");
  };

  const fetchAll = async (silent = false) => {
    if (!addr || !provider) return;
    try {
      setError("");
      if (!silent) setLoading(true);
      const checksum = toChecksum(addr);
      // מעדכן למעלה – שכל שאר הקומפוננטות ישתמשו באותה כתובת
      setContractAddress?.(checksum);

      const contract = new ethers.Contract(checksum, artifact.abi, provider);
      const data = await contract.getContractInfo();
      setContractData(data);

      const p = await contract.getPayments();
      setPayments(p);
    } catch (err) {
      setError(err.reason || err.message || "Failed to load contract");
    } finally {
      if (!silent) setLoading(false);
    }
  };

  const loadContract = async () => fetchAll(false);

  // רענון אוטומי כש־refreshKey משתנה (למשל אחרי נעילה/תשלום/דפלוי)
  useEffect(() => {
    if (addr && provider) fetchAll(true);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [refreshKey]);

  const formatRent = (weiAmount) => {
    try {
      if (!weiAmount) return "0";
      const fmt = (ethers?.utils?.formatEther ?? ethers.formatEther)(weiAmount.toString());
      const eth = parseFloat(fmt);
      if (!ethPrice) return `${eth.toFixed(6)} ETH`;
      const usd = (eth * ethPrice).toFixed(2);
      return `${eth.toFixed(6)} ETH ($${usd} USD)`;
    } catch {
      return weiAmount?.toString?.() ?? String(weiAmount);
    }
  };

  const getStatusLabel = (status) => {
    switch (Number(status)) {
      case 0: return "Created";
      case 1: return "Signed";
      case 2: return "Locked";
      case 3: return "Cancelled";
      case 4: return "Terminated";
      default: return "Unknown";
    }
  };

  return (
    <div className="card">
      <div className="card-toolbar" style={{display:"flex",alignItems:"center",justifyContent:"space-between",gap:12}}>
        <h2 style={{margin:0}}>Contract Info</h2>
        <div style={{display:"flex",gap:8}}>
          <button className="btn small secondary" onClick={() => onRefresh?.()} disabled={loading || !addr}>
            Refresh
          </button>
        </div>
      </div>

      <label>Contract Address</label>
      <input
        type="text"
        placeholder="0x..."
        value={addr}
        onChange={(e) => setAddr(e.target.value)}
      />

      <button className="btn" onClick={loadContract} disabled={loading || !addr}>
        {loading ? "Loading..." : "Load Contract"}
      </button>

      {error && (
        <p style={{ color: "#ff9e9e", marginTop: 8 }}>
          ⚠ {error}
        </p>
      )}

      {contractData && (
        <>
          <div className="info">
            <h3>Details</h3>
            <p><b>Landlord:</b> {contractData[0]}</p>
            <p><b>Tenant:</b> {contractData[1]}</p>
            <p><b>Rent Amount:</b> {formatRent(contractData[2])}</p>
            <p><b>Start Date:</b> {new Date(Number(contractData[3]) * 1000).toLocaleDateString()}</p>
            <p><b>End Date:</b> {new Date(Number(contractData[4]) * 1000).toLocaleDateString()}</p>
            <p><b>Signed by Landlord:</b> {contractData[5] ? "Yes" : "No"}</p>
            <p><b>Signed by Tenant:</b> {contractData[6] ? "Yes" : "No"}</p>
            <p><b>Locked:</b> {contractData[7] ? "Yes" : "No"}</p>
            <p><b>Active:</b> {contractData[8] ? "Yes" : "No"}</p>
            <p><b>Status:</b> {getStatusLabel(contractData[9])}</p>
          </div>

          <div className="actions">
            <h2>Actions</h2>
            <SignContract
              contractAddress={contractAddress}
              signer={signer}
              account={account}
              // אם יש כאן פעולה שמבצעת טרנזקציה – שתקרא onRefresh אחרי הצלחה
            />
          </div>
        </>
      )}

      {payments?.length > 0 && (
        <div className="info">
          <h3>Payments</h3>
          {payments.map((p, i) => (
            <p key={i}>
              Amount: {formatRent(p.amount)} | Time: {new Date(Number(p.timestamp) * 1000).toLocaleString()}
            </p>
          ))}
        </div>
      )}
    </div>
  );
}
