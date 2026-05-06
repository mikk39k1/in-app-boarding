import type { FlowDTO, FlowsResponseDTO } from "@ib/shared";

export interface ClientConfig {
  apiUrl: string;
  apiKey: string;
  jwt?: string;
}

export class ApiClient {
  constructor(private cfg: ClientConfig) {}

  setJwt(jwt: string | undefined) {
    this.cfg.jwt = jwt;
  }

  private headers(): HeadersInit {
    const auth = this.cfg.jwt
      ? `Bearer ${this.cfg.jwt}`
      : `Bearer ${this.cfg.apiKey}`;
    return {
      Authorization: auth,
      "Content-Type": "application/json",
    };
  }

  async exchangeBuilderToken(token: string): Promise<{
    jwt: string;
    flowId: string | null;
    environment: "DEV" | "PROD";
  }> {
    const res = await fetch(`${this.cfg.apiUrl}/api/builder/exchange`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ token, apiKey: this.cfg.apiKey }),
    });
    if (!res.ok) {
      const err = await res.text();
      throw new Error(`Builder exchange failed: ${res.status} ${err}`);
    }
    return res.json();
  }

  async listFlows(): Promise<FlowsResponseDTO> {
    const res = await fetch(`${this.cfg.apiUrl}/api/sdk/flows`, {
      headers: this.headers(),
    });
    if (!res.ok) throw new Error(`listFlows failed: ${res.status}`);
    return res.json();
  }

  async getFlow(id: string): Promise<FlowDTO> {
    const res = await fetch(`${this.cfg.apiUrl}/api/sdk/flows/${id}`, {
      headers: this.headers(),
    });
    if (!res.ok) throw new Error(`getFlow failed: ${res.status}`);
    return res.json();
  }

  async updateFlow(
    id: string,
    body: Partial<{
      name: string;
      description: string | null;
      isPublished: boolean;
      dimBackground: boolean;
      steps: Array<{
        id?: string;
        order: number;
        title: string;
        body: string;
        targetProfile: unknown;
        revealActions?: unknown[];
        dimBackground?: boolean;
        advanceOnTargetClick?: boolean;
        placement: string;
        pageUrlPattern: string | null;
      }>;
    }>,
  ): Promise<FlowDTO> {
    const res = await fetch(`${this.cfg.apiUrl}/api/sdk/flows/${id}`, {
      method: "PUT",
      headers: this.headers(),
      body: JSON.stringify(body),
    });
    if (!res.ok) {
      const err = await res.text();
      throw new Error(`updateFlow failed: ${res.status} ${err}`);
    }
    return res.json();
  }
}
