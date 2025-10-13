import { useState, useCallback, useEffect } from "react";
import { ethers } from "ethers";
import artifact from "../abi/RentalContract.json";
import "../styles/Components.css";

export default function SignContract({ provider, signer, contractAddress }) {
  const [status, setStatus] = useState({ landlord: false, tenant: false });
  const [loading, setLoading] = useState(false);
  const [busy, setBusy] = useState(false);

  const isAddr = (a) => {
    try {
      return (ethers.utils?.isAddress ?? ethers.isAddress)(a);
    } catch {
      return false;
    }
  };

  const read = useCallback(async () => {
    console.log(provider, contractAddress);
    
    if (!provider || !isAddr(contractAddress)) return;
    try {
      setBusy(true);
      const c = new ethers.Contract(contractAddress, artifact.abi, provider);
      const info = await c.getContractInfo();
      // info[5] → landlord signed, info[6] → tenant signed, info[7] → locked
      console.log("Contract info:", info);
      setStatus({
        landlord: info[5],
        tenant: info[6],
      });
    } catch (err) {
      console.error("Failed to read contract info:", err);
    } finally {
      setBusy(false);
    }
  }, [provider, contractAddress]);

  useEffect(() => {
    read();
  }, [read]);

  const handleSignContract = async () => {
    try {
      if (!signer) {
        alert("Wallet not connected. Please connect MetaMask first.");
        return;
      }

      if (!contractAddress) {
        alert("Please load a valid contract first.");
        return;
      }

      const contract = new ethers.Contract(contractAddress, artifact.abi, signer);

      setLoading(true);
      const tx = await contract.signContract();
      await tx.wait();

      alert("Contract successfully signed on blockchain!");
      await read(); 
    } catch (err) {
      console.error("Sign contract failed:", err);
      alert("Failed to sign contract. See console for details.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="card">
      <div className="card-toolbar" style={{display:"flex",alignItems:"center",justifyContent:"space-between",gap:12}}>
        <h2>Sign Contract</h2>
      </div>

      <p>
        <b>Address:</b> {contractAddress || "Enter Contract Address"}
      </p>
      <p>
        <b>Landlord signed:</b> {status.landlord ? "Yes" : "No"}
      </p>
      <p>
        <b>Tenant signed:</b> {status.tenant ? "Yes" : "No"}
      </p>

      <div style={{ display: "flex", gap: 12 }}>
        <button
          className="btn secondary"
          onClick={read}
          disabled={busy || !isAddr(contractAddress)}
        >
          {busy ? "Refreshing…" : "Refresh"}
        </button>

        <button className="btn" onClick={handleSignContract} disabled={loading}>
          {loading ? "Signing..." : "Sign Contract On Blockchain"}
        </button>
      </div>
    </div>
  );
}
