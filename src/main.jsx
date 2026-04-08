import React from "react";
import { createRoot } from "react-dom/client";
import "./styles.css";

const ONEDRIVE_SHARE_URL = import.meta.env.VITE_ONEDRIVE_SHARE_URL || "";

function toShareToken(url) {
  const base64 = btoa(url).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
  return `u!${base64}`;
}

async function graphGet(path) {
  const response = await fetch(`https://graph.microsoft.com/v1.0${path}`);
  if (!response.ok) {
    throw new Error(`Graph request failed: ${response.status}`);
  }
  return response.json();
}

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
  const [tree, setTree] = React.useState(null);
  const [selectedFolderId, setSelectedFolderId] = React.useState("");
  const [images, setImages] = React.useState([]);
  const [status, setStatus] = React.useState("Loading your shared OneDrive album...");
  const [shareContext, setShareContext] = React.useState(null);

  async function listFolderChildren(itemId, driveId) {
    return graphGet(
      `/drives/${driveId}/items/${itemId}/children?$select=id,name,folder,image,webUrl,@microsoft.graph.downloadUrl`,
    );
  }

  async function buildFolderTree(itemId, driveId) {
    const data = await listFolderChildren(itemId, driveId);
    const folders = (data.value || []).filter((item) => item.folder);

    const children = await Promise.all(
      folders.map(async (folder) => ({
        id: folder.id,
        name: folder.name,
        children: await buildFolderTree(folder.id, driveId),
      })),
    );

    return children;
  }

  async function loadImages(itemId, driveId) {
    const data = await listFolderChildren(itemId, driveId);
    setImages((data.value || []).filter((item) => item.image));
  }

  React.useEffect(() => {
    async function loadSharedDrive() {
      if (!ONEDRIVE_SHARE_URL) {
        setStatus("Set VITE_ONEDRIVE_SHARE_URL to a share link from your own OneDrive folder.");
        return;
      }

      try {
        const token = toShareToken(ONEDRIVE_SHARE_URL);
        const shareRoot = await graphGet(`/shares/${token}/driveItem?$expand=children`);
        const driveId = shareRoot?.parentReference?.driveId;
        const rootItemId = shareRoot?.id;

        if (!driveId || !rootItemId) {
          throw new Error("Share metadata missing drive information.");
        }

        setShareContext({ driveId, rootItemId });
        const children = await buildFolderTree(rootItemId, driveId);
        setTree({ id: rootItemId, name: `📁 ${shareRoot.name}`, children });
        setSelectedFolderId(rootItemId);
        await loadImages(rootItemId, driveId);
        setStatus("Showing your shared OneDrive albums.");
      } catch (error) {
        console.error(error);
        setStatus(
          "Could not read the shared OneDrive folder. Make sure the link is public/anyone-with-link and points to a folder.",
        );
      }
    }

    loadSharedDrive();
  }, []);

  function FolderNode({ node }) {
    const [open, setOpen] = React.useState(false);

    return (
      <div className="folder-node">
        <button
          className={`folder-btn ${selectedFolderId === node.id ? "active" : ""}`}
          onClick={async () => {
            setSelectedFolderId(node.id);
            if (shareContext) {
              await loadImages(node.id, shareContext.driveId);
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
          This site now reads from your own OneDrive share link (not from each visitor's account).
        </p>
        <p className="status">{status}</p>
      </header>

      <WeirdVolumeSandbox />

      <section className="gallery-layout">
        <aside>
          <h3>Albums</h3>
          {tree ? <FolderNode node={tree} /> : <p>Waiting for OneDrive folder configuration.</p>}
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
