
/**
 * @constructor Item
 * @param {Object} data       Object containing parameters start, end
 *                            content, group.
 * @param {Object} [options]  Options to set initial property values
 *                            // TODO: describe available options
 */
function Item (data, options) {
    this.data = data;
    this.selected = false;
    this.visible = true;
    this.dom = null;
    this.options = options;
}

Item.prototype = new Component();

/**
 * Select current item
 */
Item.prototype.select = function () {
    this.selected = true;
};

/**
 * Unselect current item
 */
Item.prototype.unselect = function () {
    this.selected = false;
};