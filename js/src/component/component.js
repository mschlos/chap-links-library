/**
 * Interface prototype for visual components
 */
function Component () {
    this.id = null;
    this.parent = null;
    this.controller = null;
    this.options = {};

    this.frame = null; // main DOM element
    this.top = 0;
    this.left = 0;
    this.width = 0;
    this.height = 0;
}

/**
 * Set parameters for the frame. Parameters will be merged in current parameter
 * set.
 * @param {Object} options  Available parameters:
 *                          {String} [id]
 *                          {HTMLElement} container
 *                          {Array} depends           Components on which this
 *                                                    component is dependent
 *                          {String | Number | function} [left]
 *                          {String | Number | function} [top]
 *                          {String | Number | function} [width]
 *                          {String | Number | function} [height]
 */
Component.prototype.setOptions = function(options) {
    var me = this;
    if (options) {
        util.forEach(options, function (value, key) {
            switch (key) {
                case 'id':
                    me.id = value;
                    break;
                case 'depends':
                    me.depends = value;
                    break;

                case 'parent':
                    me.parent = value;
                    break;

                default:
                    me.options[key] = value;
                    break;
            }
        });
    }

    if (!this.id) {
        this.id = util.randomUUID();
    }

    if (this.controller) {
        this.requestRepaint();
        this.requestReflow();
    }
};

/**
 * Find components by name
 * @param {function} componentType
 * @return {Component[]} components
 */
Component.prototype.find = function(componentType) {
    return this.parent ? this.parent.find(componentType) : [];
};


Component.prototype.repaint = function (props) {
    // should be implemented by the component
};

Component.prototype.reflow = function (props) {
    // should be implemented by the component
};

/**
 * Request a repaint. The controller will schedule a repaint
 */
Component.prototype.requestRepaint = function () {
    if (this.controller) {
        this.controller.requestRepaint();
    }
    else {
        throw new Error('Cannot request a repaint: no controller configured');
        // TODO: just do a repaint when no parent is configured?
    }
};

/**
 * Request a reflow. The controller will schedule a reflow
 */
Component.prototype.requestReflow = function () {
    if (this.controller) {
        this.controller.requestReflow();
    }
    else {
        throw new Error('Cannot request a reflow: no controller configured');
        // TODO: just do a reflow when no parent is configured?
    }
};

/**
 * Event handler
 * @param {String} event       name of the event, for example 'click', 'mousemove'
 * @param {function} callback  callback handler, invoked with the raw HTML Event
 *                             as parameter.
 */
Component.prototype.on = function (event, callback) {
    if (this.controller) {
        this.controller.on(event, callback);
    }
    else {
        // if there is no controller, put the listener in a queue which will be
        // emptied by the controller as soon as it is connected.
        if (!this.listenerQueue) {
            this.listenerQueue = [];
        }
        this.listenerQueue.push({
            event: event,
            callback: callback
        });
    }
};

/**
 * Format a size or location in pixels or a percentage
 * @param {String | Number | function | undefined} value
 * @param {String} [defaultValue]
 * @returns {String} size
 */
Component.toSize = function (value, defaultValue) {
    if (typeof value == 'function') {
        value = value();
    }

    if (util.isString(value)) {
        return value;
    }
    else if (util.isNumber(value)) {
        return value + 'px';
    }
    else {
        return defaultValue || null;
    }
};

/**
 * Evaluate a value to DOM element
 * @param {HTMLElement | function | undefined} value
 * @param {HTMLElement} [defaultValue]
 * @returns {HTMLElement | null} dom
 */
Component.toDom = function (value, defaultValue) {
    if (typeof value == 'function') {
        value = value();
    }

    return value || defaultValue || null;
};