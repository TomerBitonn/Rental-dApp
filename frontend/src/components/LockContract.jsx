import { useEffect, useState, useCallback } from "react";
import { ethers } from "ethers";
import artifact from "../abi/RentalContract.json";

export default function LockContract({ provider, signer, contractAddress, onChanged, refreshKey }) {
  const [status, setStatus] = useState({ landlord: false, tenant: false, locked: false });
  const [busy, setBusy] = useState(false);
  const [note, setNote] = useState(null);

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
    const c = new ethers.Contract(contractAddress, artifact.abi, provider);
    const info = await c.getContractInfo();
    setStatus({ landlord: info[5], tenant: info[6], locked: info[7] });
  }, [provider, contractAddress]);

  useEffect(() => {
    read();
  }, [read, refreshKey]);

  const pretty = (e) => {
    return (
      e?.reason ||
      e?.data?.message ||
      e?.error?.message ||
      e?.message ||
      "Transaction failed"
    );
  };

  const lock = async () => {
    try {
      if (!signer) throw new Error("No signer. Connect your wallet.");
      if (!isAddr(contractAddress)) throw new Error("Invalid contract address.");
      if (!status.landlord || !status.tenant)
        throw new Error("Both parties must sign before locking.");
      if (status.locked) throw new Error("Contract is already locked.");

      setBusy(true);
      setNote({
        type: "info",
        text: "Submitting transaction… Please confirm in your wallet and wait for confirmation.",
      });

      const c = new ethers.Contract(contractAddress, artifact.abi, signer);
      const tx = await c.lockContract();

      setNote({
        type: "info",
        text: `Transaction sent (${tx.hash.slice(
          0,
          10
        )}…). Waiting for confirmation…`,
      });
      await tx.wait(1);

      setNote({ type: "success", text: "Contract locked successfully." });
      await read();
      onChanged?.();
      status.locked = true;
    } catch (e) {
      setNote({ type: "error", text: pretty(e) });
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="card">
      <div className="card-toolbar" style={{display:"flex",alignItems:"center",justifyContent:"space-between",gap:12}}>
        <h2>Lock Contract</h2>
      </div>
      <p>
        <b>Address:</b> {contractAddress || "Enter Contract Address"}
      </p>
      <p>
        <b>Locked:</b> {status.locked ? "Yes" : "No"}
      </p>

      {note && <Notice type={note.type}>{note.text}</Notice>}

      <div style={{ display: "flex", gap: 12 }}>
        <button
          className="btn secondary"
          onClick={read}
          disabled={busy || !isAddr(contractAddress)}
        >
          Refresh
        </button>
        <button
          className="btn"
          onClick={lock}
          disabled={
            busy ||
            !isAddr(contractAddress) ||
            !status.landlord ||
            !status.tenant ||
            status.locked
          }
        >
          {busy ? "Locking…" : "Lock Contract"}
        </button>
      </div>
    </div>
  );
}

function Notice({ type = "info", children }) {
  return <div className={`notice ${type}`}>{children}</div>;
}
