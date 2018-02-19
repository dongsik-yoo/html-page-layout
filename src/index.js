'use strict';

const SPLIT_PARAGRAPH_ID = 'data-split-paragraph-id';

class HtmlPageLayout {
    constructor(parent) {
        /**
         * @type {Array.<HTMLElement>}
         */
        this.pageBodyElements = [];

        this.pageSize = {
            width: '150mm', // '210mm',
            height: '70mm' // '297mm'
        };
        this.containerStyles = {
            padding: '10mm 10mm',
            backgroundColor: '#f5f5f5',
            width: `calc(${this.pageSize.width} + 20mm)`,
            position: 'relative'
        };
        this.pageStyles = {
            padding: '20mm 10mm',
            margin: '0 0 10mm 0',
            width: this.pageSize.width,
            height: this.pageSize.height,
            backgroundColor: '#ffffff'
        };
        this.pageBodyStyles = {
            outline: 0,
            height: '100%',
            border: '1px dashed black'
        };
        this.splitParagraphId = 1;

        this._createPageContainer(parent);
        this._appendPage();
        this._addEventListener();
    }

    setHtml(html) {
        const selection = document.getSelection();
        const range = document.createRange();
        const [pageBodyElement] = this.pageBodyElements;
        pageBodyElement.innerHTML = html;

        this._layout();
        this._scrollIntoView(pageBodyElement.parentElement, true);

        // set the cursor at page body element
        range.setStart(pageBodyElement.firstChild, 0);
        range.setEnd(pageBodyElement.firstChild, 0);
        selection.removeAllRanges();
        selection.addRange(range);
    }

    _createPageContainer(parent) {
        this.container = document.createElement('div');
        parent.appendChild(this.container);

        this._setContainerStyles();
    }

    _appendPage(insertParagraph = true) {
        const pageElement = document.createElement('div');
        const pageBodyElement = document.createElement('div');

        this._setPageStyles(pageElement);
        this._setPageBodyStyles(pageBodyElement);
        this._setEditable(pageBodyElement, true);
        if (insertParagraph) {
            this._appendParagraph(pageBodyElement);
        }

        pageElement.appendChild(pageBodyElement);
        this.container.appendChild(pageElement);

        this.pageBodyElements.push(pageBodyElement);

        pageElement.setAttribute('data-page-number', this.pageBodyElements.length);
    }

    _setContainerStyles() {
        const {padding, backgroundColor, width, position} = this.containerStyles;
        this.container.style.padding = padding;
        this.container.style.backgroundColor = backgroundColor;
        this.container.style.width = width;
        this.container.style.position = position;
    }

    _setPageStyles(pageElement) {
        const {padding, margin, width, height, backgroundColor} = this.pageStyles;
        pageElement.style.padding = padding;
        pageElement.style.margin = margin;
        pageElement.style.width = width;
        pageElement.style.height = height;
        pageElement.style.backgroundColor = backgroundColor;
    }

    /**
     * Set page body element styles
     * @param {HTMLElement} pageBodyElement - page body element
     */
    _setPageBodyStyles(pageBodyElement) {
        const {outline, height, border} = this.pageBodyStyles;
        pageBodyElement.style.outline = outline;
        pageBodyElement.style.height = height;
        pageBodyElement.style.border = border;

        pageBodyElement.classList.add('page-body');
    }

    _setEditable(pageBodyElement, enable) {
        pageBodyElement.setAttribute('contentEditable', enable);
    }

    _appendParagraph(pageBodyElement) {
        const p = document.createElement('p');
        const br = document.createElement('br');

        p.appendChild(br);
        pageBodyElement.appendChild(p);
    }

    /**
     * Calculate bottom with offset
     * @param {HTMLElement} element - target element
     * @returns {number} bottom
     */
    _getBottom(element) {
        let bottom = element.offsetHeight + element.offsetTop;
        let parent = element.offsetParent;
        while (parent) {
            bottom += parent.offsetTop;
            parent = parent.offsetParent;
        }

        return bottom;
    }

    /**
     * Add event listners to layout pages
     */
    _addEventListener() {
        document.addEventListener('keyup', event => {
            if (event.target.isContentEditable) {
                this._layout();
            }
        });
    }

