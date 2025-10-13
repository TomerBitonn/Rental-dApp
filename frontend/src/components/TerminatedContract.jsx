import { useEffect, useMemo, useState, useCallback } from "react";
import { ethers } from "ethers";
import artifact from "../abi/RentalContract.json";
import "../styles/Components.css";

export default function TerminatedContract({
  provider,
  signer,
  account,
  contractAddress,
  onChanged,      
  refreshKey = 0, 
}) {
  const [busy, setBusy] = useState(false);
  const [note, setNote] = useState(null);

  // on-chain snapshot we need for logic + display
  const [snap, setSnap] = useState({
    landlord: "",
    tenant: "",
    rentWei: 0n,
    signedL: false,
    signedT: false,
    locked: false,
    active: false,
    status: 0, // enum Status
  });

  const isAddr = useMemo(
    () => !!contractAddress && /^0x[a-fA-F0-9]{40}$/.test(contractAddress),
    [contractAddress]
  );
  const lower = (s) => (s ? String(s).toLowerCase() : s);
  const iAmLandlord = useMemo(() => lower(account) === lower(snap.landlord), [account, snap.landlord]);
  const iAmTenant   = useMemo(() => lower(account) === lower(snap.tenant),   [account, snap.tenant]);

  // helpers

  // small helper: pretty error to string
  const pretty = (e) =>
    e?.reason || e?.data?.message || e?.error?.message || e?.message || "Transaction failed";

  // convert wei -> ETH number (display only)
  const weiToEth = (wei) => {
    try {
      const f = (ethers.utils?.formatEther ?? ethers.formatEther)(wei.toString());
      return Number(f);
    } catch {
      return 0;
    }
  };

  // compute 2× rent in wei (works for BigNumber or bigint)
  const doubleWei = useMemo(() => {
    try {
      if (typeof snap.rentWei === "bigint") return snap.rentWei * 2n;
      if (ethers.BigNumber?.isBigNumber?.(snap.rentWei)) return snap.rentWei.mul(2);
      return BigInt(String(snap.rentWei)) * 2n;
    } catch {
      return 0n;
    }
  }, [snap.rentWei]);

  const doubleEth = useMemo(() => weiToEth(doubleWei), [doubleWei]);

  // read() - pulls a fresh snapshot from the contract
  // we keep it tiny: addresses, rent, signatures, locked/active, status
  const read = useCallback(async () => {
    setNote(null);
    if (!provider || !isAddr) return;
    try {
      const c = new ethers.Contract(contractAddress, artifact.abi, provider);
      const info = await c.getContractInfo();
      setSnap({
        landlord: String(info[0]),
        tenant:   String(info[1]),
        rentWei:  info[2],
        // info[3]=start, [4]=end
        signedL:  Boolean(info[5]),
        signedT:  Boolean(info[6]),
        locked:   Boolean(info[7]),
        active:   Boolean(info[8]),
        status:   Number(info[9]),
      });
    } catch (e) {
      setNote({ type: "error", text: pretty(e) });
    }
  }, [provider, contractAddress, isAddr]);

  useEffect(() => { read(); /* eslint-disable-next-line */ }, [provider, contractAddress, refreshKey]);

  // terminateByTenant() – tenant pays 2× rent and the contract becomes inactive
  // we guard with simple checks so the user gets clear reasons when disabled
  const terminateByTenant = async () => {
    try {
      if (!signer) { setNote({ type: "error", text: "Please connect your wallet first" }); return; }
      if (!isAddr)  { setNote({ type: "error", text: "Invalid contract address" }); return; }

      await read(); // make sure we operate on fresh state

      if (!iAmTenant) {
        setNote({ type: "error", text: "Only the tenant can terminate early with a fee" });
        return;
      }
      if (!snap.active) {
        setNote({ type: "info", text: "Contract is already inactive" });
        return;
      }
      if (!snap.locked) {
        setNote({ type: "error", text: "Contract must be locked before termination" });
        return;
      }
      if (!snap.signedL || !snap.signedT) {
        setNote({ type: "error", text: "Both parties must sign before termination" });
        return;
      }
      if (doubleWei === 0n) {
        setNote({ type: "error", text: "Invalid rent amount (cannot compute X 2 fee)" });
        return;
      }

      setBusy(true);
      setNote({ type: "info", text: `Submitting payment of ${doubleEth.toFixed(6)} ETH… Confirm in wallet` });

      const c = new ethers.Contract(contractAddress, artifact.abi, signer);
      const tx = await c.terminateByTenant({ value: doubleWei });

      setNote({ type: "info", text: "Waiting for on-chain confirmation…" });
      await tx.wait(1);

      setNote({ type: "success", text: "Termination executed. Contract is now inactive" });
      await read();
      onChanged?.();
    } catch (e) {
      setNote({ type: "error", text: pretty(e) });
    } finally {
      setBusy(false);
    }
  };

  // cancelContract() – landlord cancels without payment
  // we still do some friendly checks and messages
  const cancelByLandlord = async () => {
    try {
      if (!signer) { setNote({ type: "error", text: "Please connect your wallet first" }); return; }
      if (!isAddr)  { setNote({ type: "error", text: "Invalid contract address" }); return; }

      await read();

      if (!iAmLandlord) {
        setNote({ type: "error", text: "Only the landlord can cancel the contract" });
        return;
      }
      if (!snap.active) {
        setNote({ type: "info", text: "Contract is already inactive" });
        return;
      }

      setBusy(true);
      setNote({ type: "info", text: "Submitting cancel… Please confirm in your wallet" });

      const c = new ethers.Contract(contractAddress, artifact.abi, signer);
      const tx = await c.cancelContract();

      setNote({ type: "info", text: "Waiting for on-chain confirmation…" });
      await tx.wait(1);

      setNote({ type: "success", text: "Contract cancelled by landlord" });
      await read();
      onChanged?.();
    } catch (e) {
      setNote({ type: "error", text: pretty(e) });
    } finally {
      setBusy(false);
    }
  };

  // UI 

  return (
    <div className="card">
      <div className="card-toolbar" style={{display:"flex",alignItems:"center",justifyContent:"space-between",gap:12}}>
        <h2 style={{margin:0}}>Terminate Contract</h2>
      </div>

      <div className="info">
        <p>
          <b>Active:</b> {snap.active ? "Yes" : "No"} | <b>Locked:</b> {snap.locked ? "Yes" : "No"} |{" "}
          <b>Signed by Lanlord:</b> {snap.signedL ? "Yes" : "No"} | <b>Signed by Tenant:</b> {snap.signedT ? "Yes" : "No"}
        </p>
        <p><b>Termination fee (Tenant):</b> {doubleEth.toFixed(6)} ETH (Monthly Rent Amount <b>X</b> 2)</p>
      </div>

      {note && <Notice type={note.type}>{note.text}</Notice>}

      <div style={{ display: "flex", gap: 12, marginTop: 10, flexWrap: "wrap" }}>
        {/* Tenant button */}
        <button
          className="btn"
          onClick={terminateByTenant}
          disabled={busy || !isAddr}
          title="Tenant pays X 2 rent to terminate early"
        >
          {busy ? "Processing…" : `Terminate Early (Rent Amount X 2)`}
        </button>

        {/* Landlord button */}
        <button
          className="btn secondary"
          onClick={cancelByLandlord}
          disabled={busy || !isAddr}
          title="Landlord cancels without payment"
        >
          {busy ? "Processing…" : "Cancel Contract (Landlord)"}
        </button>
      </div>
    </div>
  );
}

// small presentational message box (uses your .notice styles)
function Notice({ type = "info", children }) {
  return <div className={`notice ${type}`} style={{ whiteSpace: "pre-line" }}>{children}</div>;
}
