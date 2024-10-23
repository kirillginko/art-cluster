import axios from "axios";

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
      timeout: 10000,
    });

    const buffer = Buffer.from(response.data, "binary");
    imageCache.set(id, buffer);
    console.log(`Image stored in cache with ID: ${id}`);

    res.status(200).json({ success: true, id });
  } catch (error) {
    console.error("Error saving image:", error);
    res.status(500).json({ error: error.message });
  }
}

export { imageCache };
