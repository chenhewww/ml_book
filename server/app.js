import http from "node:http";
import { sendJson, sendText, serveStatic } from "./http.js";
import { getMetadata } from "./metadata.js";
import { parseExperimentRequest, readJsonBody, parseCustomExperimentPayload } from "./requests.js";
import { buildMermaid } from "./exporters.js";

export async function handleRequest(request, response) {
  const url = new URL(request.url, `http://${request.headers.host}`);

  if (request.method === "GET" && url.pathname === "/api/metadata") {
    sendJson(response, 200, getMetadata());
    return;
  }

  if (request.method === "GET" && url.pathname === "/api/experiment") {
    const parsed = parseExperimentRequest(url);
    if (parsed.error) {
      sendJson(response, 400, { error: parsed.error });
      return;
    }

    sendJson(response, 200, {
      algorithmId: parsed.algorithmId,
      learningRate: parsed.learningRate,
      ...parsed.experiment,
    });
    return;
  }

  if (request.method === "POST" && url.pathname === "/api/experiment/custom") {
    try {
      const payload = await readJsonBody(request);
      const parsed = parseCustomExperimentPayload(payload);
      if (parsed.error) {
        sendJson(response, 400, { error: parsed.error });
        return;
      }

      sendJson(response, 200, {
        algorithmId: parsed.algorithmId,
        learningRate: parsed.learningRate,
        customDataset: true,
        ...parsed.experiment,
      });
    } catch (error) {
      sendJson(response, 400, { error: error.message });
    }
    return;
  }

  if (request.method === "GET" && url.pathname === "/api/export/mermaid") {
    const parsed = parseExperimentRequest(url);
    if (parsed.error) {
      sendJson(response, 400, { error: parsed.error });
      return;
    }

    const algorithm = parsed.metadata.algorithms.find(({ id }) => id === parsed.algorithmId);
    sendText(response, 200, buildMermaid(algorithm, parsed.learningRate), "text/plain; charset=utf-8");
    return;
  }

  if (request.method === "POST" && url.pathname === "/api/export/custom") {
    try {
      const payload = await readJsonBody(request);
      const parsed = parseCustomExperimentPayload(payload);
      if (parsed.error) {
        sendJson(response, 400, { error: parsed.error });
        return;
      }

      const algorithm = parsed.metadata.algorithms.find(({ id }) => id === parsed.algorithmId);
      if (payload.kind === "mermaid") {
        sendText(response, 200, buildMermaid(algorithm, parsed.learningRate), "text/plain; charset=utf-8");
        return;
      }

      sendJson(response, 400, { error: "kind must be mermaid." });
    } catch (error) {
      sendJson(response, 400, { error: error.message });
    }
    return;
  }

  if (request.method !== "GET") {
    sendJson(response, 405, { error: "Unsupported method for this route." });
    return;
  }

  await serveStatic(url.pathname, response);
}

export function createAppServer() {
  return http.createServer(handleRequest);
}
