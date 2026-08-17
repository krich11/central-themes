import { spawn } from "node:child_process";

const cli = "C:\\Users\\Ken\\AppData\\Local\\npm-cache\\_npx\\9833c18b2d85bc59\\node_modules\\@playwright\\mcp\\cli.js";
const child = spawn(process.execPath, [cli, "--extension", "--browser", "msedge"], {
  env: {
    ...process.env,
    PLAYWRIGHT_MCP_BROWSER: "msedge",
    PLAYWRIGHT_MCP_EXECUTABLE_PATH: "C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe",
    PLAYWRIGHT_MCP_EXTENSION_TOKEN: process.env.PLAYWRIGHT_MCP_EXTENSION_TOKEN || "",
  },
  stdio: ["pipe", "pipe", "pipe"],
  windowsHide: false,
});
child.stdout.on("data", (d) => console.error("STDOUT", d.toString("utf8").slice(0, 500)));
child.stderr.on("data", (d) => console.error("STDERR", d.toString("utf8").slice(0, 500)));
child.on("exit", (c, s) => console.error("EXIT", c, s));
setTimeout(() => {
  const payload = JSON.stringify({
    jsonrpc: "2.0",
    id: 1,
    method: "initialize",
    params: { protocolVersion: "2024-11-05", capabilities: {}, clientInfo: { name: "t", version: "0" } },
  });
  const frame = `Content-Length: ${Buffer.byteLength(payload)}\r\n\r\n${payload}`;
  console.error("SEND", frame.slice(0, 120));
  child.stdin.write(frame);
}, 1500);
setTimeout(() => {
  child.kill();
  console.error("killed");
}, 8000);
