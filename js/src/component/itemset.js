/**
 * An ItemSet holds a set of items and ranges which can be displayed in a
 * range. The width is determined by the parent of the ItemSet, and the height
 * is determined by the size of the items.
 * @param {Object} options   Available parameters:
 *                          {Component} parent
 *                          {String} [id]
 *                          {DataSet} [data]
 *                          {String | function} [className]
 * @constructor ItemSet
 * @extends Component
 */
function ItemSet(options) {
    this.id = util.randomUUID();
    this.options = {};
    this.data = new DataSet();

    this.setOptions(options);
}

ItemSet.prototype = new Component();

// TODO: comment
ItemSet.prototype.setOptions = function (options) {
    if (options.data) {
        if (!(options.data instanceof DataSet)) {
            throw new TypeError('data must be of type DataSet');
        }
        this.data = options.data;
    }

    Component.prototype.setOptions.call(this, options);
};

/**
 * Repaint the component
 * @return {Boolean} changed
 */
ItemSet.prototype.repaint = function () {
    var changed = false,
        options = this.options,
        frame = this.frame;

    if (!frame) {
        frame = document.createElement('div');
        frame.className = 'itemset';

        if (options.className) {
            util.addClassName(frame, util.option.asString(options.className));
        }

        this.frame = frame;
        changed = true;
    }
    if (!frame.parentNode) {
        if (!this.parent) {
            throw new Error('Cannot repaint itemset: no parent attached');
        }
        var parentContainer = this.parent.getContainer();
        if (!parentContainer) {
            throw new Error('Cannot repaint itemset: parent has no container element');
        }
        parentContainer.appendChild(frame);
        changed = true;
    }

    // update top
    var top = util.option.asSize(options.top, '0');
    if (frame.style.top != top) {
        frame.style.top = top;
        changed = true;
    }

    // update left
    var left = util.option.asSize(options.left, '0');
    if (frame.style.left != left) {
        frame.style.left = left;
        changed = true;
    }

    // update width
    var width = util.option.asSize(options.width, '100%');
    if (frame.style.width != width) {
        frame.style.width = width;
        changed = true;
    }

    // update height
    var height = util.option.asSize(options.height, '100%');
    if (frame.style.height != height) {
        frame.style.height = height;
        changed = true;
    }

    return changed;
};

/**
 * Reflow the component
 * @return {Boolean} resized
 */
ItemSet.prototype.reflow = function () {
    var resized = false;
    var frame = this.frame;
    if (frame) {
        var top = frame.offsetTop;
        if (top != this.top) {
            this.top = top;
            resized = true;
        }

        var left = frame.offsetLeft;
        if (left != this.left) {
            this.left = left;
            resized = true;
        }

        var width = frame.offsetWidth;
        if (width != this.width) {
            this.width = width;
            resized = true;
        }

        var height = frame.offsetHeight;
        if (height != this.height) {
            this.height = height;
            resized = true;
        }
    }
    else {
        resized = true;
    }

    return resized;
};
