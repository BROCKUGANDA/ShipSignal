export interface HealthResult {
  healthy: boolean;
  message?: string;
  checkedAt: string;
}

export interface Capability {
  name: string;
  available: boolean;
}

export interface ProviderResult<T> {
  data: T;
  source: string;
  retrievedAt: string;
  partial: boolean;
  warnings: string[];
}

export interface ProviderRequest {
  workspaceId: string;
  resourceId?: string;
  cursor?: string;
  limit?: number;
}

export interface ProviderCommand {
  type: string;
  payload: Record<string, unknown>;
}

export interface ProviderOperationResult {
  success: boolean;
  id?: string;
  message?: string;
}

export interface IntegrationProvider {
  connect(): Promise<{ success: boolean; message?: string }>;
  healthCheck(): Promise<HealthResult>;
  getCapabilities(): Promise<Capability[]>;
  fetchPage<T>(request: ProviderRequest): Promise<ProviderResult<T>>;
  execute(command: ProviderCommand): Promise<ProviderOperationResult>;
  disconnect(): Promise<void>;
}