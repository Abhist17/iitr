const { compressImage } = require("./src/services/compression.service.js");

compressImage("uploads/test6.jpg")
  .then(out => console.log("Output saved to:", out))
  .catch(err => console.error(err));

  