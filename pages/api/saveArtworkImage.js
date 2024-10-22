import fs from "fs";
import path from "path";
import axios from "axios";

export default async function handler(req, res) {
  const { url, id } = req.query;

  if (!url || !id) {
    return res.status(400).json({ error: "URL and ID are required" });
  }

  try {
    const response = await axios.get(url, { responseType: "arraybuffer" });
    const buffer = Buffer.from(response.data, "binary");

    const publicDir = path.join(process.cwd(), "public");
    const artworksDir = path.join(publicDir, "artworks");

    if (!fs.existsSync(artworksDir)) {
      fs.mkdirSync(artworksDir, { recursive: true });
    }

    const filePath = path.join(artworksDir, `${id}.jpg`);
    fs.writeFileSync(filePath, buffer);

    res.status(200).json({ success: true, path: `/artworks/${id}.jpg` });
  } catch (error) {
    console.error("Error saving image:", error);
    res.status(500).json({ error: "Failed to save image" });
  }
}
