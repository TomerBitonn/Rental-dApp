import { useState, useEffect } from "react";
import { ethers } from "ethers";
import artifact from "../abi/RentalContract.json";
import "../styles/Components.css";

export default function DeployContract({ signer, account, setContractAddress, contractAddress }) {
  const [tenant, setTenant] = useState("");
  const [usdRent, setUsdRent] = useState("");
  const [ethPrice, setEthPrice] = useState(null);
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [duration, setDuration] = useState(null);
  const [loading, setLoading] = useState(false);

  // Fetch ETH price
  useEffect(() => {
    fetch("https://api.coingecko.com/api/v3/simple/price?ids=ethereum&vs_currencies=usd")
      .then((res) => res.json())
      .then((data) => setEthPrice(data.ethereum.usd))
      .catch((err) => console.error("Failed to fetch ETH price", err));
  }, []);

  // Calculate duration when start/end change
  useEffect(() => {
    if (startDate && endDate) {
      const start = new Date(startDate);
      const end = new Date(endDate);
      const diff = Math.ceil((end - start) / (1000 * 60 * 60 * 24));
      setDuration(diff > 0 ? diff : null);
    }
  }, [startDate, endDate]);

  // Deploy contract
  const deployContract = async () => {
    try {
      if (!signer || !account) {
        alert("Please connect MetaMask before deploying.");
        return;
      }

      if (!tenant || !usdRent || !duration) {
        alert("Please fill all fields before deploying.");
        return;
      }

      if (!ethPrice) {
        alert("ETH price not loaded yet, please wait a moment.");
        return;
      }

      setLoading(true);

      const rentEth = usdRent / ethPrice;

      if (rentEth <= 0) {
        alert("Rent amount must be greater than 0.");
        setLoading(false);
        return;
      }

      const rentEthFixed = rentEth.toFixed(18);

      const rentWei = ethers.utils.parseEther(rentEthFixed);

      const factory = new ethers.ContractFactory(artifact.abi, artifact.bytecode, signer);

      const contract = await factory.deploy(
        tenant,
        rentWei,
        duration
      );

      console.log("Contract deployment transaction:", contract.deployTransaction.hash);

      await contract.deployed();

      console.log("Contract deployed at:", contract.address);
      setContractAddress(contract.address);

      alert(`Contract successfully deployed at:\n${contract.address}`);

    } catch (err) {
      console.error("Contract deployment failed:", err);
      if (err.code === "NUMERIC_FAULT") {
        alert("Rent value too precise — try rounding or increasing the amount slightly.");
      } else if (err.code === "INSUFFICIENT_FUNDS") {
        alert("Not enough ETH in your wallet to deploy the contract.");
      } else {
        alert(`Deployment failed: ${err.message}`);
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="card">
      <h2>Deploy Rental Contract</h2>

      <label>Tenant Address</label>
      <input
        type="text"
        placeholder="e.g., 0xvc387b8l05f7e821554b7u114958b11tye3r6347"
        value={tenant}
        onChange={(e) => setTenant(e.target.value)}
      />

      <label>Start Date</label>
      <input
        type="date"
        value={startDate}
        onChange={(e) => setStartDate(e.target.value)}
      />

      <label>End Date</label>
      <input
        type="date"
        value={endDate}
        onChange={(e) => setEndDate(e.target.value)}
      />

      {duration && <p>Duration: {duration} days</p>}

      <label>Monthly Rent Amount (USD)</label>
      <input
        type="number"
        placeholder="$ ≈ ETH"
        value={usdRent}
        onChange={(e) => setUsdRent(e.target.value)}
      />

      {ethPrice && usdRent && (
        <p>
          ≈ {(usdRent / ethPrice).toFixed(6)} ETH (ETH Price: ${ethPrice})
        </p>
      )}

      <button className="btn" onClick={deployContract} disabled={loading}>
        {loading ? "Deploying..." : "Deploy Contract"}
      </button>


      {contractAddress && (
        <p className="deployed">
          Contract deployed at:{" "}
          <span className="address">{contractAddress}</span>
        </p>
      )}
    </div>
  );
}
