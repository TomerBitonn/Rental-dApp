/*import { useEffect, useState } from "react";
import { ethers } from "ethers";
import artifact from "../abi/RentalContract.json";

export default function PayRent({ provider, signer, contractAddress, onPaid }) {
  const [rentWei, setRentWei] = useState(null);
  const [locked, setLocked] = useState(false);
  const [ethPrice, setEthPrice] = useState(null);
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState("");

  // Load rent amount + locked state
  useEffect(() => {
    if (!contractAddress || !provider) {
      setRentWei(null);
      setLocked(false);
      return;
    }
    const load = async () => {
      try {
        setMsg("");
        const c = new ethers.Contract(contractAddress, artifact.abi, provider);
        const info = await c.getContractInfo();
        setRentWei(info[2]);            // rent in wei
        setLocked(Boolean(info[7]));    // locked flag
      } catch (e) {
        setMsg(e.reason || e.message || "Failed to read contract.");
      }
    };
    load();
  }, [contractAddress, provider]);

  // ETH price (USD)
  useEffect(() => {
    fetch("https://api.coingecko.com/api/v3/simple/price?ids=ethereum&vs_currencies=usd")
      .then(r => r.json())
      .then(d => setEthPrice(d?.ethereum?.usd))
      .catch(() => {});
  }, []);

  const formatEthUsd = () => {
    if (!rentWei) return "";
    const fmt = (ethers?.utils?.formatEther ?? ethers.formatEther)(rentWei.toString());
    const eth = parseFloat(fmt);
    const usd = ethPrice ? ` ($${(eth * ethPrice).toFixed(2)} USD)` : "";
    return `${eth.toFixed(6)} ETH${usd}`;
  };

  const pay = async () => {
    try {
      setBusy(true);
      setMsg("");
      if (!signer) throw new Error("No signer. Connect your wallet.");
      if (!rentWei) throw new Error("Missing rent amount.");

      const c = new ethers.Contract(contractAddress, artifact.abi, signer);
      const tx = await c.payRent({ value: rentWei });
      await tx.wait();

      setMsg("Rent paid successfully.");
      onPaid?.();
    } catch (e) {
      setMsg(e.reason || e.message || "Failed to pay rent.");
    } finally {
      setBusy(false);
    }
  };

  const disabled = !contractAddress || !locked || !rentWei || busy;

  return (
    <div className="card">
      <h2>Pay Rent</h2>

      {!contractAddress && (
        <p className="note">Load a contract address first.</p>
      )}

      {rentWei && (
        <p className="note">Amount due: <b>{formatEthUsd()}</b></p>
      )}

      {!locked && contractAddress && (
        <p className="note-warn">Contract must be locked before paying.</p>
      )}

      <button className="btn" onClick={pay} disabled={disabled}>
        {busy ? "Paying..." : "Pay Rent"}
      </button>

      {msg && <p className="note" style={{ marginTop: 8 }}>{msg}</p>}
    </div>
  );
}*/

/*import { useEffect, useMemo, useState } from "react";
import { ethers } from "ethers";
import artifact from "../abi/RentalContract.json";

export default function PayRent({
  provider,
  signer,
  account,
  contractAddress,
  onChange,        // parent can bump a refresh counter
  refreshKey = 0,  // parent bump forces reload
}) {
  const [ethPrice, setEthPrice] = useState(null);
  const [tenant, setTenant]   = useState("");
  const [locked, setLocked]   = useState(false);
  const [rentWei, setRentWei] = useState(0n);
  const [busy, setBusy]       = useState(false);
  const [msg, setMsg]         = useState("");

  const lower = (s) => (s ? s.toLowerCase() : s);

  // Load ETH price (USD)
  useEffect(() => {
    fetch("https://api.coingecko.com/api/v3/simple/price?ids=ethereum&vs_currencies=usd")
      .then(r => r.json())
      .then(d => setEthPrice(d?.ethereum?.usd ?? null))
      .catch(() => {});
  }, []);

  // Load contract snapshot (always from chain, fresh)
  const load = async () => {
    setMsg("");
    if (!provider || !contractAddress) return;
    try {
      const c = new ethers.Contract(contractAddress, artifact.abi, provider);
      const info = await c.getContractInfo();
      // tuple: [0] landlord, [1] tenant, [2] rentWei, [3] start, [4] end, [5] LL signed, [6] TN signed, [7] locked, [8] active, [9] status
      setTenant(info[1]);
      setRentWei(info[2]);
      setLocked(Boolean(info[7]));
    } catch (e) {
      setMsg(e.reason || e.message || "Failed to read contract.");
    }
  };

  // Reload when address changes or parent bumps refresh
  useEffect(() => { load(); }, [contractAddress, provider, refreshKey]);

  // Amount due: contract stores rent in WEI (monthly). Convert to ETH & USD
  const amountEth = useMemo(() => {
    try {
      const fmt = (ethers.utils?.formatEther ?? ethers.formatEther);
      return Number(fmt(rentWei));
    } catch {
      return 0;
    }
  }, [rentWei]);

  const amountUsd = useMemo(() => {
    if (!ethPrice) return null;
    return (amountEth * ethPrice).toFixed(2);
  }, [amountEth, ethPrice]);

  // Why the button is disabled
  const disabledReason = useMemo(() => {
    if (!contractAddress) return "Enter/select a contract first.";
    if (!locked) return "Contract must be locked before paying.";
    if (!signer) return "Please connect a wallet.";
    if (lower(account) !== lower(tenant)) return "Only the tenant can pay.";
    if (amountEth <= 0) return "Nothing to pay.";
    return "";
  }, [contractAddress, locked, signer, account, tenant, amountEth]);

  const pay = async () => {
    if (disabledReason) return;
    setBusy(true);
    setMsg("");
    try {
      const c = new ethers.Contract(contractAddress, artifact.abi, signer);
      const parse = (ethers.utils?.parseEther ?? ethers.parseEther);
      const tx = await c.payRent({ value: parse(String(amountEth)) });
      setMsg("Waiting for on-chain confirmation…");
      await tx.wait();
      setMsg("Payment successful.");
      onChange?.();      // tell parent to refresh siblings (Lock/Info)
      await load();      // self refresh
    } catch (e) {
      setMsg(e?.reason || e?.message || "Payment failed.");
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="card">
      <h2>Pay Rent</h2>

      <p style={{ margin: 0 }}>
        Amount due: <b>{amountEth.toFixed(6)} ETH</b>
        {amountUsd ? <> (${amountUsd} USD)</> : null}
      </p>

      {!!disabledReason && (
        <p className="note note--warn" style={{ marginTop: 10 }}>
          {disabledReason}
        </p>
      )}

      <div style={{ display: "flex", gap: 12, marginTop: 14 }}>
        <button className="btn" onClick={pay} disabled={!!disabledReason || busy}>
          {busy ? "Paying…" : "Pay Rent"}
        </button>
        <button
          className="btn secondary small"
          onClick={load}
          disabled={busy}
          title="Refresh"
        >
          Refresh
        </button>
      </div>

      {!!msg && <p className="note" style={{ marginTop: 10 }}>{msg}</p>}
    </div>
  );
}*/


