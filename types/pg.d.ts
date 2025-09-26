declare module "pg" {
  export class Client {
    constructor(config?: any);
    connect(): Promise<void>;
    end(): Promise<void>;
    query<T = any>(queryText: string, values?: any[]): Promise<{ rows: T[] }>;
  }
}
