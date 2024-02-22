import createInMemoryClient from "./in-memory-client.js";

export class StorageClientFactory {
    static async getStorageClient() {
        // return createIndexedDBClient()
        //     .then((client) => client)
        //     .catch(() => createInMemoryClient());

        return createInMemoryClient();
    }
}