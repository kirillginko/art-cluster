import { imageCache } from "./saveArtworkImage";

export default function handler(req, res) {
  const { id } = req.query;

  console.log(`Attempting to retrieve image with ID: ${id}`);

  if (!id) {
    console.log("No ID provided");
    return res.status(400).json({ error: "ID is required" });
  }

  const imageData = imageCache.get(id);

  if (!imageData) {
    console.log(`Image with ID ${id} not found in cache`);
    return res.status(404).json({ error: "Image not found" });
  }

  console.log(`Image found for ID ${id}, sending response`);
  res.setHeader("Content-Type", "image/jpeg");
  res.setHeader("Cache-Control", "public, max-age=31536000, immutable");
  res.send(imageData);
}
