import React from "react";
import { createRoot } from "react-dom/client";
import { PublicClientApplication } from "@azure/msal-browser";
import "./styles.css";

const graphScopes = ["User.Read", "Files.Read", "Files.Read.All"];

const msalConfig = {
  auth: {
    clientId: import.meta.env.VITE_AZURE_CLIENT_ID || "",
    authority: "https://login.microsoftonline.com/common",
    redirectUri: import.meta.env.VITE_REDIRECT_URI || window.location.origin,
  },
  cache: {
    cacheLocation: "localStorage",
  },
};

const msalInstance = new PublicClientApplication(msalConfig);

function WeirdVolumeSandbox() {
  const [volume, setVolume] = React.useState(42);
  const [clicks, setClicks] = React.useState(0);

  function scrambleVolume() {
    const randomJump = Math.floor(Math.random() * 131) - 15;
    setVolume((prev) => Math.max(0, Math.min(100, prev + randomJump)));
    setClicks((c) => c + 1);
  }

  return (
    <section className="sandbox-card">
      <h2>UX Crime Lab 🔬</h2>
      <p>Totally ergonomic volume control (for legal reasons this is sarcasm).</p>
      <div className="dial-wrap" onMouseEnter={scrambleVolume}>
        <button className="danger-knob" onClick={scrambleVolume}>
          Increase but maybe decrease
        </button>
        <div className="volume-readout">{volume}%</div>
      </div>
      <p className="tiny">Attempts: {clicks}. Confidence: unjustified.</p>
    </section>
  );
}

function App() {
  const [account, setAccount] = React.useState(null);
  const [tree, setTree] = React.useState(null);
  const [selectedFolderId, setSelectedFolderId] = React.useState("root");
  const [images, setImages] = React.useState([]);
  const [status, setStatus] = React.useState("Sign in to browse your OneDrive albums.");

  React.useEffect(() => {
    msalInstance.initialize().then(() => {
      const existing = msalInstance.getAllAccounts()[0];
      if (existing) {
        setAccount(existing);
        loadTree(existing);
      }
    });
  }, []);

  async function authHeader(activeAccount) {
    const response = await msalInstance.acquireTokenSilent({
      account: activeAccount,
      scopes: graphScopes,
    });

    return { Authorization: `Bearer ${response.accessToken}` };
  }

  async function graphGet(path, activeAccount) {
    const headers = await authHeader(activeAccount);
    const response = await fetch(`https://graph.microsoft.com/v1.0${path}`, { headers });
    if (!response.ok) {
      throw new Error(`Graph request failed: ${response.status}`);
    }
    return response.json();
  }

  async function buildFolderTree(folderId, activeAccount) {
    const path =
      folderId === "root"
        ? "/me/drive/root/children?$select=id,name,folder,file,image,webUrl,@microsoft.graph.downloadUrl"
        : `/me/drive/items/${folderId}/children?$select=id,name,folder,file,image,webUrl,@microsoft.graph.downloadUrl`;

    const data = await graphGet(path, activeAccount);
    const folders = (data.value || []).filter((item) => item.folder);

    const children = await Promise.all(
      folders.map(async (folder) => ({
        id: folder.id,
        name: folder.name,
        children: await buildFolderTree(folder.id, activeAccount),
      })),
    );

    return children;
  }

  async function listImages(folderId, activeAccount) {
    const path =
      folderId === "root"
        ? "/me/drive/root/children?$select=id,name,image,file,webUrl,@microsoft.graph.downloadUrl"
        : `/me/drive/items/${folderId}/children?$select=id,name,image,file,webUrl,@microsoft.graph.downloadUrl`;
    const data = await graphGet(path, activeAccount);

    const folderImages = (data.value || []).filter((item) => item.image);
    setImages(folderImages);
  }

  async function loadTree(activeAccount) {
    setStatus("Loading albums from OneDrive...");
    try {
      const children = await buildFolderTree("root", activeAccount);
      setTree({ id: "root", name: "📁 Root", children });
      await listImages("root", activeAccount);
      setStatus("Connected. Pick an album from the left!");
    } catch (error) {
      console.error(error);
      setStatus(
        "Could not load OneDrive. Check VITE_AZURE_CLIENT_ID and Graph API permissions (Files.Read).",
      );
    }
  }

  async function signIn() {
    if (!msalConfig.auth.clientId) {
      setStatus("Set VITE_AZURE_CLIENT_ID in a .env file before signing in.");
      return;
    }

    try {
      const login = await msalInstance.loginPopup({ scopes: graphScopes });
      setAccount(login.account);
      await loadTree(login.account);
    } catch (error) {
      console.error(error);
      setStatus("Sign in failed. See console for details.");
    }
  }

  function FolderNode({ node }) {
    const [open, setOpen] = React.useState(false);

    return (
      <div className="folder-node">
        <button
          className={`folder-btn ${selectedFolderId === node.id ? "active" : ""}`}
          onClick={async () => {
            setSelectedFolderId(node.id);
            if (account) {
              await listImages(node.id, account);
            }
          }}
        >
          {node.children?.length ? (
            <span
              className="caret"
              onClick={(event) => {
                event.stopPropagation();
                setOpen((prev) => !prev);
              }}
            >
              {open ? "▼" : "▶"}
            </span>
          ) : (
            <span className="caret-placeholder">•</span>
          )}
          {node.name}
        </button>
        {open && node.children?.length ? (
          <div className="folder-children">
            {node.children.map((child) => (
              <FolderNode key={child.id} node={child} />
            ))}
          </div>
        ) : null}
      </div>
    );
  }

  return (
    <main>
      <header>
        <h1>Chaotic Cloud Albums 📸☁️</h1>
        <p>
          A React + GitHub Pages photo host that treats each OneDrive folder as an album (including
          nested albums).
        </p>
        <button onClick={signIn}>{account ? `Signed in as ${account.username}` : "Sign in"}</button>
        <p className="status">{status}</p>
      </header>

      <WeirdVolumeSandbox />

      <section className="gallery-layout">
        <aside>
          <h3>Albums</h3>
          {tree ? <FolderNode node={tree} /> : <p>Sign in to load albums.</p>}
        </aside>

        <section className="images">
          <h3>Images in album</h3>
          <div className="grid">
            {images.length ? (
              images.map((image) => (
                <a
                  key={image.id}
                  href={image["@microsoft.graph.downloadUrl"] || image.webUrl}
                  target="_blank"
                  rel="noreferrer"
                  className="image-card"
                >
                  <img
                    src={image["@microsoft.graph.downloadUrl"] || image.webUrl}
                    alt={image.name}
                    loading="lazy"
                  />
                  <span>{image.name}</span>
                </a>
              ))
            ) : (
              <p>No images in this album yet.</p>
            )}
          </div>
        </section>
      </section>
    </main>
  );
}

createRoot(document.getElementById("root")).render(<App />);
