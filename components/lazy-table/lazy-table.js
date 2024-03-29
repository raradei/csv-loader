import templateService from "./template.service.js"

customElements.define('lazy-table', class extends HTMLElement {
    static observedAttributes = ['size'];

    constructor() {
        super();

        this.ACCEPTED_FILE_TYPE = 'text/csv';

        this.attachShadow({ mode: 'open' });
        this.shadowRoot.innerHTML = templateService.getTemplate.apply(this);

        this.size = 25;
        this.pageIndex = 0;
        this.filters = new Map([]);
        this.scrollTopBtnThreshold = 500;

        this.container = this.shadowRoot.querySelector('.sticky-table-container');
        this.thead = this.shadowRoot.querySelector('thead');
        this.tbody = this.shadowRoot.querySelector('tbody');
        this.progress = this.shadowRoot.querySelector('progress');
        this.fileSelector = this.shadowRoot.querySelector('#file-selector');
        this.scrollTopBtn = this.shadowRoot.querySelector('.scroll-top')

        this.csvWorker = new Worker(
            new URL('./workers/csv-worker.js', import.meta.url),
            { type: 'module' }
        );

        this.intersectionObserver = new IntersectionObserver(this.intersectionObserverHandler);
        this.scrollTopBtn.onclick = this.scrollTopHandler;
        this.container.onscroll = this.containerScrollHandler;
    }

    intersectionObserverHandler = ([entry]) => {
        if (entry.isIntersecting) {
            this.pageIndex += 1;
            this.csvWorker.postMessage({
                type: 'loadPageValues',
                value: {
                    pageIndex: this.pageIndex,
                    size: this.size,
                    filters: this.filters
                }
            })
            this.intersectionObserver.disconnect();
        }
    }

    scrollTopHandler = () => {
        this.container.scrollTop = 0;
    }

    containerScrollHandler = (ev) => {
        const overThreshold = this.container.scrollTop > this.scrollTopBtnThreshold;
        const isHidden = this.scrollTopBtn.classList.contains('hidden')
        if (overThreshold && isHidden || !overThreshold & !isHidden) this.scrollTopBtn.classList.toggle('hidden');
    }

    setHeaders(value) {
        if (value.length) {
            const nodes = templateService.generateTableHeaderNodes(value, this.inputListenerCallback);
            this.thead.append(...nodes);
        }
    }

    inputListenerCallback = (input) => {
        const key = input.getAttribute('data-key');

        if (input.value) this.filters.set(key, input.value);
        else this.filters.delete(key);

        this.container.scrollTop = 0;
        this.csvWorker.postMessage({
            type: 'filter',
            value: {
                filters: this.filters,
                size: this.size
            }
        })
    }

    setValues(result) {
        this.clearTableValues();
        if (result.entries.length) this.loadPageResults(result);
    }

    clearTableValues() {
        this.values = [];
        this.pageIndex = 0;
        this.tbody.replaceChildren();
    }

    clearTableHeaders() {
        this.headers = [];
        this.thead.replaceChildren();
    }

    loadPageResults(result) {
        this.tbody.append(...templateService.generateTableRowNodes(result.entries));
        if (!result.done) this.intersectionObserver.observe(this.tbody.lastElementChild);
    }

    csvWorkerHandler = ({ data: { type, value } }) => {
        if (type === 'fileLoaded') {
            this.setHeaders(value.headers);
            this.progress.classList.toggle('hidden');
            this.csvWorker.postMessage({
                type: 'loadPageValues',
                value: { pageIndex: this.pageIndex, size: this.size }
            })
        }

        if (type === 'pageValuesLoaded') {
            this.loadPageResults(value);
        }

        if (type === 'filterResults') {
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

            this.clearTableHeaders()
            this.clearTableValues();
            this.progress.classList.toggle('hidden');
            this.csvWorker.postMessage({ type: 'loadFile', value: file });
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