import multer from "multer";
import cloudinary from "../config/cloudinary.js";
import streamifier from "streamifier";

const storage = multer.memoryStorage();

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

const fileFilter = (
  req,
  file,
  cb
) => {
  if (
    allowedTypes.includes(
      file.mimetype
    )
  ) {
    cb(null, true);
  } else {
    cb(
      new Error(
        "Only image and video files are allowed"
      ),
      false
    );
  }
};

const upload = multer({
  storage,
  fileFilter,
  limits: {
    files: 10,
    fileSize:
      50 * 1024 * 1024,
  },
});

export const uploadToCloudinary =
  (file) =>
    new Promise(
      (resolve, reject) => {
        const resourceType =
          file.mimetype.startsWith(
            "video/"
          )
            ? "video"
            : "image";

        const stream =
          cloudinary.uploader.upload_stream(
            {
              folder:
                "instagram/stories",
              resource_type:
                resourceType,
            },
            (
              error,
              result
            ) => {
              if (error) {
                reject(error);
              } else {
                resolve(
                  result
                );
              }
            }
          );

        streamifier
          .createReadStream(
            file.buffer
          )
          .pipe(stream);
      }
    );

export default upload;