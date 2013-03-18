/**
 * A frame containing all components
 * @param {Object} config   Available config parameters:
 *                          {HTMLElement} container
 *                          {String} [id]
 *                          {String | Number} [width]
 *                          {String | Number} [height]
 * @constructor Frame
 * @extends Component
 */
function Frame(config) {
    this.setConfig(config);
}

Frame.prototype = new Component();

Frame.prototype.repaint = function () {
    console.log('repaint frame ' + this.id.split('-')[0]); // TODO: cleanup logging

    var needReflow = false;
    var frame = this.frame;
    if (!frame) {
        frame = document.createElement('div');
        frame.className = 'visualization'; // TODO: replace visualization with the final name of the library
        this.frame = frame;
        needReflow = true;
    }
    if (!frame.parentNode) {
        var container = Component.toDom(this.config.container);
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
    var width = Component.toSize(this.config.width, '100%');
    if (frame.style.width != width) {
        frame.style.width = width;
        needReflow = true;
    }

    // update height
    var height = Component.toSize(this.config.height, '100%');
    if (frame.style.height != height) {
        frame.style.height = height;
        needReflow = true;
    }

    if (needReflow) {
        this.requestReflow();
    }
};

Frame.prototype.reflow = function () {
    console.log('reflow frame ' + this.id.split('-')[0]); // TODO: cleanup logging

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
