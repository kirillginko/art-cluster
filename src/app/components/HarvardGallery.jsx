"use client";
import { useState, useEffect } from "react";
import { Loader2 } from "lucide-react";
import styles from "../styles/gallery.module.css";
import Image from "next/image";

const HarvardGallery = () => {
  const [artworks, setArtworks] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [imageLoading, setImageLoading] = useState({});
  const [windowWidth, setWindowWidth] = useState(
    typeof window !== "undefined" ? window.innerWidth : 1024
  );

  useEffect(() => {
    const handleResize = () => {
      setWindowWidth(window.innerWidth);
    };

    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, []);

  const fetchArtworks = async () => {
    try {
      setLoading(true);
      setError(null);
      setImageLoading({});
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
        size: 100, // Request more images
        sort: "random",
        fields: [
          "id",
          "title",
          "primaryimageurl",
          "people",
          "dated",
          "period",
          "style",
          "classification",
          "century",
        ].join(","),
        timestamp: Date.now(),
      });

      const response = await fetch(
        `https://api.harvardartmuseums.org/object?${queryParams}`
      );

      if (!response.ok) {
        throw new Error(`API request failed with status ${response.status}`);
      }

      const data = await response.json();
      const filteredArtworks = data.records
        .filter((art) => art.primaryimageurl)
        .slice(0, 32); // Display 32 images instead of 16

      if (filteredArtworks.length === 0) {
        throw new Error("No artworks found with images");
      }

      const newImageLoading = {};
      filteredArtworks.forEach((art) => {
        newImageLoading[art.id] = true;
      });
      setImageLoading(newImageLoading);

      setArtworks(filteredArtworks);
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

  const getArtistInfo = (people) => {
    if (!people || people.length === 0) return "Unknown Artist";

    const artists = people.filter((person) => person.role === "Artist");

    if (artists.length === 0) {
      const primaryCreator = people[0];
      return (
        primaryCreator.displayname || primaryCreator.name || "Unknown Artist"
      );
    }

    if (artists.length === 1) {
      return artists[0].displayname || artists[0].name;
    }

    return `${artists[0].displayname} and others`;
  };

  const getArtistDetails = (person) => {
    if (!person) return null;

    const culture = person.culture ? `${person.culture}` : "";
    const dates = person.displaydate ? ` (${person.displaydate})` : "";

    return culture + dates;
  };

  if (error) {
    return (
      <div className={styles.gallery_container}>
        <div className={styles.error_container}>
          <h2 className={styles.error_title}>Error Loading Gallery</h2>
          <p className={styles.error_message}>{error}</p>
          <button onClick={fetchArtworks} className={styles.load_button}>
            Try Again
          </button>
        </div>
      </div>
    );
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
        <div className={styles.gallery_grid}>
          {artworks.map((artwork, index) => {
            const artistName = getArtistInfo(artwork.people);
            const artistDetails = artwork.people?.[0]
              ? getArtistDetails(artwork.people[0])
              : null;

            // Determine if this image should be prioritized based on viewport width
            const isPriority = index === 0 || (windowWidth >= 768 && index < 4);

            return (
              <div key={artwork.id} className={styles.artwork_card}>
                <div className={styles.image_wrapper}>
                  {imageLoading[artwork.id] && (
                    <div className={styles.image_loading}>
                      <Loader2
                        className={`${styles.loading_spinner} ${styles.spinner}`}
                      />
                    </div>
                  )}
                  <Image
                    src={artwork.primaryimageurl}
                    alt={artwork.title || "Artwork"}
                    className={`${styles.artwork_image} ${
                      !imageLoading[artwork.id] ? styles.image_loaded : ""
                    }`}
                    fill={true}
                    sizes="(max-width: 640px) 100vw, (max-width: 768px) 50vw, (max-width: 1024px) 33vw, 25vw"
                    style={{ objectFit: "contain" }}
                    onLoad={() => {
                      setImageLoading((prev) => ({
                        ...prev,
                        [artwork.id]: false,
                      }));
                    }}
                    onError={() => {
                      setImageLoading((prev) => ({
                        ...prev,
                        [artwork.id]: false,
                      }));
                    }}
                    priority={isPriority}
                    loading={isPriority ? "eager" : "lazy"}
                    quality={85}
                  />
                </div>
                <div className={styles.artwork_info}>
                  <h2 className={styles.artwork_title} title={artwork.title}>
                    {artwork.title}
                  </h2>
                  <p className={styles.artwork_artist} title={artistName}>
                    {artistName}
                  </p>
                  {artistDetails && (
                    <p className={styles.artwork_details}>{artistDetails}</p>
                  )}
                  <div className={styles.artwork_meta}>
                    {artwork.dated && (
                      <p className={styles.artwork_date}>{artwork.dated}</p>
                    )}
                    {artwork.period && (
                      <p className={styles.artwork_period}>{artwork.period}</p>
                    )}
                    {artwork.century && (
                      <p className={styles.artwork_century}>
                        {artwork.century}
                      </p>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};

export default HarvardGallery;
