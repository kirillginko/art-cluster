"use client";
import { useState, useEffect, useRef, Suspense } from "react";
import { Loader2 } from "lucide-react";
import styles from "../styles/gallery.module.css";
import { Canvas, useFrame, useLoader, useThree } from "@react-three/fiber";
import { OrbitControls, Text } from "@react-three/drei";
import * as THREE from "three";
import { TextureLoader } from "three";

const ArtworkImage = ({ artwork, position }) => {
  const [error, setError] = useState(artwork.imageLoadError || null);
  const meshRef = useRef();
  const { scene } = useThree();

  useEffect(() => {
    if (artwork.imageLoadError) {
      setError(new Error("Image failed to load"));
      return;
    }

    const loader = new THREE.TextureLoader();
    loader.crossOrigin = "anonymous";

    if (artwork.dataURI) {
      loader.load(
        artwork.dataURI,
        (texture) => {
          if (meshRef.current) {
            meshRef.current.material.map = texture;
            meshRef.current.material.needsUpdate = true;
          }
        },
        undefined,
        (err) => {
          console.error(
            `Error loading texture for artwork ${artwork.id}:`,
            err
          );
          setError(err);
        }
      );
    } else {
      setError(new Error("No dataURI available"));
    }

    return () => {
      if (meshRef.current && meshRef.current.material.map) {
        meshRef.current.material.map.dispose();
      }
    };
  }, [artwork.id, artwork.dataURI, artwork.imageLoadError]);

  useEffect(() => {
    if (meshRef.current && error) {
      const hue = Math.random() * 360;
      const color = new THREE.Color(`hsl(${hue}, 70%, 80%)`);
      meshRef.current.material.color = color;
    }
  }, [error]);

  const artistName = artwork.people
    ? artwork.people[0]?.name
    : "Unknown Artist";
  const year = artwork.dated || "Unknown Year";

  const truncate = (str, maxLength) => {
    if (str.length <= maxLength) return str;
    return str.slice(0, maxLength - 3) + "...";
  };

  const titleFontSize = Math.max(0.1, Math.min(0.15, 2 / artwork.title.length));
  const artistFontSize = Math.max(0.08, Math.min(0.12, 2 / artistName.length));
  const yearFontSize = 0.08;

  const titlePosition = -1.1;
  const artistPosition = titlePosition - titleFontSize - 0.05;
  const yearPosition = artistPosition - artistFontSize - 0.05;

  return (
    <group position={position}>
      <mesh ref={meshRef}>
        <planeGeometry args={[2, 2]} />
        <meshBasicMaterial
          color={error ? "gray" : "white"}
          side={THREE.DoubleSide}
        />
      </mesh>
      <Text
        position={[0, titlePosition, 0]}
        fontSize={titleFontSize}
        color="black"
        anchorX="center"
        anchorY="top"
        maxWidth={2}
      >
        {truncate(artwork.title, 50)}
      </Text>
      <Text
        position={[0, artistPosition, 0]}
        fontSize={artistFontSize}
        color="black"
        anchorX="center"
        anchorY="top"
        maxWidth={2}
      >
        {truncate(artistName, 30)}
      </Text>
      <Text
        position={[0, yearPosition, 0]}
        fontSize={yearFontSize}
        color="black"
        anchorX="center"
        anchorY="top"
        maxWidth={2}
      >
        {year}
      </Text>
    </group>
  );
};

const ArtworkCluster = ({ artworks }) => {
  const group = useRef();

  // useFrame((state) => {
  //   group.current.rotation.y += 0.001;
  // });

  return (
    <group ref={group}>
      {artworks.map((artwork) => {
        const position = new THREE.Vector3(
          Math.random() * 10 - 5,
          Math.random() * 10 - 5,
          Math.random() * 10 - 5
        );
        return (
          <ArtworkImage
            key={artwork.id}
            artwork={artwork}
            position={position}
          />
        );
      })}
    </group>
  );
};

const HarvardGallery = () => {
  const [artworks, setArtworks] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const fetchArtworks = async () => {
    try {
      setLoading(true);
      setError(null);
      console.log("Fetching artworks...");

      const apiKey = process.env.NEXT_PUBLIC_HARVARD_API_KEY;

      if (!apiKey) {
        throw new Error(
          "API key not found. Please check your environment variables."
        );
      }

      const queryParams = new URLSearchParams({
        apikey: apiKey,
        hasimage: 1,
        size: 20,
        sort: "random",
        fields: "id,title,primaryimageurl,people,dated",
      });

      const response = await fetch(
        `https://api.harvardartmuseums.org/object?${queryParams}`
      );

      if (!response.ok) {
        throw new Error(`API request failed with status ${response.status}`);
      }

      const data = await response.json();
      console.log("API response:", data);

      const filteredArtworks = data.records.filter(
        (art) => art.primaryimageurl
      );
      console.log("Filtered artworks:", filteredArtworks);

      // Process artworks in batches
      const batchSize = 5;
      const batches = Math.ceil(filteredArtworks.length / batchSize);

      for (let i = 0; i < batches; i++) {
        const batch = filteredArtworks.slice(
          i * batchSize,
          (i + 1) * batchSize
        );
        const savedArtworksBatch = await Promise.all(
          batch.map(async (artwork) => {
            try {
              const saveResponse = await fetch(
                `/api/saveArtworkImage?url=${encodeURIComponent(
                  artwork.primaryimageurl
                )}&id=${artwork.id}`
              );
              const saveData = await saveResponse.json();

              if (!saveResponse.ok) {
                console.warn(
                  `Failed to save image for artwork ${artwork.id}: ${saveData.error}`
                );
                return { ...artwork, id: artwork.id, imageLoadError: true };
              }

              console.log(`Saved artwork ${artwork.id}:`, saveData);
              return { ...artwork, id: saveData.id, dataURI: saveData.dataURI };
            } catch (error) {
              console.error(`Error saving artwork ${artwork.id}:`, error);
              return { ...artwork, id: artwork.id, imageLoadError: true };
            }
          })
        );

        setArtworks((prevArtworks) => [...prevArtworks, ...savedArtworksBatch]);
      }

      setLoading(false);
    } catch (error) {
      console.error("Error fetching artworks:", error);
      setError(error.message);
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchArtworks();
  }, []);

  if (error) {
    return <div className={styles.error_container}>{error}</div>;
  }

  return (
    <div className={styles.gallery_container}>
      <div className={styles.gallery_header}>
        <h1 className={styles.gallery_title}>Harvard Art Museums Gallery</h1>
        <button
          onClick={fetchArtworks}
          className={styles.load_button}
          disabled={loading}
        >
          {loading ? (
            <Loader2
              className={`${styles.loading_spinner} ${styles.spinner}`}
            />
          ) : (
            "Load New Artworks"
          )}
        </button>
      </div>

      {loading ? (
        <div className={styles.loading_container}>
          <Loader2 className={`${styles.loading_spinner} ${styles.spinner}`} />
        </div>
      ) : (
        <div className={styles.canvas_container}>
          <Canvas camera={{ position: [0, 0, 15], fov: 60 }}>
            <ambientLight intensity={0.5} />
            <pointLight position={[10, 10, 10]} />
            <Suspense fallback={null}>
              <ArtworkCluster artworks={artworks} />
            </Suspense>
            <OrbitControls />
          </Canvas>
        </div>
      )}
    </div>
  );
};

export default HarvardGallery;
