import { StorageClientFactory } from "../storage-clients/storage-client.factory.js";

let storageClient = null;

self.onmessage = async ({ data: { type, value } }) => {
    if (type === 'loadFile') await loadFile(value);
    if (type === 'loadPageValues') await loadPage(value);
    if (type === 'filter') await filterData(value);
}

/**
 * @param {File} file
 */
const loadFile = async (file) => {
    if (!storageClient) storageClient = await StorageClientFactory.getStorageClient();

    const reader = new FileReader();

    reader.onprogress = onprogressHandler;
    reader.onload = onloadHandler;
    reader.readAsText(file);
}

/**  Emits the progress when loading the file
 * @param {ProgressEvent<FileReader>} event
 * @param {boolean} loaded
 * @param {number} total
 */
const onprogressHandler = ({ loaded, total }) => postMessage({
    type: 'progress',
    value: Math.round(loaded / total * 100)
});

/**  Emits the progress when loading the file
 * @param {ProgressEvent<FileReader>} event
 * @param {string} result
 */
const onloadHandler = ({ target: { result } }) => {
    const [rawHeaders, ...rawValues] = result.trimEnd().split('\r\n');
    const headers = rawHeaders.split(',').map(label => ({ label, key: toPascalCase(label) }));
    const fileValues = rawValues.map(csvRowToObject(headers));

    postMessage({ type: 'fileLoaded', value: { headers } });

    storageClient.store(fileValues);
};

/**  Loads the page at the specified index
 * @param {number} pageIndex
 * @param {number} size
 * @param {Map<string, object>} filters
 */
const loadPage = async ({ pageIndex, size, filters }) => {
    postMessage({
        type: 'pageValuesLoaded',
        value: await storageClient.getEntries(pageIndex + 1, size, filters)
    });
}

/**  Filters loaded data and emits the first page of the results
 * @param {Map<string, object>} filters
 * @param {number} size
 */
const filterData = async ({ filters, size }) => {
    postMessage({
        type: 'filterResults',
        value: await storageClient.getEntries(1, size, filters)
    });
}

/**
 * Takes in a string with spaces and returns it in pascalCase
 * @param {string} str
 * @returns {string}
 */
const toPascalCase = (str) => {
    let pascalCaseProp = '';
    let isWordStart = false;

    for (const char of str) {
        if (char === ' ') {
            isWordStart = true;
            continue;
        }

        if (isWordStart) {
            pascalCaseProp += char.toUpperCase();
            isWordStart = false
        } else pascalCaseProp += char.toLowerCase();
    }

    return pascalCaseProp;
}

/**
 * Takes in a string with spaces and returns it in pascalCase
 * @param {{key: string, label: string}[]} headers
 * @returns {function(csvRow: string): object}
 */
const csvRowToObject = (headers) => (csvRow) => {
    return csvRow.split(',').reduce((acc, val, rIdx) => {
        // TODO: Handle string that contains "
        let key = headers[rIdx] ? headers[rIdx].key : headers[headers.length - 1].key;
        acc[key] = val;
        return acc;
    }, {})
}