import { useEffect, useState } from "react";
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
    try { return (ethers.utils?.isAddress ?? ethers.isAddress)(a); } catch { return false; }
  };

  useEffect(() => {
    fetch("https://api.coingecko.com/api/v3/simple/price?ids=ethereum&vs_currencies=usd")
      .then(r => r.json())
      .then(d => setEthPrice(d?.ethereum?.usd ?? null))
      .catch(() => {});
  }, []);

  async function read() {
    if (!provider || !isAddr(contractAddress)) return;
    const c = new ethers.Contract(contractAddress, artifact.abi, provider);
    const info = await c.getContractInfo();
    setTenant(info[1]);
    setRentWei(info[2].toString());
    setLocked(Boolean(info[7]));
  }

  useEffect(() => { read(); }, [provider, contractAddress, refreshKey]);

  function fmt(wei) {
    const eth = parseFloat((ethers.utils?.formatEther ?? ethers.formatEther)(wei));
    if (!ethPrice) return `${eth.toFixed(6)} ETH`;
    return `${eth.toFixed(6)} ETH ($${(eth * ethPrice).toFixed(2)} USD)`;
  }

  function pretty(e) {
    return e?.reason || e?.data?.message || e?.error?.message || e?.message || "Payment failed";
  }

  async function pay() {
    try {
      if (!signer) throw new Error("No signer. Connect your wallet.");
      if (!isAddr(contractAddress)) throw new Error("Invalid contract address.");

      await read();
      if (!locked) throw new Error("Contract must be locked before paying.");
      if (!tenant || account?.toLowerCase() !== tenant.toLowerCase()) {
        throw new Error("Only the tenant can pay the rent.");
      }

      setBusy(true);
      setNote({ type: "info", text: "Submitting payment… Please confirm in your wallet and wait for confirmation." });

      const c = new ethers.Contract(contractAddress, artifact.abi, signer);
      const tx = await c.payRent({ value: rentWei });

      setNote({ type: "info", text: `Transaction sent (${tx.hash.slice(0, 10)}…). Waiting for confirmation…` });
      await tx.wait(1);

      setNote({ type: "success", text: "Payment confirmed. Thank you!" });
      onChanged?.(); 
    } catch (e) {
      setNote({ type: "error", text: pretty(e) });
    } finally {
      setBusy(false);
    }
  }

  const disabled = busy || !isAddr(contractAddress) || !locked || !tenant || account?.toLowerCase() !== tenant.toLowerCase();

  return (
    <div className="card">
      <h2>Pay Rent</h2>
      <p>Amount due: <b>{fmt(rentWei)}</b></p>

      {!locked && <Notice type="error">Contract must be locked before paying.</Notice>}
      {tenant && account && account.toLowerCase() !== tenant.toLowerCase() && (
        <Notice type="error">Only the tenant can pay this contract.</Notice>
      )}
      {note && <Notice type={note.type}>{note.text}</Notice>}

      <div style={{ display: "flex", gap: 12 }}>
        <button className="btn secondary" onClick={read} disabled={busy || !isAddr(contractAddress)}>
          Refresh
        </button>
        <button className="btn" onClick={pay} disabled={disabled}>
          {busy ? "Loading…" : "Pay Rent"}
        </button>
      </div>
    </div>
  );
}

function Notice({ type = "info", children }) {
  return <div className={`notice ${type}`}>{children}</div>;
}
