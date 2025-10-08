import { useEffect, useMemo, useState } from "react";
import { ethers } from "ethers";
import artifact from "../abi/RentalContract.json";

export default function PayRent({ provider, signer, contractAddress }) {
  const [ethPrice, setEthPrice] = useState(null);
  const [loading, setLoading] = useState(false);
  const [busy, setBusy] = useState(false);
  const [info, setInfo] = useState("");
  const [error, setError] = useState("");

  // from contract
  const [landlord, setLandlord] = useState("");
  const [tenant, setTenant] = useState("");
  const [rentWei, setRentWei] = useState(ethers.constants.Zero);
  const [locked, setLocked] = useState(false);
  const [active, setActive] = useState(false);

  // input value (ETH) user will pay. default = rent from contract
  const [amountEth, setAmountEth] = useState("");

  const address = (contractAddress || "").trim();

  useEffect(() => {
    // Fetch ETH price (USD)
    fetch("https://api.coingecko.com/api/v3/simple/price?ids=ethereum&vs_currencies=usd")
      .then((r) => r.json())
      .then((data) => setEthPrice(data?.ethereum?.usd ?? null))
      .catch(() => setEthPrice(null));
  }, []);

  const readContract = useMemo(() => {
    if (!provider || !address || !ethers.utils.isAddress(address)) return null;
    return new ethers.Contract(address, artifact.abi, provider);
  }, [provider, address]);

  const writeContract = useMemo(() => {
    if (!signer || !address || !ethers.utils.isAddress(address)) return null;
    return new ethers.Contract(address, artifact.abi, signer);
  }, [signer, address]);

  const fetchContract = async () => {
    setError("");
    setInfo("");
    if (!readContract) return;
    try {
      setLoading(true);
      // getContractInfo(): [0]=landlord, [1]=tenant, [2]=rentAmount(wei),
      // [3]=start, [4]=end, [5]=signedByLandlord, [6]=signedByTenant,
      // [7]=locked, [8]=active, [9]=status(enum)
      const data = await readContract.getContractInfo();
      const _landlord = data[0];
      const _tenant   = data[1];
      const _rentWei  = data[2];
      const _locked   = Boolean(data[7]);
      const _active   = Boolean(data[8]);

      setLandlord(_landlord);
      setTenant(_tenant);
      setRentWei(_rentWei);
      setLocked(_locked);
      setActive(_active);

      const defaults = ethers.utils.formatEther(_rentWei?.toString() ?? "0");
      setAmountEth(defaults); // show the contractual rent as default

    } catch (e) {
      console.error(e);
      setError("Failed to read contract info. Please verify the address and network.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchContract();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [readContract]);

  // current connected address (if available)
  const [connected, setConnected] = useState("");
  useEffect(() => {
    let stale = false;
    const getAccount = async () => {
      try {
        if (!signer) return setConnected("");
        const addr = await signer.getAddress();
        if (!stale) setConnected(addr);
      } catch {
        if (!stale) setConnected("");
      }
    };
    getAccount();
    return () => { stale = true; };
  }, [signer]);

  const isTenant = connected && tenant && connected.toLowerCase() === tenant.toLowerCase();
  const canPay   = !!writeContract && isTenant && locked && active && Number(amountEth) > 0;

  const usdForInput = ethPrice && amountEth
    ? (parseFloat(amountEth || "0") * Number(ethPrice)).toFixed(2)
    : null;

  const pay = async () => {
    setError("");
    setInfo("");

    if (!canPay) {
      if (!isTenant) {
        setInfo("Only the tenant address may pay the rent.");
      } else if (!locked) {
        setInfo("The contract must be locked before payments can be made.");
      } else if (!active) {
        setInfo("This contract is not active.");
      } else if (!amountEth || Number(amountEth) <= 0) {
        setInfo("Please enter a positive amount in ETH.");
      }
      return;
    }

    try {
      setBusy(true);
      const value = ethers.utils.parseEther(String(amountEth));
      const tx = await writeContract.payRent({ value }); // your payable function
      setInfo("Submitting transaction… Please confirm in your wallet and wait for confirmation.");
      const receipt = await tx.wait();
      if (receipt.status !== 1) throw new Error("Transaction failed.");
      setInfo("Rent payment completed successfully.");
      // Optionally refresh contract info (or a payment list)
      await fetchContract();
    } catch (e) {
      console.error(e);
      const msg = e?.error?.message || e?.reason || e?.message || "Payment failed.";
      setError(msg);
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="action-card">
      <h3>Pay Rent</h3>

      {!address ? (
        <p>Enter/select a contract address first.</p>
      ) : (
        <>
          <div className="info" style={{ marginTop: 8 }}>
            <p><b>Landlord:</b> {landlord || "-"}</p>
            <p><b>Tenant:</b> {tenant || "-"}</p>
            <p>
              <b>Rent (from contract):</b>{" "}
              {ethers.utils.formatEther(rentWei?.toString() || "0")} ETH
              {ethPrice && rentWei
                ? ` ($${(Number(ethers.utils.formatEther(rentWei.toString())) * Number(ethPrice)).toFixed(2)} USD)`
                : ""}
            </p>
            <p><b>Locked:</b> {locked ? "Yes" : "No"} | <b>Active:</b> {active ? "Yes" : "No"}</p>
            {connected && (
              <p><b>Connected as:</b> {connected}{isTenant ? " (tenant)" : ""}</p>
            )}
          </div>

          <label style={{ marginTop: 12 }}>Amount to pay (ETH)</label>
          <input
            type="number"
            min="0"
            step="0.000000000000000001"
            value={amountEth}
            onChange={(e) => setAmountEth(e.target.value)}
            placeholder="0.0"
          />
          <div style={{ opacity: .9, marginTop: 6 }}>
            {usdForInput ? <>≈ <b>${usdForInput}</b> USD</> : "USD price unavailable"}
          </div>

          {info && <div className="notice info" style={{ marginTop: 12 }}>{info}</div>}
          {error && <div className="notice error" style={{ marginTop: 12 }}>{error}</div>}

          <div style={{ display: "flex", gap: 12, marginTop: 14, flexWrap: "wrap" }}>
            <button className="btn secondary" onClick={fetchContract} disabled={loading || busy}>
              {loading ? "Refreshing…" : "Refresh"}
            </button>
            <button className="btn" onClick={pay} disabled={!canPay || busy}>
              {busy ? "Paying…" : "Pay rent"}
            </button>
          </div>

          {!isTenant && (
            <div className="notice warn" style={{ marginTop: 12 }}>
              Only the <b>tenant</b> address can pay the rent.
            </div>
          )}
          {(!locked || !active) && (
            <div className="notice warn" style={{ marginTop: 8 }}>
              The contract must be <b>locked and active</b> to accept payments.
            </div>
          )}
        </>
      )}
    </div>
  );
}
