import { useEffect, useState } from "react";
import { ethers } from "ethers";
import { getMe, logout } from "./api";
import Login from "./components/Login";
import DeployContract from "./components/DeployContract";
import ContractInfo from "./components/ContractInfo";
import "./styles/App.css";
import "./styles/Components.css";

function App() {
  const [user, setUser] = useState(null); // backend user
  const [provider, setProvider] = useState(null);
  const [signer, setSigner] = useState(null);
  const [account, setAccount] = useState(null);
  const [contractAddress, setContractAddress] = useState(null);
  const [activeTab, setActiveTab] = useState("deploy");
  const [loading, setLoading] = useState(true);

  // On app load: check if already logged in (JWT cookie)
  useEffect(() => {
    const checkSession = async () => {
      try {
        const res = await getMe();
        if (res.user) setUser(res.user);
      } catch {
        // not logged in
      } finally {
        setLoading(false);
      }
    };
    checkSession();
  }, []);

  // Initialize provider and signer once MetaMask is connected
  useEffect(() => {
    if (window.ethereum) {
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
          setSigner(null);
        } else {
          setAccount(accounts[0]);
          setSigner(prov.getSigner());
        }
      });
    }
  }, []);

  const handleLogout = async () => {
    await logout();
    setUser(null);
    setSigner(null);
    setProvider(null);
    setAccount(null);
  };

  if (loading) {
    return (
      <div className="app">
        <h1>Loading...</h1>
      </div>
    );
  }

  // If not logged in → show login screen
  if (!user) {
    return (
      <div className="app">
        <h1>Rental Smart Contracts DApp</h1>
        <Login
          onLoginSuccess={(me) => {
            setUser(me);
            // Initialize provider/signer immediately after login
            const prov = new ethers.providers.Web3Provider(window.ethereum);
            setProvider(prov);
            setSigner(prov.getSigner());
            setAccount(me.address);
          }}
        />
      </div>
    );
  }

  // Logged in → show the main app
  return (
    <div className="app">
      <header className="header">
        <h1>Rental Smart Contracts DApp</h1>
        <div className="user-info">
          <span>Connected as: {account}</span>
          <button className="btn secondary small" onClick={handleLogout}>
            Disconnect
          </button>
        </div>
      </header>

      {/* Tabs navigation */}
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

      {/* Tabs content */}
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
