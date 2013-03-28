/**
 * A panel can contain components
 * @param {Object} [options]    Available parameters:
 *                              {Component} parent
 *                              {String} [id]
 *                              {String | Number | function} [left]
 *                              {String | Number | function} [top]
 *                              {String | Number | function} [width]
 *                              {String | Number | function} [height]
 *                              {String | function} [className]
 * @constructor Panel
 * @extends Component
 */
function Panel(options) {
    this.id = util.randomUUID();
    this.options = {};

    this.setOptions(options);
}

Panel.prototype = new Component();

/**
 * Get the container element of the panel, which can be used by a child to
 * add its own widgets.
 * @returns {HTMLElement} container
 */
Panel.prototype.getContainer = function () {
    return this.frame;
};

// TODO: comment
Panel.prototype.repaint = function () {
    var needReflow = false,
        options = this.options,
        frame = this.frame;
    if (!frame) {
        frame = document.createElement('div');
        frame.className = 'panel';

        if (options.className) {
            if (typeof options.className == 'function') {
                util.addClassName(frame, String(options.className()));
            }
            else {
                util.addClassName(frame, String(options.className));
            }
        }

        this.frame = frame;
        needReflow = true;
    }
    if (!frame.parentNode) {
        if (!this.parent) {
            throw new Error('Cannot repaint panel: no parent attached');
        }
        var parentContainer = this.parent.getContainer();
        if (!parentContainer) {
            throw new Error('Cannot repaint panel: parent has no container element');
        }
        parentContainer.appendChild(frame);
        needReflow = true;
    }

    // update top
    var top = util.option.asSize(options.top, '0');
    if (frame.style.top != top) {
        frame.style.top = top;
        needReflow = true;
    }

    // update left
    var left = util.option.asSize(options.left, '0');
    if (frame.style.left != left) {
        frame.style.left = left;
        needReflow = true;
    }

    // update width
    var width = util.option.asSize(options.width, '100%');
    if (frame.style.width != width) {
        frame.style.width = width;
        needReflow = true;
    }

    // update height
    var height = util.option.asSize(options.height, '100%');
    if (frame.style.height != height) {
        frame.style.height = height;
        needReflow = true;
    }

    if (needReflow) {
        this.requestReflow();
    }
};

Panel.prototype.reflow = function () {
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
