import { getTemplate } from "./lazy-table.template.js";
import { lazyTableService } from "./lazy-table.service.js"

customElements.define('lazy-table', class extends HTMLElement {
    static observedAttributes = ['size'];

    constructor() {
        super();

        this.ACCEPTED_FILE_TYPE = 'text/csv';

        this.attachShadow({ mode: 'open' });
        this.shadowRoot.innerHTML = getTemplate.apply(this);

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

    setHeaders(value) {
        this.thead.replaceChildren();

        if (value.length) {
            const inputListenerCallback = (input) => {
                // TODO: keep track of filter on multiple fields,
                this.csvWorker.postMessage({
                    type: 'search',
                    key: input.getAttribute('data-key'),
                    value: input.value
                })
            }
            const nodes = lazyTableService.generateTableHeaderNodes(value, inputListenerCallback);
            this.thead.append(...nodes);
        }
    }

    setValues(value) {
        this.tbody.replaceChildren();
        this.pageIndex = 0;

        if (value.length) this.loadPage(value);
    }

    loadPage(values) {
        this.tbody.append(...lazyTableService.generateTableRowNodes(values));
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

        if (type === 'searchResults') {
            this.setValues(value);
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