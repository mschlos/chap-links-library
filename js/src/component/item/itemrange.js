/**
 * @constructor ItemRange
 * @extends Item
 * @param {Object} data       Object containing parameters start, end
 *                            content, className.
 * @param {Object} [options]  Options to set initial property values
 *                              {ItemSet} parent
 *                            // TODO: describe available options
 */
function ItemRange (data, options) {
    this.props = {
        contentWidth: 0
    };

    Item.call(this, data, options);
}

ItemRange.prototype = new Item (null);

// register the ItemBox in the item types
itemTypes['range'] = ItemRange;

/**
 * Select the item
 * @override
 */
ItemRange.prototype.select = function () {
    this.selected = true;
    // TODO: select and unselect
};

/**
 * Unselect the item
 * @override
 */
ItemRange.prototype.unselect = function () {
    this.selected = false;
    // TODO: select and unselect
};

/**
 * Repaint the item
 * @return {Boolean} changed
 */
ItemRange.prototype.repaint = function () {
    // TODO: make an efficient repaint
    var changed = false;
    var dom = this.dom;

    if (this.visible) {
        if (!dom) {
            this._create();
            changed = true;
        }
        dom = this.dom;

        if (dom) {
            if (!this.options && !this.options.parent) {
                throw new Error('Cannot repaint item: no parent attached');
            }
            var parentContainer = this.options.parent.getContainer();
            if (!parentContainer) {
                throw new Error('Cannot repaint time axis: parent has no container element');
            }

            if (!dom.box.parentNode) {
                parentContainer.appendChild(dom.box);
                changed = true;
            }

            // update content
            if (this.data.content != this.content) {
                this.content = this.data.content;
                if (this.content instanceof Element) {
                    dom.content.innerHTML = '';
                    dom.content.appendChild(this.content);
                }
                else {
                    dom.content.innerHTML = this.content;
                }
                changed = true;
            }

            // update class
            var className = this.data.className ? ('' + this.data.className) : '';
            dom.box.className = 'item range' + className;
        }
    }
    else {
        // hide when visible
        if (dom) {
            if (dom.box.parentNode) {
                dom.box.parentNode.removeChild(dom.box);
                changed = true;
            }
        }
    }

    return changed;
};

/**
 * Reflow the item: calculate its actual size from the DOM
 * @return {boolean} resized    returns true if the axis is resized
 * @override
 */
ItemRange.prototype.reflow = function () {
    var dom = this.dom,
        props = this.props,
        resized;

    if (dom) {
        var box = dom.box;

        var contentWidth = dom.content.offsetWidth;
        if (contentWidth != props.contentWidth) {
            props.contentWidth = contentWidth;
            resized = true;
        }

        var top = box.offsetTop;
        if (top != this.top) {
            this.top = top;
            resized = true;
        }

        var left = box.offsetLeft;
        if (left != this.left) {
            this.left = left;
            resized = true;
        }

        var width = box.offsetWidth;
        if (width != this.width) {
            this.width = width;
            resized = true;
        }

        var height = box.offsetHeight;
        if (height != this.height) {
            this.height = height;
            resized = true;
        }
    }
    else {
        resized = false;
    }

    return resized;
};

/**
 * Create an items DOM
 * @private
 */
ItemRange.prototype._create = function () {
    var dom = this.dom;
    if (!dom) {
        this.dom = dom = {};
        // background box
        dom.box = document.createElement('div');
        // className is updated in repaint()

        // contents box
        dom.content = document.createElement('div');
        dom.content.className = 'content';
        dom.box.appendChild(dom.content);
    }
};

/**
 * Reposition the item, recalculate its left, top, and width, using the current
 * range and size of the items itemset
 * @override
 */
ItemRange.prototype.reposition = function () {
    var dom = this.dom,
        options = this.options,
        margin = 5; // TODO: do not hardcode margin
    if (dom) {
        // TODO: check whether start is defined
        // TODO: check whether end is defined
        var contentWidth = options.parent.width,
            start = this.data && options.parent._toScreen(this.data.start),
            end = this.data && options.parent._toScreen(this.data.end),
            box = dom.box,
            content = dom.content,
            contentLeft;

        // limit the width of the this, as browsers cannot draw very wide divs
        if (start < -contentWidth) {
            start = -contentWidth;
        }
        if (end > 2 * contentWidth) {
            end = 2 * contentWidth;
        }

        // when range exceeds left of the window, position the contents at the left of the visible area
        if (start < 0) {
            contentLeft = Math.min(-start,
                (end - start - this.props.contentWidth - 2 * margin)) + 'px';
        }
        else {
            contentLeft = '0';
        }

        box.style.top = this.top + 'px';
        box.style.left = start + 'px';
        //box.style.width = Math.max(end - start - 2 * this.options.borderWidth, 1) + 'px'; // TODO: borderWidth
        box.style.width = Math.max(end - start, 1) + 'px';

        content.style.left = contentLeft;
    }
};
