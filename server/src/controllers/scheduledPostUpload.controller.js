import { uploadToCloudinary } from "../middleware/storyUpload.middleware.js";

export const uploadScheduledMedia = async (req, res) => {
  try {
    if (!req.file) return res.status(400).json({ success: false, message: "Select an image or video first." });
    const isVideo = req.file.mimetype.startsWith("video/");
    const result = await uploadToCloudinary(req.file);
    if (!result?.secure_url) return res.status(502).json({ success: false, message: "Media upload provider did not return a URL." });
    return res.status(201).json({
      success: true,
      media: {
        url: result.secure_url,
        publicId: result.public_id || "",
        type: isVideo ? "video" : "image",
        width: result.width || undefined,
        height: result.height || undefined,
        duration: result.duration || undefined,
      },
    });
  } catch (error) {
    console.error("Scheduled media upload failed:", error.message);
    return res.status(500).json({ success: false, message: error.message || "Unable to upload scheduled media." });
  }
};