    /**
     * Get top value of element
     * @param {HTMLElement} element - target element
     * @returns {number} top value
     */
    _getTop(element) {
        return element.offsetTop;
    }

    /**
     * Layout pages
     */
    async _layout() {
        let pageNumber = 1;
        while (pageNumber <= this.pageBodyElements.length) {
            pageNumber = await this._layoutPage(pageNumber);
        }
    }

    /**
     * Layout a page and return next page number
     * @param {number} pageNumber - page number
     * @returns {Promise} promise
     */
    _layoutPage(pageNumber = 1) {
        const promise = new Promise((resolve, reject) => {
            const pageIndex = pageNumber - 1;
            const totalPageCount = this.pageBodyElements.length;
            if (pageNumber > totalPageCount || pageNumber > 100) {
                reject(pageNumber + 1);
            }

            const pageBodyElement = this.pageBodyElements[pageIndex];
            const pageBodyBottom = this._getBottom(pageBodyElement);
            const exceedParagraph = this._findExceedParagraph(pageBodyElement, pageBodyBottom);
            const insertBodyParagraph = false;
            let allExceedParagraphs, nextPageBodyElement;

            if (exceedParagraph) {
                this._splitParagraph(exceedParagraph, pageBodyBottom);

                allExceedParagraphs = this._getExceedAllParagraphs(pageBodyElement, pageBodyBottom);
                if (pageNumber >= totalPageCount) {
                    this._appendPage(insertBodyParagraph);
                }

                nextPageBodyElement = this.pageBodyElements[pageIndex + 1];
                this._insertParagraphsToBodyAtFirst(nextPageBodyElement, allExceedParagraphs);
            }

            resolve(pageNumber + 1);
        });

        return promise;
    }

    /**
     * Find a first exceed paragraph
     * @param {HTMLElement} pageBodyElement - page body element
     * @param {number} pageBodyBottom - page bottom
     * @returns {HtmlElement} a first exceed paragraph
     */
    _findExceedParagraph(pageBodyElement, pageBodyBottom) {
        const paragraphs = pageBodyElement.querySelectorAll('p');
        const {length} = paragraphs;

        for (let i = 0; i < length; i += 1) {
            const paragraph = paragraphs[i];
            const paragraphBottom = this._getBottom(paragraph);
            if (pageBodyBottom < paragraphBottom) {
                return paragraph;
            }
        }

        return null;
    }

    /**
     * Get all exceed paragraphs
     * @param {HTMLElement} pageBodyElement - page body element
     * @param {number} pageBodyBottom - page bottom
     * @returns {Array.<HTMLElement>} all exceed paragraph array
     */
    _getExceedAllParagraphs(pageBodyElement, pageBodyBottom) {
        const paragraphs = pageBodyElement.querySelectorAll('p');
        const {length} = paragraphs;
        const exceedParagraphs = [];

        for (let i = 0; i < length; i += 1) {
            const paragraph = paragraphs[i];
            const paragraphBottom = this._getBottom(paragraph);
            if (pageBodyBottom < paragraphBottom) {
                exceedParagraphs.push(paragraph);
            }
        }

        // Remain a bigger paragraph than page height.
        if (paragraphs.length === exceedParagraphs.length) {
            exceedParagraphs.shift();
        }

        return exceedParagraphs;
    }

    /**
     * Insert paragraphs to body at first
     * @param {HTMLElement} pageBodyElement - page body element
     * @param {Array.<HTMLElement>} paragraphs - paragraph array
     */
    _insertParagraphsToBodyAtFirst(pageBodyElement, paragraphs) {
        if (pageBodyElement.firstChild) {
            // merge split paragraphs before.
            paragraphs.slice().reverse().forEach(paragraph => {
                const splitParagraphId = paragraph.getAttribute(SPLIT_PARAGRAPH_ID);
                let appended = false;
                if (splitParagraphId) {
                    const nextParagraph = pageBodyElement.querySelector(`[${SPLIT_PARAGRAPH_ID}="${splitParagraphId}"]`);
                    if (nextParagraph) {
                        const {firstChild} = nextParagraph;
                        paragraph.childNodes.forEach(
                            node => nextParagraph.insertBefore(node, firstChild)
                        );

                        paragraph.parentElement.removeChild(paragraph);
                        appended = true;
                    }
                }

                if (!appended) {
                    pageBodyElement.insertBefore(paragraph, pageBodyElement.firstChild);
                }
            });
        } else {
            paragraphs.forEach(
                paragraph => pageBodyElement.appendChild(paragraph)
            );
        }
    }

