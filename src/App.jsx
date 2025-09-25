import { useState } from "react";
import DeployContract from "./components/DeployContract";
import ContractInfo from "./components/ContractInfo";
import "./styles/App.css";
import "./styles/Components.css";

function App() {
  const [account, setAccount] = useState(null);
  const [contractAddress, setContractAddress] = useState(null);
  const [activeTab, setActiveTab] = useState("deploy"); // default tab

  return (
    <div className="app">
      <h1>Rental Smart Contracts DApp</h1>

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
          account={account}
          setAccount={setAccount}
          setContractAddress={(addr) => {
            setContractAddress(addr);
            setActiveTab("info"); // switch automatically after deploy
          }}
          contractAddress={contractAddress} 
        />
      )}

      {activeTab === "info" && (
        <ContractInfo
          account={account}
          contractAddress={contractAddress}
          setContractAddress={setContractAddress}
        />
      )}
    </div>
  );
}

export default App;
