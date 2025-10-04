import { useEffect, useState } from "react";
import { ethers } from "ethers";
import DeployContract from "./components/DeployContract";
import ContractInfo from "./components/ContractInfo";
import "./styles/App.css";
import "./styles/Components.css";

function App() {
  const [account, setAccount] = useState(null);
  const [provider, setProvider] = useState(null);
  const [signer, setSigner] = useState(null);
  const [contractAddress, setContractAddress] = useState(null);
  const [activeTab, setActiveTab] = useState("deploy");
  const [isMetaMaskInstalled, setIsMetaMaskInstalled] = useState(true);

  // Check MetaMask on load 
  useEffect(() => {
    if (typeof window.ethereum === "undefined") {
      setIsMetaMaskInstalled(false);
      return;
    }
    const prov = new ethers.providers.Web3Provider(window.ethereum);
    setProvider(prov);

    prov.listAccounts().then((accounts) => {
      if (accounts.length > 0) {
        setAccount(accounts[0]);
        setSigner(prov.getSigner());
      }
    });

    // Listen to account change
    window.ethereum.on("accountsChanged", (accounts) => {
      if (accounts.length === 0) {
        setAccount(null);
      } else {
        setAccount(accounts[0]);
        setSigner(prov.getSigner());
      }
    });
  }, []);

  // Connect MetaMask manually 
  const connectWallet = async () => {
    if (!window.ethereum) {
      alert("Please install MetaMask to use this app");
      return;
    }

    try {
      const prov = new ethers.providers.Web3Provider(window.ethereum);
      const accounts = await prov.send("eth_requestAccounts", []);
      setProvider(prov);
      setSigner(prov.getSigner());
      setAccount(accounts[0]);
    } catch (err) {
      console.error("Failed to connect wallet:", err);
      alert("Connection to MetaMask failed. See console for details.");
    }
  };

  const disconnectWallet = () => {
    setAccount(null);
    setSigner(null);
    setProvider(null);
    setContractAddress(null);
    localStorage.removeItem("connected"); 
  };

  // UI: MetaMask not installed 
  if (!isMetaMaskInstalled) {
    return (
      <div className="app">
        <h1>Rental Smart Contracts DApp</h1>
        <div className="card">
          <p>MetaMask is not installed.</p>
          <a
            href="https://metamask.io/download/"
            target="_blank"
            rel="noopener noreferrer"
            className="btn"
          >
            Install MetaMask
          </a>
        </div>
      </div>
    );
  }

  // UI: Wallet not connected 
  if (!account) {
    return (
      <div className="app">
        <h1>Rental Smart Contracts DApp</h1>
        <div className="card">
          <p>Please connect your MetaMask wallet to continue</p>
          <button className="btn" onClick={connectWallet}>
            Connect Wallet
          </button>
        </div>
      </div>
    );
  }

  // UI: Wallet connected 
  return (
    <div className="app">
      <h1>Rental Smart Contracts DApp</h1>

      {account ? (
        <div className="connection-status">
          <p className="connected">
            Connected: <span className="address">{account}</span>
          </p>
          <button className="btn secondary small" onClick={disconnectWallet}>
            Disconnect
          </button>
        </div>
      ) : (
        <p>Not connected</p>
      )}

      {/* Navigation */}
      <div className="tab-nav">
        <button
          className={`tab-btn ${activeTab === "deploy" ? "active" : ""}`}
          onClick={() => setActiveTab("deploy")}
        >
          Deploy Contract
        </button>
        <button
          className={`tab-btn ${activeTab === "info" ? "active" : ""}`}
          onClick={() => setActiveTab("info")}
        >
          Contract Info
        </button>
      </div>

      {/* Tabs */}
      {activeTab === "deploy" && (
        <DeployContract
          provider={provider}
          signer={signer}
          account={account}
          setContractAddress={(addr) => {
            setContractAddress(addr);
            setActiveTab("info");
          }}
          contractAddress={contractAddress}
        />
      )}

      {activeTab === "info" && (
        <ContractInfo
          provider={provider}
          signer={signer}
          account={account}
          contractAddress={contractAddress}
          setContractAddress={setContractAddress}
        />
      )}
    </div>
  );
}

export default App;
