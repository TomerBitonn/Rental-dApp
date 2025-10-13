import { useEffect, useState, useCallback } from "react";
import { ethers } from "ethers";
import artifact from "../abi/RentalContract.json";
import "../styles/Components.css";

export default function CancelContract({
  provider,
  signer,
  contractAddress,
  onChanged,     
  refreshKey = 0, 
}) {
  const [busy, setBusy] = useState(false);
  const [note, setNote] = useState(null);
  const [state, setState] = useState({
    landlord: "",
    tenant: "",
    locked: false,
    active: false,
    statusNum: 0,
  });

  const isAddr = (a) => {
    try { return (ethers.utils?.isAddress ?? ethers.isAddress)(a); }
    catch { return false; }
  };

  const pretty = (e) =>
    e?.reason || e?.data?.message || e?.error?.message || e?.message || "Transaction failed";

  const read = useCallback(async () => {
    if (!provider || !isAddr(contractAddress)) return;
    try {
      const c = new ethers.Contract(contractAddress, artifact.abi, provider);
      const info = await c.getContractInfo();
      setState({
        landlord: info[0],
        tenant: info[1],
        locked:  Boolean(info[7]),
        active:  Boolean(info[8]),
        statusNum: Number(info[9]),
      });
    } catch (err) {
      setNote({ type: "error", text: pretty(err) });
    }
  }, [provider, contractAddress]);

  useEffect(() => { read(); }, [read, refreshKey]);

  const cancel = async () => {
    try {
      if (!signer)        { setNote({ type: "error", text: "Please connect your wallet first." }); return; }
      if (!isAddr(contractAddress)) { setNote({ type: "error", text: "Invalid contract address." }); return; }

      await read();

      if (state.locked) {
        setNote({ type: "error", text: "This contract is already locked and cannot be canceled." });
        return;
      }
      if (!state.active) {
        setNote({ type: "info", text: "This contract is already inactive." });
        return;
      }

      const ok = window.confirm(
        "Are you sure you want to cancel this contract?\n" +
        "This will deactivate it on-chain (before locking) and cannot be undone."
      );
      if (!ok) return;

      setBusy(true);
      setNote({ type: "info", text: "Submitting cancel transaction… Please confirm in your wallet." });

      const c = new ethers.Contract(contractAddress, artifact.abi, signer);

      let tx;
      if (typeof c.cancelContract === "function")      tx = await c.cancelContract();
      else if (typeof c.cancel === "function")         tx = await c.cancel();
      else if (typeof c.terminate === "function")      tx = await c.terminate();
      else if (typeof c.terminateContract === "function") tx = await c.terminateContract();
      else throw new Error("cancel/terminate function not found in ABI. Rename in code to your contract method.");

      setNote({ type: "info", text: "Waiting for on-chain confirmation…" });
      await tx.wait(1);

      setNote({ type: "success", text: "Contract canceled successfully (now inactive)." });
      onChanged?.();     
      await read();      

    } catch (e) {
      setNote({ type: "error", text: pretty(e) });
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="card">
      <div className="card-toolbar" style={{display:"flex",alignItems:"center",justifyContent:"space-between",gap:12}}>
        <h2 style={{margin:0}}>Cancel Contract</h2>
      </div>

      <p><b>Address:</b> {contractAddress || "Enter Contract Address"}</p>
      <p>
        <b>Status:</b> {state.active ? "Active" : "Inactive"} | <b>Locked:</b> {state.locked ? "Yes" : "No"}
      </p>

      {note && <Notice type={note.type}>{note.text}</Notice>}

      <div style={{ display: "flex", gap: 12, marginTop: 10 }}>
        <button
          className="btn"
          onClick={cancel}
          disabled={busy || !isAddr(contractAddress)}
          title="Cancel this contract before it is locked"
        >
          {busy ? "Canceling…" : "Cancel Contract"}
        </button>
      </div>
    </div>
  );
}

function Notice({ type = "info", children }) {
  return <div className={`notice ${type}`} style={{ whiteSpace: "pre-line" }}>{children}</div>;
}
