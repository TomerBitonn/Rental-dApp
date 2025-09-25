import { useState, useEffect } from "react";
import { ethers } from "ethers";
import artifact from "../abi/RentalContract.json";
import "../styles/Components.css";

export default function DeployContract({ account, setAccount, setContractAddress, contractAddress }) {
  const [tenant, setTenant] = useState("");
  const [usdRent, setUsdRent] = useState("");
  const [ethPrice, setEthPrice] = useState(null);
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [duration, setDuration] = useState(null);

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

  // Connect wallet
  const connectWallet = async () => {
    if (!window.ethereum) return alert("Please install Metamask");

    const provider = new ethers.providers.Web3Provider(window.ethereum);
    await provider.send("eth_requestAccounts", []);
    const signer = provider.getSigner();
    setAccount(await signer.getAddress());
  };

  // Deploy contract
  const deployContract = async () => {
    try {
      if (!window.ethereum) return alert("Please install Metamask");
      if (!tenant || !usdRent || !duration) return alert("Fill all fields");

      const provider = new ethers.providers.Web3Provider(window.ethereum);
      const signer = provider.getSigner();

      const factory = new ethers.ContractFactory(artifact.abi, artifact.bytecode, signer);

      // Convert USD → ETH → wei
      const rentEth = usdRent / ethPrice;
      const contract = await factory.deploy(
        tenant,
        ethers.utils.parseEther(rentEth.toString()),
        duration
      );

      await contract.deployed();
      setContractAddress(contract.address); // updates global state
    } catch (err) {
      console.error(err);
      alert("Deployment failed, see console for details");
    }
  };

  return (
    <div className="card">
      <h2>Deploy Rental Contract</h2>

      {!account ? (
        <button className="btn" onClick={connectWallet}>Connect MetaMask</button>
      ) : (
        <p className="connected">Connected: <span className="address">{account}</span></p>
      )}

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

      <label>Rent Amount (USD)</label>
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

      <button className="btn" onClick={deployContract}>Deploy Contract</button>

      {contractAddress && (
        <p className="deployed">
          Contract deployed at:{" "}
          <span className="address">{contractAddress}</span>
        </p>
      )}
    </div>
  );
}
