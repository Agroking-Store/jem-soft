export interface Client {
  id: string;
  name: string;
  companyName?: string | null;
  email: string;
  phone: string;
  createdAt: string;
  updatedAt: string;
}

export interface ClientPayload {
  name: string;
  companyName?: string;
  email: string;
  phone: string;
  password: string;
}

export interface ClientUpdatePayload {
  name?: string;
  companyName?: string;
  email?: string;
  phone?: string;
  password?: string;
}

export interface ClientState {
  clients: Client[];
  currentClient: Client | null;
  portalClient: Client | null;
  portalToken: string | null;
  isLoading: boolean;
  error: string | null;
}

export interface ClientApiResponse {
  status: string;
  data: { client: Client };
}

export interface ClientsApiResponse {
  status: string;
  data: { clients: Client[] };
}

export interface ClientLoginApiResponse {
  status: string;
  token: string;
  data: { client: Client };
}
