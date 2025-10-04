import { useState } from "react";
import { ethers } from "ethers";
import { getNonce, verifyLogin, getMe } from "../api";
import { SiweMessage } from "siwe";

function Login({ onLoginSuccess }) {
  const [status, setStatus] = useState("");
  const [loading, setLoading] = useState(false);

  const handleLogin = async () => {
    try {
      setLoading(true);
      setStatus("Connecting to MetaMask...");

      // Check if MetaMask is installed
      if (!window.ethereum) {
        alert("Please install MetaMask");
        return;
      }

      const provider = new ethers.providers.Web3Provider(window.ethereum);
      const [rawAddress] = await provider.send("eth_requestAccounts", []);
      const signer = provider.getSigner();

      // Ensure the address is checksummed (EIP-55)
      const address = ethers.utils.getAddress(rawAddress);
      const chainId = await signer.getChainId();

      // Step 1: get nonce from backend
      setStatus("Requesting nonce from backend...");
      const { nonce } = await getNonce(address);

      // Step 2: build proper SIWE message
      const domain = window.location.hostname;
      const origin = window.location.origin;
      const issuedAt = new Date().toISOString();

      const siwe = new SiweMessage({
        domain,
        address,
        statement: "Sign in with Ethereum to the Rental DApp.",
        uri: origin,
        version: "1",
        chainId,
        nonce,
        issuedAt,
      });

      // Prepare the message for signing
      const message = siwe.prepareMessage();

      // Step 3: sign the message
      setStatus("Waiting for signature...");
      const signature = await signer.signMessage(message);

      // Step 4: send to backend for verification
      setStatus("Verifying signature...");
      const resp = await verifyLogin({ address, message, signature });
      if (!resp.ok) throw new Error(resp.error || "Login failed");

      // Step 5: get user info
      const me = await getMe();
      setStatus("Logged in!");
      onLoginSuccess(me.user);

    } catch (err) {
      console.error("Login error:", err);
      setStatus("Login failed. Check console for details.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="card">
      <h2>Sign In with Ethereum</h2>
      <p>Authenticate with your wallet to access the DApp</p>
      <button className="btn" onClick={handleLogin} disabled={loading}>
        {loading ? "Processing..." : "Login with MetaMask"}
      </button>
      <p>{status}</p>
    </div>
  );
}

export default Login;
