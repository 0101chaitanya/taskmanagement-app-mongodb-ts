import dotenv from "dotenv";
import connectDB from "./db/db.ts";
import app from "./app.ts";

dotenv.config({ path: "./.env" });

const port = process.env.PORT || 3000;

connectDB()
  .then(() => {
    app.listen(port, () => {
      console.log(`Example app listening on port http://localhost:${port}`);
    });
  })
  .catch((reason) => {
    console.log("MongoDB connection error", reason);
    process.exit(1);
  });

