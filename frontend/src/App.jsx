
import { useEffect, useState } from "react";
import { ethers } from "ethers";
import { getMe, logout } from "./api";

import Login from "./components/Login";
import DeployContract from "./components/DeployContract";
import ContractInfo from "./components/ContractInfo";
import LockContract from "./components/LockContract";
import PayRent from "./components/PayRent";

import "./styles/Components.css";
import "./styles/App.css";

import logoUrl from "../assets/logo3.png";
import Yahelpic from "../assets/Yahelpic.png";
import Tomerpic from "../assets/Tomerpic2.png";
import Lizapic from "../assets/lizapic.png";
import Davidpic from "../assets/davidpic.png";
import Inbarpic from "../assets/inbarpic.png";

function App() {
  const [user, setUser] = useState(null);
  const [provider, setProvider] = useState(null);
  const [signer, setSigner] = useState(null);
  const [account, setAccount] = useState(null);
  const [accountRaw, setAccountRaw] = useState(null);
  const [contractAddress, setContractAddress] = useState(null);
  const [activeTab, setActiveTab] = useState("deploy");
  const [loading, setLoading] = useState(true);
  const [infoKey, setInfoKey] = useState(0);


  useEffect(() => {
    const checkSession = async () => {
      try {
        const res = await getMe();
        if (res.user) setUser(res.user);
      } catch {} finally {
        setLoading(false);
      }
    };
    checkSession();
  }, []);

  // MetaMask
  useEffect(() => {
    if (!window.ethereum) return;
    const prov = new ethers.providers.Web3Provider(window.ethereum);
    setProvider(prov);

    prov.listAccounts().then((accounts) => {
      if (accounts.length > 0) {
        setAccount(accounts[0]);
        setAccountRaw(accounts[0]);           
        setSigner(prov.getSigner());
      }
    });

    const onChange = (accounts) => {
      if (accounts.length === 0) {
        setAccount(null);
        setAccountRaw(null);
        setSigner(null);
      } else {
        setAccount(accounts[0]);
        setAccountRaw(accounts[0]);
        setSigner(prov.getSigner());
      }
    };

    window.ethereum.on("accountsChanged", onChange);
    return () => window.ethereum.removeListener("accountsChanged", onChange);
  }, []);

  const handleLogout = async () => {
    await logout();
    setUser(null);
    setSigner(null);
    setProvider(null);
    setAccount(null);
    setAccountRaw(null);
  };

  if (loading) {
    return (
      <div className="app">
        <h1>Loading...</h1>
      </div>
    );
  }


  if (!user) {
    return (
      <div className="app">
        <header className="header">
          <div className="brand">
            <div className="logo">
              <img src={logoUrl} alt="Logo" />
            </div>
            <h1>Rental Smart Contracts</h1>
          </div>
        </header>

        <section className="about" aria-label="About Rental Smart Contracts">
          <h2>About Us✨</h2>
          <p>
            Our platform brings rental agreements into the future with blockchain technology. 
            Instead of relying on paperwork and third parties, landlords and tenants can 
            instantly deploy secure, transparent, and tamper-proof smart contracts. Every 
            transaction is recorded on-chain, ensuring trust without middlemen. With just a 
            few clicks, users can create, sign, and manage rental agreements while tracking 
            payments in real time - all through a clean and intuitive interface.
          </p>
        </section>

        <div className="team">
          <ul className="team-grid">
            <li className="avatar">
              <img src={Yahelpic} alt="Yahel Malka" />
              <span className="avatar-name">Yahel Malka</span>
            </li>
            <li className="avatar">
              <img src={Tomerpic} alt="Tomer Biton" />
              <span className="avatar-name">Tomer Biton</span>
            </li>
            <li className="avatar">
              <img src={Lizapic} alt="Liza Titurenko" />
              <span className="avatar-name">Liza Titurenko</span>
            </li>
            <li className="avatar">
              <img src={Inbarpic} alt="Inbar Rahmany" />
              <span className="avatar-name">Inbar Rahmany</span>
            </li>
            <li className="avatar">
              <img src={Davidpic} alt="David Khutsishvili" />
              <span className="avatar-name">David Khutsishvili</span>
            </li>
            <li className="avatar">
              <img src={logoUrl} alt="Ruth Dubinsky" />
              <span className="avatar-name">Ruth Dubinsky</span>
            </li>
          </ul>
        </div>

        <div className="login-wrap">
          <Login
            onLoginSuccess={(me) => {
              setUser(me);
              const prov = new ethers.providers.Web3Provider(window.ethereum);
              setProvider(prov);
              setSigner(prov.getSigner());
              setAccount(me.address);
              setAccountRaw(me.address);   
            }}
          />
        </div>
      </div>
    );
  }

  return (
    <div className="app app--authed">
     
      <header className="header">
        <div className="brand">
          <div className="logo">
            <img src={logoUrl} alt="Logo" />
          </div>
          <h1>Rental Smart Contracts DApp</h1>
        </div>
      </header>

      
      <div className="connected-bar">
        <div className="connected-pill">
          <span className="address">Connected as: {accountRaw ?? account}</span>
          <button className="btn secondary small" onClick={handleLogout}>
            Disconnect
          </button>
        </div>
      </div>

    
    <nav className="tab-nav tabs--compact" data-active={activeTab}>
  <button className={`tab-btn ${activeTab === "deploy" ? "active" : ""}`} onClick={() => setActiveTab("deploy")}>
    Deploy Contract
  </button>
  <button className={`tab-btn ${activeTab === "info" ? "active" : ""}`} onClick={() => setActiveTab("info")}>
    Contract Info
  </button>
</nav>

<main className="main">
  {activeTab === "deploy" ? (
  <DeployContract
    provider={provider}
    signer={signer}
    account={account}
    setContractAddress={(addr) => {
      setContractAddress(addr);
      setActiveTab("info");
      setInfoKey(k => k + 1);
    }}
    contractAddress={contractAddress}
  />
) : (

  <section className="info-lock-stack">
    <ContractInfo
      key={infoKey} 
      provider={provider}
      signer={signer}
      account={account}
      contractAddress={contractAddress}
      setContractAddress={setContractAddress}
    />

    <LockContract
      provider={provider}
      signer={signer}
      contractAddress={contractAddress} 
        onLocked={() => setInfoKey(k => k + 1)}
    />
  </section>
)}

</main>



    </div>
  );
}

export default App;
