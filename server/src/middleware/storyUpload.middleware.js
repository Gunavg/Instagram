import multer from "multer";

const storage = multer.memoryStorage();

const fileFilter = (req, file, cb) => {
  const allowedTypes = [
    "image/jpeg",
    "image/jpg",
    "image/png",
    "image/webp",
    "image/gif",
    "video/mp4",
    "video/webm",
    "video/quicktime",
  ];

  if (allowedTypes.includes(file.mimetype)) {
    cb(null, true);
  } else {
    cb(
      new Error(
        "Only image and video files are allowed for stories",
      ),
      false,
    );
  }
};

const storyUpload = multer({
  storage,
  fileFilter,
  limits: {
    files: 10,
    fileSize: 50 * 1024 * 1024,
  },
});

export default storyUpload;