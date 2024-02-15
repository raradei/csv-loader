onmessage = ({ data }) => {
    if (data.type === 'loadFile') loadFile(data.file, data.pageSize);
    if (data.type === 'loadPageValues') loadPage(data.pageIndex);
    if (data.type === 'search') search(data.filters);
}

/**
 * @param {File} file
 * @param {Number} pageSize
 */
const loadFile = (file, pageSize) => {
    const reader = new FileReader();
    self.pageSize = pageSize

    reader.onprogress = onprogressHandler;
    reader.onload = onloadHandler;
    reader.readAsText(file);
}

/**  Emits the progress when loading the file
 * @param {ProgressEvent<FileReader>} event
 */
const onprogressHandler = ({ loaded, total }) => postMessage({
    type: 'progress',
    value: Math.round(loaded / total * 100)
});

/**  Emits the progress when loading the file
 * @param {ProgressEvent<FileReader>} event
 */
const onloadHandler = ({ target: { result } }) => {
    const [rawHeaders, ...rawValues] = result.trimEnd().split('\r\n');
    const headers = rawHeaders.split(',').map(label => ({ label, key: toPascalCase(label) }));

    self.lastPageIndex = Math.round(rawValues.length / pageSize - 1);
    self.fileValues = rawValues.slice(0, pageSize).map(csvRowToObject(headers));

    postMessage({ type: 'fileLoaded', value: { headers, values: self.fileValues } });

    if (self.lastPageIndex) {
        self.fileValues = self.fileValues.concat(rawValues.slice(pageSize).map(csvRowToObject(headers)));
    }

    self.currentValuesRef = self.fileValues;
};

/**  Loads the page at the specified index
 * @param {number} pageIndex
 */
const loadPage = (pageIndex) => {
    if (pageIndex <= self.lastPageIndex) {
        const startIndex = pageIndex * self.pageSize;
        const endIndex = startIndex + self.pageSize;

        postMessage({
            type: 'pageValuesLoaded',
            value: {
                pageValues: self.currentValuesRef.slice(startIndex, endIndex),
                lastPage: pageIndex === self.lastPageIndex
            },
        });
    }
}

/**  Filters loaded data and emits the first page of the results
 * @param {Map<string, object>} filters
 */
const search = (filters) => {
    self.currentValuesRef = self.fileValues.filter(obj => {
        for (let [key, value] of filters) {
            if (!obj[key].includes(value)) return false;
        }

        return true;
    });

    self.lastPageIndex = Math.round(self.currentValuesRef.length / self.pageSize - 1);

    postMessage({
        type: 'searchResults',
        value: self.currentValuesRef.slice(0, self.pageSize)
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
