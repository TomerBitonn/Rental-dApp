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
      if (!window.ethereum) {
        alert("Please install MetaMask");
        return;
      }
      const provider = new ethers.providers.Web3Provider(window.ethereum);
      const [rawAddress] = await provider.send("eth_requestAccounts", []);
      const signer = provider.getSigner();
      const address = ethers.utils.getAddress(rawAddress);
      const chainId = await signer.getChainId();

      setStatus("Requesting nonce from backend...");
      const { nonce } = await getNonce(address);
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
      const message = siwe.prepareMessage();
      setStatus("Waiting for signature...");
      const signature = await signer.signMessage(message);
      setStatus("Verifying signature...");
      const resp = await verifyLogin({ address, message, signature });
      if (!resp.ok) throw new Error(resp.error || "Login failed");

  
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
    <div className="login-card">
      <button className="btn-login" onClick={handleLogin} disabled={loading}>
        {loading ? "Processing..." : "Login with MetaMask"}
      </button>
      <p>{status}</p>
    </div>
  );
}

export default Login;
