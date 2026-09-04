import multer from "multer";

const storage = multer.memoryStorage();

const audioUpload = multer({
  storage,
  limits: {
    fileSize: 25 * 1024 * 1024,
  },
});

export default audioUpload;