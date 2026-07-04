export interface Client {
  id: string;
  name?: string | null;
  email?: string | null;
  phone?: string | null;
  companyName?: string | null;
  groupCode?: string | null;
}

export interface ClientPayload {
  name: string;
  email: string;
  password: string;
  phone?: string;
  companyName?: string;
  groupCode?: string;
}

export interface ClientUpdatePayload {
  name?: string;
  email?: string;
  phone?: string;
  companyName?: string;
  groupCode?: string;
}

export interface ClientApiResponse {
  data: {
    client?: Client;
    token?: string;
  };
  message?: string;
}

export interface ClientsApiResponse {
  data: {
    clients: Client[];
  };
  message?: string;
}

export interface ClientLoginApiResponse {
  data: {
    token: string;
  };
  message?: string;
}
