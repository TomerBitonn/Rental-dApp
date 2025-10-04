import { useState } from "react";
import { ethers } from "ethers";
import artifact from "../abi/RentalContract.json";
import "../styles/Components.css";

export default function SignContract({ signer, contractAddress }) {
  const [loading, setLoading] = useState(false);

  const handleSignContract = async () => {
    try {
      if (!signer) {
        alert("Wallet not connected. Please connect MetaMask first.");
        return;
      }

      if (!contractAddress) {
        alert("Please load a valid contract first.");
        return;
      }

      const contract = new ethers.Contract(contractAddress, artifact.abi, signer);

      setLoading(true);
      const tx = await contract.signContract();
      await tx.wait();

      alert("Contract successfully signed on blockchain!");
    } catch (err) {
      console.error("Sign contract failed:", err);
      alert("Failed to sign contract. See console for details.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="actions-card">
      <h3>Sign Contract</h3>
      <button className="btn" onClick={handleSignContract} disabled={loading}>
        {loading ? <div className="loader"></div> : "Sign Contract on Blockchain"}
      </button>
    </div>
  );
}
