"use client";
import { useState, useEffect, useRef } from "react";
import { Loader2 } from "lucide-react";
import styles from "../styles/gallery.module.css";
import { Canvas, useFrame } from "@react-three/fiber";
import { OrbitControls, Text } from "@react-three/drei";
import * as THREE from "three";

const ArtworkImage = ({ artwork, position }) => {
  const [texture, setTexture] = useState(null);
  const [error, setError] = useState(false);
  const meshRef = useRef();

  useEffect(() => {
    console.log(
      `Loading texture for artwork ${artwork.id}:`,
      artwork.localImagePath
    );
    const loader = new THREE.TextureLoader();
    loader.load(
      artwork.localImagePath,
      (loadedTexture) => {
        console.log(`Successfully loaded texture for artwork ${artwork.id}`);
        setTexture(loadedTexture);
      },
      undefined,
      (err) => {
        console.error(`Error loading texture for ${artwork.id}:`, err);
        setError(true);
      }
    );

    return () => {
      if (texture) {
        texture.dispose();
      }
    };
  }, [artwork.localImagePath, artwork.id]);

  useEffect(() => {
    if (meshRef.current) {
      if (error) {
        const hue = Math.random() * 360;
        const color = new THREE.Color(`hsl(${hue}, 70%, 80%)`);
        meshRef.current.material.color = color;
      } else if (texture) {
        meshRef.current.material.map = texture;
        meshRef.current.material.needsUpdate = true;
      }
    }
  }, [texture, error]);

  return (
    <mesh ref={meshRef} position={position}>
      <planeGeometry args={[2, 2]} />
      <meshBasicMaterial
        color={error ? "gray" : "white"}
        side={THREE.DoubleSide}
      />
      <Text
        position={[0, -1.2, 0]}
        fontSize={0.2}
        color="black"
        anchorX="center"
        anchorY="top"
      >
        {artwork.title}
      </Text>
    </mesh>
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
        fields: "id,title,primaryimageurl",
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

      // Save images and update artwork data
      const savedArtworks = await Promise.all(
        filteredArtworks.map(async (artwork) => {
          const saveResponse = await fetch(
            `/api/saveArtworkImage?url=${encodeURIComponent(
              artwork.primaryimageurl
            )}&id=${artwork.id}`
          );
          const saveData = await saveResponse.json();
          return { ...artwork, localImagePath: saveData.path };
        })
      );

      setArtworks(savedArtworks);
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
            <ArtworkCluster artworks={artworks} />
            <OrbitControls />
          </Canvas>
        </div>
      )}
    </div>
  );
};

export default HarvardGallery;
