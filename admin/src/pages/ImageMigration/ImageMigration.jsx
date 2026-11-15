import React, { useEffect, useState } from "react";
import axios from "axios";

const BASE =
  "https://shrill-frost-36cd.manilacafe-goteborg.workers.dev";

const IMAGES = {
  "Chicken Adobo": "chicken-adobo-25.jpg",
  "Ube Caramel Latte": "ube-caramel-latte-46.jpg",
  "Halo-Halo": "halo-halo-29.jpg",
  "Siningang med räkor": "siningang-med-rakor-43.jpg",
  "Fruit cup": "fruit-cup-27.jpg",
  "Golden Turon & Ube Ice Cream": "golden-turon-ube-ice-cream-28.jpg",
  "Biscoff Cinnamon Banana Float":
    "biscoff-cinnamon-banana-float-02.jpg"
};

export default function ImageMigration({ url }) {
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [backupReady, setBackupReady] = useState(false);
  const [loaded, setLoaded] = useState({});
  const [busy, setBusy] = useState(null);
  const [message, setMessage] = useState("");

  useEffect(() => {
    let active = true;

    axios.get(`${url}/api/food/list`)
      .then(response => {
        if (!response.data.success ||
            !Array.isArray(response.data.data)) {
          throw new Error("Ogiltig produktlista");
        }
        if (active) setProducts(response.data.data);
      })
      .catch(() => {
        if (active) setMessage("Kunde inte hämta produkterna.");
      })
      .finally(() => {
        if (active) setLoading(false);
      });

    return () => { active = false; };
  }, [url]);

  const downloadBackup = () => {
    const data = products.map(item => ({
      id: item._id,
      name: item.name,
      image: item.image
    }));

    const file = new Blob(
      [JSON.stringify(data, null, 2)],
      { type: "application/json" }
    );

    const link = document.createElement("a");
    const objectUrl = URL.createObjectURL(file);

    link.href = objectUrl;
    link.download = "manilacafe-bildadresser-backup.json";
    document.body.appendChild(link);
    link.click();
    link.remove();

    setTimeout(() => URL.revokeObjectURL(objectUrl), 1000);
    setBackupReady(true);
    setMessage("Kontrollera att säkerhetskopian har laddats ned.");
  };

  const updateImage = async (item, imageUrl) => {
    if (!backupReady || busy) return;

    const confirmed = window.confirm(
      `Byt produktbild för ${item.name}? Kontrollera att bilden är rätt.`
    );

    if (!confirmed) return;

    const token = localStorage.getItem("token");

    if (!token) {
      setMessage("Logga in som administratör igen.");
      return;
    }

    setBusy(item._id);
    setMessage("");

    try {
      const response = await axios.post(
        `${url}/api/food/update-image`,
        {
          id: item._id,
          image: imageUrl,
          expectedImage: item.image
        },
        {
          headers: {
            Authorization: `Bearer ${token}`
          }
        }
      );

      if (!response.data.success) {
        throw new Error("Uppdateringen nekades.");
      }

      setProducts(previous =>
        previous.map(product =>
          product._id === item._id
            ? { ...product, image: response.data.image }
            : product
        )
      );

      setMessage(`${item.name}: bildadressen uppdaterad.`);
    } catch (error) {
      setMessage(
        error.response?.data?.message ||
        error.message ||
        "Kunde inte uppdatera bilden."
      );
    } finally {
      setBusy(null);
    }
  };

  const candidates = products.filter(item =>
    Object.prototype.hasOwnProperty.call(IMAGES, item.name)
  );

  return (
    <main style={{ padding: 24, maxWidth: 1050, margin: "auto" }}>
      <h1>Manila Café – Bildflytt</h1>

      <p>
        Granska varje Cloudflare-bild innan du ersätter
        den gamla produktbilden.
      </p>

      <button
        type="button"
        onClick={downloadBackup}
        disabled={loading || !products.length || !!busy}
        style={{ padding: 12, marginBottom: 20 }}
      >
        Ladda ned säkerhetskopia av bildadresser
      </button>

      <p role="status">{message}</p>

      {loading && <p>Hämtar produkter...</p>}

      {candidates.map(item => {
        const filename = IMAGES[item.name];
        const imageUrl = `${BASE}/products/${filename}`;
        const done = item.image === imageUrl;

        return (
          <section
            key={item._id}
            style={{
              border: "1px solid #ccc",
              borderRadius: 12,
              padding: 16,
              marginBottom: 18,
              background: "#fff",
              color: "#222"
            }}
          >
            <h2 style={{ fontSize: 20 }}>{item.name}</h2>

            <img
              src={imageUrl}
              alt={`Ny bild: ${item.name}`}
              onLoad={() => setLoaded(previous => ({
                ...previous,
                [item._id]: true
              }))}
              onError={() => setLoaded(previous => ({
                ...previous,
                [item._id]: false
              }))}
              style={{
                width: 220,
                maxWidth: "100%",
                height: 220,
                objectFit: "contain"
              }}
            />

            <p style={{ overflowWrap: "anywhere" }}>
              {filename}
            </p>

            <p>
              {done ? "Redan uppdaterad" : "Ännu inte uppdaterad"}
            </p>

            <button
              type="button"
              disabled={
                done ||
                !backupReady ||
                !loaded[item._id] ||
                !!busy
              }
              onClick={() => updateImage(item, imageUrl)}
              style={{ padding: 12 }}
            >
              {busy === item._id
                ? "Sparar..."
                : done
                  ? "Klar"
                  : "Ersätt produktbild"}
            </button>
          </section>
        );
      })}
    </main>
  );
}
