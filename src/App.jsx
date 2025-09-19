import { useState } from "react";
import { ethers } from "ethers";
import artifact from "./abi/RentalContract.json";
import "./App.css";

function App() {
  const [account, setAccount] = useState(null);
  const [tenant, setTenant] = useState("");
  const [rent, setRent] = useState("");
  const [duration, setDuration] = useState("");
  const [contractAddress, setContractAddress] = useState(null);

  // Connect to Metamask and switch to Sepolia if needed
  const connectWallet = async () => {
    if (!window.ethereum) {
      alert("Please install Metamask");
      return;
    }

    const provider = new ethers.providers.Web3Provider(window.ethereum);
    await provider.send("eth_requestAccounts", []);
    const signer = provider.getSigner();

    const network = await provider.getNetwork();

    // Check if user is on Sepolia (chainId 11155111)
    if (network.chainId !== 11155111) {
      try {
        await window.ethereum.request({
          method: "wallet_switchEthereumChain",
          params: [{ chainId: "0xaa36a7" }], // Hex for 11155111
        });
      } catch (switchError) {
        // If Sepolia is not added in Metamask
        if (switchError.code === 4902) {
          await window.ethereum.request({
            method: "wallet_addEthereumChain",
            params: [
              {
                chainId: "0xaa36a7",
                chainName: "Sepolia Test Network",
                nativeCurrency: {
                  name: "SepoliaETH",
                  symbol: "ETH",
                  decimals: 18,
                },
                rpcUrls: ["https://sepolia.infura.io/v3/YOUR_INFURA_KEY"],
                blockExplorerUrls: ["https://sepolia.etherscan.io"],
              },
            ],
          });
        }
      }
    }

    setAccount(await signer.getAddress());
  };

  // Deploy the Rental contract with parameters from the form
  const deployContract = async () => {
    try {
      if (!window.ethereum) return alert("Please install Metamask");

      const provider = new ethers.providers.Web3Provider(window.ethereum);
      const signer = provider.getSigner();

      const factory = new ethers.ContractFactory(
        artifact.abi,
        artifact.bytecode,
        signer
      );

      const contract = await factory.deploy(
        tenant,
        ethers.utils.parseEther(rent), // Rent in ETH
        duration
      );

      await contract.deployed();
      setContractAddress(contract.address);
      alert(`Contract deployed to: ${contract.address}`);
    } catch (err) {
      console.error(err);
      alert("Deployment failed, see console for details");
    }
  };

  return (
    <div className="app">
      <h1>Rental Smart Contract DApp</h1>

      {!account ? (
        <button className="btn" onClick={connectWallet}>
          Connect Metamask
        </button>
      ) : (
        <p className="connected">
          Connected: <span className="address">{account}</span>
        </p>
      )}

      <input
        type="text"
        placeholder="Tenant Address"
        value={tenant}
        onChange={(e) => setTenant(e.target.value)}
      />
      <input
        type="text"
        placeholder="Rent Amount (ETH)"
        value={rent}
        onChange={(e) => setRent(e.target.value)}
      />
      <input
        type="number"
        placeholder="Duration (days)"
        value={duration}
        onChange={(e) => setDuration(e.target.value)}
      />

      <button className="btn" onClick={deployContract}>
        Deploy Contract
      </button>

      {contractAddress && (
        <p className="deployed">
          ✅ Contract deployed at:{" "}
          <span className="address">{contractAddress}</span>
        </p>
      )}
    </div>
  );
}

export default App;
