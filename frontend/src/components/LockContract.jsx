import { useEffect, useMemo, useState } from "react";
import { ethers } from "ethers";
import artifact from "../abi/RentalContract.json";

export default function LockContract({ provider, signer, contractAddress, onLocked }) {
  const [status, setStatus] = useState({
    landlord: false,
    tenant: false,
    locked: false,
  });
  const [loading, setLoading] = useState(false);
  const [busy, setBusy] = useState(false);
  const [info, setInfo] = useState("");
  const [error, setError] = useState("");

  const address = (contractAddress || "").trim();

  const readContract = useMemo(() => {
    if (!provider || !address || !ethers.utils.isAddress(address)) return null;
    return new ethers.Contract(address, artifact.abi, provider);
  }, [provider, address]);

  const writeContract = useMemo(() => {
    if (!signer || !address || !ethers.utils.isAddress(address)) return null;
    return new ethers.Contract(address, artifact.abi, signer);
  }, [signer, address]);

  const fetchStatus = async () => {
    setError("");
    setInfo("");
    if (!readContract) return;
    try {
      setLoading(true);
      const data = await readContract.getContractInfo();
      setStatus({
        landlord: Boolean(data[5]),
        tenant: Boolean(data[6]),
        locked:  Boolean(data[7]),
      });
    } catch (e) {
      console.error(e);
      setError("Failed to read contract state. Check the address and your network.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchStatus();
  }, [readContract]);

  const canLock = status.landlord && status.tenant && !status.locked && !!writeContract;

  const handleLock = async () => {
    setError("");
    setInfo("");

    if (!canLock) {
      setInfo("Both landlord and tenant must sign before the agreement can be locked.");
      return;
    }

    try {
      setBusy(true);
      const tx = await writeContract.lockContract(); // ← your solidity function name
      setInfo("Submitting transaction… Please confirm in your wallet and wait for confirmation.");
      const receipt = await tx.wait();
      onLocked?.();
      if (receipt.status !== 1) throw new Error("Transaction failed.");
      setInfo("Contract locked successfully.");
      await fetchStatus();
    } catch (e) {
      console.error(e);
      const msg = e?.error?.message || e?.reason || e?.message || "Failed to lock contract.";
      setError(msg);
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="card">
      <h2>Lock Contract</h2>

      {!address ? (
        <p>Enter/select a contract address first.</p>
      ) : (
        <>
          <p><b>Address:</b> {address}</p>
          <p><b>Landlord signed:</b> {status.landlord ? "Yes" : "No"}</p>
          <p><b>Tenant signed:</b> {status.tenant ? "Yes" : "No"}</p>
          <p><b>Locked:</b> {status.locked ? "Yes" : "No"}</p>

          {info && (
            <div className="notice info" style={{ marginTop: 12 }}>
              {info}
            </div>
          )}
          {error && (
            <div className="notice error" style={{ marginTop: 12 }}>
              {error}
            </div>
          )}

          <div style={{ display: "flex", gap: 12, marginTop: 16, flexWrap: "wrap" }}>
            <button className="btn secondary" onClick={fetchStatus} disabled={loading || busy}>
              {loading ? "Refreshing…" : "Refresh status"}
            </button>

            <button className="btn" onClick={handleLock} disabled={!canLock || busy}>
              {busy ? "Locking…" : "Lock contract"}
            </button>
          </div>

          {(!status.landlord || !status.tenant) && (
            <div className="notice warn" style={{ marginTop: 16 }}>
              You can lock the contract only after <b>both parties</b> have signed it.
            </div>
          )}
        </>
      )}
    </div>
  );
}
