import { useEffect, useState, useCallback } from "react";
import { ethers } from "ethers";
import artifact from "../abi/RentalContract.json";

export default function PayRent({ provider, signer, account, contractAddress, refreshKey, onChanged }) {
  const [ethPrice, setEthPrice] = useState(null);
  const [locked, setLocked] = useState(false);
  const [tenant, setTenant] = useState("");
  const [rentWei, setRentWei] = useState("0");
  const [busy, setBusy] = useState(false);
  const [note, setNote] = useState(null);

  const isAddr = (a) => {
    try {
      return (ethers.utils?.isAddress ?? ethers.isAddress)(a);
    } catch {
      return false;
    }
  };

  useEffect(() => {
    fetch("https://api.coingecko.com/api/v3/simple/price?ids=ethereum&vs_currencies=usd")
      .then((r) => r.json())
      .then((d) => setEthPrice(d?.ethereum?.usd ?? null))
      .catch(() => {});
  }, []);

  const read = useCallback(async () => {
    if (!provider || !isAddr(contractAddress)) return;
    const c = new ethers.Contract(contractAddress, artifact.abi, provider);
    const info = await c.getContractInfo();
    setTenant(info[1]);
    setRentWei(info[2].toString());
    setLocked(Boolean(info[7]));
  }, [provider, contractAddress]);

  useEffect(() => {
    read();
  }, [read, refreshKey]);

  const fmt = (wei) => {
    const eth = parseFloat((ethers.utils?.formatEther ?? ethers.formatEther)(wei));
    if (!ethPrice) return `${eth.toFixed(6)} ETH`;
    return `${eth.toFixed(6)} ETH ($${(eth * ethPrice).toFixed(2)} USD)`;
  };

  const pretty = (e) => {
    return (
      e?.reason ||
      e?.data?.message ||
      e?.error?.message ||
      e?.message ||
      "Payment failed"
    );
  };

  const pay = async () => {
    try {
      if (!signer) throw new Error("No signer. Connect your wallet.");
      if (!isAddr(contractAddress)) throw new Error("Invalid contract address.");

      await read();
      if (!locked) throw new Error("Contract must be locked before paying.");
      if (!tenant || account?.toLowerCase() !== tenant.toLowerCase()) {
        throw new Error("Only the tenant can pay the rent.");
      }

      setBusy(true);
      setNote({
        type: "info",
        text: "Submitting payment… Please confirm in your wallet and wait for confirmation.",
      });

      const c = new ethers.Contract(contractAddress, artifact.abi, signer);
      const tx = await c.payRent({ value: rentWei });

      setNote({
        type: "info",
        text: `Transaction sent (${tx.hash.slice(
          0,
          10
        )}…). Waiting for confirmation…`,
      });
      await tx.wait(1);

      setNote({ type: "success", text: "Payment confirmed. Thank you!" });
      onChanged?.();
    } catch (e) {
      setNote({ type: "error", text: pretty(e) });
    } finally {
      setBusy(false);
    }
  };

  const disabled =
    busy ||
    !isAddr(contractAddress) ||
    !locked ||
    !tenant ||
    account?.toLowerCase() !== tenant.toLowerCase();

  return (
    <div className="card">
      <div className="card-toolbar" style={{display:"flex",alignItems:"center",justifyContent:"space-between",gap:12}}>
        <h2>Pay Rent</h2>
      </div>

      <p>
        Amount due: <b>{fmt(rentWei)}</b>
      </p>

      {!locked && <Notice type="error">Contract must be locked before paying.</Notice>}
      {tenant && account && account.toLowerCase() !== tenant.toLowerCase() && (
        <Notice type="error">Only the tenant can pay this contract.</Notice>
      )}
      {note && <Notice type={note.type}>{note.text}</Notice>}

      <div style={{ display: "flex", gap: 12 }}>
        <button
          className="btn secondary"
          onClick={read}
          disabled={busy || !isAddr(contractAddress)}
        >
          Refresh
        </button>
        <button className="btn" onClick={pay} disabled={disabled}>
          {busy ? "Paying..." : "Pay Rent"}
        </button>
      </div>
    </div>
  );
}

function Notice({ type = "info", children }) {
  return <div className={`notice ${type}`}>{children}</div>;
}