    /* eslint-disable complexity */
    /**
     * Split a paragraph to two paragraphs
     * @param {HTMLElement} paragraph - paragraph element
     * @param {number} pageBodyBottom - bottom of element to be split
     */
    _splitParagraph(paragraph, pageBodyBottom) {
        const textNodes = [];
        const wrappers = [];
        const lines = [];
        const treeWalker = document.createTreeWalker(paragraph);
        const selection = document.getSelection();
        let range = null;

        if (selection.rangeCount) {
            range = selection.getRangeAt(0);
        }

        // find text nodes
        while (treeWalker.nextNode()) {
            const node = treeWalker.currentNode;
            if (node.nodeType === Node.TEXT_NODE) {
                textNodes.push(node);
            }
        }

        // wrap text nodes with span
        textNodes.forEach(textNode => {
            const texts = textNode.textContent.split('');
            texts.forEach((chararcter, index) => {
                const span = document.createElement('span');
                span.innerText = chararcter;
                wrappers.push(span);

                textNode.parentElement.insertBefore(span, textNode);

                // for keeping the cursor
                if (range
                    && range.startContainer === textNode
                    && range.startOffset === index) {
                    range.setStartBefore(span);
                    range.setEndBefore(span);
                }
            });

            textNode.parentElement.removeChild(textNode);
        });

        // recognize lines
        let prevSpan;
        wrappers.forEach(span => {
            const prevSpanBottom = prevSpan ? prevSpan.getBoundingClientRect().bottom : 0;
            const spanTop = span.getBoundingClientRect().top;
            if (prevSpanBottom < spanTop) {
                lines.push(span);
            }
            prevSpan = span;
        });

        // find a exceed first line
        let nextParagraphCharacters = [];
        const {length} = lines;
        for (let i = 0; i < length; i += 1) {
            const line = lines[i];
            const lineBottom = this._getBottom(line);
            if (lineBottom > pageBodyBottom) {
                const splitIndex = wrappers.indexOf(line);
                nextParagraphCharacters = wrappers.slice(splitIndex);
                break;
            }
        }

        // split the paragraph to two paragraphs
        const extractRange = document.createRange();
        extractRange.setStartBefore(nextParagraphCharacters[0]);
        extractRange.setEndAfter(nextParagraphCharacters[nextParagraphCharacters.length - 1]);

        const fragment = extractRange.extractContents();
        const nextParagraph = paragraph.cloneNode();
        nextParagraph.innerHTML = '';

        nextParagraph.appendChild(fragment);
        paragraph.parentElement.insertBefore(nextParagraph, paragraph.nextSibling);

        if (!paragraph.hasAttribute(SPLIT_PARAGRAPH_ID)) {
            paragraph.setAttribute(SPLIT_PARAGRAPH_ID, this.splitParagraphId);
            nextParagraph.setAttribute(SPLIT_PARAGRAPH_ID, this.splitParagraphId);
            this.splitParagraphId += 1;
        }

        // unwrap text nodes
        wrappers.forEach(span => {
            if (span.parentElement) {
                const textNode = span.firstChild;
                span.removeChild(textNode);
                span.parentElement.insertBefore(textNode, span);
                span.parentElement.removeChild(span);
            }
        });

        // keep the cursor
        if (range) {
            selection.removeAllRanges();
            selection.addRange(range);
        }

        paragraph.normalize();
        nextParagraph.normalize();
    }

    /**
     * Scroll to the element
     * @param {HTMLElement} element - target element
     * @param {boolean} immediatly - no smooth
     */
    _scrollIntoView(element, immediatly) {
        element.scrollIntoView({
            block: 'start',
            behavior: immediatly ? 'auto' : 'smooth'
        });
    }
}

module.exports = HtmlPageLayout;
