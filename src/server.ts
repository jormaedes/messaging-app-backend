import { createServer } from "http";
import { app } from "./app.js";
import { env } from "./config/env.js";

const httpServer = createServer(app);

httpServer.listen(env.PORT, () => console.log(`API na porta ${env.PORT}`));