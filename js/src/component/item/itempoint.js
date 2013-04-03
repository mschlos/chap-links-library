/**
 * @constructor ItemPoint
 * @extends Item
 * @param {Object} data       Object containing parameters start
 *                            content, className.
 * @param {Object} [options]  Options to set initial property values
 *                              {ItemSet} parent
 *                            // TODO: describe available options
 */
function ItemPoint (data, options) {
    this.props = {};

    Item.call(this, data, options);
}

ItemPoint.prototype = new Item (null);

// register the ItemPoint in the item types
itemTypes['point'] = ItemPoint;

/**
 * Select the item
 * @override
 */
ItemPoint.prototype.select = function () {
    this.selected = true;
    // TODO: select and unselect
};

/**
 * Unselect the item
 * @override
 */
ItemPoint.prototype.unselect = function () {
    this.selected = false;
    // TODO: select and unselect
};

/**
 * Repaint the item
 * @return {Boolean} changed
 */
ItemPoint.prototype.repaint = function () {
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

            if (!dom.point.parentNode) {
                parentContainer.appendChild(dom.point);
                changed = true;
            }

            // update contents
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
            var className = (this.data.className? ' ' + this.data.className : '') +
                (this.selected ? ' selected' : '');
            dom.point.className  = 'item point' + className;
            // TODO: check whether the classname is changed, if so set changed to true
        }
    }
    else {
        // hide when visible
        if (dom) {
            if (dom.point.parentNode) {
                dom.point.parentNode.removeChild(dom.point);
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
ItemPoint.prototype.reflow = function () {
    var dom = this.dom,
        props = this.props,
        resized;

    if (dom) {
        var point = dom.point;

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

        var contentHeight = dom.content.offsetHeight;
        if (contentHeight != props.contentHeight) {
            props.contentHeight = contentHeight;
            resized = true;
        }

        var top = point.offsetTop;
        if (top != this.top) {
            this.top = top;
            resized = true;
        }

        var left = point.offsetLeft;
        if (left != this.left) {
            this.left = left;
            resized = true;
        }

        var width = point.offsetWidth;
        if (width != this.width) {
            this.width = width;
            resized = true;
        }

        var height = point.offsetHeight;
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
ItemPoint.prototype._create = function () {
    var dom = this.dom;
    if (!dom) {
        this.dom = dom = {};

        // background box
        dom.point = document.createElement('div');
        // className is updated in repaint()

        // contents box, right from the dot
        dom.content = document.createElement('div');
        dom.content.className = 'content';
        dom.point.appendChild(dom.content);

        // dot at start
        dom.dot = document.createElement('div');
        dom.dot.className  = 'dot';
        dom.point.appendChild(dom.dot);
    }
};

/**
 * Reposition the item, recalculate its left, top, and width, using the current
 * range and size of the items itemset
 * @override
 */
ItemPoint.prototype.reposition = function () {
    var dom = this.dom,
        props = this.props;
    if (dom) {
        var options = this.options,
            start = this.data && options.parent._toScreen(this.data.start);

        // TODO: check whether start is defined
        // TODO: check whether align is defined

        dom.point.style.top = this.top + 'px';
        dom.point.style.left = (start - props.dotWidth / 2) + 'px';

        dom.content.style.marginLeft = (1.5 * props.dotWidth) + 'px';
        //dom.content.style.marginRight = (0.5 * this.dotWidth) + 'px'; // TODO
        dom.dot.style.top = ((this.height - props.dotHeight) / 2) + 'px';
    }
};
