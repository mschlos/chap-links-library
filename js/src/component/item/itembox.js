/**
 * @constructor ItemBox
 * @extends Item
 * @param {Object} data       Object containing parameters start, end
 *                            content, group.
 * @param {Object} [options]  Options to set initial property values
 *                              {ItemSet} parent
 *                            // TODO: describe available options
 */
function ItemBox (data, options) {
    this.props = {};

    Item.call(this, data, options);
}

ItemBox.prototype = new Item (null);

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
            // TODO: only update content when changed
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
            dom.box.className = 'item box';
            dom.line.className = 'item line';
            dom.dot.className  = 'item dot';

            // add item specific class name when provided
            var className = this.data.className;
            if (className) {
                util.addClassName(dom.box, className);
                util.addClassName(dom.line, className);
                util.addClassName(dom.dot, className);
            }

            if (this.selected) {
                util.addClassName(dom.box, 'selected');
                util.addClassName(dom.line, 'selected');
                util.addClassName(dom.dot, 'selected');
            }

            // TODO: check whether the classname is changed, if so set changed to true
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
        dom.box.style.position = 'absolute';
        dom.box.style.left = this.left + 'px';
        dom.box.style.top = this.top + 'px';

        // contents box (inside the background box). used for making margins
        dom.content = document.createElement('DIV');
        dom.content.className = 'content';
        dom.content.innerHTML = this.content;  // TODO support content of type HTMLElement
        dom.box.appendChild(dom.content);

        // line to axis
        dom.line = document.createElement('DIV');
        dom.line.style.position = 'absolute';
        dom.line.style.width = '0px';
        // important: the vertical line is added at the front of the list of elements,
        // so it will be drawn behind all boxes and ranges

        // dot on axis
        dom.dot = document.createElement('DIV');
        dom.dot.style.position = 'absolute';
        dom.dot.style.width  = '0';
        dom.dot.style.height = '0';
    }
};

/**
 * Reposition the item, recalculate its left, top, and width, using the current
 * range and size of the items itemset
 * @override
 */
ItemBox.prototype.reposition = function () {
    var dom = this.dom,
        props = this.props;
    if (dom) {
        /* TODO: reposition the item
        var left = timeline.timeToScreen(this.start),
            axisOnTop = timeline.options.axisOnTop,
            axisTop = timeline.size.axis.top,
            axisHeight = timeline.size.axis.height,
            boxAlign = (timeline.options.box && timeline.options.box.align) ?
                timeline.options.box.align : undefined;
        */

        var options = this.options,
            start = this.data && options.parent._toScreen(this.data.start),
            align = options && options.align,
            orientation = options.orientation,
            box = dom.box,
            line = dom.line,
            dot = dom.dot;

        // TODO: check whether start is defined
        // TODO: check whether align is defined

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
            top = parentHeight - this.height - options.margin;

            box.style.top = top + 'px';
            line.style.top = (top + this.height) + 'px';
            line.style.height = Math.max(parentHeight - top - this.height, 0) + 'px';
            dot.style.top = (parentHeight - props.dotHeight / 2) + 'px';
        }
    }
};
