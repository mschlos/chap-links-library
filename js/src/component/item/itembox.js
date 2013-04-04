/**
 * @constructor ItemBox
 * @extends Item
 * @param {Object} data       Object containing parameters start
 *                            content, className.
 * @param {Object} [options]  Options to set initial property values
 *                              {ItemSet} parent
 *                            // TODO: describe available options
 */
function ItemBox (data, options) {
    this.props = {
        dotHeight: 0,
        dotWidth: 0,
        lineWidth: 0
    };

    Item.call(this, data, options);
}

ItemBox.prototype = new Item (null);

// register the ItemBox in the item types
itemTypes['box'] = ItemBox;

/**
 * Select the item
 * @override
 */
ItemBox.prototype.select = function () {
    this.selected = true;
    // TODO: select and unselect
};

/**
 * Unselect the item
 * @override
 */
ItemBox.prototype.unselect = function () {
    this.selected = false;
    // TODO: select and unselect
};

/**
 * Repaint the item
 * @return {Boolean} changed
 */
ItemBox.prototype.repaint = function () {
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
            if (!dom.line.parentNode) {
                parentContainer.appendChild(dom.line);
                changed = true;
            }
            if (!dom.dot.parentNode) {
                parentContainer.appendChild(dom.dot);
                changed = true;
            }

            // update contents
            if (this.data.content != this.content) {
                this.content = this.data.content;
                if (this.content instanceof Element) {
                    dom.content.innerHTML = '';
                    dom.content.appendChild(this.content);
                }
                else if (this.data.content != undefined) {
                    dom.content.innerHTML = this.content;
                }
                else {
                    throw new Error('Property "content" missing in item ' + this.data.id);
                }
                changed = true;
            }

            // update class
            var className = (this.data.className? ' ' + this.data.className : '') +
                (this.selected ? ' selected' : '');
            if (this.className != className) {
                this.className = className;
                dom.box.className = 'item box' + className;
                dom.line.className = 'item line' + className;
                dom.dot.className  = 'item dot' + className;
                changed = true;
            }
        }
    }
    else {
        // hide when visible
        if (dom) {
            if (dom.box.parentNode) {
                dom.box.parentNode.removeChild(dom.box);
                changed = true;
            }
            if (dom.line.parentNode) {
                dom.line.parentNode.removeChild(dom.line);
                changed = true;
            }
            if (dom.dot.parentNode) {
                dom.dot.parentNode.removeChild(dom.dot);
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
ItemBox.prototype.reflow = function () {
    var dom = this.dom,
        props = this.props,
        resized;

    if (dom) {
        var box = dom.box;

        var dotHeight = dom.dot.offsetHeight;
        if (dotHeight != props.dotHeight) {
            props.dotHeight = dotHeight;
            resized = true;
        }

        var dotWidth = dom.dot.offsetWidth;
        if (dotWidth != props.dotWidth) {
            props.dotWidth = dotWidth;
            resized = true;
        }

        var lineWidth = dom.line.offsetWidth;
        if (lineWidth != props.lineWidth) {
            props.lineWidth = lineWidth;
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
ItemBox.prototype._create = function () {
    var dom = this.dom;
    if (!dom) {
        this.dom = dom = {};

        // create the box
        dom.box = document.createElement('DIV');
        // className is updated in repaint()

        // contents box (inside the background box). used for making margins
        dom.content = document.createElement('DIV');
        dom.content.className = 'content';
        dom.box.appendChild(dom.content);

        // line to axis
        dom.line = document.createElement('DIV');
        dom.line.className = 'line';

        // dot on axis
        dom.dot = document.createElement('DIV');
        dom.dot.className = 'dot';
    }
};

/**
 * Reposition the item, recalculate its left, top, and width, using the current
 * range and size of the items itemset
 * @override
 */
ItemBox.prototype.reposition = function () {
    var dom = this.dom,
        props = this.props,
        options = this.options;
    if (dom) {
        if (this.data.start == undefined) {
            throw new Error('Property "start" missing in item ' + this.data.id);
        }

        var start = this.data && options.parent._toScreen(this.data.start),
            align = options && options.align,
            orientation = options.orientation,
            box = dom.box,
            line = dom.line,
            dot = dom.dot;

        var parentHeight = options.parent.height;
        var top;

        if (align == 'right') {
            box.style.left = (start - this.width) + 'px';
        }
        else if (align == 'left') {
            box.style.left = (start) + 'px';
        }
        else { // default or 'center'
            box.style.left = (start - this.width / 2) + 'px';
        }

        line.style.left = (start - props.lineWidth / 2) + 'px';
        dot.style.left = (start - props.dotWidth / 2) + 'px';
        if (orientation == 'top') {
            top = options.margin;

            box.style.top = top + 'px';
            line.style.top = '0';
            line.style.height = top + 'px';
            dot.style.top = (-props.dotHeight / 2) + 'px';
        }
        else {
            // default or 'bottom'
            top = parentHeight - this.height - options.margin;

            box.style.top = top + 'px';
            line.style.top = (top + this.height) + 'px';
            line.style.height = Math.max(parentHeight - top - this.height, 0) + 'px';
            dot.style.top = (parentHeight - props.dotHeight / 2) + 'px';
        }
    }
};
