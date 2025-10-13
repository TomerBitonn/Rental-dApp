import { useEffect, useMemo, useState } from "react";
import { ethers } from "ethers";
import artifact from "../abi/RentalContract.json";
import "../styles/Components.css";

export default function RentUpdate({
  provider,
  signer,
  account,
  contractAddress,
  onChange,        
  refreshKey = 0, 
}) {
  const [ethPrice, setEthPrice] = useState(null);
  const [landlord, setLandlord] = useState("");
  const [currentRentWei, setCurrentRentWei] = useState(0n);
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState("");      
  const [usdInput, setUsdInput] = useState(""); 

  const lower = (s) => (s ? String(s).toLowerCase() : s);
  const isAddr = !!contractAddress && /^0x[a-fA-F0-9]{40}$/.test(contractAddress);
  const isLandlord = landlord && account && lower(landlord) === lower(account);

  useEffect(() => {
    fetch("https://api.coingecko.com/api/v3/simple/price?ids=ethereum&vs_currencies=usd")
      .then(r => r.json())
      .then(d => setEthPrice(d?.ethereum?.usd ?? null))
      .catch(() => {});
  }, []);

  const load = async () => {
    if (!provider || !isAddr) return;
    try {
      const c = new ethers.Contract(contractAddress, artifact.abi, provider);
      const info = await c.getContractInfo();
      setLandlord(info[0]);
      setCurrentRentWei(info[2]);
    } catch (e) {
      setMsg(e?.reason || e?.message || "Failed to read contract.");
    }
  };

  useEffect(() => { load();}, [provider, contractAddress, refreshKey]);
  const currentRentEth = useMemo(() => {
    try {
      const fmt = (ethers?.utils?.formatEther ?? ethers.formatEther);
      return Number(fmt(currentRentWei));
    } catch { return 0; }
  }, [currentRentWei]);

  const currentRentUsd = useMemo(() => {
    if (!ethPrice) return null;
    return (currentRentEth * Number(ethPrice)).toFixed(2);
  }, [currentRentEth, ethPrice]);

  const canUpdate = isAddr && signer && isLandlord && Number(usdInput) > 0 && !busy;

  const updateRent = async () => {
    if (!canUpdate) return;
    try {
      setBusy(true);
      setMsg("Updating…");

      if (!ethPrice) throw new Error("ETH price not loaded.");
      const newEth = Number(usdInput) / Number(ethPrice);
      const parse = (ethers?.utils?.parseEther ?? ethers.parseEther);
      const newWei = parse(newEth.toFixed(18));

      const c = new ethers.Contract(contractAddress, artifact.abi, signer);

      let tx;
      if (typeof c.updateRent === "function") tx = await c.updateRent(newWei);
      else if (typeof c.setRent === "function") tx = await c.setRent(newWei);
      else if (typeof c.updateRentAmount === "function") tx = await c.updateRentAmount(newWei);
      else throw new Error("updateRent function not found in ABI.");

      await tx.wait();

      setMsg(" Rent updated successfully.");
      onChange?.();  
      await load();  
      setUsdInput("");
    } catch (e) {
      setMsg(e?.reason || e?.message || "Failed to update rent.");
    } finally {
      setBusy(false);
    }
  };

  useEffect(() => {
    if (!msg) return;
    
    if (/updated successfully|/i.test(msg)) {
      const t = setTimeout(() => setMsg(""), 3500);
      return () => clearTimeout(t);
    }
  }, [msg]);

  if (!isAddr) {
    return (
      <div className="card">
        <h2>Rent Update</h2>
        <p>Please enter/select a contract address first.</p>
      </div>
    );
  }

  if (!isLandlord) {
    return (
      <div className="card">
        <h2>Rent Update</h2>
        <p className="note">Only the landlord can access this tab.</p>
      </div>
    );
  }

  const isWarn = /fail|error|cannot|missing/i.test(msg);

  return (
    <div className="card">
      <div className="card-toolbar" style={{display:"flex",alignItems:"center",justifyContent:"space-between",gap:12}}>
        <h2 style={{margin:0}}>Rent Update</h2>
      </div>

      <div className="info">
        <p>
          <b>Current Rent:</b> {currentRentEth.toFixed(6)} ETH
          {currentRentUsd ? ` ($${currentRentUsd} USD)` : ""}
        </p>
      </div>

      <div className="subcard">
        <h3 className="subtitle">Set New Monthly Rent</h3>
        <div style={{display:"flex",gap:12,alignItems:"center",flexWrap:"wrap"}}>
          <label htmlFor="newRent" style={{minWidth:120}}>New Rent (USD):</label>
          <input
            id="newRent"
            type="number"
            min="0"
            step="0.01"
            placeholder="e.g. 1200"
            value={usdInput}
            onChange={(e) => setUsdInput(e.target.value)}
            disabled={busy}
          />
          <button className="btn" onClick={updateRent} disabled={!canUpdate}>
            {busy ? "Updating…" : "Update Rent"}
          </button>
        </div>

        {ethPrice && Number(usdInput) > 0 && (
          <p className="hint" style={{marginTop:8}}>
            ≈ {(Number(usdInput)/Number(ethPrice)).toFixed(6)} ETH @ ${ethPrice} USD/ETH
          </p>
        )}
      </div>

      {!!msg && (
        <div
          className={`note ${isWarn ? "note--warn" : "note--success"}`}
          style={{ marginTop: 10 }}
        >
          {msg}
        </div>
      )}
    </div>
  );
}
