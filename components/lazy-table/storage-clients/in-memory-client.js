export default function createInMemoryClient() {
    let entries = [];
    let filteredEntries = [];
    let totalPages = 0;

    function store(values) {
        entries = values;
        filteredEntries = entries;
    }

    function getEntries(page, size, filters = undefined) {
        const startIndex = (page - 1) * size;
        const endIndex = startIndex + size;

        if (filters) {
            filteredEntries = entries.filter(obj => {
                for (let [key, value] of filters) {
                    if (!obj[key].includes(value)) return false;
                }

                return true;
            });
        }

        totalPages = Math.round(filteredEntries.length / size) || 1;

        return Promise.resolve({
            entries: filteredEntries.slice(startIndex, endIndex),
            totalEntries: filteredEntries.length,
            done: page === totalPages
        });
    }

    return {
        store,
        getEntries
    };
}