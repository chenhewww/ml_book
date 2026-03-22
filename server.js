import { createAppServer } from "./server/app.js";
import { HOST, PORT } from "./server/config.js";

const server = createAppServer();

server.listen(PORT, HOST, () => {
  console.log(`ML Visual Debugger running at http://${HOST}:${PORT}`);
});
