export default async function createIndexedDBClient() {
    /**
     * @type(IDBDatabase)
     */
    let database = null;

    const dbVersion = 3;
    const storeName = 'data';

    function store(values) {
        const objectStore = database
            .transaction(storeName, 'readwrite')
            .objectStore(storeName);

        objectStore.clear();

        values.forEach((value, i) => objectStore.add(value, i));
    }

    function getEntries(page, size, filters = undefined) {
        let startIndex = (page - 1) * size;

        return new Promise((resolve, reject) => {
            const request = database.transaction(storeName, 'readonly')
                .objectStore(storeName)
                .openCursor();

            const result = [];
            let idx = 0;

            request.onerror = console.log;
            request.onsuccess = ({ target: { result: cursor } }) => {
                if (cursor && filters && !isObjMatched(cursor.value, filters)) cursor.continue();
                else {
                    if (cursor && !startIndex) {
                        result[idx] = cursor.value;
                        idx++;
                    } else startIndex--;

                    if (cursor && size > result.length) cursor.continue();
                    else resolve({
                        entries: result,
                        currentPage: page,
                        done: !cursor
                    });
                }
            };
        });
    }

    /**
     * @param {object} obj
     * @param {Map<string, string>} filters
     * @return boolean
     */
    function isObjMatched(obj, filters) {
        for (let [key, value] of filters) {
            if (!obj[key].includes(value)) return false;
        }

        return true;
    }

    const request = indexedDB.open("CSVIndexedDB", dbVersion);

    request.onupgradeneeded = ({ target: { result: db } }) => {
        db.createObjectStore(storeName);
    }

    return new Promise((resolve, reject) => {
        request.onerror = (event) => {
            reject(event);
        };

        request.onsuccess = ({ target: { result } }) => {
            database = result;
            resolve({
                store,
                getEntries
            })
        };
    });
}
