/**
 * Interface prototype for visual components
 */
function Component () {
    this.id = null;
    this.parent = null;
    this.config = {};

    this.frame = null; // main DOM element
    this.top = 0;
    this.left = 0;
    this.width = 0;
    this.height = 0;
}

/**
 * Set parameters for the frame. Parameters will be merged in current parameter
 * set.
 * @param {Object} config   Available parameters:
 *                          {String} [id]
 *                          {HTMLElement} container
 *                          {Array} depends           Components on which this
 *                                                    component is dependent
 *                          {String | Number | function} [left]
 *                          {String | Number | function} [top]
 *                          {String | Number | function} [width]
 *                          {String | Number | function} [height]
 */
Component.prototype.setConfig = function(config) {
    var me = this;
    if (config) {
        each(config, function (value, key) {
            me.config[key] = value;
        });

        if (config.id) {
            this.id = config.id
        }
        if (config.depends) {
            this.depends = config.depends;
        }
    }

    if (!this.id) {
        this.id = randomUUID();
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
    var parent = this.parent;
    if (parent) {
        parent.requestRepaint();
    }
    else {
        throw new Error('Cannot request a repaint: no parent configured');
        // TODO: just do a repaint when no parent is configured?
    }
};

/**
 * Request a reflow. The controller will schedule a reflow
 */
Component.prototype.requestReflow = function () {
    var parent = this.parent;
    if (parent) {
        parent.requestReflow();
    }
    else {
        throw new Error('Cannot request a reflow: no parent configured');
        // TODO: just do a reflow when no parent is configured?
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

    if (isString(value)) {
        return value;
    }
    else if (isNumber(value)) {
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