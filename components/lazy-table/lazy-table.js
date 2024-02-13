customElements.define('lazy-table', class extends HTMLElement {
    static observedAttributes = ['size'];

    constructor() {
        super();

        this.ACCEPTED_FILE_TYPE = 'text/csv';

        this.attachShadow({ mode: 'open' });

        this.shadowRoot.innerHTML = `
            <style> @import url(${new URL('./lazy-table.css', import.meta.url)}); </style>
            
            <div class="flex-column">
                <label for="file-selector">Upload CSV</label>
                <input id="file-selector" type="file" accept="${this.ACCEPTED_FILE_TYPE}">
            </div>
                
            <progress class="hidden w-full" value="0" max="100"></progress>
            
            <table>
                <thead></thead>
                <tbody></tbody>
            </table>
        `;

        this.size = 25;
        this.pageIndex = 0;

        this.thead = this.shadowRoot.querySelector('thead');
        this.tbody = this.shadowRoot.querySelector('tbody');
        this.progress = this.shadowRoot.querySelector('progress');
        this.fileSelector = this.shadowRoot.querySelector('#file-selector');

        this.csvWorker = new Worker(
            new URL('./workers/csv-worker.js', import.meta.url),
            { type: 'module' }
        );

        this.intersectionObserver = new IntersectionObserver(([entry]) => {
            if (entry.isIntersecting) {
                this.pageIndex += 1;
                this.csvWorker.postMessage({ type: 'loadPageValues', pageIndex: this.pageIndex })
                this.intersectionObserver.unobserve(entry.target);
            }
        });
    }

    setValues(value) {
        this.tbody.replaceChildren();
        this.pageIndex = 0;

        if (value.length) this.loadPage(value);
    }

    setHeaders(value) {
        this.thead.replaceChildren();

        if (value.length) {
            const nodes = Array(value.length - 1);

            value.forEach((header, i) => {
                const node = document.createElement('th');
                node.innerText = header.label;
                nodes[i] = (node);
            })

            this.shadowRoot.querySelector('thead').append(...nodes);
        }
    }

    loadPage(values) {
        const rowNodes = Array(this.size);

        values.forEach((rowValue, i) => {
            const row = document.createElement('tr');

            for (const cellValue in rowValue) {
                const node = document.createElement('td');
                node.innerText = rowValue[cellValue];
                row.append(node);
            }

            rowNodes[i] = row;
        })

        this.tbody.append(...rowNodes);
        this.intersectionObserver.observe(this.tbody.lastElementChild);
    }

    csvWorkerHandler = ({ data: { type, value } }) => {
        if (type === 'fileLoaded') {
            this.setHeaders(value.headers);
            this.setValues(value.values);
            this.progress.classList.toggle('hidden');
        }

        if (type === 'pageValuesLoaded') {
            this.loadPage(value.pageValues);
            if (value.lastPage) this.intersectionObserver.disconnect();
        }

        if (type === 'progress') {
            this.progress.value = value;
        }
    }

    fileSelectorHandler = ({ target: { files: [file] } }) => {
        if (file) {
            if (file.type !== this.ACCEPTED_FILE_TYPE) {
                this.fileSelector.value = null;
                throw Error(`Uploaded file is ${file.type} instead of ${this.ACCEPTED_FILE_TYPE}`);
            }

            this.values = [];
            this.headers = [];
            this.progress.classList.toggle('hidden');
            this.csvWorker.postMessage({ type: 'loadFile', file, pageSize: this.size });
        }
    }

    connectedCallback() {
        this.csvWorker.addEventListener('message', this.csvWorkerHandler);
        this.fileSelector.addEventListener('change', this.fileSelectorHandler)
    }

    disconnectedCallback() {
        this.csvWorker.removeEventListener('message', this.csvWorkerHandler);
        this.fileSelector.removeEventListener('change', this.fileSelectorHandler);
    }

    attributeChangedCallback(attribute, oldValue, newValue) {
        if (attribute === 'size') this.size = newValue;
    }
});