import { createServer } from "node:http";

import { WebSocketServer } from "ws";

import type { AppConfig } from "../../config";
import type { ObservabilityService } from "../observability/service";
import type { RealtimeEventBus } from "./event-bus";

export function startRealtimeServer(
  config: AppConfig,
  eventBus: RealtimeEventBus,
  observability?: ObservabilityService,
): { close: () => Promise<void> } {
  const server = createServer();
  const wss = new WebSocketServer({ server });

  wss.on("connection", (socket, request) => {
    observability?.openWebsocket();
    const url = new URL(request.url ?? "/", `http://127.0.0.1:${config.WS_PORT}`);
    const channel = url.searchParams.get("channel");

    if (!channel) {
      socket.send(
        JSON.stringify({
          type: "error",
          message: "channel query parameter is required",
        }),
      );
      socket.close();
      return;
    }

    socket.send(
      JSON.stringify({
        type: "subscribed",
        channel,
        emitted_at: new Date().toISOString(),
      }),
    );

    const unsubscribe = eventBus.subscribe(channel, (event) => {
      if (socket.readyState === socket.OPEN) {
        socket.send(JSON.stringify(event));
      }
    });

    socket.on("close", () => {
      unsubscribe();
      observability?.closeWebsocket();
    });
  });

  server.listen(config.WS_PORT);

  return {
    close: async () => {
      await new Promise<void>((resolve, reject) => {
        wss.close((error) => {
          if (error) {
            reject(error);
            return;
          }
          server.close((serverError) => {
            if (serverError) {
              reject(serverError);
              return;
            }
            resolve();
          });
        });
      });
    },
  };
}
