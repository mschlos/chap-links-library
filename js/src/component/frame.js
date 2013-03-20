/**
 * A frame containing all components
 * @param {Object} options   Available parameters:
 *                          {HTMLElement} container
 *                          {String} [id]
 *                          {String | Number} [width]
 *                          {String | Number} [height]
 * @constructor Frame
 * @extends Component
 */
function Frame(options) {
    this.setOptions(options);
}

Frame.prototype = new Component();

Frame.prototype.repaint = function () {
    var needReflow = false;
    var frame = this.frame;
    if (!frame) {
        frame = document.createElement('div');
        frame.className = 'visualization'; // TODO: replace visualization with the final name of the library
        this.frame = frame;
        needReflow = true;
    }
    if (!frame.parentNode) {
        var container = Component.toDom(this.options.container);
        if (!container) {
            throw new Error('Cannot repaint frame: no container attached');
        }
        while (container.firstChild) {
            container.removeChild(container.firstChild);
        }
        container.appendChild(frame);
        needReflow = true;
    }

    // update width
    var width = Component.toSize(this.options.width, '100%');
    if (frame.style.width != width) {
        frame.style.width = width;
        needReflow = true;
    }

    // update height
    var height = Component.toSize(this.options.height, '100%');
    if (frame.style.height != height) {
        frame.style.height = height;
        needReflow = true;
    }

    this._updateEventEmitters();

    if (needReflow) {
        this.requestReflow();
    }
};

Frame.prototype.reflow = function () {
    var needRepaint = false;
    var frame = this.frame;
    if (frame) {
        var top = frame.offsetTop;
        if (top != this.top) {
            this.top = top;
            needRepaint = true;
        }

        var left = frame.offsetLeft;
        if (left != this.left) {
            this.left = left;
            needRepaint = true;
        }

        var width = frame.offsetWidth;
        if (width != this.width) {
            this.width = width;
            needRepaint = true;
        }

        var height = frame.offsetHeight;
        if (height != this.height) {
            this.height = height;
            needRepaint = true;
        }
    }
    else {
        needRepaint = true;
    }

    if (needRepaint) {
        this.requestRepaint();
    }
};
