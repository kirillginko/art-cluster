import axios from "axios";
import sharp from "sharp";

const imageCache = new Map();

export default async function handler(req, res) {
  const { url, id } = req.query;

  if (!url || !id) {
    return res.status(400).json({ error: "URL and ID are required" });
  }

  try {
    console.log(`Fetching image from URL: ${url}`);
    const response = await axios.get(url, {
      responseType: "arraybuffer",
      timeout: 30000, // 30 seconds timeout
    });

    const buffer = Buffer.from(response.data, "binary");

    // Process image: resize and compress
    const processedBuffer = await sharp(buffer)
      .resize(512, 512, { fit: "inside", withoutEnlargement: true })
      .webp({ quality: 80 })
      .toBuffer();

    const base64 = processedBuffer.toString("base64");
    const dataURI = `data:image/webp;base64,${base64}`;

    imageCache.set(id, { buffer: processedBuffer, dataURI });
    console.log(`Image stored in cache with ID: ${id}`);

    res.status(200).json({ success: true, id, dataURI });
  } catch (error) {
    console.error("Error saving image:", error);
    if (error.code === "ECONNABORTED") {
      res.status(504).json({ error: "Request timeout", id });
    } else {
      res.status(500).json({ error: error.message, id });
    }
  }
}

export { imageCache };
