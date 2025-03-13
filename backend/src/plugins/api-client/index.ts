import { IAgentRuntime, settings } from "@elizaos/core";
import { Client } from "@elizaos/core";
import { ApiClient } from "../../api/api";

export const ApiClientInterface: Client = {
    name: 'Elysia API',
    config: {},
    start: async (_runtime: IAgentRuntime) => {
      const client = new ApiClient();
      const serverPort = Number.parseInt(settings.SERVER_PORT || '3000');
      client.start(serverPort);
      return client;
    },
  };
  
  const apiPlugin = {
    name: 'api',
    description: 'Elysia API client',
    clients: [ApiClientInterface],
  };
  
  export default apiPlugin;